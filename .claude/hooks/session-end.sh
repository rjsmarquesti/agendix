#!/bin/bash
# session-end.sh — Atualiza memória ao final de cada sessão

PROJECT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
MEMORY_DIR="$PROJECT_DIR/MEMORY"
DATETIME=$(date '+%Y-%m-%d %H:%M')

mkdir -p "$MEMORY_DIR"

if [ -f "$MEMORY_DIR/wake-up.md" ]; then
  sed -i "s/\*\*Última sessão:\*\*.*/\*\*Última sessão:\*\* $DATETIME/" "$MEMORY_DIR/wake-up.md" 2>/dev/null || true
fi

echo "Sessão encerrada em $DATETIME" >&2
exit 0
