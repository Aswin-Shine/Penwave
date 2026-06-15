import express, { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import morgan from 'morgan';

import { env } from './config/env';
import { logger, requestLoggerMiddleware } from './lib/logger';
import { globalRateLimiter } from './middleware/rateLimiter';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { metricsMiddleware, metricsHandler } from './middleware/metrics';
import { livenessHandler, readinessHandler } from './middleware/health';

import { authRouter } from './modules/auth/auth.routes';
import { postsRouter } from './modules/posts/posts.routes';
import { commentsRouter } from './modules/comments/comments.routes';
import { likesRouter } from './modules/likes/likes.routes';
import { bookmarksRouter } from './modules/bookmarks/bookmarks.routes';
import { usersRouter } from './modules/users/users.routes';
import { notificationsRouter } from './modules/notifications/notifications.routes';
import { searchRouter } from './modules/search/search.routes';
import { analyticsRouter } from './modules/analytics/analytics.routes';
import { tagsRouter } from './modules/tags/tags.routes';

function metricsAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const secret = env.METRICS_SECRET;
  if (!secret) { res.status(404).end(); return; }
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  const queryToken = req.query['token'] as string | undefined;
  const provided = bearerToken ?? queryToken;
  if (!provided || provided !== secret) { res.status(401).set('WWW-Authenticate', 'Bearer').end(); return; }
  next();
}

export function createApp(): Application {
  const app = express();

  app.set('trust proxy', 1);

  app.use(helmet({
    contentSecurityPolicy: {
      directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
    },
    crossOriginEmbedderPolicy: false,
  }));

  app.use(cors({
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID'],
    exposedHeaders: ['X-Total-Count'],
  }));

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser(env.COOKIE_SECRET));
  app.use(metricsMiddleware);
  app.use(compression());

  // Assign X-Request-ID before the child logger so every log line carries it
  app.use((req, _res, next) => {
    if (!req.headers['x-request-id']) req.headers['x-request-id'] = crypto.randomUUID();
    next();
  });

  // Attach req.log = logger.child({ requestId, method, path })
  app.use(requestLoggerMiddleware);

  app.use(morgan('combined', {
    stream: { write: (msg) => logger.http(msg.trim()) },
    skip: (req) => req.path === '/health',
  }));

  app.use('/api', globalRateLimiter);

  app.get('/metrics', metricsAuthMiddleware, metricsHandler);
  app.get('/health', livenessHandler);
  app.get('/ready', readinessHandler);

  app.use('/api/auth', authRouter);
  app.use('/api/posts', postsRouter);
  app.use('/api/posts/:postId/comments', commentsRouter);
  app.use('/api/posts/:postId/likes', likesRouter);
  app.use('/api/bookmarks', bookmarksRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/search', searchRouter);
  app.use('/api/analytics', analyticsRouter);
  app.use('/api/tags', tagsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
