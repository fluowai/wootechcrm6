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

# Copy go.mod and go.sum first for better layer caching
COPY go.mod go.sum ./

# Download dependencies (cached unless go.mod/go.sum change)
RUN go mod download

# Copy source code
COPY . .

# Build the binary
RUN go build -o whatsmeow-service main.go

# ==========================================
# Production Stage
# ==========================================
FROM alpine:3.19

RUN apk add --no-cache ca-certificates

WORKDIR /app

COPY --from=builder /app/whatsmeow-service ./whatsmeow-service

EXPOSE 8080

CMD ["./whatsmeow-service"]
