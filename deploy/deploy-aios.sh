#!/bin/bash
# =============================================================================
# WOOTECH CRM — Deploy AI-BOS (Hermes + Jarvis)
# =============================================================================
# Deploy Hermes Agent and Jarvis to existing Docker/Portainer VPS stack.
#
# Usage:
#   ./deploy/deploy-aios.sh                    # Deploy Hermes + Jarvis
#   ./deploy/deploy-aios.sh --status           # Check service status
#   ./deploy/deploy-aios.sh --logs hermes      # View Hermes logs
#   ./deploy/deploy-aios.sh --logs jarvis      # View Jarvis logs
# =============================================================================

set -euo pipefail

# ── Colors ────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ── Configuration ────────────────────────────────────────────────
COMPOSE_FILE="docker-compose.yml"
PROJECT_NAME="wootech"

log() { echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# ── Pre-flight checks ───────────────────────────────────────────
preflight() {
  log "Running pre-flight checks..."
  
  # Check Docker
  if ! command -v docker &> /dev/null; then
    error "Docker not found. Install Docker first."
  fi
  
  # Check Docker Compose
  if ! docker compose version &> /dev/null; then
    error "Docker Compose not found. Install Docker Compose v2 first."
  fi
  
  # Check .env file
  if [ ! -f .env ]; then
    warn ".env file not found. Copying from .env.example..."
    cp .env.example .env
    warn "Please edit .env with your API keys before continuing."
    exit 1
  fi
  
  # Check required env vars
  source .env
  if [ -z "${GEMINI_API_KEY:-}" ] && [ -z "${GROQ_API_KEY:-}" ] && [ -z "${OPENROUTER_API_KEY:-}" ]; then
    warn "No LLM API keys configured. Hermes/Jarvis may not work."
  fi
  
  success "Pre-flight checks passed"
}

# ── Deploy ────────────────────────────────────────────────────────
deploy() {
  log "Deploying AI-BOS (Hermes + Jarvis)..."
  
  # Pull latest images
  log "Pulling latest images..."
  docker compose -f "$COMPOSE_FILE" pull hermes jarvis 2>/dev/null || warn "Pull skipped (using local images)"
  
  # Stop existing containers if running
  log "Stopping existing containers..."
  docker compose -f "$COMPOSE_FILE" stop hermes jarvis 2>/dev/null || true
  
  # Remove old containers
  log "Removing old containers..."
  docker compose -f "$COMPOSE_FILE" rm -f hermes jarvis 2>/dev/null || true
  
  # Start new containers
  log "Starting Hermes and Jarvis..."
  docker compose -f "$COMPOSE_FILE" up -d hermes jarvis
  
  # Wait for health checks
  log "Waiting for services to be ready..."
  sleep 10
  
  # Verify health
  log "Verifying health..."
  local hermes_ok=false
  local jarvis_ok=false
  
  for i in {1..30}; do
    if curl -sf http://localhost:8642/health > /dev/null 2>&1; then
      hermes_ok=true
    fi
    if curl -sf http://localhost:8443/api/health > /dev/null 2>&1; then
      jarvis_ok=true
    fi
    if $hermes_ok && $jarvis_ok; then
      break
    fi
    sleep 2
  done
  
  if $hermes_ok; then
    success "Hermes Agent: http://localhost:9119 (dashboard) | http://localhost:8642 (API)"
  else
    warn "Hermes Agent may still be starting. Check: docker logs hermes-agent"
  fi
  
  if $jarvis_ok; then
    success "Jarvis: http://localhost:8443 (dashboard)"
  else
    warn "Jarvis may still be starting. Check: docker logs jarvis"
  fi
  
  # Rebuild CRM app to pick up new code
  log "Rebuilding CRM app..."
  docker compose -f "$COMPOSE_FILE" up -d --build crm-app
  
  success "AI-BOS deployment complete!"
  echo ""
  log "Services:"
  echo "  Hermes Agent Dashboard: http://localhost:9119"
  echo "  Hermes Agent API:       http://localhost:8642"
  echo "  Jarvis Dashboard:       http://localhost:8443"
  echo "  CRM Health:             http://localhost:3000/api/health"
  echo ""
}

# ── Status ────────────────────────────────────────────────────────
status() {
  log "Checking AI-BOS status..."
  docker compose -f "$COMPOSE_FILE" ps hermes jarvis
  echo ""
  
  # Health checks
  if curl -sf http://localhost:8642/health > /dev/null 2>&1; then
    success "Hermes: healthy"
  else
    warn "Hermes: not responding"
  fi
  
  if curl -sf http://localhost:8443/api/health > /dev/null 2>&1; then
    success "Jarvis: healthy"
  else
    warn "Jarvis: not responding"
  fi
}

# ── Logs ──────────────────────────────────────────────────────────
logs() {
  local service="${1:-}"
  if [ -z "$service" ]; then
    error "Usage: $0 --logs <hermes|jarvis>"
  fi
  
  if [ "$service" = "hermes" ]; then
    docker logs -f hermes-agent
  elif [ "$service" = "jarvis" ]; then
    docker logs -f jarvis
  else
    error "Unknown service: $service (use 'hermes' or 'jarvis')"
  fi
}

# ── Main ──────────────────────────────────────────────────────────
main() {
  case "${1:-}" in
    --status)
      status
      ;;
    --logs)
      logs "${2:-}"
      ;;
    --help|-h)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  (no args)    Deploy Hermes + Jarvis"
      echo "  --status     Check service status"
      echo "  --logs       View logs (hermes|jarvis)"
      echo "  --help       Show this help"
      ;;
    *)
      preflight
      deploy
      ;;
  esac
}

main "$@"
