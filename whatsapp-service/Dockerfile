FROM golang:1.22-alpine

RUN apk add --no-cache gcc musl-dev

WORKDIR /app

COPY . .

ENV CGO_ENABLED=1
ENV GONOSUMCHECK=*
ENV GONOSUMDB=*
ENV GOPROXY=direct

RUN go get go.mau.fi/whatsmeow@latest
RUN go get github.com/redis/go-redis/v9@latest
RUN go get github.com/mattn/go-sqlite3@latest
RUN go get google.golang.org/protobuf@latest
RUN go mod tidy
RUN go build -o whatsmeow-service main.go

EXPOSE 8080

CMD ["./whatsmeow-service"]
