FROM --platform=${BUILDPLATFORM} golang:alpine as compiler
ARG TARGETOS
ARG TARGETARCH
ENV CGO_ENABLED=0

WORKDIR /go/src/storm

COPY . .

RUN GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build -ldflags="-s -w" github.com/relvacode/storm/cmd/storm


FROM --platform=${TARGETPLATFORM} alpine
COPY --from=compiler /go/src/storm/storm /usr/bin/storm

ENTRYPOINT ["/usr/bin/storm"]
