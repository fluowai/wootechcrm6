module whatsapp-service

go 1.21

require (
	go.mau.fi/whatsmeow v0.0.0-20240321175653-f77259f976a4
	github.com/go-redis/redis/v8 v8.11.5
	github.com/mattn/go-sqlite3 v1.14.22 // required for whatsmeow store
	google.golang.org/protobuf v1.33.0
)
