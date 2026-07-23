-- ================================================================
-- Wootech CRM — PostgreSQL Init
-- Tabelas para cache de CNPJ e dados de leads
-- ================================================================

-- Cache de consultas CNPJ (Receita Federal)
CREATE TABLE IF NOT EXISTS cnpj_cache (
  cnpj        VARCHAR(14) PRIMARY KEY,
  data        JSONB NOT NULL,
  source      VARCHAR(50),
  fetched_at  TIMESTAMPTZ DEFAULT NOW(),
  expires_at  TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

CREATE INDEX IF NOT EXISTS idx_cnpj_cache_expires ON cnpj_cache (expires_at);
CREATE INDEX IF NOT EXISTS idx_cnpj_cache_nome_fantasia ON cnpj_cache ((data->>'nome_fantasia'));
CREATE INDEX IF NOT EXISTS idx_cnpj_cache_razao_social ON cnpj_cache ((data->>'razao_social'));

-- Log de jobs de scraping
CREATE TABLE IF NOT EXISTS scraping_jobs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bullmq_id   VARCHAR(100),
  keyword     TEXT,
  location    TEXT,
  status      VARCHAR(50) DEFAULT 'pending',
  results_count INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
