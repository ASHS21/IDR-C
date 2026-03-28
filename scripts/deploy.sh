#!/usr/bin/env bash
# =============================================================================
# Identity Radar — Production Deployment Script
#
# Deploys Identity Radar on any Linux VPS in under 10 minutes.
# Usage:
#   ./scripts/deploy.sh --domain idr.example.com
#   ./scripts/deploy.sh --domain idr.example.com --seed --ai-provider anthropic --anthropic-key sk-...
#
# Requirements: Docker 20+, Docker Compose v2, ports 80/443 available, 4GB+ RAM
# =============================================================================
set -euo pipefail

# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------
DOMAIN="localhost"
ADMIN_EMAIL="admin@example.com"
ORG_NAME="My Organization"
AI_PROVIDER="none"
ANTHROPIC_KEY=""
SEED=false
COMPOSE_FILE="docker/docker-compose.prod.yml"
ENV_FILE=".env.production"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# ---------------------------------------------------------------------------
# Colors
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
fail()    { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }
step()    { echo -e "\n${BOLD}━━━ Step $1: $2 ━━━${NC}"; }

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
  case $1 in
    --domain)        DOMAIN="$2"; shift 2 ;;
    --admin-email)   ADMIN_EMAIL="$2"; shift 2 ;;
    --org-name)      ORG_NAME="$2"; shift 2 ;;
    --ai-provider)   AI_PROVIDER="$2"; shift 2 ;;
    --anthropic-key) ANTHROPIC_KEY="$2"; shift 2 ;;
    --seed)          SEED=true; shift ;;
    --help|-h)
      echo "Usage: ./scripts/deploy.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --domain <fqdn>        Domain for HTTPS (default: localhost)"
      echo "  --admin-email <email>  Admin user email (default: admin@example.com)"
      echo "  --org-name <name>      Organization name (default: My Organization)"
      echo "  --ai-provider <type>   AI backend: ollama, anthropic, none (default: none)"
      echo "  --anthropic-key <key>  Anthropic API key (required if ai-provider=anthropic)"
      echo "  --seed                 Load sample data for demo"
      echo "  --help                 Show this help"
      exit 0
      ;;
    *) fail "Unknown option: $1. Use --help for usage." ;;
  esac
done

cd "$PROJECT_DIR"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║      Identity Radar — Production Deploy      ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
info "Domain:       ${DOMAIN}"
info "Admin Email:  ${ADMIN_EMAIL}"
info "Organization: ${ORG_NAME}"
info "AI Provider:  ${AI_PROVIDER}"
info "Seed Data:    ${SEED}"
echo ""

# =============================================================================
# Step 1: Validate prerequisites
# =============================================================================
step "1/9" "Validating prerequisites"

command -v docker >/dev/null 2>&1 || fail "Docker is required. Install: https://docs.docker.com/engine/install/"
docker info >/dev/null 2>&1 || fail "Docker daemon is not running. Start it with: sudo systemctl start docker"

# Check Docker Compose v2
if docker compose version >/dev/null 2>&1; then
  COMPOSE_VERSION=$(docker compose version --short 2>/dev/null || echo "unknown")
  success "Docker Compose ${COMPOSE_VERSION}"
else
  fail "Docker Compose v2 is required. Install: https://docs.docker.com/compose/install/"
fi

# Check Docker version (need 20+)
DOCKER_VERSION=$(docker version --format '{{.Server.Version}}' 2>/dev/null || echo "0.0.0")
DOCKER_MAJOR=$(echo "$DOCKER_VERSION" | cut -d. -f1)
if [ "$DOCKER_MAJOR" -lt 20 ]; then
  fail "Docker 20+ required. Found: ${DOCKER_VERSION}"
fi
success "Docker ${DOCKER_VERSION}"

# Check available RAM (need 4GB+)
if command -v free >/dev/null 2>&1; then
  TOTAL_RAM_MB=$(free -m | awk '/^Mem:/{print $2}')
  if [ "$TOTAL_RAM_MB" -lt 3500 ]; then
    warn "Only ${TOTAL_RAM_MB}MB RAM available. Recommended: 4096MB+"
  else
    success "RAM: ${TOTAL_RAM_MB}MB"
  fi
fi

# Check ports 80 and 443
for PORT in 80 443; do
  if ss -tlnp 2>/dev/null | grep -q ":${PORT} " || netstat -tlnp 2>/dev/null | grep -q ":${PORT} "; then
    fail "Port ${PORT} is already in use. Stop the conflicting service first."
  fi
done
success "Ports 80 and 443 are available"

# Check required files exist
[ -f "$COMPOSE_FILE" ] || fail "Missing: ${COMPOSE_FILE}. Are you in the project root?"
[ -f "docker/Dockerfile" ] || fail "Missing: docker/Dockerfile"
[ -f "docker/Caddyfile" ] || fail "Missing: docker/Caddyfile"
[ -f ".env.example" ] || fail "Missing: .env.example"
success "All required files present"

# =============================================================================
# Step 2: Generate secrets
# =============================================================================
step "2/9" "Generating secrets"

NEXTAUTH_SECRET=$(openssl rand -base64 32)
POSTGRES_PASSWORD=$(openssl rand -hex 20)

success "NEXTAUTH_SECRET generated (base64, 32 bytes)"
success "POSTGRES_PASSWORD generated (hex, 20 bytes)"

# =============================================================================
# Step 3: Create .env.production
# =============================================================================
step "3/9" "Creating ${ENV_FILE}"

if [ "$DOMAIN" = "localhost" ]; then
  APP_URL="http://localhost"
