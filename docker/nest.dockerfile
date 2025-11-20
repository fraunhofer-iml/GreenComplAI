ARG NODE_VERSION=20.18.0

FROM node:${NODE_VERSION}-alpine

ARG APP

ENV NODE_ENV="production"

WORKDIR /home/node

COPY --chown=node:node ./dist/apps/${APP} .
COPY --chown=node:node ./prisma .
COPY --chown=node:node ./blockchain/abi ./blockchain/abi

RUN npm install --omit=dev
RUN npx prisma generate --generator jsclient

USER node

CMD ["node", "main.js"]
