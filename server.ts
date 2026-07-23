import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { supabaseAdmin } from "./src/lib/supabase.js";
import { addScrapingJob, redisConnection } from "./src/lib/queue.js";
import "./src/lib/worker.js";
import { Server } from "socket.io";
import http from "http";
import aiOsRouter from "./src/routes/ai-os.js";
import aiOsToolsRouter from "./src/routes/aios-tools.js";
import hermesRouter from "./src/routes/hermes.js";
import jarvisRouter from "./src/routes/jarvis.js";
import createWhatsAppInstancesRouter from "./src/routes/whatsapp-instances.js";
import { initWebSocket } from "./src/lib/websocket-events.js";
import { runExecutionEngine } from "./src/lib/execution-engine.js";
import { loadProviderKeysFromDB } from "./src/lib/llm-router.js";
import axios from "axios";
import * as cheerio from "cheerio";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import multer from "multer";

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// ── URLs dos serviços internos ────────────────────────────────────
const SCRAPER_API_URL     = process.env.SCRAPER_API_URL     || "http://localhost:8000";
const BROWSERLESS_URL     = process.env.BROWSERLESS_URL     || "ws://localhost:3001";
const BROWSERLESS_TOKEN   = process.env.BROWSERLESS_TOKEN   || "wootech-token";
const FIRECRAWL_URL       = process.env.FIRECRAWL_URL       || "http://localhost:3002";
let firecrawlKeyIndex = 0;
function getFirecrawlApiKey() {
  const keys = (process.env.FIRECRAWL_API_KEY || "local").split(",").map(k => k.trim()).filter(Boolean);
  const key = keys[firecrawlKeyIndex % keys.length] || "local";
  firecrawlKeyIndex++;
  return key;
}
const UNSTRUCTURED_URL    = process.env.UNSTRUCTURED_URL    || "http://localhost:8003";
const CNPJ_SERVICE_URL    = process.env.CNPJ_SERVICE_URL    || "http://localhost:4000";
const COLLY_SERVICE_URL   = process.env.COLLY_SERVICE_URL   || "http://localhost:5000";
const WHATSAPP_API_URL    = process.env.WHATSAPP_BRIDGE_URL  || process.env.WHATSAPP_API_URL || "http://localhost:8091";
const BRIDGE_SECRET = process.env.WHATSAPP_BRIDGE_SECRET || '';
const bridgeHeaders: Record<string, string> = BRIDGE_SECRET ? { 'X-Bridge-Secret': BRIDGE_SECRET } : {};

// ── Redis Subscriber para o Whatsmeow (optional) ─────────────────
if (redisConnection) {
  try {
    const redisSubscriber = redisConnection.duplicate();
    redisSubscriber.subscribe("whatsapp_events", (err) => {
      if (err) console.error("Erro ao assinar canal Redis:", err);
    });
    redisSubscriber.on("message", (channel, message) => {
      if (channel === "whatsapp_events") {
        try {
          const data = JSON.parse(message);
          io.emit("whatsapp_event", data);
        } catch (e) {
          console.error("Erro no parse do Redis Message", e);
        }
      }
    });
  } catch {
    console.warn("[Server] Redis subscriber unavailable — WhatsApp events disabled");
  }
} else {
  console.warn("[Server] Redis not configured — WhatsApp events disabled");
}

io.on("connection", (socket) => {
  console.log("🟢 Cliente Frontend conectado via WebSocket:", socket.id);
  socket.on("disconnect", () => console.log("🔴 Cliente desconectado:", socket.id));
});

// Initialize AIOS WebSocket handler
initWebSocket(io);

// Start execution engine (runs every 5 minutes)
setInterval(runExecutionEngine, 5 * 60 * 1000);
console.log("🤖 AIOS Execution Engine started");

// Load LLM provider keys from Supabase DB
loadProviderKeysFromDB().then(() => {
  console.log("[LLM] Provider keys loaded from DB");
}).catch(() => {});

const PORT = parseInt(process.env.PORT || "3000");
app.use(express.json());

// ── Gemini AI Client ──────────────────────────────────────────────
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || "",
      httpOptions: { headers: { "User-Agent": "aistudio-build" } },
    });
  }
  return aiClient;
}

