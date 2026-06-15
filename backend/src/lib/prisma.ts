import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: env.DATABASE_URL,
      },
    },
    // Explicit pool config prevents silent exhaustion under concurrent load.
    // connection_limit: size of the connection pool (default: CPU cores × 2 + 1, often ~9)
    // pool_timeout: seconds to wait for a connection before throwing (default: 10)
    // statement_timeout: per-query hard ceiling in milliseconds
    //
    // These are passed as URL parameters — append to DATABASE_URL in your .env:
    //   ?connection_limit=10&pool_timeout=20&statement_timeout=30000
    //
    // Or override here via a constructed URL:
  });

// Extend with a global query timeout middleware.
// Prisma doesn't support per-client statement_timeout natively — use $extends.
export const prismaWithTimeout = prisma.$extends({
  query: {
    async $allOperations({ operation, model, args, query }) {
      const timeout = 25_000; // 25s hard ceiling — below Express's 30s server timeout
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Query timeout: ${model}.${operation} exceeded ${timeout}ms`)), timeout)
      );
      return Promise.race([query(args), timeoutPromise]);
    },
  },
});

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
