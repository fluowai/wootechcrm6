FROM golang:1.22-alpine

RUN apk add --no-cache gcc musl-dev

WORKDIR /app

COPY go.mod ./
RUN go mod download

COPY . .

ENV CGO_ENABLED=1

RUN go build -o whatsmeow-service main.go

EXPOSE 8080

CMD ["./whatsmeow-service"]
