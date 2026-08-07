# Despliegue en Coolify — CRM WhatsApp (backend + frontend)

Esta guia asume que ya tienes, desplegada en tu Coolify por la plantilla de un clic, una
instancia de **Evolution API** funcionando, y que **no** hay que crear otra (ni otro Postgres o
Redis) a menos que lo decidas tu mismo revisando lo que ya existe.

> No tengo acceso a tu servidor/proyecto de Coolify — no pude "inspeccionarlo" literalmente.
> Los pasos de abajo te dicen exactamente que datos ir a buscar a tus recursos ya desplegados
> (Evolution API, y el Postgres/Redis que decidas usar) y donde pegarlos. No inventes ni un solo
> valor: si no lo encontras en tu Coolify, no lo pongas todavia y preguntame.

## Estado actual (2026-08-06) — YA DESPLEGADO

Con acceso a tu Coolify (sesion que dejaste iniciada), esto ya quedo hecho:

- **`backend-postgres`** y **`backend-redis`**: recursos nuevos y dedicados en el proyecto
  `WhatsApp > production` (separados del stack de `evolution-api`, tal como se acordo).
- **`whatsapp-backend`**: Application desde `https://github.com/LACMMXLI/whatsappboot2026fatboy`
  (`/backend`, Dockerfile), dominio `https://apicrm.fatboymexicali.com`, **Running (healthy)**.
  `GET /health` y `GET /docs` verificados en vivo.
- **`whatsapp-frontend`**: Application del mismo repo (`/frontend`, Dockerfile+Nginx), dominio
  `https://wacrm.fatboymexicali.com`, **Running (healthy)**, sirviendo el CRM con el bundle ya
  apuntando al backend correcto.
- El webhook de Evolution API (instancia real `Alonzo`, numero conectado) **sigue
  desactivado a proposito** — falta tu confirmacion final para activarlo (ver seccion 4).

Problemas reales que aparecieron desplegando y como se resolvieron (por si los ves de nuevo):
1. Coolify inyecta las env vars como build-args por defecto; `NODE_ENV=production` en el build
   hacia que `npm ci` saltara devDependencies → el build fallaba. Fix: forzar
   `NODE_ENV=development` dentro del stage de build del `Dockerfile`.
2. Nunca se habia podido correr `prisma migrate dev` en el entorno donde arme el proyecto (sin
   Docker ahi). No existia ninguna migracion → `prisma migrate deploy` no tenia nada que aplicar
   y el contenedor entraba en loop de reinicio. Fix: se genero la migracion inicial offline con
   `prisma migrate diff --from-empty` y se commiteo.
3. Alpine no trae OpenSSL, que el motor de Prisma necesita; sin el, el proceso moria en
   silencio. Fix: `apk add --no-cache openssl` en ambos stages del `Dockerfile` del backend.
4. Cloudflare (modo Flexible) + dominio configurado como `https://` en Coolify generaba un loop
   de redirect. Fix: dominios configurados como `http://` en Coolify (igual que `evo-api`),
   Cloudflare sigue presentando `https://` real al navegador.
5. El wizard de "New Resource" dejaba el frontend con "Ports Exposes" en `3000` (default de
   Nixpacks) en vez de `80` (donde escucha Nginx) → 502. Fix: cambiado a `80` manualmente.
6. Los secretos (`DATABASE_URL`, `JWT_SECRET`, etc.) quedaban marcados "Available at Buildtime"
   por defecto, exponiendolos en el historial de la imagen (advertencia del propio linter de
   Docker). Fix: desmarcados para todos los vars sensibles del backend (el build no los necesita).

## Arquitectura resultante

```
WhatsApp  →  Evolution API (ya desplegada)  →  Backend NestJS  →  PostgreSQL / Redis
                                                      ↕ WebSocket
                                                 CRM React (Nginx)  →  operador humano
```

Backend y frontend se despliegan como **dos aplicaciones separadas** en Coolify, cada una con
su propio `Dockerfile` (ya incluidos en [backend/Dockerfile](backend/Dockerfile) y
[frontend/Dockerfile](frontend/Dockerfile)).

---

## 0. Antes de crear nada: reunir datos de lo que ya existe

En tu proyecto de Coolify:

1. Abre el recurso de **Evolution API** ya desplegado. Anota:
   - Su URL (interna, si el backend va a vivir en el mismo proyecto/red de Coolify — mas
     rapido y no sale a internet; o publica si prefieres).
   - El **API key** configurado.
   - El **nombre de instancia** que vas a usar para este negocio (o crea una instancia nueva
     dentro de esa misma Evolution API — eso si esta bien, es solo una instancia de WhatsApp,
     no una nueva instalacion del servicio).
