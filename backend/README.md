# WhatsApp Orders Backend

Backend (solo backend, sin frontend) para un SaaS de automatizacion de pedidos por WhatsApp
para restaurantes. Construido con NestJS + TypeScript + PostgreSQL (Prisma) + Redis/BullMQ +
WebSockets, multi-tenant (`businessId`).

## Stack

- NestJS 10 + TypeScript
- PostgreSQL + Prisma ORM
- Redis + BullMQ (procesamiento asincrono de mensajes entrantes)
- Socket.IO (WebSockets, namespace `/realtime`)
- JWT (passport-jwt) para las APIs internas
- Swagger/OpenAPI en `/docs`

## Modulos (`src/modules`)

`auth`, `users`, `businesses`, `whatsapp` (webhook + cliente Evolution API), `conversations`,
`messages`, `bot` (motor conversacional), `orders`, `customers`, `products`, `promotions`,
`pos`, `realtime`.

## Requisitos

- Node.js 20+
- Docker (para Postgres y Redis en desarrollo) — o instancias propias ya corriendo

## Puesta en marcha

```bash
npm install
cp .env.example .env
# Completa .env: como minimo revisa DATABASE_URL, JWT_SECRET.
# Para probar el envio real de WhatsApp, completa EVOLUTION_API_URL / EVOLUTION_API_KEY /
# EVOLUTION_INSTANCE_NAME (no hay credenciales reales incluidas en este repo).

docker compose up -d          # levanta Postgres y Redis
npx prisma migrate dev        # crea las tablas
npm run start:dev             # arranca el backend en modo watch
```

La API queda en `http://localhost:3000` y la documentacion Swagger de **todos los endpoints**
en `http://localhost:3000/docs`.

> Nota de este entorno de desarrollo: no hay Docker disponible en la sandbox donde se generó
> este proyecto, por lo que **no se pudo ejecutar `docker compose up` ni `prisma migrate dev`
> aquí**. Sí se verificó que `npm run build` compila sin errores y que la aplicación arranca y
> registra correctamente todos los módulos/rutas (falla únicamente al intentar conectar a una
> base de datos real, que es el comportamiento esperado sin Postgres). Debes ejecutar los
> comandos de arriba en tu máquina/servidor para levantar la base de datos real.

## Flujo minimo de prueba (via Swagger o curl)

1. `POST /auth/register` → crea el negocio (Business) y el usuario admin, devuelve `accessToken`.
2. `POST /auth/login` → alternativa para volver a obtener el token.
3. Con el token (`Authorization: Bearer ...`):
   - `POST /products` o `POST /products/upload` para cargar el catalogo.
   - `POST /promotions` para cargar promociones activas.
4. `PATCH /businesses/me/whatsapp-instance` con `{ "whatsappInstanceId": "tu-instancia" }` para
   asociar tu negocio con el nombre de instancia de Evolution API (asi el webhook sabe a que
   negocio pertenece cada mensaje entrante; soporta multiples negocios con multiples instancias).
5. Simula un mensaje entrante llamando a `POST /webhook/whatsapp` con un payload tipo Evolution
   API (`event: "messages.upsert"`), o conecta tu instancia real de Evolution API y apunta su
   webhook a esa URL. El header `x-webhook-secret` debe coincidir con `WHATSAPP_WEBHOOK_SECRET`.
6. El motor del bot procesa el mensaje de forma asincrona (BullMQ), interpreta la intencion
   contra el catalogo real, arma/actualiza el pedido (carrito) y responde automaticamente.
7. `GET /conversations`, `GET /conversations/:id`, `GET /messages/:conversationId` para ver todo
   desde el CRM. `GET /orders` para ver los pedidos.

## Notas de diseño relevantes

- **Multi-tenant**: todo dato de negocio lleva `businessId`; los endpoints protegidos infieren
  el `businessId` del JWT (no se puede leer ni escribir data de otro negocio).
- **`BotState`**: ademas del estado actual en `Conversation.state`, se guarda un log de
  transiciones en la tabla `BotState` (auditoria de intents/estados).
- **POS**: se implementa una interfaz `PosProvider` generica con un adaptador de referencia que
  solo deja log (no se especifico un POS real en el prompt). Para integrar un POS real, crear
  una clase que implemente `PosProvider` y reemplazar el provider en `pos.module.ts`.
- **Evolution API**: el cliente HTTP (`EvolutionApiService`) está parametrizado 100% por
  variables de entorno; si `EVOLUTION_INSTANCE_NAME` no está configurado, los envíos se
  simulan (log) en vez de fallar, para poder probar el flujo del bot sin una instancia real.

## Extension para el CRM (frontend)

Se agregaron campos y endpoints para que el frontend CRM (`D:\whatsappboot\frontend`) pueda
mostrar un indicador operativo por chat sin inferir nada por su cuenta:
- `Conversation`: `resolvedAt`, `lastInboundMessageAt`, `lastOutboundMessageAt`, `unreadCount`,
  `automationError`. `Business`: `waitingThresholdMinutes` (default 3).
