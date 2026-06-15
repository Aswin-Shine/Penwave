/**
 * Health & Readiness endpoints for Penwave backend.
 *
 * DROP THIS FILE INTO: backend/src/middleware/health.ts
 *
 * Then in app.ts (before route handlers):
 *   import { livenessHandler, readinessHandler } from './middleware/health';
 *   app.get('/health', livenessHandler);
 *   app.get('/ready',  readinessHandler);
 *
 * NOTE: /health already exists in app.ts with a DB check.
 * Replace it with these two split endpoints for proper K8s-style probes.
 *
 * /health  — liveness:  is the process alive?  (no DB check — avoids restart loops)
 * /ready   — readiness: can we serve traffic?  (checks DB + Redis)
 */

import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';

const startTime = Date.now();

/** Liveness — process is running. Fast, no external calls. */
export function livenessHandler(_req: Request, res: Response): void {
  res.json({
    status: 'ok',
    service: 'penwave-api',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
  });
}

/** Readiness — all dependencies reachable. Used by load balancer. */
export async function readinessHandler(_req: Request, res: Response): Promise<void> {
  const checks: Record<string, 'ok' | 'error'> = {};
  let healthy = true;

  // Database check
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
    healthy = false;
  }

  // Redis check
  try {
    const pong = await redis.ping();
    checks.redis = pong === 'PONG' ? 'ok' : 'error';
    if (checks.redis === 'error') healthy = false;
  } catch {
    checks.redis = 'error';
    healthy = false;
  }

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ready' : 'not_ready',
    service: 'penwave-api',
    checks,
    timestamp: new Date().toISOString(),
  });
}
