#!/bin/bash

echo "Removing previous containers"
docker compose down -v

echo "Removing old docker image for Application"
docker rmi dpp_basyx_skala

echo "Building .jar"
./mvnw clean package -DskipTests

echo "Building docker image for Application"
docker build -t dpp_basyx_skala:latest .

echo "Starting test environment"
docker compose up
