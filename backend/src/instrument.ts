// Debe importarse ANTES que cualquier otro modulo (ver primera linea de
// src/main.ts) para que Sentry pueda instrumentar el resto de la app.
import * as Sentry from '@sentry/nestjs';

const dsn = process.env.SENTRY_DSN;

// Sin SENTRY_DSN configurado, Sentry.init queda deshabilitado (no-op) y el
// resto de la app funciona igual que antes de agregar esto — util en
// desarrollo local donde no hace falta reportar errores.
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    // Trazas de performance: 100% en desarrollo, muestreo bajo en produccion
    // para no consumir la cuota gratuita del plan con trafico real.
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });
}
