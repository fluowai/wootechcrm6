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
	"path/filepath"
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

// ─── Instance ───────────────────────────────────────────────────

type Instance struct {
	ID          string
	Client      *whatsmeow.Client
	Store       *sqlstore.Container
	DB          *sql.DB
	Status      string // connected, disconnected, connecting, qr_pending, logged_out
	CurrentQR   string
	Mu          sync.RWMutex
	WebhookURL  string
	CancelFn    context.CancelFunc
	PhoneNumber string
}

func (inst *Instance) GetPhoneNumber() string {
	inst.Mu.RLock()
	defer inst.Mu.RUnlock()
	if inst.Client != nil && inst.Client.Store != nil && inst.Client.Store.ID != nil {
		return inst.Client.Store.ID.User
	}
	return ""
}

func (inst *Instance) SetStatus(status string) {
	inst.Mu.Lock()
	defer inst.Mu.Unlock()
	inst.Status = status
}

func (inst *Instance) GetStatus() string {
	inst.Mu.RLock()
	defer inst.Mu.RUnlock()
	return inst.Status
}

func (inst *Instance) SetQR(qr string) {
	inst.Mu.Lock()
	defer inst.Mu.Unlock()
	inst.CurrentQR = qr
}

func (inst *Instance) GetQR() string {
	inst.Mu.RLock()
	defer inst.Mu.Unlock()
	return inst.CurrentQR
}

// ─── Manager ────────────────────────────────────────────────────

type Manager struct {
	instances map[string]*Instance
	mu        sync.RWMutex
	dataDir   string
	webhookURL string
}

func NewManager(dataDir, webhookURL string) *Manager {
	os.MkdirAll(dataDir, 0755)
	return &Manager{
		instances:  make(map[string]*Instance),
		dataDir:    dataDir,
		webhookURL: webhookURL,
	}
}

func (m *Manager) GetInstance(id string) *Instance {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.instances[id]
}

func (m *Manager) GetAllInstances() []*Instance {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var list []*Instance
	for _, inst := range m.instances {
		list = append(list, inst)
	}
	return list
}

func (m *Manager) CreateInstance(id string) *Instance {
	m.mu.Lock()
	defer m.mu.Unlock()

	if _, exists := m.instances[id]; exists {
		return m.instances[id]
	}

	instDir := filepath.Join(m.dataDir, id)
	os.MkdirAll(instDir, 0755)

	dbPath := filepath.Join(instDir, "store.db")
	dbLog := waLog.Stdout(fmt.Sprintf("DB-%s", id), "ERROR", true)

	db, err := sql.Open("sqlite", fmt.Sprintf("file:%s?_pragma=foreign_keys(1)", dbPath))
	if err != nil {
		log.Printf("[Manager] Failed to open DB for instance %s: %v", id, err)
		return nil
	}

	container := sqlstore.NewWithDB(db, "sqlite", dbLog)
	if err := container.Upgrade(context.Background()); err != nil {
		db.Close()
		log.Printf("[Manager] Failed to upgrade DB for instance %s: %v", id, err)
		return nil
	}

	inst := &Instance{
		ID:         id,
		Store:      container,
		DB:         db,
		Status:     "disconnected",
		WebhookURL: m.webhookURL,
	}

	m.instances[id] = inst
	log.Printf("[Manager] Instance %s created", id)
	return inst
}

func (m *Manager) RemoveInstance(id string) bool {
	m.mu.Lock()
	defer m.mu.Unlock()

	inst, exists := m.instances[id]
	if !exists {
		return false
	}

	if inst.Client != nil {
		inst.Client.Disconnect()
	}
	if inst.CancelFn != nil {
		inst.CancelFn()
	}
	if inst.DB != nil {
		inst.DB.Close()
	}

	delete(m.instances, id)
	log.Printf("[Manager] Instance %s removed", id)
	return true
}

