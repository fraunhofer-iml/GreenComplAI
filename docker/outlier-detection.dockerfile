FROM ghcr.io/astral-sh/uv:debian-slim

RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

ARG PACKAGE_NAME

WORKDIR /app

COPY ./pkg/${PACKAGE_NAME} ./
COPY ./prisma ./prisma

RUN uv sync --locked && uv run prisma_config.py

CMD ["uv", "run", "main.py"]