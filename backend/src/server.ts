import { createApp } from './app';
import { connectDatabase, disconnectDatabase } from './lib/prisma';
import { redis } from './lib/redis';
import { logger } from './lib/logger';
import { env } from './config/env';

async function bootstrap() {
  try {
    await connectDatabase();

    await redis.ping();
    logger.info('✅ Redis connection verified');

    const app = createApp();
    const server = app.listen(env.PORT, () => {
      logger.info(`🚀 Penwave API running on http://localhost:${env.PORT}`);
      logger.info(`🌍 Environment: ${env.NODE_ENV}`);
      logger.info(`📡 CORS allowed origin: ${env.FRONTEND_URL}`);
    });

    // Request timeout: 30s ceiling per connection.
    // Prevents slowloris attacks and runaway queries from holding the event loop.
    // Must be higher than the Prisma query timeout (25s) so Prisma errors
    // surface cleanly rather than being swallowed by a socket reset.
    server.setTimeout(30_000);

    // keepAliveTimeout must be greater than the upstream proxy's (nginx) idle
    // timeout to prevent "socket hang up" errors on keep-alive connections.
    // Nginx default keepalive_timeout is 75s.
    server.keepAliveTimeout = 90_000;
    server.headersTimeout = 91_000; // must be > keepAliveTimeout

    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);
      server.close(async () => {
        await disconnectDatabase();
        await redis.quit();
        logger.info('✅ Graceful shutdown complete');
        process.exit(0);
      });

      // Force exit after 10s
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10_000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason: unknown) => {
      logger.error('Unhandled Rejection:', reason);
    });

    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();