func (m *Manager) ConnectInstance(id string) error {
	inst := m.GetInstance(id)
	if inst == nil {
		return fmt.Errorf("instance %s not found", id)
	}

	inst.Mu.Lock()
	defer inst.Mu.Unlock()

	if inst.Client != nil && inst.Client.Store != nil && inst.Client.Store.ID != nil {
		log.Printf("[Instance %s] Device found — reconnecting", id)
		inst.Status = "connecting"
		if err := inst.Client.Connect(); err != nil {
			inst.Status = "disconnected"
			return fmt.Errorf("connect failed: %w", err)
		}
		return nil
	}

	log.Printf("[Instance %s] No device — starting QR pairing", id)
	inst.Status = "qr_pending"

	clientLog := waLog.Stdout(fmt.Sprintf("Client-%s", id), "ERROR", true)
	deviceStore, err := inst.Store.GetFirstDevice(context.Background())
	if err != nil {
		inst.Status = "disconnected"
		return fmt.Errorf("get device: %w", err)
	}

	inst.Client = whatsmeow.NewClient(deviceStore, clientLog)
	inst.Client.AddEventHandler(m.makeEventHandler(id))

	qrChan, err := inst.Client.GetQRChannel(context.Background())
	if err != nil {
		inst.Status = "disconnected"
		return fmt.Errorf("qr channel: %w", err)
	}

	if err := inst.Client.Connect(); err != nil {
		inst.Status = "disconnected"
		return fmt.Errorf("connect: %w", err)
	}

	go func() {
		for evt := range qrChan {
			if evt.Event == "code" {
				log.Printf("[Instance %s] QR code received", id)
				inst.SetQR(evt.Code)
				inst.SetStatus("qr_pending")
				m.postWebhook(inst, EventPayload{
					Type:       "qr_code",
					InstanceID: id,
					Data:       evt.Code,
				})
			} else if evt.Event == "success" {
				log.Printf("[Instance %s] QR scan success", id)
			} else {
				log.Printf("[Instance %s] Login event: %s", id, evt.Event)
			}
		}
	}()

	return nil
}

func (m *Manager) DisconnectInstance(id string) error {
	inst := m.GetInstance(id)
	if inst == nil {
		return fmt.Errorf("instance %s not found", id)
	}

	inst.Mu.Lock()
	defer inst.Mu.Unlock()

	if inst.Client != nil {
		inst.Client.Disconnect()
	}
	inst.Status = "disconnected"
	inst.CurrentQR = ""

	return nil
}

func (m *Manager) makeEventHandler(instanceID string) func(interface{}) {
	return func(evt interface{}) {
		inst := m.GetInstance(instanceID)
		if inst == nil {
			return
		}

		ctx := context.Background()

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
			if v.Info.IsGroup && inst.Client != nil {
				groupInfo, err := inst.Client.GetGroupInfo(ctx, v.Info.Chat)
				if err == nil {
					groupName = groupInfo.Name
				}
			}

			avatarURL := ""
			if inst.Client != nil {
				pic, err := inst.Client.GetProfilePictureInfo(ctx, sender, &whatsmeow.GetProfilePictureParams{})
				if err == nil && pic != nil {
					avatarURL = pic.URL
				}
			}

			m.postWebhook(inst, EventPayload{
				Type:       "message",
				InstanceID: instanceID,
				ChatID:     v.Info.Chat.String(),
				Sender:     phone,
				PushName:   pushName,
				IsGroup:    v.Info.IsGroup,
				GroupName:  groupName,
				Avatar:     avatarURL,
				Content:    content,
				Timestamp:  v.Info.Timestamp,
			})

		case *events.Connected:
			log.Printf("[Instance %s] Connected", instanceID)
			inst.SetStatus("connected")
			inst.SetQR("")
			inst.PhoneNumber = inst.GetPhoneNumber()
			m.postWebhook(inst, EventPayload{
				Type:       "connected",
				InstanceID: instanceID,
			})

		case *events.LoggedOut:
			log.Printf("[Instance %s] Logged out", instanceID)
			inst.SetStatus("logged_out")
			inst.SetQR("")
			m.postWebhook(inst, EventPayload{
				Type:       "logged_out",
				InstanceID: instanceID,
			})

		case *events.Disconnected:
			log.Printf("[Instance %s] Disconnected", instanceID)
			inst.SetStatus("disconnected")
			m.postWebhook(inst, EventPayload{
				Type:       "disconnected",
				InstanceID: instanceID,
			})
		}
	}
}

// ─── Webhook ────────────────────────────────────────────────────

type EventPayload struct {
	Type       string      `json:"type"`
	InstanceID string      `json:"instanceId"`
	ChatID     string      `json:"chatId,omitempty"`
	Sender     string      `json:"sender,omitempty"`
	PushName   string      `json:"pushName,omitempty"`
	IsGroup    bool        `json:"isGroup,omitempty"`
	GroupName  string      `json:"groupName,omitempty"`
	Avatar     string      `json:"avatar,omitempty"`
	Content    string      `json:"content,omitempty"`
	Timestamp  time.Time   `json:"timestamp,omitempty"`
	Data       interface{} `json:"data,omitempty"`
}