// =================================================================
// HEALTHCHECK
// =================================================================
app.get("/api/health", async (req, res) => {
  const checks: Record<string, string> = { crm: "ok" };

  const checkService = async (name: string, url: string) => {
    try {
      await axios.get(url, { timeout: 3000 });
      checks[name] = "ok";
    } catch {
      checks[name] = "offline";
    }
  };

  await Promise.allSettled([
    checkService("gosom",        `${SCRAPER_API_URL}/health`),
    checkService("firecrawl",    `${FIRECRAWL_URL}/health`),
    checkService("unstructured", `${UNSTRUCTURED_URL}/healthcheck`),
    checkService("cnpj",         `${CNPJ_SERVICE_URL}/health`),
    checkService("colly",        `${COLLY_SERVICE_URL}/health`),
    checkService("whatsapp",     `${WHATSAPP_API_URL}/health`),
    checkService("paperclip",    `${process.env.PAPERCLIP_URL || "http://localhost:4100"}/health`),
    checkService("hermes",       `${process.env.HERMES_URL || "http://localhost:8642"}/health`),
    checkService("jarvis",       `${process.env.JARVIS_URL || "http://localhost:8443"}/api/health`),
  ]);

  res.json({ status: "ok", service: "Wootech CRM Engine", services: checks, timestamp: new Date().toISOString() });
});

// =================================================================
// AI-BOS (Paperclip Agent Runtime)
// =================================================================
app.use("/api/ai-os", aiOsRouter);
app.use("/api/ai-os/tools", aiOsToolsRouter);
app.use("/api/ai-os/hermes", hermesRouter);
app.use("/api/ai-os/jarvis", jarvisRouter);

// =================================================================
// WHATSAPP MULTI-INSTANCE (Instances CRUD + Webhook + Service Links)
// =================================================================
app.use("/api/whatsapp/instances", createWhatsAppInstancesRouter(io));

