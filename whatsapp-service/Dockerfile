FROM golang:1.21-alpine

# Install build dependencies for sqlite3 (cgo)
RUN apk add --no-cache gcc musl-dev

WORKDIR /app

COPY go.mod ./
# Se tivermos go.sum, adicionar aqui, mas vamos baixar manual
RUN go mod tidy

COPY . .

# Habilitar CGO para o driver do sqlite3
ENV CGO_ENABLED=1

RUN go build -o whatsmeow-service main.go

EXPOSE 8080

CMD ["./whatsmeow-service"]
