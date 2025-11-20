FROM node:20-alpine3.18

ARG DEPLOYMENT_MNEMONIC
ENV DEV_MNEMONIC=${DEPLOYMENT_MNEMONIC}

ARG TOKEN_NAME
ENV TOKEN_NAME=${TOKEN_NAME}

ARG TOKEN_SYMBOL
ENV TOKEN_SYMBOL=${TOKEN_SYMBOL}

WORKDIR /usr/src/app
COPY . .

RUN apk update && apk add --no-cache bash git openssh-client
RUN git clone https://github.com/fraunhofer-iml/nft-folder-smart-contracts.git

RUN chmod +x deploy-smart-contracts.sh ./wait-for-it.sh

ENTRYPOINT ["./deploy-smart-contracts.sh"]
