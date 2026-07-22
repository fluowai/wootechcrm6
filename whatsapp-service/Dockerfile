FROM golang:1.22-alpine

RUN apk add --no-cache gcc musl-dev

WORKDIR /app

COPY . .

ENV CGO_ENABLED=1
ENV GONOSUMCHECK=*
ENV GONOSUMDB=*
ENV GOPROXY=https://proxy.golang.org,direct
ENV GOFLAGS=-mod=mod

RUN go mod tidy
RUN go build -o whatsmeow-service main.go

EXPOSE 8080

CMD ["./whatsmeow-service"]
