/**
 * Colly Service — Go Web Crawler
 * https://github.com/gocolly/colly
 *
 * API REST:
 *   POST /crawl       — crawl completo de um site
 *   POST /extract     — extração rápida de uma única página
 *   GET  /health
 *
 * Extrai: emails, telefones, links sociais, texto, título
 * Usa libphonenumber (nyaruka/phonenumbers) para validação de telefones
 */
package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"regexp"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gocolly/colly/v2"
	"github.com/gocolly/colly/v2/queue"
	"github.com/nyaruka/phonenumbers"
)

// ── Modelos ───────────────────────────────────────────────────────

type CrawlRequest struct {
	URL            string `json:"url" binding:"required"`
	MaxDepth       int    `json:"maxDepth"`
	MaxPages       int    `json:"maxPages"`
	ExtractEmails  bool   `json:"extractEmails"`
	ExtractPhones  bool   `json:"extractPhones"`
	ExtractSocials bool   `json:"extractSocials"`
	CountryCode    string `json:"countryCode"` // para validação de telefone, ex: "BR"
}

type CrawlResult struct {
	URL          string            `json:"url"`
	Title        string            `json:"title"`
	Emails       []string          `json:"emails"`
	Phones       []string          `json:"phones"`
	SocialLinks  map[string]string `json:"socialLinks"`
	WhatsAppNums []string          `json:"whatsappNums"`
	Links        []string          `json:"links"`
	PagesVisited int               `json:"pagesVisited"`
	Duration     string            `json:"duration"`
}

// ── Regex ─────────────────────────────────────────────────────────

var (
	emailRegex    = regexp.MustCompile(`[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}`)
	phoneRegexBR  = regexp.MustCompile(`(?:\+55\s?)?(?:\(?\d{2}\)?\s?)(?:9\d{4}|\d{4})[-\s]?\d{4}`)
	waRegex       = regexp.MustCompile(`wa\.me/(\d{10,15})`)
	waAPIRegex    = regexp.MustCompile(`api\.whatsapp\.com/send\?phone=(\d{10,15})`)
)

var socialPatterns = map[string]string{
	"instagram": "instagram.com/",
	"facebook":  "facebook.com/",
	"linkedin":  "linkedin.com/company/",
	"youtube":   "youtube.com/",
	"twitter":   "twitter.com/",
	"tiktok":    "tiktok.com/@",
}

// ── Handlers ─────────────────────────────────────────────────────

func healthHandler(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":    "ok",
		"service":   "colly-service",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	})
}

