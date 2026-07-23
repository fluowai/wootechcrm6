package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"sync"
	"syscall"
	"time"

	"go.mau.fi/whatsmeow"
	waProto "go.mau.fi/whatsmeow/binary/proto"
	"go.mau.fi/whatsmeow/store/sqlstore"
	"go.mau.fi/whatsmeow/types"
	"go.mau.fi/whatsmeow/types/events"
	waLog "go.mau.fi/whatsmeow/util/log"
	_ "modernc.org/sqlite"
)

var cli *whatsmeow.Client
var ctx = context.Background()

// In-memory store for QR and status
var (
	mu            sync.RWMutex
	currentQR     string
	connStatus    = "disconnected"
	webhookURL    string
	pendingMsgs   = make(map[string]chan bool)
)

type EventPayload struct {
	Type      string      `json:"type"`
	ChatID    string      `json:"chatId,omitempty"`
	Sender    string      `json:"sender,omitempty"`
	PushName  string      `json:"pushName,omitempty"`
	IsGroup   bool        `json:"isGroup,omitempty"`
	GroupName string      `json:"groupName,omitempty"`
	Avatar    string      `json:"avatar,omitempty"`
	Content   string      `json:"content,omitempty"`
	Timestamp time.Time   `json:"timestamp,omitempty"`
	Data      interface{} `json:"data,omitempty"`
}

func postWebhook(payload EventPayload) {
	if webhookURL == "" {
		return
	}
	data, _ := json.Marshal(payload)
	go func() {
		client := &http.Client{Timeout: 5 * time.Second}
		resp, err := client.Post(webhookURL, "application/json", strings.NewReader(string(data)))
		if err != nil {
			fmt.Printf("[Webhook] Error: %v\n", err)
			return
		}
		resp.Body.Close()
	}()
}

func eventHandler(evt interface{}) {
	switch v := evt.(type) {
	case *events.Message:
		if v.Info.Category == "status" || v.Info.Category == "broadcast" {
			return
		}

		sender := v.Info.Sender.ToNonAD()
		phone := sender.User

		if !strings.HasPrefix(phone, "55") && len(phone) >= 10 {
			phone = "55" + phone
		}

		pushName := v.Info.PushName
		content := v.Message.GetConversation()
		if content == "" {
			content = v.Message.GetExtendedTextMessage().GetText()
		}

		groupName := ""
		if v.Info.IsGroup {
			groupInfo, err := cli.GetGroupInfo(ctx, v.Info.Chat)
			if err == nil {
				groupName = groupInfo.Name
			}
		}

		avatarURL := ""
		pic, err := cli.GetProfilePictureInfo(ctx, sender, &whatsmeow.GetProfilePictureParams{})
		if err == nil && pic != nil {
			avatarURL = pic.URL
		}

		postWebhook(EventPayload{
			Type:      "message",
			ChatID:    v.Info.Chat.String(),
			Sender:    phone,
			PushName:  pushName,
			IsGroup:   v.Info.IsGroup,
			GroupName: groupName,
			Avatar:    avatarURL,
			Content:   content,
			Timestamp: v.Info.Timestamp,
		})

	case *events.Connected:
		fmt.Println("Connected to WhatsApp!")
		mu.Lock()
		connStatus = "connected"
		mu.Unlock()
		postWebhook(EventPayload{Type: "connected"})

	case *events.LoggedOut:
		fmt.Println("Logged out of WhatsApp!")
		mu.Lock()
		connStatus = "logged_out"
		currentQR = ""
		mu.Unlock()
		postWebhook(EventPayload{Type: "logged_out"})

	case *events.Disconnected:
		fmt.Println("Disconnected from WhatsApp!")
		mu.Lock()
		connStatus = "disconnected"
		mu.Unlock()
		postWebhook(EventPayload{Type: "disconnected"})
	}
}

