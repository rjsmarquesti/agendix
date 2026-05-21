#!/bin/sh
set -e

npx prisma migrate deploy
node prisma/seed.js
node server.js
