// HEALTHCHECK del contenedor: golpea GET /health sin depender de curl/wget
// (no vienen instalados en node:alpine). Sale 0 si responde 200, 1 si no.
const http = require('http');

const port = process.env.PORT || 3000;

const req = http.get(`http://127.0.0.1:${port}/health`, (res) => {
  process.exit(res.statusCode === 200 ? 0 : 1);
});

req.on('error', () => process.exit(1));
req.setTimeout(4000, () => {
  req.destroy();
  process.exit(1);
});
