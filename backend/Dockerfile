# ─────────────────────────────────────────────
# Stage 1: deps — install production deps only
# ─────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Install system deps needed by native modules (argon2, etc.)
RUN apk add --no-cache libc6-compat openssl

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# ─────────────────────────────────────────────
# Stage 2: build — compile TypeScript
# ─────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src

# Generate Prisma client
RUN npx prisma generate

# Compile TypeScript
RUN npm run build

# ─────────────────────────────────────────────
# Stage 3: runtime — minimal final image
# ─────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

LABEL org.opencontainers.image.title="penwave-backend"
LABEL org.opencontainers.image.description="Penwave API server"

RUN apk add --no-cache openssl curl tini

# Non-root user
RUN addgroup --system --gid 1001 penwave \
  && adduser --system --uid 1001 --ingroup penwave penwave

# Copy production deps from deps stage
COPY --from=deps --chown=penwave:penwave /app/node_modules ./node_modules

# Copy compiled output and Prisma artifacts from build stage
COPY --from=build --chown=penwave:penwave /app/dist ./dist
COPY --from=build --chown=penwave:penwave /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build --chown=penwave:penwave /app/node_modules/@prisma ./node_modules/@prisma
COPY --chown=penwave:penwave prisma ./prisma
COPY --chown=penwave:penwave package.json ./

USER penwave

EXPOSE 4000

ENV NODE_ENV=production

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

# tini handles PID 1 properly — forwards signals to node
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/server.js"]
