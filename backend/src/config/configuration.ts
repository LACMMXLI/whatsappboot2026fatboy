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
    instanceName: process.env.EVOLUTION_INSTANCE_NAME,
  },
  whatsapp: {
    webhookSecret: process.env.WHATSAPP_WEBHOOK_SECRET ?? '',
  },
  pos: {
    webhookSecret: process.env.POS_WEBHOOK_SECRET ?? '',
  },
});
