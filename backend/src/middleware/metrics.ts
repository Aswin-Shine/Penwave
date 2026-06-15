import { Request, Response, NextFunction } from 'express';
import client from 'prom-client';

const register = new client.Registry();
client.collectDefaultMetrics({ register, prefix: 'nodejs_' });

export const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [register],
});

export const httpActiveRequests = new client.Gauge({
  name: 'http_active_requests',
  help: 'Number of active HTTP requests',
  registers: [register],
});

export const httpErrorsTotal = new client.Counter({
  name: 'http_errors_total',
  help: 'Total number of HTTP errors (4xx + 5xx)',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

function normalizeRoute(req: Request): string {
  if (req.route?.path) {
    return (req.baseUrl ?? '') + req.route.path;
  }
  return req.path
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
    .replace(/\/\d+/g, '/:id');
}

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (req.path === '/metrics') return next();

  const start = process.hrtime.bigint();
  httpActiveRequests.inc();

  res.on('finish', () => {
    const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;
    const route = normalizeRoute(req);
    const labels = {
      method: req.method,
      route,
      status: String(res.statusCode),
    };
    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe(labels, durationSeconds);
    httpActiveRequests.dec();
    if (res.statusCode >= 400) {
      httpErrorsTotal.inc(labels);
    }
  });

  next();
}

export async function metricsHandler(_req: Request, res: Response): Promise<void> {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
}

export { register };