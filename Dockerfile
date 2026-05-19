FROM golang:1.21 AS build-go

COPY . /app
WORKDIR /app
RUN CGO_ENABLED=0 go build -o openmower-gui


FROM node:22 AS build-web

COPY ./web /web
WORKDIR /web
RUN yarn && yarn build


FROM ubuntu:22.04 AS deps

RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    python3 \
    python3-pip \
    python3-venv \
    git \
    build-essential \
    unzip \
    wget \
    libusb-1.0-0-dev \
    stlink-tools \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://raw.githubusercontent.com/platformio/platformio-core-installer/master/get-platformio.py -o get-platformio.py \
 && python3 get-platformio.py \
 && rm -f get-platformio.py

RUN python3 -m pip install --upgrade pygnssutils

RUN mkdir -p /usr/local/bin \
 && ln -s ~/.platformio/penv/bin/platformio /usr/local/bin/platformio \
 && ln -s ~/.platformio/penv/bin/pio /usr/local/bin/pio \
 && ln -s ~/.platformio/penv/bin/piodebuggdb /usr/local/bin/piodebuggdb


FROM deps

COPY ./setup /app/setup
COPY --from=build-web /web/dist /app/web
COPY --from=build-go /app/openmower-gui /app/openmower-gui

ENV WEB_DIR=/app/web
ENV DB_PATH=/app/db

WORKDIR /app

CMD ["/app/openmower-gui"]