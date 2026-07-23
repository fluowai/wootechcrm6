# WooTech CRM — DEV Documentation Index

## Project: AI Business Operating System (AI-BOS)

### Active Specs
- `SPECS/ACTIVE.md` — Current implementation scope and acceptance criteria

### Architecture
- `ARCH/aios-architecture.md` — Full AIOS architecture with Paperclip integration

### Workflows
- `WORKFLOWS/implementation-phases.md` — Phased implementation plan

### SQL
- `SQL/aios-schema.sql` — Database migrations for AIOS tables
- `SQL/wa-instances-schema.sql` — WhatsApp multi-instance schema (whatsapp_instances, wa_instance_links, wa_messages)

### Backlog
- `BACKLOG/tasks.md` — Task breakdown per phase

### Key Files
- `DEV/HANDOFF.md` — Next context for continuation
- `DEV/WORKLOG.md` — Change log
- `DEV/VERIFY.md` — Verification status

## Stack Summary
- **Frontend**: React 19 + Vite + Tailwind CSS 4
- **Backend**: Express.js + TypeScript
- **Database**: Supabase (PostgreSQL)
- **Queue**: BullMQ + Redis
- **AI**: Google Gemini (existing) + Paperclip (new runtime)
- **WhatsApp**: Whatsmeow (Go)
- **Services**: gosom, Firecrawl, Colly, Browserless, Unstructured, CNPJ
