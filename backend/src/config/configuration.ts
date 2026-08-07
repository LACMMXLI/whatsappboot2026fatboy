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
});