// =================================================================
// SUPABASE PASSTHROUGH
// =================================================================
app.get("/api/companies", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from("companies").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =================================================================
// FERRAMENTA 1: GOOGLE MAPS SCRAPER (gosom)
// POST /api/scrape — adiciona job assíncrono na fila BullMQ
// =================================================================
app.post("/api/scrape", async (req, res) => {
  try {
    const { keyword, location, depth = 1 } = req.body;
    if (!keyword || !location) {
      return res.status(400).json({ success: false, error: "keyword e location são obrigatórios" });
    }
    const job = await addScrapingJob("google-maps-scrape", { keyword, location, depth });
    res.json({ success: true, message: "Job de scraping adicionado à fila", jobId: job.id });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/scrape/jobs/:id — status do job
app.get("/api/scrape/jobs/:id", async (req, res) => {
  try {
    const { scraperQueue } = await import("./src/lib/queue.js");
    const job = await scraperQueue.getJob(req.params.id);
    if (!job) return res.status(404).json({ success: false, error: "Job não encontrado" });
    const state = await job.getState();
    const progress = job.progress;
    res.json({ success: true, jobId: job.id, state, progress, data: job.data, returnValue: job.returnvalue });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =================================================================
// PROSPECÇÃO — Google Maps via gosom REST API (síncrono)
// POST /api/prospecting/gmb
// =================================================================
app.post("/api/prospecting/gmb", async (req, res) => {
  try {
    const { cidade, estado, categoria, palavraChave, depth = 1 } = req.body;
    const query = `${categoria || ""} ${palavraChave || ""} ${cidade || ""} ${estado || ""}`.trim();

    console.log(`🔎 Prospecção GMB: "${query}"`);

    // ── Integração com Serper.dev (Google Maps) ───────────────────
    let source = "serper.dev";
    let formattedResults: any[] = [];

    const apiKey = process.env.SERPER_API_KEY;
    
    if (!apiKey) {
      throw new Error("SERPER_API_KEY não está configurada no arquivo .env. Obtenha sua chave em https://serper.dev/api-keys e reinicie o servidor.");
    }

    try {
      console.log(`[Serper API] Buscando: ${query}`);
      const serperRes = await axios.post(
        "https://google.serper.dev/places",
        { q: query, gl: "br", hl: "pt-br" },
        { 
          headers: { 
            "X-API-KEY": apiKey, 
            "Content-Type": "application/json" 
          },
          timeout: 15000
        }
      );

      const places = serperRes.data.places || [];
      
      formattedResults = places.map((item: any, idx: number) => {
        return {
          googlePlaceId: item.cid || `serper_${idx}`,
          nomeEmpresa: (item.title || "Empresa").toUpperCase(),
          categoria: item.category || categoria || "Serviços",
          telefone: item.phoneNumber || "",
          website: item.website || "",
          endereco: item.address || `${cidade || ""}, ${estado || ""}`,
          cidade: cidade || "",
          estado: estado || "",
          lat: item.latitude || 0,
          lng: item.longitude || 0,
          rating: item.rating || 0,
          reviewsCount: item.ratingCount || 0,
          photos: [], // A API places do serper não traz photos array detalhado
          horarioFuncionamento: undefined,
          alreadyInCRM: false,
          source: "serper.dev",
        };
      });
      console.log(`[Serper API] Encontrados: ${formattedResults.length} locais.`);
    } catch (e: any) {
      console.error("Erro na API Serper:", e?.response?.data || e.message);
      throw new Error("Falha ao buscar empresas no Serper.dev: " + (e?.response?.data?.message || e.message));
    }

    res.json({
      success: true,
      source,
      query: { cidade, estado, categoria, palavraChave },
      totalResults: formattedResults.length,
      results: formattedResults,
    });
  } catch (err: any) {
    console.error("Erro na prospecção GMB:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =================================================================
// FERRAMENTA 6: CNPJ (via cnpj-service self-hosted)
// POST /api/enrichment/receita
// =================================================================
app.post("/api/enrichment/receita", async (req, res) => {
  try {
    const { cnpj } = req.body;
    const cleanCNPJ = cnpj?.replace(/\D/g, "");
    if (!cleanCNPJ || cleanCNPJ.length !== 14) {
      return res.status(400).json({ success: false, error: "CNPJ inválido" });
    }

    const cnpjRes = await axios.get(`${CNPJ_SERVICE_URL}/cnpj/${cleanCNPJ}`, { timeout: 15000 });
    if (cnpjRes.data?.success) {
      const d = cnpjRes.data.data;
      return res.json({
        success: true,
        source: cnpjRes.data.source,
        cached: cnpjRes.data.cached,
        data: {
          razaoSocial: d.razao_social,
          nomeFantasia: d.nome_fantasia || d.razao_social,
          cnpj,
          situacao: d.situacao,
          cnaePrincipal: d.cnae_principal,
          capitalSocial: d.capital_social,
          fundacao: d.data_abertura,
          porte: d.porte,
          naturezaJuridica: d.natureza_juridica,
          endereco: d.endereco,
          telefones: d.telefones || [],
          emails: [d.email].filter(Boolean),
          qsa: d.qsa || [],
          simples: d.simples,
          mei: d.mei,
        },
      });
    }

    res.status(502).json({ success: false, error: "CNPJ service não retornou dados" });
  } catch (err: any) {
    console.error("Erro CNPJ:", err?.message);
    // Fallback direto BrasilAPI
    try {
      const cleanCNPJ = req.body.cnpj?.replace(/\D/g, "");
      const bRes = await axios.get(`https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`, { timeout: 8000 });
      const d = bRes.data;
      return res.json({
        success: true,
        source: "brasilapi-direct",
        data: {
          razaoSocial: d.razao_social,
          nomeFantasia: d.nome_fantasia || d.razao_social,
          cnpj: req.body.cnpj,
          situacao: d.descricao_situacao_cadastral || "ATIVA",
          cnaePrincipal: { codigo: String(d.cnae_fiscal || ""), descricao: d.cnae_fiscal_descricao || "" },
          capitalSocial: d.capital_social || 0,
          fundacao: d.data_inicio_atividade || "",
          porte: d.porte || "EPP",
          naturezaJuridica: d.natureza_juridica || "",
          endereco: {
            logradouro: `${d.descricao_tipo_de_logradouro || ""} ${d.logradouro || ""}`.trim(),
            numero: d.numero || "S/N",
            bairro: d.bairro || "",
            municipio: d.municipio || "",
            uf: d.uf || "",
            cep: d.cep || "",
          },
          telefones: [d.ddd_telefone_1, d.ddd_telefone_2].filter(Boolean),
          emails: [d.email].filter(Boolean),
          qsa: (d.qsa || []).map((s: any) => ({ nome: s.nome_socio, qualificacao: s.qualificacao_socio })),
        },
      });
    } catch {
      res.status(500).json({ success: false, error: err.message });
    }
  }
});

// GET /api/enrichment/socios/:cnpj — Sócios (QSA) via cnpj-service
app.get("/api/enrichment/socios/:cnpj", async (req, res) => {
  try {
    const cnpj = req.params.cnpj.replace(/\D/g, "");
    const r = await axios.get(`${CNPJ_SERVICE_URL}/cnpj/${cnpj}/socios`, { timeout: 15000 });
    res.json(r.data);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =================================================================
// FERRAMENTAS 7+8+9+10: Website Enrichment
// Usa Firecrawl → Colly → Browserless+Playwright → fetch+Cheerio
// POST /api/enrichment/website
// =================================================================
app.post("/api/enrichment/website", async (req, res) => {
  try {
    const { website } = req.body;
    if (!website) return res.status(400).json({ success: false, error: "website é obrigatório" });

    console.log(`🕷️ Enriquecendo: ${website}`);

    // ── Tentar Firecrawl (mais completo) ─────────────────────────
    let emails: string[] = [];
    let phones: string[] = [];
    let whatsappLinks: string[] = [];
    let socialLinks: Record<string, string> = {};
    let techStack: Array<{ name: string; category: string }> = [];
    let source = "none";

    try {
      const fcRes = await axios.post(
        `${FIRECRAWL_URL}/v1/scrape`,
        {
          url: website,
          formats: ["html", "markdown"],
          actions: [],
          onlyMainContent: false,
          waitFor: 2000,
        },
        {
          headers: { Authorization: `Bearer ${getFirecrawlApiKey()}`, "Content-Type": "application/json" },
          timeout: 20000,
        }
      );

      if (fcRes.data?.success && (fcRes.data?.data?.html || fcRes.data?.data?.markdown)) {
        const html = fcRes.data.data.html || "";
        const $ = cheerio.load(html);

        // Emails
        const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
        emails = [...new Set([
          ...$("a[href^='mailto:']").map((_, el) => $(el).attr("href")?.replace("mailto:", "").split("?")[0] || "").toArray(),
          ...(html.match(emailRegex) || []),
        ])].filter(e => !e.endsWith(".png") && !e.endsWith(".jpg") && e.includes("@") && e.length < 100).slice(0, 10);

        // Phones
        $("a[href^='tel:']").each((_, el) => {
          const phone = $(el).attr("href")?.replace("tel:", "") || "";
          if (phone) phones.push(phone);
        });

        // WhatsApp
        $("a").each((_, el) => {
          const href = $(el).attr("href") || "";
          const waMatch = href.match(/wa\.me\/(\d{10,15})/);
          if (waMatch) whatsappLinks.push(href);
        });

        // Socials
        $("a[href]").each((_, el) => {
          const href = $(el).attr("href") || "";
          if (href.includes("instagram.com/") && !socialLinks.instagram) socialLinks.instagram = href;
          if ((href.includes("facebook.com/") || href.includes("fb.com/")) && !socialLinks.facebook) socialLinks.facebook = href;
          if (href.includes("linkedin.com/") && !socialLinks.linkedin) socialLinks.linkedin = href;
          if (href.includes("youtube.com/") && !socialLinks.youtube) socialLinks.youtube = href;
          if ((href.includes("twitter.com/") || href.includes("x.com/")) && !socialLinks.twitter) socialLinks.twitter = href;
          if (href.includes("tiktok.com/") && !socialLinks.tiktok) socialLinks.tiktok = href;
        });

        // Tech stack via Cheerio
        const techDetect = (pattern: string, name: string, cat: string) => {
          if (html.includes(pattern)) techStack.push({ name, category: cat });
        };
        techDetect("wp-content", "WordPress", "cms");
        techDetect("elementor", "Elementor", "cms");
        techDetect("cdn.shopify", "Shopify", "ecommerce");
        techDetect("wixsite", "Wix", "cms");
        techDetect("webflow", "Webflow", "cms");
        techDetect("squarespace", "Squarespace", "cms");
        techDetect("googletagmanager", "Google Tag Manager", "analytics");
        techDetect("fbevents.js", "Meta Pixel", "advertising");
        techDetect("gtag(", "Google Analytics 4", "analytics");
        techDetect("hotjar", "Hotjar", "analytics");
        techDetect("rdstation", "RD Station", "crm");
        techDetect("hubspot", "HubSpot", "crm");
        techDetect("intercom", "Intercom", "crm");
        techDetect("next.js", "Next.js", "framework");
        techDetect("nuxt", "Nuxt.js", "framework");

        techStack = [...new Map(techStack.map(t => [t.name, t])).values()];
        source = "firecrawl";
      }
    } catch (e: any) {
      console.warn("Firecrawl indisponível:", e?.message);
    }

    // ── Fallback: Colly Service ─────────────────────────────────
    if (emails.length === 0 && source === "none") {
      try {
        const collyRes = await axios.post(
          `${COLLY_SERVICE_URL}/crawl`,
          {
            url: website,
            maxDepth: 2,
            maxPages: 20,
            extractEmails: true,
            extractPhones: true,
            extractSocials: true,
            countryCode: "BR",
          },
          { timeout: 30000 }
        );
        if (collyRes.data?.success) {
          const d = collyRes.data.data;
          emails = d.emails || [];
          phones = d.phones || [];
          whatsappLinks = (d.whatsappNums || []).map((n: string) => `https://wa.me/${n}`);
          socialLinks = d.socialLinks || {};
          source = "colly";
        }
      } catch (e: any) {
        console.warn("Colly indisponível:", e?.message);
      }
    }

    // ── Fallback final: fetch simples + Cheerio ─────────────────
    if (emails.length === 0 && source === "none") {
      try {
        const fetchRes = await fetch(website, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; WootechCRM/1.0)" },
          signal: AbortSignal.timeout(8000),
        });
        if (fetchRes.ok) {
          const html = await fetchRes.text();
          const $ = cheerio.load(html);
          const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
          emails = [...new Set([
            ...$("a[href^='mailto:']").map((_, el) => $(el).attr("href")?.replace("mailto:", "").split("?")[0] || "").toArray(),
            ...(html.match(emailRegex) || []),
          ])].filter(e => !e.endsWith(".png") && e.includes("@")).slice(0, 10);

          $("a[href^='tel:']").each((_, el) => {
            const phone = $(el).attr("href")?.replace("tel:", "") || "";
            if (phone) phones.push(phone);
          });

          $("a").each((_, el) => {
            const href = $(el).attr("href") || "";
            if (href.includes("wa.me")) whatsappLinks.push(href);
            if (href.includes("instagram.com/")) socialLinks.instagram = href;
            if (href.includes("facebook.com/")) socialLinks.facebook = href;
            if (href.includes("linkedin.com/")) socialLinks.linkedin = href;
          });

          source = "cheerio-fetch";
        }
      } catch { /* ignore */ }
    }

    // Validar e formatar telefones com libphonenumber-js
    const validatedPhones = [...new Set(phones)].map(p => {
      try {
        const parsed = parsePhoneNumberFromString(p, "BR");
        return parsed?.isValid() ? parsed.formatInternational() : p;
      } catch { return p; }
    }).slice(0, 10);

    res.json({
      success: true,
      source,
      website,
      emails: [...new Set(emails)].slice(0, 10),
      phones: validatedPhones,
      whatsappLinks: [...new Set(whatsappLinks)].slice(0, 5),
      socialLinks,
      techStack,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =================================================================
// FERRAMENTA 12: FIRECRAWL — Crawl completo de site
// POST /api/enrichment/crawl
// =================================================================
app.post("/api/enrichment/crawl", async (req, res) => {
  try {
    const { url, maxDepth = 3 } = req.body;
    if (!url) return res.status(400).json({ success: false, error: "url é obrigatório" });

    const fcRes = await axios.post(
      `${FIRECRAWL_URL}/v1/crawl`,
      {
        url,
        limit: 50,
        maxDepth,
        scrapeOptions: { formats: ["markdown", "html"] },
      },
      {
        headers: { Authorization: `Bearer ${getFirecrawlApiKey()}`, "Content-Type": "application/json" },
        timeout: 10000,
      }
    );

    res.json({ success: true, jobId: fcRes.data?.jobId || fcRes.data?.id, data: fcRes.data });
  } catch (err: any) {
    res.status(502).json({ success: false, error: err.message });
  }
});

// GET /api/enrichment/crawl/:jobId — status do crawl
app.get("/api/enrichment/crawl/:jobId", async (req, res) => {
  try {
    const r = await axios.get(`${FIRECRAWL_URL}/v1/crawl/${req.params.jobId}`, {
      headers: { Authorization: `Bearer ${getFirecrawlApiKey()}` },
      timeout: 8000,
    });
    res.json(r.data);
  } catch (err: any) {
    res.status(502).json({ success: false, error: err.message });
  }
});

// =================================================================
// FERRAMENTA 11: UNSTRUCTURED — Extração de PDFs, DOCX, XLSX
// POST /api/enrichment/document
// =================================================================
app.post("/api/enrichment/document", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: "Arquivo é obrigatório" });

    const formData = new FormData();
    const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
    formData.append("files", blob, req.file.originalname);
    formData.append("strategy", "auto");
    formData.append("coordinates", "false");

    const response = await fetch(`${UNSTRUCTURED_URL}/general/v0/general`, {
      method: "POST",
      headers: { unstructured_api_key: process.env.UNSTRUCTURED_API_KEY || "local" },
      body: formData,
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      return res.status(502).json({ success: false, error: `Unstructured retornou ${response.status}` });
    }

    const elements: any[] = await response.json();

    // Extrair texto completo + emails + telefones
    const fullText = elements.map((e: any) => e.text || "").join("\n");
    const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
    const emails = [...new Set(fullText.match(emailRegex) || [])].slice(0, 20);

    res.json({
      success: true,
      filename: req.file.originalname,
      elements: elements.length,
      text: fullText.substring(0, 5000),
      emails,
      rawElements: elements.slice(0, 50),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =================================================================
// FERRAMENTA Whatsmeow: Validação de Números WhatsApp
// POST /api/whatsapp/validate-numbers
// =================================================================
app.post("/api/whatsapp/validate-numbers", async (req, res) => {
  try {
    const { numbers } = req.body;
    if (!Array.isArray(numbers) || numbers.length === 0) {
      return res.status(400).json({ success: false, error: "numbers deve ser um array" });
    }

    const results = await Promise.all(
      numbers.map(async (num: string) => {
        const cleaned = num.replace(/\D/g, "");
        const withCountry = cleaned.startsWith("55") ? cleaned : `55${cleaned}`;

        // Validar formato com libphonenumber-js
        let isValid = false;
        try {
          const parsed = parsePhoneNumberFromString(`+${withCountry}`, "BR");
          isValid = parsed?.isValid() || false;
        } catch { /* ignore */ }

        // Verificar no whatsapp-service (Go/Whatsmeow)
        let hasWhatsApp = false;
        let jid = "";
        let accountType = "unknown";

        try {
          const waRes = await axios.get(`${WHATSAPP_API_URL}/validate?number=${withCountry}`, { timeout: 10000, headers: bridgeHeaders });
          hasWhatsApp = waRes.data?.valid === true;
          jid = waRes.data?.jid || "";
          accountType = jid.includes("@g.us") ? "WhatsApp Group" : hasWhatsApp ? "WhatsApp" : "Não registrado";
        } catch {
          // WhatsApp service offline — deixar como não verificado
          accountType = "Não verificado (serviço offline)";
        }

        return {
          rawNumber: num,
          formattedNumber: `+${withCountry}`,
          isValidFormat: isValid,
          hasWhatsApp,
          jid: jid || undefined,
          accountType,
          verifiedAt: new Date().toISOString(),
        };
      })
    );

    res.json({ success: true, count: results.length, validated: results });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =================================================================
// COLLY: Crawl direto via colly-service
// POST /api/enrichment/colly-crawl
// =================================================================
app.post("/api/enrichment/colly-crawl", async (req, res) => {
  try {
    const { url, maxDepth = 2, maxPages = 30 } = req.body;
    if (!url) return res.status(400).json({ success: false, error: "url é obrigatório" });

    const r = await axios.post(
      `${COLLY_SERVICE_URL}/crawl`,
      { url, maxDepth, maxPages, extractEmails: true, extractPhones: true, extractSocials: true, countryCode: "BR" },
      { timeout: 45000 }
    );
    res.json(r.data);
  } catch (err: any) {
    res.status(502).json({ success: false, error: err.message });
  }
});

// =================================================================
// AI — Gemini Comercial
// POST /api/ai/generate
// =================================================================
app.post("/api/ai/generate", async (req, res) => {
  try {
    const { type, companyName, contactRole, niche, dealValue, notes, objectionText } = req.body;

    const systemPrompt = "Você é o assistente executivo de Inteligência Comercial do Wootech CRM. Responda em português do Brasil de forma extremamente persuasiva, objetiva e profissional para vendas B2B.";
    let userPrompt = "";

    if (type === "script") {
      userPrompt = `Crie um script de Cold Call telefônica de alta conversão para abordar a empresa "${companyName || "Empresa B2B"}" (Nicho: ${niche || "Geral"}). O interlocutor é o ${contactRole || "Decisor/Diretor"}. Destaque propostas de valor, gancho de abertura e pergunta de qualificação rápida.`;
    } else if (type === "email") {
      userPrompt = `Escreva um e-mail de prospecção fria (Cold Email B2B) curto (máximo 120 palavras) para a empresa "${companyName || "Empresa"}" no nicho de ${niche || "B2B"}. Assunto chamativo e Call to Action claro para agendar 15 min.`;
    } else if (type === "whatsapp") {
      userPrompt = `Crie uma mensagem amigável e direta de abordagem pelo WhatsApp para o ${contactRole || "Decisor"} da empresa "${companyName || "Empresa"}". Use formatação limpa do WhatsApp (negrito em palavras chave) com pergunta aberta ao final.`;
    } else if (type === "objection") {
      userPrompt = `O cliente disse: "${objectionText || "Está muito caro"}". Crie 3 respostas estratégicas de contorno de objeção comercial B2B baseadas em ROI e custo de oportunidade.`;
    } else if (type === "summary") {
      userPrompt = `Sintetize em 3 pontos estratégicos as oportunidades de venda para "${companyName}" (Nicho: ${niche}). Notas: ${notes || "Nenhuma"}. Apresente resumo executivo e sugestão de oferta.`;
    } else if (type === "score") {
      userPrompt = `Avalie o potencial comercial B2B para "${companyName}" com oportunidade de R$ ${dealValue || 10000}. Forneça pontuação de 0 a 100 e 3 justificativas resumidas.`;
    } else {
      userPrompt = `Forneça sugestões de ações comerciais B2B para "${companyName}".`;
    }

    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: userPrompt,
      config: { systemInstruction: systemPrompt, temperature: 0.7 },
    });

    res.json({ success: true, result: response.text || "Conteúdo gerado." });
  } catch (err: any) {
    console.error("Erro Gemini:", err);
    res.status(500).json({ success: false, error: err.message || "Falha ao gerar conteúdo.", fallback: "Verifique a chave de API Gemini nas configurações." });
  }
});

// =================================================================
// VITE MIDDLEWARE / PRODUCTION STATIC
// =================================================================
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Wootech CRM (WebSocket + Lead Stack) em http://0.0.0.0:${PORT}`);
    console.log(`   gosom:        ${SCRAPER_API_URL}`);
    console.log(`   browserless:  ${BROWSERLESS_URL}`);
    console.log(`   firecrawl:    ${FIRECRAWL_URL}`);
    console.log(`   unstructured: ${UNSTRUCTURED_URL}`);
    console.log(`   cnpj-service: ${CNPJ_SERVICE_URL}`);
    console.log(`   colly:        ${COLLY_SERVICE_URL}`);
    console.log(`   whatsapp:     ${WHATSAPP_API_URL}`);
  });
}

startServer();
