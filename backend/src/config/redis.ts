export interface RedisConnectionConfig {
  host: string;
  port: number;
  password?: string;
  tls?: Record<string, never>;
}

/**
 * Resuelve la conexion a Redis. Preferido: REDIS_HOST/REDIS_PORT/REDIS_PASSWORD
 * (variables sueltas). Si en cambio se define REDIS_URL (formato
 * redis://[:password@]host:port o rediss:// para TLS, tipico de servicios
 * gestionados como el Redis de Coolify), se parsea y tiene prioridad.
 */
export function resolveRedisConnection(): RedisConnectionConfig {
  const url = process.env.REDIS_URL;
  if (url) {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parsed.port ? parseInt(parsed.port, 10) : 6379,
      password: parsed.password || undefined,
      ...(parsed.protocol === 'rediss:' ? { tls: {} } : {}),
    };
  }

  return {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  };
}
