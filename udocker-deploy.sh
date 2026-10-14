#!/usr/bin/env bash
# Runs the equivalent of compose.dev.yaml with udocker (no root, no docker, no compose).
#
#   ./udocker-deploy.sh up | u      start backend (:8080) + frontend (:5173)
#   ./udocker-deploy.sh down | d    kill running udocker dev containers
#   ./udocker-deploy.sh logs | l    follow both service logs
#   ./udocker-deploy.sh help | -h | --help    this help (also on no argument)
#
# node_modules land in ./.udocker-cache (gitignored), emulating the
# anonymous volumes from compose so they never touch the host source dirs.

set -uo pipefail

PYTHON="/home/rizoret/.venv/bin/python"
UDOCKER="/home/rizoret/8Apps/udocker/maincmd.py"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CACHE="$ROOT/.udocker-cache"
LOG_BE="$CACHE/backend.log"
LOG_FE="$CACHE/frontend.log"
IMG="node:22-alpine"

run_ud() { "$PYTHON" "$UDOCKER" "$@"; }

usage() {
  cat <<EOF
$(basename "$0") - udocker stand-in for compose.dev.yaml

Usage: $(basename "$0") <command>

Commands:
  up, u                Start backend (:8080) and frontend (:5173)
  down, d              Stop running udocker dev containers
  logs, l              Follow backend + frontend logs
  help, h, -h, --help  Show this help
EOF
}

cleanup() {
  [ "${TPID:-0}" != 0 ] && kill "$TPID" 2>/dev/null
  [ "${BACKEND_PID:-0}" != 0 ] && kill "$BACKEND_PID" 2>/dev/null
  [ "${FRONTEND_PID:-0}" != 0 ] && kill "$FRONTEND_PID" 2>/dev/null
  sleep 1
  pkill -9 -f 'udocker/bin/proot' 2>/dev/null
  pkill -f "$UDOCKER" 2>/dev/null
}

case "${1:-}" in
  up|u)
    ;;
  down|d)
    cleanup
    echo "stopped."
    exit 0
    ;;
  logs|l)
    exec tail -F "$LOG_BE" "$LOG_FE"
    ;;
  help|h|-h|--help|"")
    usage
    exit 0
    ;;
  *)
    usage >&2
    exit 1
    ;;
esac

mkdir -p "$CACHE/backend-nm" "$CACHE/frontend-nm"

if ! run_ud images | grep -q "$IMG"; then
  echo "[dev] pulling $IMG (first run only)..."
  run_ud pull "$IMG" || { echo "[dev] pull failed"; exit 1; }
fi

trap cleanup EXIT INT TERM

echo "[dev] starting backend -> http://localhost:8080"
run_ud run --rm -w /app \
  -v "$ROOT/backend:/app" \
  -v "$CACHE/backend-nm:/app/node_modules" \
  --publish=8080:8080 "$IMG" sh -c "npm install && npm run dev" \
  >"$LOG_BE" 2>&1 &
BACKEND_PID=$!

sleep 1

echo "[dev] starting frontend -> http://localhost:5173"
run_ud run --rm -w /app \
  -v "$ROOT/frontend:/app" \
  -v "$CACHE/frontend-nm:/app/node_modules" \
  --publish=5173:5173 "$IMG" sh -c "npm install && npm run dev -- --host 0.0.0.0" \
  >"$LOG_FE" 2>&1 &
FRONTEND_PID=$!

tail -F "$LOG_BE" "$LOG_FE" &
TPID=$!

wait "$BACKEND_PID" "$FRONTEND_PID"
