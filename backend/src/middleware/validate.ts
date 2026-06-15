import { Request, Response, NextFunction } from 'express';
import { ZodType, ZodTypeAny } from 'zod';

export function validateBody<T>(schema: ZodType<T, ZodTypeAny['_def'], unknown>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(result.error);
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery<T>(schema: ZodType<T, ZodTypeAny['_def'], unknown>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      next(result.error);
      return;
    }
    // Store parsed + coerced values on req.validatedQuery AND back on req.query
    // so controllers reading either location get correct coerced types.
    (req as Request & { validatedQuery: T }).validatedQuery = result.data;
    req.query = result.data as Record<string, string>;
    next();
  };
}

export function validateParams<T>(schema: ZodType<T, ZodTypeAny['_def'], unknown>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      next(result.error);
      return;
    }
    next();
  };
}
