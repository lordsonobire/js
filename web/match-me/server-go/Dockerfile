FROM golang:1.24-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -o main .
RUN go build -o seeder cmd/seeder/main.go

FROM alpine:latest
WORKDIR /root/

COPY --from=builder /app/main .
COPY --from=builder /app/seeder .
COPY --from=builder /app/migrations ./migrations

# Install bash for potential debugging
RUN apk add --no-cache bash

EXPOSE 3000

CMD ["./main"]
