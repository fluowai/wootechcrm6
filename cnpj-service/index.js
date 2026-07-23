/**
 * CNPJ Service — Receita Federal Self-Hosted
 * Fonte primária: BrasilAPI (https://brasilapi.com.br)
 * Fonte secundária: CNPJ.ws (https://cnpj.ws)
 * Cache: PostgreSQL local (TTL 7 dias) + Redis (TTL 24h)
 *
 * Rotas:
 *   GET  /health
 *   GET  /cnpj/:cnpj              — dados completos da empresa
 *   GET  /cnpj/:cnpj/socios       — quadro societário (QSA)
 *   GET  /cnpj/:cnpj/cnaes        — CNAEs principal + secundários
 *   POST /cnpj/batch              — busca em lote (array de CNPJs)
 *   GET  /cnpj/search?nome=       — busca por nome fantasia (cache local)
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { Pool } = require('pg');
const Redis = require('ioredis');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const DATABASE_URL = process.env.DATABASE_URL;

// ── Clientes ────────────────────────────────────────────────────
const redis = new Redis(REDIS_URL, { maxRetriesPerRequest: null, lazyConnect: true });
redis.connect().catch(() => console.warn('[CNPJ] Redis não disponível — sem cache Redis'));

const pg = DATABASE_URL
  ? new Pool({ connectionString: DATABASE_URL, max: 5, idleTimeoutMillis: 30000 })
  : null;

// ── Inicializar tabela de cache ──────────────────────────────────
async function initDB() {
  if (!pg) return;
  try {
    await pg.query(`
      CREATE TABLE IF NOT EXISTS cnpj_cache (
        cnpj        VARCHAR(14) PRIMARY KEY,
        data        JSONB NOT NULL,
        source      VARCHAR(50),
        fetched_at  TIMESTAMPTZ DEFAULT NOW(),
        expires_at  TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
      );
      CREATE INDEX IF NOT EXISTS idx_cnpj_cache_expires ON cnpj_cache (expires_at);
      CREATE INDEX IF NOT EXISTS idx_cnpj_cache_nome ON cnpj_cache ((data->>'nome_fantasia'));
    `);
    console.log('[CNPJ] Tabela cnpj_cache pronta.');
  } catch (e) {
    console.warn('[CNPJ] Erro ao criar tabela cache:', e.message);
  }
}

// ── Cache helpers ────────────────────────────────────────────────
async function getFromCache(cnpj) {
  // 1. Redis (rápido)
  try {
    const cached = await redis.get(`cnpj:${cnpj}`);
    if (cached) return { data: JSON.parse(cached), source: 'redis' };
  } catch { /* ignore */ }

  // 2. PostgreSQL (persistente)
  if (pg) {
    try {
      const res = await pg.query(
        'SELECT data, source FROM cnpj_cache WHERE cnpj = $1 AND expires_at > NOW()',
        [cnpj]
      );
      if (res.rows.length > 0) {
        // Re-popular Redis
        try { await redis.setex(`cnpj:${cnpj}`, 86400, JSON.stringify(res.rows[0].data)); } catch { }
        return { data: res.rows[0].data, source: `pg:${res.rows[0].source}` };
      }
    } catch { /* ignore */ }
  }

  return null;
}

async function saveToCache(cnpj, data, source) {
  try { await redis.setex(`cnpj:${cnpj}`, 86400, JSON.stringify(data)); } catch { }
  if (pg) {
    try {
      await pg.query(
        `INSERT INTO cnpj_cache (cnpj, data, source, fetched_at, expires_at)
         VALUES ($1, $2, $3, NOW(), NOW() + INTERVAL '7 days')
         ON CONFLICT (cnpj) DO UPDATE
         SET data = EXCLUDED.data, source = EXCLUDED.source,
             fetched_at = NOW(), expires_at = NOW() + INTERVAL '7 days'`,
        [cnpj, JSON.stringify(data), source]
      );
    } catch { /* ignore */ }
  }
}

// ── Fontes externas ──────────────────────────────────────────────
const SOURCES = [
  {
    name: 'brasilapi',
    fetch: async (cnpj) => {
      const r = await axios.get(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, { timeout: 8000 });
      return normalizeBrasilAPI(r.data);
    },
  },
  {
    name: 'cnpjws',
    fetch: async (cnpj) => {
      const r = await axios.get(`https://publica.cnpj.ws/cnpj/${cnpj}`, { timeout: 8000 });
      return normalizeCNPJws(r.data);
    },
  },
  {
    name: 'receitaws',
    fetch: async (cnpj) => {
      const r = await axios.get(`https://www.receitaws.com.br/v1/cnpj/${cnpj}`, { timeout: 8000 });
      return normalizeReceitaWS(r.data);
    },
  },
];

