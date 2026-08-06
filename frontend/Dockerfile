# syntax=docker/dockerfile:1

# =============================================================================
# Stage 1: build (Vite inlina las variables VITE_* EN TIEMPO DE BUILD, no de
# arranque del contenedor — por eso se reciben como build args).
# =============================================================================
FROM node:20-alpine AS builder
WORKDIR /app

ARG VITE_API_URL
ARG VITE_WS_URL
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_WS_URL=${VITE_WS_URL}

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# =============================================================================
# Stage 2: servir el build estatico con Nginx
# =============================================================================
FROM nginx:1.27-alpine AS runner

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O- http://127.0.0.1/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
