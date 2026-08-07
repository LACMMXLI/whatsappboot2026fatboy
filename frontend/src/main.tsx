import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.tsx'

// Sin VITE_SENTRY_DSN configurado (ej. en desarrollo local), Sentry.init
// queda deshabilitado y la app funciona igual que antes de agregar esto.
const sentryDsn = import.meta.env.VITE_SENTRY_DSN
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<p>Ocurrio un error inesperado. Recarga la pagina.</p>}>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>,
)