else
  APP_URL="https://${DOMAIN}"
fi

# Build AI configuration
OLLAMA_URL=""
OLLAMA_MODEL="qwen2.5:7b"
AI_PROVIDER_ENV="none"

case "$AI_PROVIDER" in
  ollama)
    AI_PROVIDER_ENV="ollama"
    OLLAMA_URL="http://host.docker.internal:11434"
    info "Ollama AI provider selected — ensure Ollama is running on the host"
    ;;
  anthropic)
    AI_PROVIDER_ENV="anthropic"
    [ -z "$ANTHROPIC_KEY" ] && fail "--anthropic-key is required when ai-provider=anthropic"
    ;;
  none|"")
    AI_PROVIDER_ENV="none"
    ;;
  *)
    fail "Unknown AI provider: ${AI_PROVIDER}. Use: ollama, anthropic, or none"
    ;;
esac

cat > "$ENV_FILE" << EOF
# =============================================================================
# Identity Radar — Production Environment
# Generated by deploy.sh on $(date -u +"%Y-%m-%dT%H:%M:%SZ")
# =============================================================================

# --- Database ---
POSTGRES_DB=identity_radar
POSTGRES_USER=postgres
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD}@db:5432/identity_radar

# --- Auth ---
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
NEXTAUTH_URL=${APP_URL}

# --- Application ---
NEXT_PUBLIC_APP_URL=${APP_URL}
NODE_ENV=production

# --- AI Provider ---
AI_PROVIDER=${AI_PROVIDER_ENV}
OLLAMA_URL=${OLLAMA_URL}
OLLAMA_MODEL=${OLLAMA_MODEL}
ANTHROPIC_API_KEY=${ANTHROPIC_KEY}

# --- Domain (for Caddy HTTPS) ---
DOMAIN=${DOMAIN}
EOF

success "Created ${ENV_FILE}"

# =============================================================================
# Step 4: Build Docker image
# =============================================================================
step "4/9" "Building Docker image"

info "This may take 3-5 minutes on first build..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" build --no-cache app
success "Docker image built"

# =============================================================================
# Step 5: Start services
# =============================================================================
step "5/9" "Starting services (PostgreSQL, App, Caddy)"

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d
success "All containers started"

# =============================================================================
# Step 6: Wait for healthy
# =============================================================================
step "6/9" "Waiting for services to be healthy"

# Wait for PostgreSQL first
info "Waiting for PostgreSQL..."
MAX_WAIT=60
ELAPSED=0
until docker exec idr-db pg_isready -U postgres -q 2>/dev/null; do
  ELAPSED=$((ELAPSED + 2))
  if [ "$ELAPSED" -ge "$MAX_WAIT" ]; then
    fail "PostgreSQL did not become ready within ${MAX_WAIT}s"
  fi
  sleep 2
done
success "PostgreSQL is ready"

# Wait for the app
info "Waiting for Identity Radar app..."
MAX_WAIT=120
ELAPSED=0
until curl -sf http://localhost:3000/api/health >/dev/null 2>&1; do
  ELAPSED=$((ELAPSED + 3))
  if [ "$ELAPSED" -ge "$MAX_WAIT" ]; then
    warn "App not healthy after ${MAX_WAIT}s. Checking logs..."
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs --tail=30 app
    fail "Application failed to start. Check logs above."
  fi
  sleep 3
done
success "Application is healthy"

# =============================================================================
# Step 7: Run database migrations
# =============================================================================
step "7/9" "Running database migrations"

docker exec idr-app npx drizzle-kit push 2>&1 | tail -5
success "Schema applied"

# Apply views if they exist
if docker exec idr-app test -f drizzle/0001_create_views.sql 2>/dev/null; then
  info "Creating database views..."
  docker exec idr-app sh -c 'cat drizzle/0001_create_views.sql | PGPASSWORD=$POSTGRES_PASSWORD psql -h db -U postgres -d identity_radar' 2>/dev/null || true
  success "Views created"
fi

# =============================================================================
# Step 8: Seed data (optional)
# =============================================================================
step "8/9" "Data initialization"

if [ "$SEED" = true ]; then
  info "Seeding sample data (this may take 30-60 seconds)..."
  docker exec idr-app npx tsx seed/index.ts 2>&1 | tail -5
  success "Sample data seeded"
else
  info "Skipping seed data (use --seed to load sample data)"
fi

# =============================================================================
# Step 9: Done
# =============================================================================
step "9/9" "Deployment complete"

# Get health status
HEALTH=$(curl -sf http://localhost:3000/api/health 2>/dev/null || echo '{"status":"unknown"}')
STATUS=$(echo "$HEALTH" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║       Identity Radar is running!             ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
info "URL:              ${APP_URL}"
info "Health Status:    ${STATUS}"
info "Admin Email:      ${ADMIN_EMAIL}"
info "Default Password: admin123"
echo ""
info "Env file:         ${ENV_FILE}"
info "Compose file:     ${COMPOSE_FILE}"
echo ""
echo -e "${YELLOW}Management commands:${NC}"
echo "  Status:   docker compose --env-file ${ENV_FILE} -f ${COMPOSE_FILE} ps"
echo "  Logs:     docker compose --env-file ${ENV_FILE} -f ${COMPOSE_FILE} logs -f"
echo "  Stop:     docker compose --env-file ${ENV_FILE} -f ${COMPOSE_FILE} down"
echo "  Restart:  docker compose --env-file ${ENV_FILE} -f ${COMPOSE_FILE} restart"
echo "  Backup:   ./scripts/backup.sh"
echo ""
echo -e "${GREEN}Deployment complete.${NC}"