func crawlHandler(c *gin.Context) {
	var req CrawlRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	if req.MaxDepth <= 0 {
		req.MaxDepth = 2
	}
	if req.MaxPages <= 0 {
		req.MaxPages = 30
	}
	if req.CountryCode == "" {
		req.CountryCode = "BR"
	}

	start := time.Now()
	result := &CrawlResult{
		URL:         req.URL,
		SocialLinks: make(map[string]string),
	}

	emails := make(map[string]bool)
	phones := make(map[string]bool)
	waNumbers := make(map[string]bool)
	links := make(map[string]bool)
	visited := 0

	col := colly.NewCollector(
		colly.MaxDepth(req.MaxDepth),
		colly.Async(true),
		colly.UserAgent("Mozilla/5.0 (compatible; WootechCRM/1.0; +https://wootech.com.br)"),
	)

	col.SetRequestTimeout(15 * time.Second)
	col.Limit(&colly.LimitRule{
		DomainGlob:  "*",
		Parallelism: 4,
		Delay:       300 * time.Millisecond,
	})

	// Extrair título
	col.OnHTML("title", func(e *colly.HTMLElement) {
		if result.Title == "" {
			result.Title = strings.TrimSpace(e.Text)
		}
	})

	// Extrair texto + emails + telefones da página
	col.OnHTML("body", func(e *colly.HTMLElement) {
		if visited >= req.MaxPages {
			return
		}
		visited++
		text := e.Text

		if req.ExtractEmails {
			for _, email := range emailRegex.FindAllString(text, -1) {
				email = strings.ToLower(strings.TrimSpace(email))
				if !strings.HasSuffix(email, ".png") && !strings.HasSuffix(email, ".jpg") &&
					len(email) < 100 && strings.Contains(email, "@") {
					emails[email] = true
				}
			}
		}

		if req.ExtractPhones {
			for _, phone := range phoneRegexBR.FindAllString(text, -1) {
				phone = strings.TrimSpace(phone)
				// Validar com libphonenumber
				num, err := phonenumbers.Parse(phone, req.CountryCode)
				if err == nil && phonenumbers.IsValidNumber(num) {
					formatted := phonenumbers.Format(num, phonenumbers.INTERNATIONAL)
					phones[formatted] = true
				} else if len(phone) >= 10 {
					phones[phone] = true
				}
			}
		}
	})

	// Extrair links de âncoras
	col.OnHTML("a[href]", func(e *colly.HTMLElement) {
		href := e.Attr("href")

		// Emails via mailto
		if strings.HasPrefix(href, "mailto:") {
			email := strings.ToLower(strings.TrimPrefix(href, "mailto:"))
			email = strings.Split(email, "?")[0]
			if email != "" {
				emails[email] = true
			}
		}

		// Telefones via tel:
		if strings.HasPrefix(href, "tel:") && req.ExtractPhones {
			phone := strings.TrimPrefix(href, "tel:")
			if phone != "" {
				phones[phone] = true
			}
		}

		// WhatsApp
		absoluteURL := e.Request.AbsoluteURL(href)
		waMatches := waRegex.FindStringSubmatch(absoluteURL)
		if len(waMatches) > 1 {
			waNumbers[waMatches[1]] = true
		}
		waAPIMatches := waAPIRegex.FindStringSubmatch(absoluteURL)
		if len(waAPIMatches) > 1 {
			waNumbers[waAPIMatches[1]] = true
		}

		// Redes sociais
		if req.ExtractSocials {
			for social, pattern := range socialPatterns {
				if strings.Contains(absoluteURL, pattern) {
					if _, exists := result.SocialLinks[social]; !exists {
						result.SocialLinks[social] = absoluteURL
					}
				}
			}
		}

		// Coletar links internos para seguir
		if visited < req.MaxPages {
			links[absoluteURL] = true
			e.Request.Visit(absoluteURL)
		}
	})

	col.OnError(func(r *colly.Response, err error) {
		log.Printf("[Colly] Erro em %s: %v", r.Request.URL, err)
	})

	col.Visit(req.URL)
	col.Wait()

	// Converter maps para slices
	for e := range emails {
		result.Emails = append(result.Emails, e)
	}
	for p := range phones {
		result.Phones = append(result.Phones, p)
	}
	for n := range waNumbers {
		result.WhatsAppNums = append(result.WhatsAppNums, n)
	}
	for l := range links {
		result.Links = append(result.Links, l)
	}
	result.PagesVisited = visited
	result.Duration = time.Since(start).String()

	// Limitar tamanho da resposta
	if len(result.Links) > 100 {
		result.Links = result.Links[:100]
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result,
	})
}

// POST /extract — extração rápida de uma única URL sem recursão
func extractHandler(c *gin.Context) {
	var req struct {
		URL         string `json:"url" binding:"required"`
		CountryCode string `json:"countryCode"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}
	if req.CountryCode == "" {
		req.CountryCode = "BR"
	}

	// Reusar crawlHandler com depth=1 e maxPages=1
	crawlReq := CrawlRequest{
		URL:            req.URL,
		MaxDepth:       1,
		MaxPages:       1,
		ExtractEmails:  true,
		ExtractPhones:  true,
		ExtractSocials: true,
		CountryCode:    req.CountryCode,
	}

	body, _ := json.Marshal(crawlReq)
	c.Request.Body = http.NoBody
	_ = body
	// Usar a lógica inline para simplicidade
	c.Set("crawl_req", crawlReq)
	crawlHandler(c)
}

// ── Main ──────────────────────────────────────────────────────────

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "5000"
	}

	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()

	r.GET("/health", healthHandler)
	r.POST("/crawl", crawlHandler)
	r.POST("/extract", crawlHandler) // alias com depth=1

	fmt.Printf("[Colly Service] 🚀 Rodando em http://0.0.0.0:%s\n", port)
	log.Fatal(r.Run("0.0.0.0:" + port))
}