func main() {
	// 1. Config
	webhookURL = os.Getenv("WEBHOOK_URL")
	if webhookURL == "" {
		webhookURL = "http://localhost:3010/api/whatsapp/webhook"
	}
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// 2. Setup whatsmeow with pure-Go SQLite
	dbLog := waLog.Stdout("Database", "DEBUG", true)

	// Open database with modernc sqlite driver
	// Use _pragma=foreign_keys(1) to enable FK at connection level
	db, err := sql.Open("sqlite", "file:whatsapp-store.db?_pragma=foreign_keys(1)")
	if err != nil {
		panic(fmt.Sprintf("Failed to open SQLite database: %v", err))
	}

	container := sqlstore.NewWithDB(db, "sqlite", dbLog)

	// Run schema upgrades (creates tables if needed)
	err = container.Upgrade(ctx)
	if err != nil {
		db.Close()
		panic(fmt.Sprintf("Failed to upgrade database: %v", err))
	}
	if err != nil {
		panic(fmt.Sprintf("Failed to open SQLite store: %v", err))
	}

	deviceStore, err := container.GetFirstDevice(ctx)
	if err != nil {
		panic(fmt.Sprintf("Failed to get device: %v", err))
	}

	clientLog := waLog.Stdout("Client", "DEBUG", true)
	cli = whatsmeow.NewClient(deviceStore, clientLog)
	cli.AddEventHandler(eventHandler)

	// 3. Connect
	if cli.Store.ID == nil {
		fmt.Println("No device found — need QR code pairing")
		mu.Lock()
		connStatus = "pairing"
		mu.Unlock()

		qrChan, _ := cli.GetQRChannel(ctx)
		err = cli.Connect()
		if err != nil {
			panic(fmt.Sprintf("Failed to connect: %v", err))
		}
		go func() {
			for evt := range qrChan {
				if evt.Event == "code" {
					fmt.Println("QR code received")
					mu.Lock()
					currentQR = evt.Code
					mu.Unlock()
					postWebhook(EventPayload{
						Type: "qr_code",
						Data: evt.Code,
					})
				} else {
					fmt.Printf("Login event: %s\n", evt.Event)
				}
			}
		}()
	} else {
		fmt.Println("Device found — connecting directly")
		err = cli.Connect()
		if err != nil {
			panic(fmt.Sprintf("Failed to connect: %v", err))
		}
	}

	// 4. HTTP API
	http.HandleFunc("/status", func(w http.ResponseWriter, r *http.Request) {
		mu.RLock()
		defer mu.RUnlock()
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"connected":   connStatus == "connected",
			"status":      connStatus,
			"hasQR":       currentQR != "",
			"phoneNumber": getPhoneNumber(),
		})
	})

	http.HandleFunc("/qr", func(w http.ResponseWriter, r *http.Request) {
		mu.RLock()
		defer mu.RUnlock()
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"qr":   currentQR,
			"status": connStatus,
		})
	})

	http.HandleFunc("/send", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req struct {
			To      string `json:"to"`
			Message string `json:"message"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}
		if req.To == "" || req.Message == "" {
			http.Error(w, "to and message are required", http.StatusBadRequest)
			return
		}

		// Format JID
		to := strings.ReplaceAll(req.To, "+", "")
		to = strings.ReplaceAll(to, " ", "")
		to = strings.ReplaceAll(to, "-", "")
		if !strings.HasPrefix(to, "55") {
			to = "55" + to
		}
		jid := types.JID{
			User:   to,
			Server: types.DefaultUserServer,
		}

		msg := &waProto.Message{
			Conversation: &req.Message,
		}

		_, err := cli.SendMessage(ctx, jid, msg)
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"success": false,
				"error":   err.Error(),
			})
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"to":      to,
		})
	})

	http.HandleFunc("/validate", func(w http.ResponseWriter, r *http.Request) {
		number := r.URL.Query().Get("number")
		if number == "" {
			http.Error(w, "Number is required", http.StatusBadRequest)
			return
		}

		resp, err := cli.IsOnWhatsApp(ctx, []string{number})
		if err != nil || len(resp) == 0 {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{"valid": false})
			return
		}

		result := resp[0]
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"valid": result.IsIn,
			"jid":   result.JID.String(),
		})
	})

	http.HandleFunc("/disconnect", func(w http.ResponseWriter, r *http.Request) {
		cli.Disconnect()
		mu.Lock()
		connStatus = "disconnected"
		currentQR = ""
		mu.Unlock()
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{"success": true})
	})

	// 5. Start server
	go func() {
		fmt.Printf("WhatsApp API running on port %s\n", port)
		if err := http.ListenAndServe(":"+port, nil); err != nil {
			log.Fatal(err)
		}
	}()

	// 6. Graceful shutdown
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)
	<-c

	fmt.Println("Shutting down...")
	cli.Disconnect()
}

func getPhoneNumber() string {
	if cli.Store.ID != nil {
		return cli.Store.ID.User
	}
	return ""
}
