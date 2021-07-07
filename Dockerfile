FROM node:15 as frontend-builder

WORKDIR /usr/src/app

COPY frontend .

RUN npm install -g @angular/cli && \
    npm install && \
    ng build --prod


FROM golang:alpine as compiler

WORKDIR /go/src/storm

COPY . .
COPY --from=frontend-builder /usr/src/app/dist /go/src/storm/frontend/dist

RUN go get -u github.com/gobuffalo/packr/packr && \
    packr && \
    go build -ldflags="-s -w" github.com/relvacode/storm/cmd/storm


FROM alpine
COPY --from=compiler /go/src/storm/storm /usr/bin/storm

ENTRYPOINT ["/usr/bin/storm"]