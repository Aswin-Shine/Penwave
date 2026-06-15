import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError, ValidationError } from '../shared/errors';
import { logger } from '../lib/logger';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  // Use request-scoped child logger if available (includes requestId)
  const log = (req as Request & { log?: typeof logger }).log ?? logger;

  log.error({
    message: err.message,
    // Stack goes to logs only — never to the response
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: (req as Request & { user?: { id: string } }).user?.id,
  });

  // Zod validation errors
  if (err instanceof ZodError) {
    const fields: Record<string, string[]> = {};
    err.errors.forEach((e) => {
      const key = e.path.join('.');
      if (!fields[key]) fields[key] = [];
      fields[key].push(e.message);
    });
    res.status(422).json({ success: false, message: 'Validation failed', fields });
    return;
  }

  if (err instanceof ValidationError) {
    res.status(err.statusCode).json({ success: false, message: err.message, fields: err.fields });
    return;
  }

  if (err instanceof AppError && err.isOperational) {
    res.status(err.statusCode).json({ success: false, message: err.message });
    return;
  }

  // Prisma known errors
  if (err.constructor.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as Error & { code: string; meta?: { target?: string[] } };
    if (prismaError.code === 'P2002') {
      const field = prismaError.meta?.target?.[0] ?? 'field';
      res.status(409).json({ success: false, message: `A record with this ${field} already exists` });
      return;
    }
    if (prismaError.code === 'P2025') {
      res.status(404).json({ success: false, message: 'Record not found' });
      return;
    }
  }

  // Unknown / non-operational errors.
  // Stack traces are NEVER sent to clients — they go to logs above.
  // Previously this leaked stacks when NODE_ENV=development, which created
  // an information disclosure risk on accidental prod deploys with wrong env.
  res.status(500).json({ success: false, message: 'An unexpected error occurred' });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
}
