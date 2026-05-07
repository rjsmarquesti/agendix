#!/bin/bash
# promise-checker.sh — Verifica integridade após cada tool use

PROJECT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

# TypeScript check (só se projeto TS)
if [ -f "$PROJECT_DIR/tsconfig.json" ]; then
  LAST_TS=$(find "$PROJECT_DIR" -name "*.ts" -o -name "*.tsx" 2>/dev/null | \
    grep -v node_modules | grep -v .next | xargs ls -t 2>/dev/null | head -1)

  if [ -n "$LAST_TS" ]; then
    MODIFIED_SECS=$(( $(date +%s) - $(date -r "$LAST_TS" +%s 2>/dev/null || echo 999) ))
    if [ "$MODIFIED_SECS" -lt 300 ] 2>/dev/null; then
      result=$(cd "$PROJECT_DIR" && npx tsc --noEmit 2>&1)
      if [ $? -ne 0 ]; then
        echo "AVISO: Erros TypeScript detectados:" >&2
        echo "$result" | head -15 >&2
      fi
    fi
  fi
fi

exit 0
