FROM golang:1.21-alpine

RUN apk add --no-cache gcc musl-dev

WORKDIR /app

COPY go.mod ./
COPY . .

ENV CGO_ENABLED=1

RUN go mod tidy && go build -o whatsmeow-service main.go

EXPOSE 8080

CMD ["./whatsmeow-service"]
