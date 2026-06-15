-- Add a GIN index on a generated tsvector column for full-text search.
--
-- Without this, every search query runs a sequential scan of the posts
-- table recomputing to_tsvector() for every row. At 10k posts it's slow;
-- at 100k it's unusable.
--
-- The STORED generated column is updated automatically by PostgreSQL on
-- INSERT/UPDATE. The GIN index makes @@ plainto_tsquery() queries fast.
--
-- To apply: npx prisma migrate deploy
-- (or run directly: psql $DATABASE_URL -f migration.sql)

-- Generated column: computed from title + excerpt, stored on disk
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', title || ' ' || COALESCE(excerpt, ''))
  ) STORED;

-- GIN index: makes @@ operator O(log n) instead of O(n)
CREATE INDEX IF NOT EXISTS posts_search_vector_gin
  ON posts
  USING GIN (search_vector);
