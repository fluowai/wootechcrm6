# ==========================================
# Build Stage
# ==========================================
FROM golang:1.25-alpine AS builder

RUN apk add --no-cache gcc musl-dev

WORKDIR /app

ENV CGO_ENABLED=1
ENV GOPROXY=https://proxy.golang.org,direct
ENV GONOSUMDB=*
ENV GONOSUMCHECK=*
ENV GOFLAGS=-mod=mod

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -o whatsmeow-service main.go

# ==========================================
# Production Stage
# ==========================================
FROM alpine:3.19

RUN apk add --no-cache ca-certificates

WORKDIR /app

# Create instances directory for multi-instance data
RUN mkdir -p /app/instances

COPY --from=builder /app/whatsmeow-service ./whatsmeow-service

EXPOSE 8080

# DATA_DIR points to persistent volume for instance SQLite stores
ENV DATA_DIR=/app/instances

CMD ["./whatsmeow-service"]
