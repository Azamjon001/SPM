# Build stage
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Install necessary packages
RUN apk add --no-cache git

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main ./cmd/server

# Final stage
FROM alpine:3.19

WORKDIR /app

# Install ca-certificates for HTTPS
RUN apk --no-cache add ca-certificates tzdata

# Copy the binary from builder
COPY --from=builder /app/main .
COPY --from=builder /app/migrations ./migrations

# Create uploads directory
RUN mkdir -p /app/uploads

# Expose port
EXPOSE 8080

# Run the application
CMD ["./main"]
