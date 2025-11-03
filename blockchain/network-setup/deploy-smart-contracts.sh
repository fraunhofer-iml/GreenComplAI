#!/bin/sh
#
# Copyright Fraunhofer Institute for Material Flow and Logistics
#
# Licensed under the Apache License, Version 2.0 (the "License").
# For details on the licensing terms, see the LICENSE file.
# SPDX-License-Identifier: Apache-2.0
#

echo "### STARTING deployment of the Token smart contract ###"

./wait-for-it.sh blockchain-network:8545 --timeout=20 --strict -- echo "### blockchain-network is up ###"

cd nft-folder-smart-contracts || exit
npm install
npm run token-deploy-dev

echo "### FINISHED deployment of the Token smart contract ###"
