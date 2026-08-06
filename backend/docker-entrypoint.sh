#!/bin/sh
# Entrypoint de produccion: aplica migraciones ya generadas (nunca crea
# migraciones nuevas ni usa `migrate dev`) y arranca el servidor compilado.
set -e

echo "[entrypoint] Aplicando migraciones de Prisma (migrate deploy)..."
npx prisma migrate deploy

echo "[entrypoint] Iniciando backend..."
exec node dist/main.js
