FROM node:15 as frontend-builder

WORKDIR /usr/src/app

COPY frontend .

RUN npm install -g @angular/cli && \
    npm install && \
    ng build --prod


FROM golang:alpine as compiler

WORKDIR /go/src/app

COPY . .
COPY --from=frontend-builder /usr/src/app/dist /go/src/app/frontend/dist

RUN go get -u github.com/gobuffalo/packr/packr && \
    packr && \
    go build github.com/relvacode/deluge-api/cmd/storm


FROM alpine
COPY --from=compiler /go/src/app/storm /usr/bin/storm

ENTRYPOINT ["/usr/bin/storm"]
