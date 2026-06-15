-- Penwave DB init script
-- Runs once on first postgres container start

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Performance settings (applied per-session; use postgresql.conf for persistent)
-- These are advisory — Prisma migrations handle schema.