function normalizeBrasilAPI(d) {
  return {
    cnpj: d.cnpj,
    razao_social: d.razao_social,
    nome_fantasia: d.nome_fantasia || d.razao_social,
    situacao: d.descricao_situacao_cadastral || 'ATIVA',
    porte: d.porte || 'EPP',
    natureza_juridica: d.natureza_juridica,
    capital_social: d.capital_social || 0,
    data_abertura: d.data_inicio_atividade,
    cnae_principal: {
      codigo: String(d.cnae_fiscal || ''),
      descricao: d.cnae_fiscal_descricao || '',
    },
    cnaes_secundarios: (d.cnaes_secundarios || []).map(c => ({
      codigo: String(c.codigo),
      descricao: c.descricao,
    })),
    endereco: {
      logradouro: `${d.descricao_tipo_de_logradouro || ''} ${d.logradouro || ''}`.trim(),
      numero: d.numero || 'S/N',
      complemento: d.complemento || '',
      bairro: d.bairro || '',
      municipio: d.municipio || '',
      uf: d.uf || '',
      cep: d.cep || '',
    },
    telefones: [d.ddd_telefone_1, d.ddd_telefone_2].filter(Boolean),
    email: d.email || '',
    qsa: (d.qsa || []).map(s => ({
      nome: s.nome_socio,
      qualificacao: s.qualificacao_socio,
      cpf_cnpj_socio: s.cpf_cnpj_socio || '',
      pais: s.pais || 'Brasil',
    })),
    simples: d.opcao_pelo_simples || false,
    mei: d.opcao_pelo_mei || false,
    _source: 'brasilapi',
  };
}

function normalizeCNPJws(d) {
  const est = d.estabelecimento || {};
  return {
    cnpj: d.cnpj_raiz,
    razao_social: d.razao_social,
    nome_fantasia: est.nome_fantasia || d.razao_social,
    situacao: est.situacao_cadastral?.descricao || 'ATIVA',
    porte: d.porte?.descricao || 'EPP',
    natureza_juridica: d.natureza_juridica?.descricao || '',
    capital_social: parseFloat(d.capital_social || '0'),
    data_abertura: est.data_inicio_atividade || '',
    cnae_principal: {
      codigo: est.atividade_principal?.subclasse || '',
      descricao: est.atividade_principal?.descricao || '',
    },
    cnaes_secundarios: (est.atividades_secundarias || []).map(c => ({
      codigo: c.subclasse,
      descricao: c.descricao,
    })),
    endereco: {
      logradouro: `${est.tipo_logradouro || ''} ${est.logradouro || ''}`.trim(),
      numero: est.numero || 'S/N',
      complemento: est.complemento || '',
      bairro: est.bairro || '',
      municipio: est.municipio?.descricao || '',
      uf: est.estado?.sigla || '',
      cep: est.cep || '',
    },
    telefones: [est.ddd1 && est.telefone1 ? `(${est.ddd1}) ${est.telefone1}` : null].filter(Boolean),
    email: est.email || '',
    qsa: (d.socios || []).map(s => ({
      nome: s.nome,
      qualificacao: s.qualificacao_socio?.descricao || '',
      cpf_cnpj_socio: s.cpf_cnpj_socio || '',
      pais: s.pais?.descricao || 'Brasil',
    })),
    simples: false,
    mei: false,
    _source: 'cnpjws',
  };
}

function normalizeReceitaWS(d) {
  return {
    cnpj: d.cnpj,
    razao_social: d.nome,
    nome_fantasia: d.fantasia || d.nome,
    situacao: d.situacao || 'ATIVA',
    porte: d.porte || 'EPP',
    natureza_juridica: d.natureza_juridica || '',
    capital_social: parseFloat((d.capital_social || '0').replace(/\./g, '').replace(',', '.')),
    data_abertura: d.abertura || '',
    cnae_principal: {
      codigo: d.atividade_principal?.[0]?.code || '',
      descricao: d.atividade_principal?.[0]?.text || '',
    },
    cnaes_secundarios: (d.atividades_secundarias || []).map(c => ({
      codigo: c.code,
      descricao: c.text,
    })),
    endereco: {
      logradouro: `${d.tipo_logradouro || ''} ${d.logradouro || ''}`.trim(),
      numero: d.numero || 'S/N',
      complemento: d.complemento || '',
      bairro: d.bairro || '',
      municipio: d.municipio || '',
      uf: d.uf || '',
      cep: d.cep || '',
    },
    telefones: [d.telefone].filter(Boolean),
    email: d.email || '',
    qsa: (d.qsa || []).map(s => ({
      nome: s.qual ? `${s.nome} (${s.qual})` : s.nome,
      qualificacao: s.qual || '',
      cpf_cnpj_socio: '',
      pais: 'Brasil',
    })),
    simples: false,
    mei: false,
    _source: 'receitaws',
  };
}

