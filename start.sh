#!/usr/bin/env bash
#
# Sobe o ambiente de desenvolvimento completo: PocketBase (back) + Vite (front).
# Uso: ./start.sh
#       Ctrl+C para parar os dois.
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PB_DIR="$ROOT/.pb"
PB_BIN="$PB_DIR/pocketbase"
PB_VERSION="0.38.1"
PB_PORT=8090
VITE_PORT=3000

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[start]${NC} $*"; }
warn() { echo -e "${YELLOW}[start]${NC} $*"; }
err()  { echo -e "${RED}[start]${NC} $*" >&2; }

PB_PID=""
cleanup() {
  if [[ -n "$PB_PID" ]] && kill -0 "$PB_PID" 2>/dev/null; then
    log "Parando PocketBase (pid $PB_PID)..."
    kill "$PB_PID" 2>/dev/null || true
    wait "$PB_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

# ----------------------------------------------------------------------------
# 1) Baixa o binário do PocketBase se ainda não existir
# ----------------------------------------------------------------------------
if [[ ! -x "$PB_BIN" ]]; then
  case "$(uname -s)-$(uname -m)" in
    Linux-x86_64)   PB_ARCH="linux_amd64" ;;
    Linux-aarch64)  PB_ARCH="linux_arm64" ;;
    Darwin-x86_64)  PB_ARCH="darwin_amd64" ;;
    Darwin-arm64)   PB_ARCH="darwin_arm64" ;;
    *)
      err "Plataforma $(uname -s)-$(uname -m) não suportada para download automático."
      err "Baixe manualmente https://github.com/pocketbase/pocketbase/releases e coloque em $PB_BIN"
      exit 1
      ;;
  esac

  log "Baixando PocketBase v${PB_VERSION} (${PB_ARCH})..."
  mkdir -p "$PB_DIR"
  ZIP="$PB_DIR/pb.zip"
  wget -q "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_${PB_ARCH}.zip" -O "$ZIP"
  unzip -o -q "$ZIP" pocketbase -d "$PB_DIR"
  rm -f "$ZIP"
  chmod +x "$PB_BIN"
fi

# ----------------------------------------------------------------------------
# 2) Instala dependências node se necessário
# ----------------------------------------------------------------------------
if [[ ! -d "$ROOT/node_modules" ]]; then
  log "Instalando dependências (npm install)..."
  (cd "$ROOT" && npm install)
fi

# ----------------------------------------------------------------------------
# 3) Verifica portas
# ----------------------------------------------------------------------------
port_in_use() {
  local port="$1"

  if command -v ss >/dev/null 2>&1; then
    ss -tln 2>/dev/null | grep -qE "[:.]${port}[[:space:]]"
    return
  fi

  if command -v lsof >/dev/null 2>&1; then
    lsof -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
    return
  fi

  if command -v nc >/dev/null 2>&1; then
    nc -z 127.0.0.1 "$port" >/dev/null 2>&1
    return
  fi

  return 1
}

PB_ALREADY_RUNNING=0
if port_in_use "$PB_PORT"; then
  PB_ALREADY_RUNNING=1
  warn "Porta ${PB_PORT} já está em uso. Vou assumir que o PocketBase já está rodando e iniciar apenas o frontend."
fi

if port_in_use "$VITE_PORT"; then
  warn "Porta ${VITE_PORT} já está em uso. O Vite escolherá automaticamente outra porta."
fi

# ----------------------------------------------------------------------------
# 4) Sobe o PocketBase em background, lendo migrations do repo
# ----------------------------------------------------------------------------
if [[ "$PB_ALREADY_RUNNING" -eq 0 ]]; then
  log "Iniciando PocketBase em http://127.0.0.1:${PB_PORT} (dashboard: /_/)"
  "$PB_BIN" serve \
    --http="127.0.0.1:${PB_PORT}" \
    --dir="$PB_DIR/pb_data" \
    --migrationsDir="$ROOT/pb_migrations" \
    --hooksDir="$ROOT/pb_hooks" \
    > "$PB_DIR/pocketbase.log" 2>&1 &
  PB_PID=$!

  # Espera ficar saudável
  for _ in $(seq 1 30); do
    if curl -sS -o /dev/null "http://127.0.0.1:${PB_PORT}/api/health" 2>/dev/null; then
      log "PocketBase pronto (logs em $PB_DIR/pocketbase.log)"
      break
    fi
    sleep 0.5
  done

  if ! curl -sS -o /dev/null "http://127.0.0.1:${PB_PORT}/api/health" 2>/dev/null; then
    err "PocketBase não respondeu em 15s. Veja $PB_DIR/pocketbase.log"
    exit 1
  fi
fi

# ----------------------------------------------------------------------------
# 5) Sobe o Vite em foreground (Ctrl+C para)
# ----------------------------------------------------------------------------
log "Iniciando Vite. URL padrão: http://127.0.0.1:${VITE_PORT}"
log "Ctrl+C para parar os serviços iniciados por este script."
echo

cd "$ROOT"
npm run dev