2. Revisa si en ese mismo proyecto ya tienes un **Postgres** y un **Redis** gestionados por
   Coolify que puedas reutilizar (pestaña "Resources"). Si no, crea uno nuevo de cada uno desde
   el catalogo de Coolify (esto SI es necesario — este backend necesita su propia base de datos
   y cola; solo evita duplicar Evolution API).
3. Anota las credenciales de conexion que Coolify te muestre para esos recursos (host interno,
   puerto, usuario, password, o la connection string completa).

## 1. Backend — nueva Application en Coolify

1. **New Resource → Application → Git Repository**, selecciona tu repo y la rama a desplegar.
2. **Root directory**: `backend`. **Build pack**: `Dockerfile` (usa
   [backend/Dockerfile](backend/Dockerfile) tal cual, ya hace `prisma generate`,
   `npm run build` y en el arranque `prisma migrate deploy` — nunca `migrate dev`).
3. **Puerto expuesto**: `3000` (coincide con `PORT` y el `EXPOSE` del Dockerfile).
4. **Health check**: path `/health`, puerto `3000`. Este endpoint ademas verifica conexion a
   la base de datos (no solo que el proceso este vivo).
5. **Variables de entorno** (Runtime, no Build — ver tabla completa en la seccion 3):
   copia [backend/.env.example](backend/.env.example) y completa cada valor real.
