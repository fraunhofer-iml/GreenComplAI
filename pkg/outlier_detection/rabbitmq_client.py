# Copyright Fraunhofer Institute for Material Flow and Logistics
#
# Licensed under the Apache License, Version 2.0 (the "License").
# For details on the licensing terms, see the LICENSE file.
# SPDX-License-Identifier: Apache-2.0

import asyncio
import json
import logging
import uuid
from typing import Any, Callable, Dict, List

from aio_pika import connect, Message, ExchangeType

class RabbitMQClient:
    def __init__(self, host: str = 'localhost', port: int = 5672, 
                 username: str = 'guest', password: str = 'guest'):
        """
        Initialize RabbitMQ client.
        
        Args:
            host (str): RabbitMQ host
            port (int): RabbitMQ port
            username (str): RabbitMQ username
            password (str): RabbitMQ password
        """
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.connection = None
        self.channel = None
        self.exchange = None
        self.logger = logging.getLogger(__name__)
        self.response_queues: Dict[str, asyncio.Queue] = {}
        self.consumer_tag = None
        self.entity_management_queue = 'entity-management-service'

    async def connect(self) -> None:
        """Establish connection to RabbitMQ server."""
        try:
            self.connection = await connect(
                f"amqp://{self.username}:{self.password}@{self.host}:{self.port}/"
            )
            self.channel = await self.connection.channel()
            self.logger.info("Successfully connected to RabbitMQ")
        except Exception as e:
            self.logger.error(f"Failed to connect to RabbitMQ: {str(e)}")
            raise

    async def declare_exchange(self, exchange_name: str, exchange_type: ExchangeType = ExchangeType.TOPIC) -> None:
        """
        Declare an exchange.
        
        Args:
            exchange_name (str): Name of the exchange
            exchange_type (ExchangeType): Type of exchange (default: TOPIC)
        """
        if not self.channel:
            raise RuntimeError("Not connected to RabbitMQ")
        
        self.exchange = await self.channel.declare_exchange(
            exchange_name,
            exchange_type,
            durable=True
        )
        self.logger.info(f"Declared exchange: {exchange_name}")

    async def request_products(self) -> List[Dict]:
        """
        Request all products from entity-management-svc.
        
        Returns:
            List[Dict]: List of product data
            
        Raises:
            RuntimeError: If exchange is not declared
            asyncio.TimeoutError: If response is not received within timeout
            Exception: For any other errors during request/response handling
        """
        if not self.exchange:
            raise RuntimeError("Exchange not declared")
            
        correlation_id = str(uuid.uuid4())
        
        # Create and bind response queue with unique routing key
        callback_queue = await self.channel.declare_queue(exclusive=True)
        await callback_queue.bind(self.exchange, routing_key=f"response.{correlation_id}")

        loop = asyncio.get_event_loop()
        future: asyncio.Future = loop.create_future()

        async def on_response(message: Message):
            async with message.process():
                if message.correlation_id == correlation_id:
                    self.logger.info(f"Received response with correlation_id: {correlation_id}")
                    data = json.loads(message.body.decode())
                    future.set_result(data)

        await callback_queue.consume(on_response)
        
        # Construct request payload following NestJS microservice protocol
        payload = {
            "pattern": "/products/get-for-outlier-detection",
            "data": {},
            "id": correlation_id
        }
        body = json.dumps(payload).encode()
        
        self.logger.info(f"Sending product request with correlation_id: {correlation_id}")
        await self.channel.default_exchange.publish(
            Message(
                body=body,
                content_type="application/json",
                correlation_id=correlation_id,
                reply_to=callback_queue.name
            ),
            routing_key=self.entity_management_queue
        )
        
        try:
            self.logger.info("Waiting for response...")
            response = await asyncio.wait_for(future, timeout=10.0)
            return response.get("response")
        except asyncio.TimeoutError:
            self.logger.error("Timeout waiting for products response")
            raise
        except Exception as e:
            self.logger.error(f"Error processing response: {str(e)}")
            raise
        finally:
            # Clean up response queue and correlation tracking
            if correlation_id in self.response_queues:
                del self.response_queues[correlation_id]

    async def start_response_consumer(self) -> None:
        """Start consuming responses from entity-management-svc."""
        if not self.channel:
            raise RuntimeError("Not connected to RabbitMQ")
            
        queue = await self.channel.declare_queue(exclusive=True)
        await queue.bind(self.exchange, routing_key="response.*")
        
        async def on_message(message):
            async with message.process():
                try:
                    data = json.loads(message.body.decode())
                    correlation_id = data.get("id")
                    self.logger.info(f"Received message with correlation_id: {correlation_id}")
                    
                    if correlation_id and correlation_id in self.response_queues:
                        await self.response_queues[correlation_id].put(data)
                    else:
                        self.logger.warning(f"Received message with unknown correlation_id: {correlation_id}")
                except Exception as e:
                    self.logger.error(f"Error processing response: {str(e)}")
        
        self.consumer_tag = await queue.consume(on_message)
        self.logger.info("Started response consumer")

    async def publish_message(self, routing_key: str, message: Any) -> None:
        """
        Publish a message to the exchange.
        
        Args:
            routing_key (str): Routing key for the message
            message (Any): Message to publish (will be converted to JSON)
        """
        if not self.exchange:
            raise RuntimeError("Exchange not declared")
        
        try:
            message_body = json.dumps(message).encode()
            await self.exchange.publish(
                Message(message_body),
                routing_key=routing_key
            )
            self.logger.info(f"Published message to {routing_key}")
        except Exception as e:
            self.logger.error(f"Failed to publish message: {str(e)}")
            raise

    async def consume_messages(self, queue_name: str, routing_key: str, 
                             callback: Callable[[Any], None]) -> None:
        """
        Consume messages from a queue.
        
        Args:
            queue_name (str): Name of the queue
            routing_key (str): Routing key to bind to
            callback (Callable): Function to call when message is received
        """
        if not self.channel or not self.exchange:
            raise RuntimeError("Not connected to RabbitMQ or exchange not declared")
        
        queue = await self.channel.declare_queue(queue_name, durable=True)
        await queue.bind(self.exchange, routing_key)
        
        async with queue.iterator() as queue_iter:
            async for message in queue_iter:
                async with message.process():
                    try:
                        data = json.loads(message.body.decode())
                        await callback(data)
                    except Exception as e:
                        self.logger.error(f"Error processing message: {str(e)}")

    async def close(self) -> None:
        """Close the RabbitMQ connection."""
        if self.connection:
            await self.connection.close()
            self.logger.info("Closed RabbitMQ connection")