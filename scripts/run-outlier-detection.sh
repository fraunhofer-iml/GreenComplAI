#!/bin/bash

# Copyright Fraunhofer Institute for Material Flow and Logistics
#
# Licensed under the Apache License, Version 2.0 (the "License").
# For details on the licensing terms, see the LICENSE file.
# SPDX-License-Identifier: Apache-2.0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
RABBITMQ_HOST=${RABBITMQ_HOST:-localhost}
RABBITMQ_PORT=${RABBITMQ_PORT:-5672}
RABBITMQ_MANAGEMENT_PORT=${RABBITMQ_MANAGEMENT_PORT:-15672}
RABBITMQ_USERNAME=${RABBITMQ_USERNAME:-guest}
RABBITMQ_PASSWORD=${RABBITMQ_PASSWORD:-guest}
ENTITY_MANAGEMENT_QUEUE=${ENTITY_MANAGEMENT_QUEUE:-entity-management-service}
MAX_RETRIES=${MAX_RETRIES:-30}
RETRY_INTERVAL=${RETRY_INTERVAL:-2}

echo -e "${BLUE}🚀 Starting Outlier Detection Service${NC}"
echo "=================================="

# Function to check if a service is running
check_service() {
    local service_name=$1
    local host=$2
    local port=$3
    local retries=0
    
    echo -e "${YELLOW}Checking if $service_name is running on $host:$port...${NC}"
    
    while [ $retries -lt $MAX_RETRIES ]; do
        if nc -z $host $port 2>/dev/null; then
            echo -e "${GREEN}✅ $service_name is running on $host:$port${NC}"
            return 0
        else
            echo -e "${YELLOW}⏳ $service_name not ready yet (attempt $((retries + 1))/$MAX_RETRIES)${NC}"
            sleep $RETRY_INTERVAL
            retries=$((retries + 1))
        fi
    done
    
    echo -e "${RED}❌ $service_name is not running on $host:$port after $MAX_RETRIES attempts${NC}"
    return 1
}

# Function to check RabbitMQ management interface
check_rabbitmq_management() {
    local retries=0
    
    echo -e "${YELLOW}Checking RabbitMQ management interface on $RABBITMQ_HOST:$RABBITMQ_MANAGEMENT_PORT...${NC}"
    
    while [ $retries -lt $MAX_RETRIES ]; do
        if curl -s http://$RABBITMQ_HOST:$RABBITMQ_MANAGEMENT_PORT > /dev/null 2>&1; then
            echo -e "${GREEN}✅ RabbitMQ management interface is accessible${NC}"
            return 0
        else
            echo -e "${YELLOW}⏳ RabbitMQ management interface not ready yet (attempt $((retries + 1))/$MAX_RETRIES)${NC}"
            sleep $RETRY_INTERVAL
            retries=$((retries + 1))
        fi
    done
    
    echo -e "${RED}❌ RabbitMQ management interface is not accessible${NC}"
    return 1
}

# Function to check if entity-management-service queue exists and is active
check_entity_management_service() {
    local retries=0
    
    echo -e "${YELLOW}Checking if entity-management-service is connected to RabbitMQ...${NC}"
    
    while [ $retries -lt $MAX_RETRIES ]; do
        # Use RabbitMQ management API to check if the queue exists and has consumers
        if curl -s -u "$RABBITMQ_USERNAME:$RABBITMQ_PASSWORD" \
            "http://$RABBITMQ_HOST:$RABBITMQ_MANAGEMENT_PORT/api/queues/%2F/$ENTITY_MANAGEMENT_QUEUE" \
            > /dev/null 2>&1; then
            
            # Check if the queue has consumers (meaning the service is connected)
            consumers=$(curl -s -u "$RABBITMQ_USERNAME:$RABBITMQ_PASSWORD" \
                "http://$RABBITMQ_HOST:$RABBITMQ_MANAGEMENT_PORT/api/queues/%2F/$ENTITY_MANAGEMENT_QUEUE" \
                | grep -o '"consumers":[0-9]*' | grep -o '[0-9]*' || echo "0")
            
            if [ "$consumers" -gt 0 ]; then
                echo -e "${GREEN}✅ Entity Management Service is connected to RabbitMQ (consumers: $consumers)${NC}"
                return 0
            else
                echo -e "${YELLOW}⏳ Entity Management Service queue exists but no consumers yet (attempt $((retries + 1))/$MAX_RETRIES)${NC}"
                sleep $RETRY_INTERVAL
                retries=$((retries + 1))
            fi
        else
            echo -e "${YELLOW}⏳ Entity Management Service queue not found yet (attempt $((retries + 1))/$MAX_RETRIES)${NC}"
            sleep $RETRY_INTERVAL
            retries=$((retries + 1))
        fi
    done
    
    echo -e "${RED}❌ Entity Management Service is not connected to RabbitMQ${NC}"
    return 1
}

# Check if required tools are available
check_dependencies() {
    echo -e "${BLUE}Checking dependencies...${NC}"
    
    if ! command -v nc &> /dev/null; then
        echo -e "${RED}❌ netcat (nc) is not installed. Please install it first.${NC}"
        exit 1
    fi
    
    if ! command -v curl &> /dev/null; then
        echo -e "${RED}❌ curl is not installed. Please install it first.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ All dependencies are available${NC}"
}

# Main execution
main() {
    check_dependencies
    
    # Check RabbitMQ
    if ! check_service "RabbitMQ" $RABBITMQ_HOST $RABBITMQ_PORT; then
        echo -e "${RED}Failed to connect to RabbitMQ. Please ensure it's running.${NC}"
        echo -e "${YELLOW}You can start RabbitMQ with: docker-compose up rabbitmq${NC}"
        exit 1
    fi
    
    # Check RabbitMQ management interface
    if ! check_rabbitmq_management; then
        echo -e "${YELLOW}Warning: RabbitMQ management interface is not accessible${NC}"
        echo -e "${YELLOW}This might indicate RabbitMQ is not fully started${NC}"
    fi
    
    # Check entity-management-service
    if ! check_entity_management_service; then
        echo -e "${RED}Failed to connect to entity-management-service. Please ensure it's running.${NC}"
        echo -e "${YELLOW}You can start the entity-management-service with: npm run dev${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}🎉 All services are ready! Starting outlier detection...${NC}"
    echo "=================================="
    
    # Change to the outlier detection directory
    cd pkg/outlier_detection
    
    # Set environment variables if not already set
    export RABBITMQ_HOST=${RABBITMQ_HOST:-localhost}
    export RABBITMQ_PORT=${RABBITMQ_PORT:-5672}
    export RABBITMQ_USERNAME=${RABBITMQ_USERNAME:-guest}
    export RABBITMQ_PASSWORD=${RABBITMQ_PASSWORD:-guest}
    
    # Run the outlier detection service
    echo -e "${BLUE}Starting outlier detection service with environment:${NC}"
    echo "RABBITMQ_HOST=$RABBITMQ_HOST"
    echo "RABBITMQ_PORT=$RABBITMQ_PORT"
    echo "RABBITMQ_USERNAME=$RABBITMQ_USERNAME"
    echo "RABBITMQ_PASSWORD=$RABBITMQ_PASSWORD"
    echo ""
    
    # Run the Python script
    uv run main.py
}

# Handle script interruption
trap 'echo -e "\n${YELLOW}Script interrupted. Exiting...${NC}"; exit 1' INT TERM

# Run the main function
main
