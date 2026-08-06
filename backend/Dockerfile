# syntax=docker/dockerfile:1

# =============================================================================
# Stage 1: build (deps completas + compilacion TypeScript + Prisma Client)
# =============================================================================
FROM node:20-alpine AS builder
WORKDIR /app
# Fuerza modo development en este stage aunque la plataforma (Coolify, etc.)
# inyecte NODE_ENV=production como build-arg: con production, npm salta
# devDependencies (typescript, @nestjs/cli) y "npm run build" falla.
ENV NODE_ENV=development

COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

# =============================================================================
# Stage 2: runtime de produccion (solo deps de produccion + dist compilado)
# =============================================================================
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci --omit=dev \
  && npx prisma generate \
  && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY scripts/docker-healthcheck.js ./scripts/docker-healthcheck.js
COPY docker-entrypoint.sh ./docker-entrypoint.sh
# Normaliza fin de linea (por si el repo se checkeo en Windows con CRLF) y
# da permisos de ejecucion al entrypoint.
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node ./scripts/docker-healthcheck.js

ENTRYPOINT ["./docker-entrypoint.sh"]