- `GET /conversations` y `GET /conversations/:id` devuelven, ademas de los campos crudos, un
  campo calculado `operationalStatus` (`ERROR | RESOLVED | WAITING | IN_ORDER |
  HUMAN_ATTENTION | NEW | ACTIVE`, logica en
  [operational-status.ts](src/modules/conversations/operational-status.ts)), `activeOrderId`,
  `activeOrderStatus` y `lastMessagePreview`.
- Nuevos endpoints: `GET /orders/conversation/:conversationId`,
  `PATCH /conversations/:id/resolve`, `PATCH /conversations/:id/reopen`,
  `PATCH /businesses/me/settings` (`waitingThresholdMinutes`).
- Como con el resto del schema, hace falta correr `npx prisma migrate dev` para aplicar estas
  columnas nuevas a la base de datos.

### Quien envio cada mensaje (`Message.senderType`)

Cada `Message` saliente ahora indica quien lo genero (`senderType`:
`CUSTOMER | BOT | AGENT | SYSTEM | INTEGRATION`), mas `senderUserId`,
`senderNameSnapshot` (nombre del agente al momento del envio, para no perder
la referencia si despues cambia) y `automationRunId` (correlaciona la
respuesta del bot con el mensaje entrante que la disparo). Esto se decide
**siempre en el servidor**, nunca lo puede elegir el frontend:
- El webhook de WhatsApp crea mensajes entrantes como `CUSTOMER`.
- El motor del bot llama `MessagesService.sendOutbound` con `senderType: BOT`.
- `POST /messages/send` fuerza `senderType: AGENT` y toma `senderUserId`/
  `senderNameSnapshot` del usuario autenticado (JWT); el body solo acepta
  `{ conversationId, content }`, no puede suplantar a nadie.
- Las notificaciones del POS usan `INTEGRATION`.
- `SYSTEM` queda reservado para notas internas del timeline (no se pidio
  disparar automaticamente ninguna todavia; el soporte ya existe en
  `MessagesService.sendOutbound` para cuando se necesite). A diferencia de
  los demas tipos, `SYSTEM` **no se reenvia por WhatsApp** (ver
  `messages.service.ts` y su test `messages.service.spec.ts`).

### Liberar el control humano (`PATCH /conversations/:id/release-control`)

Contraparte de "tomar control": limpia `assignedUserId`, reactiva el bot solo si el body trae
`{ reactivateBot: true }` o si `Business.reactivateBotOnRelease` esta en `true` (y el body no
lo fuerza a `false`), nunca toca `resolvedAt`, y deja un mensaje `SYSTEM` en el historial
("Fulano liberó la conversación") sin reenviarlo por WhatsApp. El scoping por `businessId` (el
mismo patron que el resto de endpoints) impide liberar una conversacion de otro negocio.
Tests: [conversations.service.spec.ts](src/modules/conversations/conversations.service.spec.ts).

### Configuracion simple del bot (`/bot-config`)

Dos cosas personalizables por negocio, sin tocar codigo:
- **Textos** (`GET/PUT/DELETE /bot-config/templates/:key`): los 4 mensajes cortos y
  autocontenidos del bot (`GREETING`, `CANCEL`, `HUMAN_HANDOFF`, `FALLBACK`), con
  `{businessName}` como placeholder. `DELETE` restaura el texto por defecto. Los mensajes con
  listas dinamicas (menu, resumen de carrito) **no** son configurables aca a proposito: se
  siguen generando con datos reales del catalogo/pedido, no tiene sentido volverlos texto libre.
- **Palabras clave** (`GET/POST/DELETE /bot-config/keywords`): frases adicionales por
  intencion (`greeting`, `view_menu`, `confirm`, `cancel`, `talk_to_human`) que se suman a las
  reglas por defecto del bot (ej. agregar "que tienen" como sinonimo de "menu"). No aplica a
  `order`/`add_product`: esas intenciones se detectan por catalogo, no por palabra clave.

`BotEngineService` carga los overrides y las palabras clave del negocio en cada mensaje antes
de llamar a `IntentDetectorService`/`ResponseGeneratorService` — ver
[bot-engine.service.ts](src/modules/bot/bot-engine.service.ts). Tests:
[intent-detector.service.spec.ts](src/modules/bot/intent-detector.service.spec.ts),
[response-generator.service.spec.ts](src/modules/bot/response-generator.service.spec.ts).

## Despliegue

Pensado para desplegar en Coolify (o cualquier PaaS compatible con Docker): define las mismas
variables de `.env.example` como variables de entorno del servicio, usa `npm run build` +
`npm run start:prod`, y corre `npx prisma migrate deploy` como paso de release.
