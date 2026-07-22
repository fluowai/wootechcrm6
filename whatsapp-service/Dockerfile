FROM golang:1.22-alpine

RUN apk add --no-cache gcc musl-dev

WORKDIR /app

COPY . .

ENV CGO_ENABLED=1
ENV GONOSUMCHECK=*
ENV GONOSUMDB=*

RUN go get go.mau.fi/whatsmeow@latest && \
    go get github.com/redis/go-redis/v9@latest && \
    go get github.com/mattn/go-sqlite3@latest && \
    go get google.golang.org/protobuf@latest && \
    go mod tidy && \
    go build -o whatsmeow-service main.go

EXPOSE 8080

CMD ["./whatsmeow-service"]
