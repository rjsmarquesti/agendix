#!/bin/bash
# session-start.sh — Injeta status do ambiente no início de cada sessão

PROJECT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
PROJECT_NAME="$(basename "$PROJECT_DIR")"

echo "=== $PROJECT_NAME — Início de Sessão ==="
echo ""

# node_modules (raiz ou backend/)
if [ -d "$PROJECT_DIR/node_modules" ] || [ -d "$PROJECT_DIR/backend/node_modules" ]; then
    echo "✅ node_modules: presente"
else
    echo "⚠️  node_modules: ausente — rode npm install"
fi

# .env
for f in ".env" ".env.local" ".env.development"; do
  if [ -f "$PROJECT_DIR/$f" ]; then
    echo "✅ $f: presente"
    break
  fi
done

# Git status
if command -v git &>/dev/null && [ -d "$PROJECT_DIR/.git" ]; then
    BRANCH=$(cd "$PROJECT_DIR" && git rev-parse --abbrev-ref HEAD 2>/dev/null)
    UNCOMMITTED=$(cd "$PROJECT_DIR" && git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
    echo "🔀 Branch: ${BRANCH:-desconhecido} | Arquivos modificados: $UNCOMMITTED"
fi

echo ""
if [ -f "$PROJECT_DIR/MEMORY/wake-up.md" ]; then
    echo "📋 Leia MEMORY/wake-up.md antes de qualquer ação."
elif [ -f "$PROJECT_DIR/CLAUDE.md" ]; then
    echo "📋 Leia CLAUDE.md antes de qualquer ação."
fi
echo ""

exit 0
