ARG NODE_VERSION=20.18.0

FROM node:${NODE_VERSION}-alpine

ENV NODE_ENV="production"

WORKDIR /home/node

COPY --chown=node:node ./dist/apps/entity-management-svc .
COPY --chown=node:node ./prisma .

RUN npm install --omit=dev
RUN npx prisma generate --generator jsclient

USER node

CMD ["node", "main.js"]
