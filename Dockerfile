FROM rustlang/rust:nightly-slim AS backend-builder

WORKDIR /usr/src/app
RUN apt-get update && apt-get install -y libpq-dev pkg-config && rm -rf /var/lib/apt/lists/*
COPY ./backend .
RUN cargo build --release
RUN cargo install diesel_cli --no-default-features --features postgres

FROM node:20-slim AS frontend-builder

WORKDIR /usr/src/app
COPY ./frontend/package*.json ./frontend/yarn.lock ./
RUN yarn install --frozen-lockfile

COPY ./frontend .
RUN yarn build

FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y libpq5 caddy && rm -rf /var/lib/apt/lists/*

COPY --from=backend-builder /usr/src/app/target/release/backend /usr/local/bin/backend
COPY --from=backend-builder /usr/src/app/migrations /usr/local/bin/migrations
COPY --from=backend-builder /usr/local/cargo/bin/diesel /usr/local/bin/diesel

COPY --from=frontend-builder /usr/src/app/dist /usr/share/caddy

WORKDIR /usr/local/bin

RUN echo '#!/bin/bash\ncaddy run &\nsleep 5\ndiesel migration run\n./backend' > /usr/local/bin/start.sh && \
    chmod +x /usr/local/bin/start.sh

CMD ["/usr/local/bin/start.sh"] 