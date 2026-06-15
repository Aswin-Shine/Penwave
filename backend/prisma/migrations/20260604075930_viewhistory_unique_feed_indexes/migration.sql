/*
  Warnings:

  - A unique constraint covering the columns `[userId,postId]` on the table `view_history` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE INDEX "posts_status_deletedAt_publishedAt_idx" ON "posts"("status", "deletedAt", "publishedAt" DESC);

-- CreateIndex
CREATE INDEX "posts_authorId_status_deletedAt_idx" ON "posts"("authorId", "status", "deletedAt");

-- CreateIndex
CREATE INDEX "refresh_tokens_expiresAt_idx" ON "refresh_tokens"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "view_history_userId_postId_key" ON "view_history"("userId", "postId");
