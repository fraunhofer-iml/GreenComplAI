#!/bin/bash

# Copyright Fraunhofer Institute for Material Flow and Logistics
#
# Licensed under the Apache License, Version 2.0 (the "License").
# For details on the licensing terms, see the LICENSE file.
# SPDX-License-Identifier: Apache-2.0

# Array of directories to navigate to
directories=(
    "apps/bff"
    "apps/bff-e2e"
    "apps/entity-management-svc"
    "apps/entity-management-svc-e2e"
    "apps/frontend"
    "apps/frontend-e2e"
    "libs/amqp"
    "libs/api-interfaces"
    "libs/configuration"
    "libs/database"
    "libs/user-management"
    "libs/util"
)

# Log file
log_file="run-eslint-fix.log"

# Clear the log file
>"$log_file"

echo "[INFO] ESLint fix started." | tee -a "$log_file"

# Loop through each directory and run eslint
for dir in "${directories[@]}"; do
    if [ -d "$dir" ]; then
        echo "[INFO] Running eslint in $dir" | tee -a "$log_file"
        (cd "$dir" && npx eslint --fix './**/*.{ts,js,tsx,jsx}' 2>&1 | tee -a "$log_file")
        if [ $? -ne 0 ]; then
            echo "[ERROR] ESLint failed in $dir" | tee -a "$log_file"
        else
            echo "[INFO] ESLint completed successfully in $dir" | tee -a "$log_file"
        fi
    else
        echo "[ERROR] Directory $dir does not exist. Skipping..." | tee -a "$log_file"
    fi
done

echo "[INFO] ESLint fix completed in all specified directories." | tee -a "$log_file"