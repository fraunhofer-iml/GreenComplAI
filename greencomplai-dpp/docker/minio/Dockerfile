# syntax=docker/dockerfile:1
# Build the storage service and its bucket-setup client from pinned upstream source.
FROM golang:1.25-alpine AS source
RUN apk add --no-cache git
ENV CGO_ENABLED=0

FROM source AS server
WORKDIR /src
RUN git init . \
    && git remote add origin https://github.com/minio/minio.git \
    && git fetch --depth 1 origin 9e49d5e7a648f00e26f2246f4dc28e6b07f8c84a \
    && git checkout --detach FETCH_HEAD
RUN go build -trimpath -ldflags="-s -w" -o /out/minio .

FROM source AS client
WORKDIR /src
RUN git init . \
    && git remote add origin https://github.com/minio/mc.git \
    && git fetch --depth 1 origin 7394ce0dd2a80935aded936b09fa12cbb3cb8096 \
    && git checkout --detach FETCH_HEAD
RUN go build -trimpath -ldflags="-s -w" -o /out/mc .

FROM alpine:3.24
RUN apk add --no-cache ca-certificates curl
COPY --from=server /out/minio /usr/local/bin/minio
COPY --from=client /out/mc /usr/local/bin/mc
COPY --from=server /src/LICENSE /usr/share/licenses/minio/LICENSE
COPY --from=client /src/LICENSE /usr/share/licenses/mc/LICENSE
LABEL org.opencontainers.image.licenses="AGPL-3.0-or-later" \
      org.opencontainers.image.source="https://github.com/fraunhofer-iml/GreenComplAI" \
      org.opencontainers.image.description="MinIO and mc built from pinned upstream GitHub sources"
EXPOSE 9000 9001
ENTRYPOINT ["minio"]
CMD ["server", "/data", "--console-address", ":9001"]