func (m *Manager) postWebhook(inst *Instance, payload EventPayload) {
	url := inst.WebhookURL
	if url == "" {
		url = m.webhookURL
	}
	if url == "" {
		return
	}

	data, _ := json.Marshal(payload)
	go func() {
		client := &http.Client{Timeout: 5 * time.Second}
		resp, err := client.Post(url, "application/json", strings.NewReader(string(data)))
		if err != nil {
			log.Printf("[Webhook] Error for instance %s: %v", payload.InstanceID, err)
			return
		}
		resp.Body.Close()
	}()
}

// ─── HTTP Handlers ──────────────────────────────────────────────

func (m *Manager) handleListInstances(w http.ResponseWriter, r *http.Request) {
	instances := m.GetAllInstances()
	type instResp struct {
		ID          string `json:"id"`
		Status      string `json:"status"`
		PhoneNumber string `json:"phoneNumber"`
		HasQR       bool   `json:"hasQR"`
	}

	var list []instResp
	for _, inst := range instances {
		list = append(list, instResp{
			ID:          inst.ID,
			Status:      inst.GetStatus(),
			PhoneNumber: inst.GetPhoneNumber(),
			HasQR:       inst.GetQR() != "",
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":   true,
		"instances": list,
	})
}

func (m *Manager) handleCreateInstance(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		ID          string `json:"id"`
		Name        string `json:"name"`
		WebhookURL  string `json:"webhookUrl"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}
	if req.ID == "" {
		req.ID = fmt.Sprintf("inst-%d", time.Now().UnixMilli())
	}

	inst := m.CreateInstance(req.ID)
	if inst == nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": "failed to create instance"})
		return
	}

	if req.WebhookURL != "" {
		inst.WebhookURL = req.WebhookURL
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"instance": map[string]string{"id": inst.ID, "status": inst.GetStatus()},
	})
}

func (m *Manager) handleInstanceStatus(w http.ResponseWriter, r *http.Request) {
	id := extractInstanceID(r.URL.Path, "/instances/", "/status")
	inst := m.GetInstance(id)
	if inst == nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": "instance not found"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":     true,
		"id":          inst.ID,
		"status":      inst.GetStatus(),
		"connected":   inst.GetStatus() == "connected",
		"hasQR":       inst.GetQR() != "",
		"phoneNumber": inst.GetPhoneNumber(),
	})
}

func (m *Manager) handleInstanceQR(w http.ResponseWriter, r *http.Request) {
	id := extractInstanceID(r.URL.Path, "/instances/", "/qr")
	inst := m.GetInstance(id)
	if inst == nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": "instance not found"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"qr":      inst.GetQR(),
		"status":  inst.GetStatus(),
	})
}

func (m *Manager) handleConnect(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	id := extractInstanceID(r.URL.Path, "/instances/", "/connect")
	if err := m.ConnectInstance(id); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": err.Error()})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "status": m.GetInstance(id).GetStatus()})
}

func (m *Manager) handleDisconnect(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	id := extractInstanceID(r.URL.Path, "/instances/", "/disconnect")
	if err := m.DisconnectInstance(id); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": err.Error()})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true})
}

func (m *Manager) handleReconnect(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	id := extractInstanceID(r.URL.Path, "/instances/", "/reconnect")

	_ = m.DisconnectInstance(id)
	time.Sleep(500 * time.Millisecond)

	if err := m.ConnectInstance(id); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": err.Error()})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "status": m.GetInstance(id).GetStatus()})
}

func (m *Manager) handleDelete(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	id := extractInstanceID(r.URL.Path, "/instances/", "")
	if id == "" {
		http.Error(w, "Instance ID required", http.StatusBadRequest)
		return
	}

	if !m.RemoveInstance(id) {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": "instance not found"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true})
}

func (m *Manager) handleSend(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	id := extractInstanceID(r.URL.Path, "/instances/", "/send")
	inst := m.GetInstance(id)
	if inst == nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": "instance not found"})
		return
	}

	if inst.GetStatus() != "connected" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": "instance not connected"})
		return
	}

	var req struct {
		To      string `json:"to"`
		Message string `json:"message"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}
	if req.To == "" || req.Message == "" {
		http.Error(w, "to and message are required", http.StatusBadRequest)
		return
	}

	to := normalizePhone(req.To)
	jid := types.JID{User: to, Server: types.DefaultUserServer}

	msg := &waProto.Message{Conversation: &req.Message}

	_, err := inst.Client.SendMessage(context.Background(), jid, msg)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": err.Error()})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "to": to})
}

