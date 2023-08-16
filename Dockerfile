FROM golang:1.20 as build-go

COPY . /app
WORKDIR /app
RUN CGO_ENABLED=0 go build -o openmower-gui

FROM node:17 as build-web
COPY ./web /web
WORKDIR /web
RUN yarn && yarn build

FROM ubuntu:22.04
RUN apt-get update && apt-get install -y ca-certificates curl python3 python3-pip python3-venv git build-essential
RUN curl -fsSL https://raw.githubusercontent.com/platformio/platformio-core-installer/master/get-platformio.py -o get-platformio.py &&    python3 get-platformio.py
RUN python3 -m pip install --upgrade pygnssutils
RUN mkdir -p /usr/local/bin &&    ln -s ~/.platformio/penv/bin/platformio /usr/local/bin/platformio &&    ln -s ~/.platformio/penv/bin/pio /usr/local/bin/pio &&    ln -s ~/.platformio/penv/bin/piodebuggdb /usr/local/bin/piodebuggdb
COPY ./setup /app/setup
COPY --from=build-web /web/dist /app/web
COPY --from=build-go /app/openmower-gui /app/openmower-gui
ENV WEB_DIR=/app/web
WORKDIR /app
CMD ["/app/openmower-gui"]
