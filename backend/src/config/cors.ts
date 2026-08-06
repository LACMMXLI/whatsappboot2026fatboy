/**
 * CORS_ORIGINS: lista separada por comas de origenes permitidos (el/los
 * dominios del CRM en produccion), ej. "https://crm.tudominio.com". Sin
 * definir, se permite cualquier origen (comodo en desarrollo local; DEBE
 * configurarse en produccion). Compartido entre el CORS de las APIs REST
 * (main.ts, via ConfigService) y el del WebSocketGateway (que necesita el
 * valor de forma sincrona al decorar la clase, antes de que exista el
 * ConfigService).
 */
export function parseCorsOrigins(): string[] | true {
  const raw = process.env.CORS_ORIGINS;
  if (!raw || raw.trim() === '') {
    return true;
  }
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}
