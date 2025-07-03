# Copyright Fraunhofer Institute for Material Flow and Logistics
#
# Licensed under the Apache License, Version 2.0 (the "License").
# For details on the licensing terms, see the LICENSE file.
# SPDX-License-Identifier: Apache-2.0

from product_outliers import ProductOutlierDetector
from rabbitmq_client import RabbitMQClient
import asyncio
import logging
import os

# Configure application logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def handle_outlier_detection(detector: ProductOutlierDetector, data: dict) -> None:
    """
    Process incoming messages for outlier detection analysis.
    
    Args:
        detector (ProductOutlierDetector): Instance of the outlier detection model
        data (dict): Message payload containing recycledWastePercentage
        
    Raises:
        ValueError: If recycledWastePercentage is invalid or missing
        TypeError: If data format is incorrect
        Exception: For any other processing errors
    """
    try:
        recycled_waste_percentage = float(data.get('recycledWastePercentage'))
        is_outlier, score = await detector.predict(recycled_waste_percentage)
        
        logger.info(f"Outlier detection result for {recycled_waste_percentage}%: "
                   f"is_outlier={is_outlier}, score={score}")
        
    except (ValueError, TypeError) as e:
        logger.error(f"Invalid data received: {str(e)}")
    except Exception as e:
        logger.error(f"Error processing message: {str(e)}")

async def main():
    """
    Initialize and run the outlier detection service.
    
    This function:
    1. Establishes RabbitMQ connection
    2. Sets up message exchange
    3. Initializes the outlier detection model
    4. Trains the model with existing data
    5. Starts consuming messages for analysis
    
    Raises:
        Exception: For any initialization or runtime errors
    """
    # Initialize RabbitMQ client with environment variables
    rabbitmq = RabbitMQClient(
        host=os.getenv('RABBITMQ_HOST', 'localhost'),
        port=int(os.getenv('RABBITMQ_PORT', '5672')),
        username=os.getenv('RABBITMQ_USERNAME', 'guest'),
        password=os.getenv('RABBITMQ_PASSWORD', 'guest')
    )
    
    try:
        # Establish RabbitMQ connection and setup
        await rabbitmq.connect()
        await rabbitmq.declare_exchange('outlier_detection')
        await rabbitmq.start_response_consumer()
        
        # Initialize and train the outlier detection model
        detector = ProductOutlierDetector(rabbitmq)
        logger.info("Training model with existing data...")
        await detector.train()
        logger.info("Model training completed")
        
        # Start message consumption for outlier detection
        logger.info("Starting to consume messages...")
        await handle_outlier_detection(detector, {"recycledWastePercentage": 60})
        await rabbitmq.consume_messages(
            queue_name='outlier_detection',
            routing_key='check_outlier',
            callback=lambda data: handle_outlier_detection(detector, data)
        )
        
    except Exception as e:
        logger.error(f"Error in main loop: {str(e)}")
    finally:
        await rabbitmq.close()

if __name__ == "__main__":
    asyncio.run(main())