func (m *Manager) handleValidate(w http.ResponseWriter, r *http.Request) {
	id := extractInstanceID(r.URL.Path, "/instances/", "/validate")
	inst := m.GetInstance(id)
	if inst == nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": "instance not found"})
		return
	}

	number := r.URL.Query().Get("number")
	if number == "" {
		http.Error(w, "Number is required", http.StatusBadRequest)
		return
	}

	resp, err := inst.Client.IsOnWhatsApp(context.Background(), []string{number})
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
}

func (m *Manager) handleAutoConnect(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	m.mu.RLock()
	var toConnect []string
	for id, inst := range m.instances {
		if inst.GetStatus() == "disconnected" || inst.GetStatus() == "logged_out" {
			toConnect = append(toConnect, id)
		}
	}
	m.mu.RUnlock()

	results := make(map[string]string)
	for _, id := range toConnect {
		if err := m.ConnectInstance(id); err != nil {
			results[id] = err.Error()
		} else {
			results[id] = "connecting"
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "reconnecting": results})
}

// ─── Helpers ────────────────────────────────────────────────────

func extractInstanceID(path, prefix, suffix string) string {
	s := strings.TrimPrefix(path, prefix)
	if suffix != "" {
		s = strings.TrimSuffix(s, suffix)
	}
	s = strings.Trim(s, "/")
	return s
}

func normalizePhone(phone string) string {
	s := strings.ReplaceAll(phone, "+", "")
	s = strings.ReplaceAll(s, " ", "")
	s = strings.ReplaceAll(s, "-", "")
	s = strings.ReplaceAll(s, "(", "")
	s = strings.ReplaceAll(s, ")", "")
	if !strings.HasPrefix(s, "55") && len(s) >= 10 {
		s = "55" + s
	}
	return s
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

// ─── Router ─────────────────────────────────────────────────────

func (m *Manager) SetupRoutes() http.Handler {
	mux := http.NewServeMux()

	// ── Legacy routes (backward compat, first instance) ──
	mux.HandleFunc("/status", func(w http.ResponseWriter, r *http.Request) {
		m.mu.RLock()
		var first *Instance
		for _, inst := range m.instances {
			first = inst
			break
		}
		m.mu.RUnlock()

		if first == nil {
			writeJSON(w, 200, map[string]interface{}{
				"connected": false, "status": "no_instances", "hasQR": false, "phoneNumber": "",
			})
			return
		}
		writeJSON(w, 200, map[string]interface{}{
			"connected":   first.GetStatus() == "connected",
			"status":      first.GetStatus(),
			"hasQR":       first.GetQR() != "",
			"phoneNumber": first.GetPhoneNumber(),
		})
	})

	mux.HandleFunc("/qr", func(w http.ResponseWriter, r *http.Request) {
		m.mu.RLock()
		var first *Instance
		for _, inst := range m.instances {
			first = inst
			break
		}
		m.mu.RUnlock()

		if first == nil {
			writeJSON(w, 200, map[string]interface{}{"qr": "", "status": "no_instances"})
			return
		}
		writeJSON(w, 200, map[string]interface{}{
			"qr":     first.GetQR(),
			"status": first.GetStatus(),
		})
	})

	mux.HandleFunc("/send", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		m.mu.RLock()
		var first *Instance
		for _, inst := range m.instances {
			if inst.GetStatus() == "connected" {
				first = inst
				break
			}
		}
		m.mu.RUnlock()

		if first == nil {
			writeJSON(w, 400, map[string]interface{}{"success": false, "error": "no connected instance"})
			return
		}

		// Re-route to instance send
		r.URL.Path = "/instances/" + first.ID + "/send"
		m.handleSend(w, r)
	})

	mux.HandleFunc("/validate", func(w http.ResponseWriter, r *http.Request) {
		m.mu.RLock()
		var first *Instance
		for _, inst := range m.instances {
			if inst.GetStatus() == "connected" {
				first = inst
				break
			}
		}
		m.mu.RUnlock()

		if first == nil {
			writeJSON(w, 400, map[string]interface{}{"valid": false, "error": "no connected instance"})
			return
		}

		r.URL.Path = "/instances/" + first.ID + "/validate"
		m.handleValidate(w, r)
	})

	mux.HandleFunc("/disconnect", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		m.mu.RLock()
		var first *Instance
		for _, inst := range m.instances {
			first = inst
			break
		}
		m.mu.RUnlock()

		if first == nil {
			writeJSON(w, 404, map[string]interface{}{"success": false, "error": "no instance"})
			return
		}

		r.URL.Path = "/instances/" + first.ID + "/disconnect"
		m.handleDisconnect(w, r)
	})

	// ── Multi-instance routes ──
	mux.HandleFunc("/instances", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			m.handleListInstances(w, r)
		case http.MethodPost:
			m.handleCreateInstance(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	mux.HandleFunc("/instances/", func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/instances/")
		parts := strings.Split(path, "/")

		if len(parts) == 0 || parts[0] == "" {
			m.handleListInstances(w, r)
			return
		}

		if len(parts) == 1 {
			// /instances/:id → DELETE to remove
			if r.Method == http.MethodDelete {
				m.handleDelete(w, r)
			} else {
				m.handleInstanceStatus(w, r)
			}
			return
		}

		action := parts[1]
		switch action {
		case "status":
			m.handleInstanceStatus(w, r)
		case "qr":
			m.handleInstanceQR(w, r)
		case "connect":
			m.handleConnect(w, r)
		case "disconnect":
			m.handleDisconnect(w, r)
		case "reconnect":
			m.handleReconnect(w, r)
		case "send":
			m.handleSend(w, r)
		case "validate":
			m.handleValidate(w, r)
		default:
			http.Error(w, "Not found", http.StatusNotFound)
		}
	})

	// ── Bulk operations ──
	mux.HandleFunc("/instances/reconnect-all", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		m.handleAutoConnect(w, r)
	})

	// ── Health ──
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		m.mu.RLock()
		count := len(m.instances)
		connected := 0
		for _, inst := range m.instances {
			if inst.GetStatus() == "connected" {
				connected++
			}
		}
		m.mu.RUnlock()

		writeJSON(w, 200, map[string]interface{}{
			"status":    "ok",
			"instances": count,
			"connected": connected,
			"timestamp": time.Now().UTC(),
		})
	})

	return mux
}