async function fetchCNPJ(cnpj) {
  for (const source of SOURCES) {
    try {
      const data = await source.fetch(cnpj);
      await saveToCache(cnpj, data, source.name);
      return { data, source: source.name };
    } catch (e) {
      console.warn(`[CNPJ] Source ${source.name} failed:`, e?.response?.status || e.message);
    }
  }
  throw new Error('Todas as fontes CNPJ falharam');
}

// ── Rotas ────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'cnpj-service', timestamp: new Date().toISOString() });
});

// GET /cnpj/:cnpj — dados completos
app.get('/cnpj/:cnpj', async (req, res) => {
  const cnpj = req.params.cnpj.replace(/\D/g, '');
  if (cnpj.length !== 14) {
    return res.status(400).json({ success: false, error: 'CNPJ deve ter 14 dígitos' });
  }

  try {
    // Tentar cache primeiro
    const cached = await getFromCache(cnpj);
    if (cached) {
      return res.json({ success: true, cached: true, source: cached.source, data: cached.data });
    }

    const { data, source } = await fetchCNPJ(cnpj);
    res.json({ success: true, cached: false, source, data });
  } catch (err) {
    res.status(502).json({ success: false, error: err.message });
  }
});

// GET /cnpj/:cnpj/socios — quadro societário
app.get('/cnpj/:cnpj/socios', async (req, res) => {
  const cnpj = req.params.cnpj.replace(/\D/g, '');
  if (cnpj.length !== 14) {
    return res.status(400).json({ success: false, error: 'CNPJ inválido' });
  }

  try {
    const cached = await getFromCache(cnpj);
    const data = cached?.data || (await fetchCNPJ(cnpj)).data;
    res.json({ success: true, cnpj, socios: data.qsa || [] });
  } catch (err) {
    res.status(502).json({ success: false, error: err.message });
  }
});

// GET /cnpj/:cnpj/cnaes — CNAEs principal + secundários
app.get('/cnpj/:cnpj/cnaes', async (req, res) => {
  const cnpj = req.params.cnpj.replace(/\D/g, '');
  try {
    const cached = await getFromCache(cnpj);
    const data = cached?.data || (await fetchCNPJ(cnpj)).data;
    res.json({
      success: true,
      cnpj,
      cnae_principal: data.cnae_principal,
      cnaes_secundarios: data.cnaes_secundarios || [],
    });
  } catch (err) {
    res.status(502).json({ success: false, error: err.message });
  }
});

// POST /cnpj/batch — busca em lote
app.post('/cnpj/batch', async (req, res) => {
  const { cnpjs } = req.body;
  if (!Array.isArray(cnpjs) || cnpjs.length === 0) {
    return res.status(400).json({ success: false, error: 'cnpjs deve ser um array' });
  }
  if (cnpjs.length > 50) {
    return res.status(400).json({ success: false, error: 'Máximo 50 CNPJs por lote' });
  }

  const results = [];
  for (const raw of cnpjs) {
    const cnpj = raw.replace(/\D/g, '');
    try {
      const cached = await getFromCache(cnpj);
      if (cached) {
        results.push({ cnpj, success: true, cached: true, data: cached.data });
      } else {
        const { data, source } = await fetchCNPJ(cnpj);
        results.push({ cnpj, success: true, cached: false, source, data });
      }
    } catch (e) {
      results.push({ cnpj, success: false, error: e.message });
    }
    // Rate limit gentil entre requisições
    await new Promise(r => setTimeout(r, 300));
  }

  res.json({ success: true, total: results.length, results });
});

// GET /cnpj/search?nome=clinica+curitiba — busca por nome no cache
app.get('/cnpj/search', async (req, res) => {
  const nome = req.query.nome;
  if (!nome) return res.status(400).json({ success: false, error: 'Parâmetro nome é obrigatório' });

  if (!pg) return res.json({ success: true, results: [], message: 'Banco de dados não configurado' });

  try {
    const r = await pg.query(
      `SELECT cnpj, data->>'razao_social' as razao_social,
              data->>'nome_fantasia' as nome_fantasia,
              data->>'situacao' as situacao,
              data->>'porte' as porte
       FROM cnpj_cache
       WHERE data->>'nome_fantasia' ILIKE $1
          OR data->>'razao_social' ILIKE $1
       ORDER BY fetched_at DESC
       LIMIT 20`,
      [`%${nome}%`]
    );
    res.json({ success: true, total: r.rows.length, results: r.rows });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Start ────────────────────────────────────────────────────────
initDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[CNPJ Service] 🚀 Rodando em http://0.0.0.0:${PORT}`);
    console.log(`[CNPJ Service] Fontes: BrasilAPI → CNPJ.ws → ReceitaWS`);
    console.log(`[CNPJ Service] Cache: Redis (24h) + PostgreSQL (7 dias)`);
  });
});
