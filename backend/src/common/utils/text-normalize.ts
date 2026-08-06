/**
 * Normaliza texto para comparaciones tolerantes a mayusculas/acentos:
 * minusculas, sin acentos, espacios colapsados y recortados.
 * Reutilizado por la busqueda de productos y por el detector de intenciones del bot.
 */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}
