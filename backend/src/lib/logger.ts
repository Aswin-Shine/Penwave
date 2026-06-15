import winston from 'winston';
import { env } from '../config/env';
import type { Request, Response, NextFunction } from 'express';

const { combine, timestamp, errors, json, colorize, simple } = winston.format;

const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  simple()
);

const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: env.NODE_ENV === 'production' ? prodFormat : devFormat,
  defaultMeta: { service: 'penwave-api' },
  transports: [
    // Console only — Promtail collects container stdout/stderr and ships to Loki.
    // File transports removed: read_only container filesystem blocks writes to logs/.
    new winston.transports.Console(),
  ],
});

/**
 * Express middleware that attaches a child logger with the request ID to
 * `req.log`. Every subsequent log call using req.log will include
 * { requestId } in the structured output, making it trivial to correlate
 * all log lines for a single request in Loki/Grafana.
 *
 * Usage in route handlers:
 *   req.log.info({ event: 'post.created', postId });
 *
 * The requestId is set upstream in app.ts from the X-Request-ID header.
 */
export function requestLoggerMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const requestId = req.headers['x-request-id'] as string | undefined;
  (req as Request & { log: winston.Logger }).log = logger.child({
    requestId,
    method: req.method,
    path: req.path,
  });
  next();
}

// Augment the Express Request type globally so req.log is typed everywhere.
declare global {
  namespace Express {
    interface Request {
      log: winston.Logger;
    }
  }
}
