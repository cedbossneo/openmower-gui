FROM golang:1.20 as build-go

COPY . /app
WORKDIR /app
RUN CGO_ENABLED=0 go build -o openmower-gui

FROM node:17 as build-web
COPY ./web /web
WORKDIR /web
RUN yarn && yarn build

FROM alpine:3.14
COPY --from=build-web /web/dist /app/web
COPY --from=build-go /app/openmower-gui /app/openmower-gui
ENV WEB_DIR=/app/web
WORKDIR /app
CMD ["/app/openmower-gui"]
