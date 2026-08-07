import { parseCorsOrigins } from './cors';
import { resolveRedisConnection } from './redis';

export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  corsOrigins: parseCorsOrigins(),
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: resolveRedisConnection(),
  jwt: {
    secret: process.env.JWT_SECRET ?? 'change-this-secret',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },
  evolutionApi: {
    url: process.env.EVOLUTION_API_URL,
    apiKey: process.env.EVOLUTION_API_KEY,
  },
  whatsapp: {
    webhookSecret: process.env.WHATSAPP_WEBHOOK_SECRET ?? '',
  },
  /** URL publica de este backend (sin slash final), para que el superadmin
   *  pueda registrar automaticamente el webhook de cada instancia nueva de
   *  Evolution API apuntando a {appUrl}/webhook/whatsapp. */
  appUrl: (process.env.APP_URL ?? '').replace(/\/$/, ''),
  pos: {
    webhookSecret: process.env.POS_WEBHOOK_SECRET ?? '',
  },
  /**
   * Proteccion anti fuerza bruta. Dos capas independientes, ambas aplican
   * a /auth/login sin importar el rol (superadmin, ADMIN o AGENT usan el
   * mismo endpoint):
   *  - throttle: limite de intentos por IP en una ventana de tiempo
   *    (bloquea ataques automatizados desde una sola direccion).
   *  - lockout: bloqueo de LA CUENTA (por email) tras N intentos fallidos,
   *    sin importar desde cuantas IPs distintas vengan (bloquea ataques
   *    distribuidos/rotacion de IP contra un usuario puntual).
   */
  authSecurity: {
    loginThrottleLimit: parseInt(process.env.LOGIN_THROTTLE_LIMIT ?? '5', 10),
    loginThrottleTtlMs: parseInt(process.env.LOGIN_THROTTLE_TTL_MS ?? '60000', 10),
    loginMaxFailedAttempts: parseInt(process.env.LOGIN_MAX_FAILED_ATTEMPTS ?? '5', 10),
    loginLockoutMinutes: parseInt(process.env.LOGIN_LOCKOUT_MINUTES ?? '15', 10),
    passwordResetTtlMinutes: parseInt(
      process.env.PASSWORD_RESET_TTL_MINUTES ?? '60',
      10,
    ),
    passwordResetThrottleLimit: parseInt(
      process.env.PASSWORD_RESET_THROTTLE_LIMIT ?? '3',
      10,
    ),
    passwordResetThrottleTtlMs: parseInt(
      process.env.PASSWORD_RESET_THROTTLE_TTL_MS ?? '600000',
      10,
    ),
  },
  /** URL publica del CRM (frontend, SIN slash final). Se usa para armar el
   *  link de "olvide mi contraseña" que se envia por email, ej.
   *  {frontendUrl}/reset-password?token=... */
  frontendUrl: (process.env.FRONTEND_URL ?? '').replace(/\/$/, ''),
  smtp: {
    host: process.env.SMTP_HOST ?? '',
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.SMTP_FROM ?? 'no-reply@localhost',
  },
});
