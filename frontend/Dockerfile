# ─────────────────────────────────────────────
# Stage 1: deps
# ─────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts && npm cache clean --force

# ─────────────────────────────────────────────
# Stage 2: build
# ─────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p public

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# ─────────────────────────────────────────────
# Stage 3: runtime
# ─────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

LABEL org.opencontainers.image.title="penwave-frontend"
LABEL org.opencontainers.image.description="Penwave Next.js frontend"

RUN apk add --no-cache curl tini

# Non-root user
RUN addgroup --system --gid 1001 penwave \
  && adduser --system --uid 1001 --ingroup penwave penwave

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# standalone output only needs these three dirs
COPY --from=build --chown=penwave:penwave /app/.next/standalone ./
COPY --from=build --chown=penwave:penwave /app/.next/static ./.next/static
COPY --from=build --chown=penwave:penwave /app/public ./public

USER penwave

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/api/health 2>/dev/null || curl -f http://localhost:3000/ || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
