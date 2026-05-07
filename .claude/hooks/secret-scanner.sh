#!/bin/bash
# secret-scanner.sh — Bloqueia secrets antes de qualquer operação de escrita

INPUT=$(cat)

PATTERNS=(
  "sk-[A-Za-z0-9]{20,}"
  "pk_[A-Za-z0-9]{20,}"
  "AKIA[A-Z0-9]{16}"
  "dckr_pat_[A-Za-z0-9_-]{20,}"
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+"
  "password\s*=\s*['\"][^'\"]{6,}['\"]"
  "postgresql://[^:]+:[^@]+@"
  "mysql://[^:]+:[^@]+@"
  "JWT_SECRET\s*=\s*[^\s]{8,}"
  "DB_PASSWORD\s*=\s*[^\s]{4,}"
)

FOUND=0
for pattern in "${PATTERNS[@]}"; do
  if echo "$INPUT" | grep -qE "$pattern" 2>/dev/null; then
    echo "BLOQUEADO: Possível secret detectado (padrão: $pattern)" >&2
    FOUND=1
  fi
done

if [ $FOUND -eq 1 ]; then
  echo "Use variáveis de ambiente em vez de hardcodar credenciais." >&2
  exit 1
fi

exit 0
