package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"

	"github.com/go-redis/redis/v8"
	"github.com/mattn/go-sqlite3" // needed for init
	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/store/sqlstore"
	"go.mau.fi/whatsmeow/types"
	"go.mau.fi/whatsmeow/types/events"
	waLog "go.mau.fi/whatsmeow/util/log"
)

var cli *whatsmeow.Client
var redisClient *redis.Client
var ctx = context.Background()

func eventHandler(evt interface{}) {
	switch v := evt.(type) {
	case *events.Message:
		// Se for broadcast ou status, ignora
		if v.Info.Category == "status" || v.Info.Category == "broadcast" {
			return
		}

		sender := v.Info.Sender.ToNonAD()
		isGroup := v.Info.IsGroup

		phone := sender.User
		
		// Ensure standard 55 formatting
		if !strings.HasPrefix(phone, "55") && len(phone) >= 10 {
			phone = "55" + phone
		}
		
		pushName := v.Info.PushName
		content := v.Message.GetConversation()
		if content == "" {
			content = v.Message.GetExtendedTextMessage().GetText()
		}

		groupName := ""
		if isGroup {
			groupInfo, err := cli.GetGroupInfo(v.Info.Chat)
			if err == nil {
				groupName = groupInfo.Name
			}
		}

		// Try to fetch profile picture
		avatarURL := ""
		pic, err := cli.GetProfilePictureInfo(sender, &whatsmeow.GetProfilePictureParams{})
		if err == nil && pic != nil {
			avatarURL = pic.URL
		}

		payload := map[string]interface{}{
			"type":      "message",
			"chatId":    v.Info.Chat.String(),
			"sender":    phone,
			"pushName":  pushName,
			"isGroup":   isGroup,
			"groupName": groupName,
			"avatar":    avatarURL,
			"content":   content,
			"timestamp": v.Info.Timestamp,
		}

		jsonData, _ := json.Marshal(payload)
		redisClient.Publish(ctx, "whatsapp_events", string(jsonData))

	case *events.Connected:
		fmt.Println("Connected to WhatsApp!")
		redisClient.Publish(ctx, "whatsapp_events", `{"type":"connected"}`)
	case *events.LoggedOut:
		fmt.Println("Logged out of WhatsApp!")
		redisClient.Publish(ctx, "whatsapp_events", `{"type":"logged_out"}`)
	}
}

func main() {
	// 1. Configurar Redis
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "redis:6379"
	}
	redisClient = redis.NewClient(&redis.Options{
		Addr: redisURL,
	})

	// 2. Configurar Whatsmeow
	dbLog := waLog.Stdout("Database", "DEBUG", true)
	container, err := sqlstore.New("sqlite3", "file:examplestore.db?_foreign_keys=on", dbLog)
	if err != nil {
		panic(err)
	}

	deviceStore, err := container.GetFirstDevice()
	if err != nil {
		panic(err)
	}

	clientLog := waLog.Stdout("Client", "DEBUG", true)
	cli = whatsmeow.NewClient(deviceStore, clientLog)
	cli.AddEventHandler(eventHandler)

	if cli.Store.ID == nil {
		qrChan, _ := cli.GetQRChannel(context.Background())
		err = cli.Connect()
		if err != nil {
			panic(err)
		}
		for evt := range qrChan {
			if evt.Event == "code" {
				fmt.Println("QR code:", evt.Code)
				// Publish QR Code to Redis so Node.js can read it
				payload := map[string]string{
					"type": "qr_code",
					"code": evt.Code,
				}
				jsonPayload, _ := json.Marshal(payload)
				redisClient.Publish(ctx, "whatsapp_events", string(jsonPayload))
			} else {
				fmt.Println("Login event:", evt.Event)
			}
		}
	} else {
		err = cli.Connect()
		if err != nil {
			panic(err)
		}
	}

	// 3. API Simples para checar validade do número e enviar mensagem
	http.HandleFunc("/validate", func(w http.ResponseWriter, r *http.Request) {
		number := r.URL.Query().Get("number")
		if number == "" {
			http.Error(w, "Number is required", http.StatusBadRequest)
			return
		}

		// Ensure JID format
		jid := types.NewJID(number, types.DefaultUserServer)
		
		// IsOnWhatsApp function call
		resp, err := cli.IsOnWhatsApp([]types.JID{jid})
		if err != nil || len(resp) == 0 {
			json.NewEncoder(w).Encode(map[string]interface{}{"valid": false})
			return
		}

		result := resp[0]
		json.NewEncoder(w).Encode(map[string]interface{}{
			"valid": result.IsIn,
			"jid":   result.JID.String(),
		})
	})

	// Iniciar servidor HTTP
	go func() {
		fmt.Println("API rodando na porta 8080")
		if err := http.ListenAndServe(":8080", nil); err != nil {
			log.Fatal(err)
		}
	}()

	// Graceful shutdown
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)
	<-c

	cli.Disconnect()
}
