# CRM WhatsApp — Frontend

CRM tipo WhatsApp Web para operar (caja, cocina, atencion) las conversaciones del backend
NestJS (`D:\whatsappboot\backend`). Pensado para tablet: botones grandes, sin menus anidados,
tema oscuro, todo visible sin cambiar de pantalla.

## Stack

- React 19 + Vite + TypeScript
- Tailwind CSS v4 (tema oscuro fijo)
- Zustand (estado global)
- `socket.io-client` (tiempo real, namespace `/realtime` del backend)
- Sin router (solo hay login + CRM) y sin axios (fetch wrapper propio en
  [lib/apiClient.ts](src/lib/apiClient.ts))

## Puesta en marcha

```bash
npm install
cp .env.example .env
# Ajusta VITE_API_URL / VITE_WS_URL si el backend no corre en localhost:3000
npm run dev
```

Requiere el backend corriendo (ver `D:\whatsappboot\backend\README.md`) con al menos un
usuario creado (`POST /auth/register`) y, si quieres ver mensajes reales, una instancia de
Evolution API conectada.

## Estructura

```
src/
  lib/          apiClient (fetch+JWT), socket (socket.io), operationalStatus (fallback), time
  types/        tipos que reflejan los DTOs reales del backend
  store/        authStore (sesion, persistida) y conversationsStore (conversaciones/mensajes/pedidos)
  api/          llamadas REST por recurso (auth, conversations, messages, orders)
  hooks/        useRealtime (conecta los eventos de socket con el store)
  components/
    auth/         LoginScreen
    layout/       AppShell (grid sidebar + chat, colapsa a 1 columna en <768px)
    chat-list/    ChatList, ChatItem, SearchBar, StatusBadge
    chat-window/  ChatWindow, MessageBubble, ChatInput, EmptyState
    order-panel/  OrderPanel (pedido visible dentro del chat, sin modal)
    controls/     BotToggle, TakeControlButton, ResolveButton
```

## Estado operativo del chat (`operationalStatus`)

El backend calcula y devuelve `operationalStatus` en cada conversacion
(`ERROR | RESOLVED | WAITING | IN_ORDER | HUMAN_ATTENTION | NEW | ACTIVE`, en ese orden de
prioridad) segun el estado real del bot, el pedido activo, quien esta a cargo y cuanto tiempo
paso desde el ultimo mensaje del cliente. El frontend solo lo pinta
([StatusBadge](src/components/chat-list/StatusBadge.tsx)); no lo infiere. Si algun payload
llegara sin ese campo, [lib/operationalStatus.ts](src/lib/operationalStatus.ts) replica la
misma logica como respaldo — debe mantenerse igual a
`backend/src/modules/conversations/operational-status.ts` si esa logica cambia.

## Mensajes: quien los envio (`senderType`)

Cada mensaje trae `senderType` (`CUSTOMER | BOT | AGENT | SYSTEM | INTEGRATION`), decidido
siempre por el backend. `MessageBubble` lo usa para diferenciar burbujas: cliente a la
izquierda, bot/agente/integracion a la derecha (con etiqueta), y `SYSTEM` como una nota
centrada discreta (no una burbuja de chat).

## Flujo de uso

1. Login → conecta el socket automaticamente con el token.
2. La lista de chats se carga y se mantiene actualizada en vivo
   (`conversation.new` / `conversation.updated`).
3. Al tocar un chat se cargan sus mensajes y su pedido activo (si tiene) en paralelo; el
   backend marca la conversacion como leida en ese momento.
4. Responder, activar/desactivar el bot, tomar control, liberar control o marcar como resuelto
   son botones grandes dentro del mismo panel de chat — no hay que navegar a otra pantalla.
   "Liberar control" solo aparece si hay un agente asignado o el bot esta desactivado.

## Limitaciones conocidas

- No hay pantalla de registro/alta de negocio (se hace por la API/Swagger del backend); este
  frontend es solo para la operacion diaria con un usuario ya creado.
- No se pudo probar el flujo end-to-end contra un backend real en este entorno (sin Docker
  disponible para levantar Postgres/Redis); se verifico que el build compila y que la pantalla
  de login renderiza correctamente en un viewport de tablet (768x1024).
