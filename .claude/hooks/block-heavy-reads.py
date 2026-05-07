#!/usr/bin/env python3
# block-heavy-reads.py — Bloqueia leitura de pastas pesadas e arquivos sensíveis

import sys
import json
import os

BLOCKED_DIRS = ['node_modules', '.next', 'dist/', 'build/', '.git/']
BLOCKED_FILES = ['.env', '.env.local', '.env.production', '.env.development', '.env.test']

try:
    data = json.loads(sys.stdin.read())
    file_path = data.get('file_path', data.get('path', ''))

    if not file_path:
        sys.exit(0)

    normalized = file_path.replace('\\', '/')

    for d in BLOCKED_DIRS:
        if d in normalized:
            print(f"BLOQUEADO: '{file_path}' está em pasta ignorada ({d})", file=sys.stderr)
            print("Use .claudeignore para excluir pastas do contexto.", file=sys.stderr)
            sys.exit(1)

    basename = os.path.basename(normalized)
    if basename in BLOCKED_FILES or basename.startswith('.env'):
        print(f"BLOQUEADO: '{file_path}' é arquivo sensível de ambiente", file=sys.stderr)
        sys.exit(1)

except (json.JSONDecodeError, Exception):
    pass

sys.exit(0)
