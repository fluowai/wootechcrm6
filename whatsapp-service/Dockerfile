FROM golang:1.21-alpine

RUN apk add --no-cache gcc musl-dev

WORKDIR /app

COPY go.mod go.sum* ./
RUN go mod download

COPY . .

ENV CGO_ENABLED=1

RUN go build -o whatsmeow-service main.go

EXPOSE 8080

CMD ["./whatsmeow-service"]
