# Estado del proyecto y plan hacia un SaaS completo

**Proyecto:** CRM de pedidos por WhatsApp (bot + panel humano) — multi-negocio
**Fecha del análisis:** 2026-08-07
**Repo:** `whatsappboot` (backend NestJS + frontend React, desplegado en Coolify)

> Este documento es un diagnóstico técnico honesto: qué existe, qué falta, qué puede romperse en producción tal como está hoy, y un plan estructurado para cerrar la brecha hasta un SaaS multi-cliente cobrable. No asume nada que no esté en el código — donde falta evidencia, se marca como "no verificado".

---

## 1. Resumen ejecutivo

Lo que hay hoy es un **producto funcional de un solo tipo de negocio (restaurante/pickup) operado manualmente por vos como superadmin**, no todavía un SaaS autoservicio. La arquitectura multi-tenant (aislamiento por `businessId`) está bien resuelta y es la base correcta. Falta la capa de **negocio-del-negocio**: cobro, alta autoservicio, límites por plan, seguridad de borde, observabilidad y resiliencia operativa. Es decir: el motor del producto existe: le falta la carrocería de "empresa que vende software".

**Nivel de madurez estimado:** MVP funcional en producción con un cliente piloto (Fat Boy Mexicali). Apto para 1–3 negocios pilotados a mano por vos. **No apto todavía** para alta autoservicio ni para escalar sin supervisión constante.

---

## 2. Qué está desarrollado (inventario real)

### 2.1 Backend (NestJS + Prisma + PostgreSQL + Redis/BullMQ)

| Área | Estado | Detalle |
|---|---|---|
| Multi-tenancy | ✅ Sólido | Todo modelo tiene `businessId`, guards (`JwtAuthGuard`, `RolesGuard`, `SuperAdminGuard`) filtran por tenant. `@BusinessId()` decorator saca el tenant del JWT, no del body/params (evita fuga entre negocios por request manipulada). |
| Autenticación | ✅ Básica | Login JWT + bcrypt. Roles `ADMIN`/`AGENT` por negocio + flag `isSuperAdmin` para el dueño de la plataforma. |
| Alta de negocios | ⚠️ Solo superadmin | `POST /superadmin/businesses` — no hay registro público/self-service. |
| WhatsApp (Evolution API) | ✅ Completo para 1 instancia por negocio | Webhook entrante, cola BullMQ para procesar mensajes async, aprovisionamiento de instancia + QR desde el panel superadmin, reintento si falla el provisioning. |
| Motor de bot | ✅ Bastante desarrollado | Máquina de estados de conversación (saludo → nombre → promos → categorías → menú → armado de pedido → confirmación), detección de intención por palabra clave configurable por negocio, plantillas de texto editables, catálogo dinámico con alias. |
| CRM de conversaciones | ✅ Completo | Toma/liberación de control humano, resolución de chats, WebSocket en tiempo real (Socket.IO namespace `/realtime`, rooms por `businessId`), estados operativos (esperando, atendido, etc.). |
| Catálogo (productos/promos) | ✅ Completo | CRUD + carga masiva CSV, activar/desactivar. |
| Pedidos | ✅ Completo (flujo interno) | Carrito → confirmación → envío a POS → estados (listo/entregado) con notificación automática al cliente. |
| Integración POS | ⚠️ Solo interfaz + stub | `PosProvider` es una interfaz limpia, pero la única implementación (`LoggingPosProvider`) **solo escribe un log**. No hay conector real a ningún POS (Square, Toast, local, etc.). |
| Tablero KDS (cocina) | ✅ Nuevo, funcional | Vista en vivo de pedidos para cocina. |
| Panel Superadmin | ✅ Nuevo, funcional | Listado de negocios, alta con QR de WhatsApp, estado de conexión en vivo. |
| Tests | ⚠️ Parcial | 8 archivos `.spec.ts` (guards, intent-detector, response-generator, orders, conversations, messages, superadmin). Cobertura no medida; no hay tests e2e ni de los módulos de negocio/CRUD (products, promotions, businesses, whatsapp webhook). |
| Documentación de despliegue | ✅ Muy buena | `DEPLOY.md` documenta paso a paso Coolify, variables de entorno, y hasta bugs ya resueltos durante el despliegue real. |
| Health check | ✅ | `/health` valida conexión a DB, usado por Coolify. |

### 2.2 Frontend (React 19 + Vite + Zustand + Tailwind)

- Login, lista de chats con filtros/búsqueda, ventana de chat con envío manual, panel de administración (productos, promociones, configuración del bot, ajustes del negocio), KDS, contactos, panel Superadmin completo (alta de negocio + QR).
- WebSocket centralizado con una sola fuente de conexión (ya corregido un bug de conexiones duplicadas).

