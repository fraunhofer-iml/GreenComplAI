FROM ghcr.io/astral-sh/uv:debian-slim

ARG PACKAGE_NAME

WORKDIR /app

COPY ./pkg/${PACKAGE_NAME} .

RUN uv sync --locked

CMD ["uv", "run", "main.py"]