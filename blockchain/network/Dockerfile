# Use the official Hyperledger Besu image
FROM hyperledger/besu:24.8.0-amd64

COPY genesis.json /opt/besu/data/

RUN mkdir alice-data
COPY alice/keys alice-data/
COPY static-nodes.json alice-data

RUN mkdir bob-data
COPY bob/keys bob-data/
COPY static-nodes.json bob-data

RUN mkdir carol-data
COPY carol/keys carol-data/
COPY static-nodes.json carol-data

RUN mkdir dan-data
COPY dan/keys dan-data/
COPY static-nodes.json dan-data

# Expose ports for both nodes
EXPOSE 8545

# Define entrypoint to run both nodes
ENTRYPOINT ["sh", "-c", "\
             besu --api-gas-price-max=0 --logging=ERROR --data-path=alice-data --data-storage-format=FOREST --genesis-file=data/genesis.json --host-allowlist='*' --min-gas-price=0 --nat-method=DOCKER --node-private-key-file=alice-data/key.priv --p2p-enabled=true --p2p-port=30303 --revert-reason-enabled=true --rpc-http-enabled=true --rpc-http-api=ADMIN,DEBUG,ETH,NET,QBFT,TRACE,TXPOOL,WEB3 --rpc-http-cors-origins='*' --rpc-http-port=8545 --rpc-max-logs-range=0 --rpc-ws-enabled=true --rpc-ws-api=ADMIN,DEBUG,ETH,NET,QBFT,TRACE,TXPOOL,WEB3 --rpc-ws-port=8546 --sync-mode=FULL --tx-pool-min-gas-price=0 & \
             besu --api-gas-price-max=0 --logging=ERROR --data-path=bob-data --data-storage-format=FOREST --genesis-file=data/genesis.json --host-allowlist='*' --min-gas-price=0 --nat-method=DOCKER --node-private-key-file=bob-data/key.priv --p2p-enabled=true --p2p-port=30304 --revert-reason-enabled=true --rpc-http-enabled=true --rpc-http-api=ADMIN,DEBUG,ETH,NET,QBFT,TRACE,TXPOOL,WEB3 --rpc-http-cors-origins='*' --rpc-http-port=8547 --rpc-max-logs-range=0 --rpc-ws-enabled=true --rpc-ws-api=ADMIN,DEBUG,ETH,NET,QBFT,TRACE,TXPOOL,WEB3 --rpc-ws-port=8548 --sync-mode=FULL --tx-pool-min-gas-price=0 & \
             besu --api-gas-price-max=0 --logging=ERROR --data-path=carol-data --data-storage-format=FOREST --genesis-file=data/genesis.json --host-allowlist='*' --min-gas-price=0 --nat-method=DOCKER --node-private-key-file=carol-data/key.priv --p2p-enabled=true --p2p-port=30305 --revert-reason-enabled=true --rpc-http-enabled=true --rpc-http-api=ADMIN,DEBUG,ETH,NET,QBFT,TRACE,TXPOOL,WEB3 --rpc-http-cors-origins='*' --rpc-http-port=8549 --rpc-max-logs-range=0 --rpc-ws-enabled=true --rpc-ws-api=ADMIN,DEBUG,ETH,NET,QBFT,TRACE,TXPOOL,WEB3 --rpc-ws-port=8550 --sync-mode=FULL --tx-pool-min-gas-price=0 & \
             besu --api-gas-price-max=0 --logging=ERROR --data-path=dan-data --data-storage-format=FOREST --genesis-file=data/genesis.json --host-allowlist='*' --min-gas-price=0 --nat-method=DOCKER --node-private-key-file=dan-data/key.priv --p2p-enabled=true --p2p-port=30306 --revert-reason-enabled=true --rpc-http-enabled=true --rpc-http-api=ADMIN,DEBUG,ETH,NET,QBFT,TRACE,TXPOOL,WEB3 --rpc-http-cors-origins='*' --rpc-http-port=8551 --rpc-max-logs-range=0 --rpc-ws-enabled=true --rpc-ws-api=ADMIN,DEBUG,ETH,NET,QBFT,TRACE,TXPOOL,WEB3 --rpc-ws-port=8552 --sync-mode=FULL --tx-pool-min-gas-price=0; \
             wait"]