### 2.3 Infraestructura

- Desplegado en Coolify: backend y frontend como Applications separadas, Postgres y Redis dedicados, dominios propios con HTTPS (Traefik/Let's Encrypt), Evolution API como servicio externo ya operativo.
- Dockerfiles funcionando (con fixes ya aplicados: OpenSSL en Alpine, `NODE_ENV` en build, puerto del Nginx, secretos no expuestos en build).

---

## 3. Qué falta para ser un SaaS completo (multi-cliente, autoservicio, cobrable)

Agrupado por qué tan bloqueante es para vender esto a terceros sin que vos operes cada alta a mano.

### 3.1 Bloqueante — negocio no puede vender sin esto

1. **Facturación / suscripciones.** No existe ningún modelo de plan, ciclo de cobro, ni integración con pasarela de pago (Stripe, MercadoPago, etc.). Hoy un negocio nuevo se crea gratis y para siempre.
2. **Alta autoservicio (self-signup).** El único camino para crear un negocio es `POST /superadmin/businesses`, protegido por `isSuperAdmin` — es decir, lo hacés vos a mano. Para SaaS real hace falta un flujo público de registro (con verificación de email, términos, etc.).
3. **Límites por plan / cuotas.** No hay tope de mensajes, usuarios, productos, ni conversaciones por negocio. Un solo tenant pesado puede saturar recursos compartidos (Redis, cola, conexiones WS) sin que nadie lo note hasta que ya afecta a otros.
4. **Recuperación de contraseña / gestión de cuenta.** No hay "olvidé mi contraseña", ni cambio de email, ni invitación de usuarios por link (el alta de empleados hoy la hace un ADMIN a mano con password en texto plano vía API).
5. **Aislamiento de instancias de WhatsApp a escala.** Cada negocio = 1 instancia de Evolution API en el mismo servidor de Evolution. No está validado (ni documentado) cuántas instancias soporta esa instalación de Evolution API antes de degradarse. Con 20-50 negocios esto puede ser el primer cuello de botella real.

### 3.2 Importante — funciona pero es frágil o incompleto

6. **Integración POS real.** Sigue siendo un stub que solo loguea. Sin esto, "enviar a POS" es cosmético — ningún negocio con POS real (la mayoría) puede operar el flujo completo sin trabajo manual.
7. **Seguridad de borde (hardening HTTP).** Sin `helmet` (headers de seguridad), sin rate limiting en ningún endpoint (`/auth/login` es fuerza-bruteable sin límite), sin protección explícita contra abuso del webhook público de WhatsApp más allá del secret compartido.
8. **Auditoría.** No hay registro de "quién hizo qué" (cambios de precio, quién tomó/liberó una conversación, quién creó un usuario). Para soporte a clientes reales y disputas, esto se vuelve necesario rápido.
9. **Observabilidad.** No hay logging estructurado centralizado, ni métricas (Prometheus/Grafana), ni alerting, ni tracking de errores (Sentry). Hoy "monitorear" significa mirar logs de Coolify a mano.
10. **Escalado horizontal del WebSocket.** El propio `DEPLOY.md` ya lo advierte: el gateway mantiene el estado de rooms en memoria de un solo proceso. Con más de 1 réplica del backend, los mensajes en tiempo real se pierden para clientes conectados a la réplica equivocada. Bloquea escalar el backend sin más trabajo.
11. **Backups y recuperación ante desastres.** No hay evidencia de backup automatizado de Postgres, ni plan de restore documentado o probado.
12. **Multi-idioma / localización.** Todo el bot y las plantillas están en español fijo; si el plan es vender a negocios de otros países/idiomas, falta esa capa.
13. **Tests insuficientes para confiar en cambios rápidos.** 8 specs, sin e2e, sin cobertura del webhook de WhatsApp (la pieza más crítica y más difícil de debuggear en producción) ni de products/promotions/businesses.
14. **Gestión de usuarios incompleta.** No hay "eliminar usuario", "desactivar usuario", ni cambio de rol después de creado.
15. **Onboarding del negocio.** No hay checklist guiado ni wizard: cargar catálogo, configurar bot, conectar WhatsApp son pasos manuales y separados, sin guía para un dueño de restaurante no técnico.

### 3.3 Deseable — mejora la propuesta de valor, no bloquea vender

16. Reportes/analytics para el dueño del negocio (ventas por período, productos más pedidos, tiempo de respuesta).
17. Delivery real (hoy el modelo solo soporta pickup — `FulfillmentType.DELIVERY` existe en el enum pero no hay flujo de dirección/costo de envío).
18. Métodos de pago dentro del chat (link de pago, confirmación automática).
19. Multi-agente con colas/reparto automático de conversaciones (hoy es "tomar control" manual).
20. App / notificaciones push para el dueño del negocio (hoy todo es vía navegador abierto).

---

## 4. Qué puede fallar hoy (riesgos concretos en producción actual)

| Riesgo | Probabilidad | Impacto | Causa raíz | Mitigación |
|---|---|---|---|---|
| ~~Fuerza bruta sobre `/auth/login`~~ | — | — | ~~Sin rate limiting~~ | ✅ Resuelto: `@nestjs/throttler` global (`1a7eddf`) |
| Caída de mensajes en tiempo real al escalar a 2+ réplicas | Media (si crecés) | Operador no ve chats nuevos sin refrescar | Estado de WS en memoria de un proceso | Redis adapter para Socket.IO antes de escalar réplicas |
| ~~Pérdida total de datos ante falla de Postgres~~ | — | — | ~~No hay backup verificado~~ | ✅ Resuelto: backup diario a R2 (30d) + restore probado (2026-08-07) |
| Evolution API se satura con muchas instancias | Media si crecen negocios | WhatsApp deja de responder para varios negocios a la vez | Una sola instalación de Evolution API sin límite documentado | Probar carga, definir tope de negocios por instancia de Evolution, documentar plan de escalado |
| Pedido "enviado a POS" pero nunca llega al POS real | Alta (para cualquier negocio con POS) | El negocio cree que el pedido fue procesado y no lo fue | `LoggingPosProvider` es un stub | Implementar conector real o dejar clarísimo en el producto que es "simulado" |
| Un negocio con mucho tráfico afecta a los demás | Media | Degradación cruzada entre tenants (noisy neighbor) | Sin límites de uso ni colas separadas por negocio | Cuotas por plan + límites de rate por `businessId` en la cola BullMQ |
| Webhook de WhatsApp cae en un estado raro sin alertar | Media | Bot deja de responder sin que nadie lo note hasta que el cliente se queja | Sin monitoreo activo ni alerting | Sentry + alerta si `/health` falla o si no llegan webhooks en X minutos |
| ~~Un ADMIN filtra/pierde su password porque no hay reseteo propio~~ | — | — | ~~Falta flujo de "olvidé mi contraseña"~~ | ✅ Resuelto: reset por email con token de un solo uso (`c039e01`) |
| Falta de auditoría dificulta resolver disputas ("yo no cambié ese precio") | Media con más usuarios por negocio | Soporte lento, desconfianza del cliente | Sin tabla de auditoría | Agregar `AuditLog` mínimo en acciones sensibles |

---

## 5. Plan estructurado de mejoras (por fases)

### Fase 0 — Endurecer lo que ya está en producción (1–2 semanas)
Objetivo: que lo que ya vendés hoy no se caiga ni se rompa por descuido básico.

- [x] `@nestjs/throttler` como guard global (`APP_GUARD` en `app.module.ts`) — cubre `/auth/login` y el resto de endpoints por defecto. *(`1a7eddf`, 2026-08-07)*
- [x] `helmet` — headers de seguridad HTTP aplicados globalmente en `main.ts` (CSP desactivada porque `/docs` sirve Swagger UI con scripts inline). *(2026-08-07)*
- [x] Reset de contraseña vía email (token de un solo uso, expira). *(`c039e01`, 2026-08-07)*
- [x] Backup automático de Postgres en Coolify (diario 3am UTC a Cloudflare R2, retención 30 días en S3 / 3 días local) + prueba real de restore verificada con datos íntegros. Runbook documentado en `DEPLOY.md` §6. *(2026-08-07)*
- [x] Sentry para errores de backend y frontend — desplegado y verificado en producción (evento de prueba confirmado en Sentry → Issues en <1 min). Detalle en `DEPLOY.md` §7. *(2026-08-07)*
- [ ] **(Pospuesto a propósito, 2026-08-07)** Alerta simple si `/health` falla o si el webhook de WhatsApp no recibe eventos en X minutos (uptime monitor tipo Better Uptime / UptimeRobot apuntando a `/health`). Decisión consciente: no bloquea vender, se retoma cuando el resto de Fase 0/1 esté más avanzado.
- [ ] **(Pospuesto a propósito, 2026-08-07)** Completar tests: webhook de WhatsApp, products, promotions, businesses (subir de 8 a al menos ~20 specs, priorizando el camino crítico del bot). Misma razón que arriba.

### Fase 1 — Convertirlo en multi-tenant autoservicio (3–5 semanas)
Objetivo: que un negocio nuevo se pueda dar de alta sin que vos hagas nada a mano.

- [ ] Flujo público de registro (`POST /auth/register` con verificación de email) que cree negocio + admin, reemplazando la dependencia total del panel superadmin para altas nuevas (el superadmin queda para gestión/soporte, no como único canal de alta).
- [ ] Modelo de planes: tabla `Plan` (nombre, límites: usuarios, productos, mensajes/mes) + campo `planId` en `Business`.
- [ ] Enforcement de límites: middleware/guard que rechaza acciones si el negocio superó su cuota (con mensaje claro, no un 500).
- [ ] Wizard de onboarding en el frontend: conectar WhatsApp → cargar catálogo (o CSV de ejemplo) → configurar bot → listo para recibir pedidos.
- [ ] Gestión completa de usuarios: desactivar, cambiar rol, invitación por link en vez de password creado a mano.
- [ ] `AuditLog` mínimo (quién, qué acción, cuándo) en: cambios de catálogo, cambios de configuración del bot, alta/baja de usuarios, toma/liberación de control de conversación.

### Fase 2 — Cobro y sostenibilidad del negocio (3–4 semanas, en paralelo con Fase 1 si hay dos personas)
Objetivo: que el SaaS efectivamente facture.

- [ ] Integración con pasarela de pago (Stripe recomendado si hay clientes internacionales; MercadoPago si es México/LatAm — a definir según mercado objetivo).
- [ ] Suscripción recurrente + webhook de la pasarela para activar/suspender negocios automáticamente por impago.
- [ ] Página de precios + checkout dentro del flujo de registro.
- [ ] Trial gratuito con límite de tiempo o de mensajes, con downgrade automático a "solo lectura" al vencer si no paga.
- [ ] Panel de facturación para el dueño del negocio (ver plan actual, historial de pagos, cambiar de plan).

### Fase 3 — Escalado y resiliencia operativa (2–3 semanas, cuando haya tracción real, no antes)
Objetivo: soportar crecimiento sin reescribir nada.

- [ ] Redis adapter para Socket.IO (desbloquea correr 2+ réplicas del backend).
- [ ] Prueba de carga de Evolution API con N instancias simultáneas; documentar el límite real y el plan de sharding (múltiples instalaciones de Evolution API repartidas por negocio) si hace falta.
- [ ] Colas BullMQ con límite de concurrencia por `businessId` (evita que un negocio con mucho tráfico ahogue a los demás).
- [ ] Métricas (Prometheus + Grafana o el stack que uses en Coolify) para: mensajes/min por negocio, latencia del bot, jobs fallidos en cola.
- [ ] Runbook de incidentes (qué mirar primero si "el bot dejó de responder", con los checks del `DEPLOY.md` como base).

### Fase 4 — Diferenciación de producto (continuo, según feedback de clientes reales)
Objetivo: que valga más que "un bot de WhatsApp genérico".

- [ ] Conector POS real (empezar por el POS más común entre tus primeros clientes).
- [ ] Flujo de delivery con dirección y costo de envío (el enum `FulfillmentType.DELIVERY` ya existe en el esquema, falta el flujo).
- [ ] Reportes de ventas y analytics por negocio.
- [ ] Pago dentro del chat (link de pago automático al confirmar pedido).
- [ ] Reparto automático de conversaciones entre agentes (hoy es 100% manual).

---

## 6. Priorización recomendada (si solo pudieras hacer 5 cosas ya)

1. ~~Rate limiting + helmet en endpoints públicos~~ — ✅ hecho (2026-08-07).
2. ~~Reset de password~~ — ✅ hecho (2026-08-07).
3. ~~Backup automático de Postgres verificado~~ — ✅ hecho, con restore probado (2026-08-07).
4. ~~Alerting básico (Sentry)~~ — ✅ hecho (2026-08-07). Falta el uptime monitor externo.
5. Definir y construir el flujo de cobro (Fase 2) — sin esto, técnicamente no es un SaaS, es una herramienta interna que usan terceros gratis.

---

## 7. Notas finales

- La base arquitectónica (multi-tenant real, colas, WebSocket, máquina de estados del bot) está bien pensada y no hace falta reescribirla — el trabajo que falta es mayormente **capas alrededor**, no refactor del core.
- El mayor riesgo inmediato no es "falta una feature", es **falta de red de seguridad operativa** (backups, alertas, rate limiting) mientras ya hay un negocio real en producción.
- Recomiendo tratar la Fase 0 como no negociable antes de aceptar un segundo negocio real, y la Fase 1+2 como el verdadero "lanzamiento" del SaaS — todo lo anterior a eso es, en la práctica, un servicio a medida para un cliente, no una plataforma que se vende sola.