6. **Dominio**: asignale un subdominio propio, ej. `api.tudominio.com`, con HTTPS activado
   (Coolify emite el certificado automaticamente via Traefik/Let's Encrypt).

### Socket.IO detras del proxy de Coolify

No hace falta configuracion adicional: Coolify usa Traefik, que reenvia correctamente el
`Upgrade`/`Connection` header necesario para WebSockets sobre el mismo dominio HTTPS que ya
configuraste para la Application. El cliente del CRM se conecta a
`https://api.tudominio.com` (namespace `/realtime`), que Socket.IO resuelve automaticamente a
`wss://` sobre esa misma conexion.

**Limitacion a tener en cuenta si escalas a mas de 1 replica**: el gateway actual mantiene el
estado de las conexiones en memoria de un solo proceso (rooms por `businessId`). Con 1 replica
(lo tipico para este tipo de operacion) no hay ningun problema. Si en el futuro corres mas de
una replica del backend, vas a necesitar sticky sessions en el proxy o un adapter de Redis para
Socket.IO (no incluido; avisame si llegas a ese punto y lo agregamos).

## 2. Frontend — nueva Application en Coolify

1. **New Resource → Application → Git Repository**, mismo repo.
2. **Root directory**: `frontend`. **Build pack**: `Dockerfile` (usa
   [frontend/Dockerfile](frontend/Dockerfile), sirve el build estatico con Nginx).
3. **Build Variables** (¡ojo, van como *build args*, no como variables de entorno de runtime —
   Vite las inlina al compilar!):
   - `VITE_API_URL=https://api.tudominio.com`
   - `VITE_WS_URL=https://api.tudominio.com`
4. **Puerto expuesto**: `80`.
5. **Health check**: path `/healthz`, puerto `80`.
6. **Dominio**: ej. `crm.tudominio.com`, con HTTPS activado.

Si despues cambias `VITE_API_URL`/`VITE_WS_URL`, tenes que **reconstruir la imagen** (no
alcanza con reiniciar el contenedor), porque quedaron horneadas en los archivos JS del build.

## 3. Variables de entorno — lista exacta por aplicacion

### Backend (`backend/.env.example`)

| Variable | Obligatoria | Ejemplo / notas |
|---|---|---|
| `PORT` | si | `3000` |
| `NODE_ENV` | si | `production` |
| `CORS_ORIGINS` | si en produccion | `https://crm.tudominio.com` (sin esto, CORS queda abierto a cualquier origen) |
| `APP_URL` | si (desde el superadmin) | URL publica de este backend, ej. `https://apicrm.tudominio.com` (SIN slash final). El panel `/superadmin` la usa para registrar el webhook de cada instancia de WhatsApp nueva automaticamente |
| `DATABASE_URL` | si | connection string de tu Postgres de Coolify |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` **o** `REDIS_URL` | si (una de las dos formas) | usa `REDIS_URL` si tu Redis de Coolify te da una connection string unica |
| `JWT_SECRET` | si | genera un valor largo y aleatorio propio, no reutilices el de desarrollo |
| `JWT_EXPIRES_IN` | si | `7d` (o el que prefieras) |
| `EVOLUTION_API_URL` | si | URL de tu Evolution API ya desplegada |
| `EVOLUTION_API_KEY` | si | API key real de esa instancia |
| `WHATSAPP_WEBHOOK_SECRET` | si | valor propio; el superadmin lo usa al registrar el webhook de cada instancia nueva |
| `POS_WEBHOOK_SECRET` | si | valor propio para `POST /pos/webhook/status` |
| `LOGIN_THROTTLE_LIMIT` / `LOGIN_THROTTLE_TTL_MS` | no (tiene default) | Anti fuerza bruta por IP en `/auth/login`. Default `5` intentos por `60000` ms (1 min) |
| `LOGIN_MAX_FAILED_ATTEMPTS` / `LOGIN_LOCKOUT_MINUTES` | no (tiene default) | Anti fuerza bruta por CUENTA (independiente de la IP): tras `5` intentos fallidos consecutivos, la cuenta queda bloqueada `15` minutos |

> Nota: `EVOLUTION_INSTANCE_NAME` ya no existe — cada negocio (tenant) tiene su propia
> instancia, creada desde `/superadmin`, guardada en `Business.whatsappInstanceId`. No hay un
> nombre de instancia global compartido entre negocios.

### Frontend (`frontend/.env.example`, como **Build Variables**)

| Variable | Obligatoria | Ejemplo |
|---|---|---|
| `VITE_API_URL` | si | `https://api.tudominio.com` |
| `VITE_WS_URL` | si | `https://api.tudominio.com` |

## 4. Configurar el webhook de Evolution API

1. En el panel (o API) de tu Evolution API, abre la configuracion de la instancia que anotaste
   en el paso 0.
2. Configura el webhook con la URL: `https://api.tudominio.com/webhook/whatsapp`.
3. Activa al menos el evento `messages.upsert` (es lo minimo que el backend procesa; los demas
   eventos que llegue se ignoran sin error).
4. Si tu version de Evolution API permite headers/secreto custom en el webhook, agrega el
   header `x-webhook-secret` con el mismo valor que pusiste en `WHATSAPP_WEBHOOK_SECRET` del
   backend. (La UI exacta varia segun la version de Evolution API que tengas desplegada —
   revisa la seccion de webhooks de tu instancia.)
5. Ya con el backend desplegado y logueado con un usuario, llama
   `PATCH /businesses/me/whatsapp-instance` con `{ "whatsappInstanceId": "<tu-instance-name>" }`
   (via Swagger en `https://api.tudominio.com/docs` o el CRM). Sin este paso, el webhook llega
   pero el backend no sabe a que negocio pertenece y descarta el evento.

## 5. Checklist de prueba end-to-end

- [ ] `GET https://api.tudominio.com/health` responde `200 { "status": "ok" }`
- [ ] `https://api.tudominio.com/docs` carga el Swagger con todos los endpoints
- [ ] `POST /auth/register` crea tu negocio y usuario admin
- [ ] `PATCH /businesses/me/whatsapp-instance` guardado con tu instancia real de Evolution
- [ ] Cargaste al menos un producto (`POST /products` o `/products/upload`)
- [ ] Entras a `https://crm.tudominio.com`, el login funciona
- [ ] En la consola del navegador no hay errores de CORS ni de conexion del WebSocket
      (`/realtime` deberia conectar sin reintentos infinitos)
- [ ] Escribis "hola" desde un WhatsApp real al numero de esa instancia → la conversacion
      aparece en el CRM en tiempo real, sin recargar la pagina
- [ ] El bot responde automaticamente usando el catalogo cargado (probar "quiero <producto>")
- [ ] Desde el CRM, "Tomar control" desactiva el bot y asigna el chat; responder manualmente
      llega de verdad al WhatsApp del cliente
- [ ] "Liberar control" libera la conversacion (y reactiva el bot si asi lo configuraste en
      `PATCH /businesses/me/settings`)
- [ ] "Marcar como resuelto" / "Reabrir" cambian el estado visible en el chat
- [ ] Confirmar un pedido (`PATCH /orders/:id/confirm`) y enviarlo al POS
      (`POST /pos/orders/:id/send`) — sin un POS real conectado, verificar el log del backend
      que confirma el envio simulado

## 6. Seguridad antes de ir a produccion

- `JWT_SECRET`, `WHATSAPP_WEBHOOK_SECRET` y `POS_WEBHOOK_SECRET` deben ser valores unicos y
  aleatorios, distintos de los de desarrollo — nunca los que estan en `.env.example`.
- `CORS_ORIGINS` no debe quedar vacio en produccion (si esta vacio, se acepta cualquier origen).
- HTTPS activo en ambos dominios (Coolify lo gestiona automaticamente via Traefik).
- `/auth/login` ya tiene proteccion anti fuerza bruta por defecto (limite por IP + bloqueo de
  cuenta tras intentos fallidos, ver tabla de variables arriba); no requiere nada adicional al
  desplegar, pero se puede ajustar con `LOGIN_THROTTLE_LIMIT`/`LOGIN_MAX_FAILED_ATTEMPTS` si hace
  falta.
