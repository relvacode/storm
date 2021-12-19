FROM --platform=${BUILDPLATFORM} node:16 as frontend-builder

WORKDIR /usr/src/app

COPY frontend .

RUN npm install -g @angular/cli && \
    npm install && \
    ng build --prod


FROM --platform=${BUILDPLATFORM} golang:alpine as compiler
ARG TARGETOS
ARG TARGETARCH
ENV CGO_ENABLED=0

WORKDIR /go/src/storm

COPY . .
COPY --from=frontend-builder /usr/src/app/dist /go/src/storm/frontend/dist

RUN GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build -ldflags="-s -w" github.com/relvacode/storm/cmd/storm


FROM --platform=${TARGETPLATFORM} alpine
COPY --from=compiler /go/src/storm/storm /usr/bin/storm

ENTRYPOINT ["/usr/bin/storm"]
