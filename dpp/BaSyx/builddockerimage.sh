#!/bin/bash

echo "Building .jar"
./mvnw clean package -DskipTests

echo "Building docker image for DPP_BaSyx"
docker build -t dpp_basyx_skala:latest .
