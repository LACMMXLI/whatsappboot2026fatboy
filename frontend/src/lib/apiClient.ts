const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

let unauthorizedHandler: (() => void) | null = null;

/** Registrado una vez desde authStore para cerrar sesion ante un 401. */
export function onUnauthorized(handler: () => void): void {
  unauthorizedHandler = handler;
}

let getToken: () => string | null = () => null;

export function setTokenGetter(fn: () => string | null): void {
  getToken = fn;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(options.body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> | undefined),
  };

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (response.status === 401) {
    unauthorizedHandler?.();
    throw new ApiError(401, 'No autorizado');
  }

  if (!response.ok) {
    let message = `Error ${response.status}`;
    try {
      const body = await response.json();
      message = body.message ?? message;
    } catch {
      // respuesta sin cuerpo JSON, se mantiene el mensaje generico
    }
    throw new ApiError(response.status, message);
  }

  // Algunos endpoints (ej. DELETE) devuelven 200/204 sin cuerpo.
  const text = await response.text();
  if (!text) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  /** Para endpoints multipart (ej. subir un CSV). No setea Content-Type: el
   * navegador arma el boundary correcto a partir del FormData. */
  postForm: <T>(path: string, formData: FormData) =>
    request<T>(path, { method: 'POST', body: formData }),
};