// ─── Main ───────────────────────────────────────────────────────

func main() {
	webhookURL := os.Getenv("WEBHOOK_URL")
	if webhookURL == "" {
		webhookURL = "http://localhost:3000/api/whatsapp/webhook"
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	dataDir := os.Getenv("DATA_DIR")
	if dataDir == "" {
		dataDir = "./instances"
	}

	mgr := NewManager(dataDir, webhookURL)
	handler := mgr.SetupRoutes()

	// Auto-load existing instances from data directory
	entries, err := os.ReadDir(dataDir)
	if err == nil {
		for _, entry := range entries {
			if entry.IsDir() {
				id := entry.Name()
				storePath := filepath.Join(dataDir, id, "store.db")
				if _, err := os.Stat(storePath); err == nil {
					log.Printf("[Main] Auto-loading instance: %s", id)
					inst := mgr.CreateInstance(id)
					if inst != nil {
						go func(instID string) {
							time.Sleep(1 * time.Second)
							if err := mgr.ConnectInstance(instID); err != nil {
								log.Printf("[Main] Auto-connect failed for %s: %v", instID, err)
							}
						}(id)
					}
				}
			}
		}
	}

	// Start server
	go func() {
		fmt.Printf("WhatsApp Multi-Instance API running on port %s\n", port)
		fmt.Printf("  Data dir: %s\n", dataDir)
		fmt.Printf("  Webhook:  %s\n", webhookURL)
		if err := http.ListenAndServe(":"+port, handler); err != nil {
			log.Fatal(err)
		}
	}()

	// Graceful shutdown
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)
	<-c

	fmt.Println("\nShutting down all instances...")
	mgr.mu.RLock()
	for id, inst := range mgr.instances {
		log.Printf("Disconnecting instance %s...", id)
		inst.Client.Disconnect()
	}
	mgr.mu.RUnlock()
	fmt.Println("All instances disconnected.")
}
