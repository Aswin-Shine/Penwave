<div align="center">

![Project Banner](./docs/assets/banner-placeholder.png)

# Penwave

**A production-grade, cloud-native blogging platform engineered for scale, security, and developer experience.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/your-org/penwave/ci.yml?label=CI&logo=github)](https://github.com/your-org/penwave/actions)
[![Docker](https://img.shields.io/badge/Docker-multi--arch-2496ED?logo=docker)](https://hub.docker.com/r/your-org/penwave-backend)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?logo=node.js)](https://nodejs.org)
[![Next.js](https://img.shields.io/badge/Next.js-16.x-000000?logo=next.js)](https://nextjs.org)
[![Terraform](https://img.shields.io/badge/Terraform-IaC-7B42BC?logo=terraform)](./terraform)
[![Contributors](https://img.shields.io/github/contributors/your-org/penwave)](https://github.com/your-org/penwave/graphs/contributors)

</div>

---

## Overview

Penwave is a full-stack blogging platform designed from first principles as a production system — not a tutorial project. It demonstrates end-to-end engineering maturity across the entire delivery lifecycle: secure API design, containerized deployments, infrastructure as code, real-time observability, and an automated CI/CD pipeline.

**Audience:** Engineers, content creators, and developer communities who need a self-hosted, privacy-respecting alternative to Medium or Substack with full platform control.

**Why it exists:** Most open-source blogging software treats DevOps, security, and scalability as afterthoughts. Penwave builds them in from day one — Argon2id password hashing, JWT refresh token rotation, Redis-backed rate limiting, structured logging shipped to Loki, and Prometheus metrics out of the box.

**Engineering highlights:**

- Modular monolith architecture with clean layer separation (DTO → Repository → Service → Controller)
- Security-first: httpOnly cookies, CSP on both API and frontend layers, server-side HTML sanitization
- Cloud-native deployment on AWS via Terraform-provisioned infrastructure
- Full observability stack: Prometheus + Grafana + Loki + Promtail
- Automated multi-architecture Docker builds (linux/amd64, linux/arm64) with Trivy image scanning

---

## Table of Contents

- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [System Architecture — HLD](#system-architecture--hld)
- [Low-Level Design — LLD](#low-level-design--lld)
- [CI/CD Pipeline](#cicd-pipeline)
- [Infrastructure as Code](#infrastructure-as-code)
- [Observability & Operations](#observability--operations)
- [Security](#security)
- [Development Workflow](#development-workflow)
- [Implementation Guide](#-implementation-guide)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Key Features

### Platform

| Feature                 | Details                                                                         |
| ----------------------- | ------------------------------------------------------------------------------- |
| **Rich text editor**    | TipTap with syntax-highlighted code blocks, images, typography, and autosave    |
| **Post management**     | Draft, publish, schedule, and archive with slug management and SEO metadata     |
| **Tagging & discovery** | Multi-tag system, trending feed, full-text search across posts and users        |
| **Social layer**        | Follow users, like and bookmark posts, threaded comment threads with pagination |
| **Analytics dashboard** | Per-author view, read, like, comment, and bookmark aggregates by day            |
| **Notifications**       | Schema-complete notification system across all interaction types                |

### Engineering

| Capability            | Implementation                                                                            |
| --------------------- | ----------------------------------------------------------------------------------------- |
| **Authentication**    | JWT access tokens (15 min) + refresh token rotation (7 days), single-use, theft detection |
| **Authorization**     | Role-based access control (USER / ADMIN), owner-or-admin middleware                       |
| **Caching**           | Redis-backed response cache with targeted invalidation, SCAN-safe key deletion            |
| **Rate limiting**     | Redis-distributed limits — global, auth, and search tiers                                 |
| **Input validation**  | Zod schemas at every entry point; coerced types, validated DTOs                           |
| **HTML sanitization** | Server-side content sanitization before DB write; client-side as defense-in-depth         |
| **CI/CD**             | GitHub Actions: typecheck → lint → build → security scan → multi-arch push → deploy       |
| **Containerization**  | 3-stage Dockerfiles, non-root user, tini PID 1, health checks                             |
| **Observability**     | Prometheus metrics, structured Winston logs → Loki, liveness + readiness probes           |
| **IaC**               | Terraform-provisioned AWS infrastructure (EC2, RDS, Redis, S3, Route 53)                  |

---

## Technology Stack

### Frontend

| Technology     | Version | Purpose                           |
| -------------- | ------- | --------------------------------- |
| Next.js        | 16.x    | App Router, SSR, standalone build |
| React          | 19.x    | UI framework                      |
| TypeScript     | 5.6     | Static typing                     |
| Tailwind CSS   | 3.4     | Utility-first styling             |
| Radix UI       | Latest  | Accessible component primitives   |
| TanStack Query | 5.x     | Server state management, caching  |
| Zustand        | 5.x     | Client state (auth, UI)           |
| TipTap         | 2.x     | Rich text editor                  |
| Framer Motion  | 11.x    | Animations                        |

### Backend

| Technology      | Version | Purpose                      |
| --------------- | ------- | ---------------------------- |
| Node.js         | 20.x    | Runtime                      |
| Express         | 4.x     | HTTP framework               |
| TypeScript      | 5.6     | Static typing                |
| Prisma          | 5.x     | ORM, migrations              |
| Zod             | 3.x     | Runtime validation, DTOs     |
| @node-rs/argon2 | 2.x     | Password hashing (Argon2id)  |
| jsonwebtoken    | 9.x     | JWT signing and verification |
| Winston         | 3.x     | Structured logging           |
| prom-client     | 15.x    | Prometheus metrics           |

### Data

| Technology    | Purpose                             |
| ------------- | ----------------------------------- |
| PostgreSQL 16 | Primary relational database         |
| Redis 7       | Cache, session store, rate limiting |

### DevOps & Infrastructure

| Technology     | Purpose                                    |
| -------------- | ------------------------------------------ |
| Docker         | Containerization (multi-arch, multi-stage) |
| Docker Compose | Local development orchestration            |
| GitHub Actions | CI/CD pipelines                            |
| Terraform      | AWS infrastructure provisioning            |
| AWS EC2        | Application hosting                        |
| AWS RDS        | Managed PostgreSQL                         |
| AWS S3         | Object storage, Terraform state            |
| AWS Route 53   | DNS                                        |
| Nginx          | Reverse proxy, TLS termination             |

### Observability

| Technology | Purpose                      |
| ---------- | ---------------------------- |
| Prometheus | Metrics collection           |
| Grafana    | Dashboards and alerting      |
| Loki       | Log aggregation              |
| Promtail   | Log shipping from containers |

---

## System Architecture — HLD

Penwave follows a cloud-native, layered deployment model. The frontend is a Next.js standalone container served behind Nginx. The backend is a stateless Express API that communicates with PostgreSQL for persistence and Redis for caching and rate limiting. Both write structured logs to stdout; Promtail collects and ships to Loki. Prometheus scrapes the `/metrics` endpoint every 15 seconds.

![HLD Diagram](./docs/diagrams/hld-placeholder.png)

### Component Interactions

```
Browser
  └─► Nginx (TLS termination, reverse proxy)
        ├─► Frontend (Next.js standalone — port 3000)
        │     └─► API calls via httpOnly cookie auth
        └─► Backend API (Express — port 4000)
              ├─► PostgreSQL (Prisma ORM)
              ├─► Redis (cache, rate limits)
              └─► /metrics ──► Prometheus ──► Grafana
                  stdout  ──► Promtail   ──► Loki ──► Grafana
```

**Infrastructure layer (AWS, provisioned by Terraform):**

| Component         | Service                                 |
| ----------------- | --------------------------------------- |
| Application hosts | EC2 (t3 family)                         |
| Managed database  | RDS PostgreSQL (Multi-AZ in production) |
| Cache / queue     | ElastiCache Redis                       |
| Object storage    | S3 (assets, backups, Terraform state)   |
| DNS               | Route 53                                |
| TLS               | ACM (AWS Certificate Manager)           |

---

## Low-Level Design — LLD

The backend is a modular monolith. Each domain (auth, posts, comments, likes, bookmarks, users, notifications, search, analytics, tags) is a self-contained module with its own clearly bounded layers.

![LLD Diagram](./docs/diagrams/lld-placeholder.png)

### Layer Responsibilities

```
src/
├── config/         env.ts              — Zod-validated environment variables, fails fast
├── lib/            jwt, redis, prisma, logger, sanitize
├── middleware/     auth, errorHandler, health, metrics, rateLimiter, validate
├── shared/errors/  AppError hierarchy  — operational vs programming error separation
├── utils/          response helpers, pagination
└── modules/{domain}/
    ├── *.dto.ts        Zod schemas + inferred TypeScript types
    ├── *.repository.ts Prisma queries only — no business logic
    ├── *.service.ts    Business logic, cache management, authorization
    ├── *.controller.ts HTTP request/response mapping
    └── *.routes.ts     Express router — middleware composition, handler binding
```

### Request Flow

```
Incoming Request
  → globalRateLimiter (Redis)
  → helmet / CORS
  → validateBody / validateQuery (Zod)
  → authenticate / optionalAuth (JWT)
  → authorize / requireOwnerOrAdmin
  → Controller
      → Service (cache check → business logic → cache invalidation)
          → Repository (Prisma query)
  → errorHandler (AppError, ZodError, Prisma known errors)
```

### Background Jobs

| Job                     | Trigger        | Description                                                  |
| ----------------------- | -------------- | ------------------------------------------------------------ |
| `cron:clean-tokens`     | Daily cron     | Deletes expired refresh tokens from the database             |
| `publishScheduledPosts` | Polling / cron | Promotes SCHEDULED → PUBLISHED past their `scheduledAt` time |

---

## CI/CD Pipeline

Every push to `main` runs the full delivery pipeline. Pull requests targeting `main` or `develop` run the validation pipeline (no deployment).

![CI/CD Pipeline](./docs/diagrams/cicd-placeholder.png)

### Pipeline Stages

```
ci.yml (PR validation)                    deploy.yml (main branch)
──────────────────────                    ────────────────────────
typecheck (backend + frontend)     →      Build multi-arch Docker images
lint                               →      Tag: sha-<7-char-commit>
build validation                   →      Push to Docker Hub
Trivy SARIF scan (source)          →      Trivy image scan (CRITICAL, exit 1)
Terraform validate                 →      Sync monitoring configs to EC2
                                   →      SSH deploy via penwave-deploy script
                                   →      Health check: poll /health until 200
                                   →      Create GitHub issue on failure
```

### Stage Details

| Stage                  | Tool                       | Failure Behavior                     |
| ---------------------- | -------------------------- | ------------------------------------ |
| Typecheck              | `tsc --noEmit`             | Blocks merge                         |
| Lint                   | `next lint`                | Blocks merge                         |
| Security scan (source) | Trivy SARIF                | Uploaded to GitHub Security tab      |
| Security scan (image)  | Trivy (`exit-code: 1`)     | Blocks deployment on CRITICAL CVEs   |
| Image build            | `docker/build-push-action` | Cached via GitHub Actions cache      |
| Deploy                 | `appleboy/ssh-action`      | Runs `penwave-deploy` script on EC2  |
| Health verify          | `curl /health`             | Fails deployment; logs last 50 lines |
| Failure notify         | `actions/github-script`    | Creates labelled GitHub issue        |

**Dependency management:** Dependabot runs weekly for npm (backend + frontend), Docker base images, GitHub Actions, and Terraform providers.

---

## Infrastructure as Code

All AWS infrastructure is provisioned via Terraform. Environments (`dev`, `prod`) are separated by variable files with no shared state.

![Infrastructure Diagram](./docs/diagrams/iac-placeholder.png)

### Principles

**Immutable infrastructure** — server instances are replaced on deploy, never patched in place. The `penwave-deploy` script pulls the new image tag and performs a rolling container restart.

**Remote state** — S3 backend with DynamoDB locking prevents concurrent state corruption across team members or CI runs.

**Environment parity** — dev and prod use the same Terraform modules with environment-specific variable overrides (instance sizes, Multi-AZ flags, backup retention).

**Secret management** — Secrets (DB credentials, JWT secrets, Docker Hub tokens) are stored in AWS Secrets Manager or GitHub Actions Secrets. No secrets are hardcoded or committed.

### Module Structure

```
terraform/
├── modules/
│   ├── networking/     VPC, subnets, security groups
│   ├── compute/        EC2, launch template, IAM roles
│   ├── database/       RDS PostgreSQL, parameter groups
│   ├── cache/          ElastiCache Redis
│   └── storage/        S3 buckets, lifecycle policies
├── environments/
│   ├── dev/            terraform.tfvars (t3.micro, single-AZ)
│   └── prod/           terraform.tfvars (t3.medium, Multi-AZ, 30-day backup)
└── providers.tf        AWS provider, S3 backend config
```

---

## Observability & Operations

### Logging

Winston writes structured JSON logs to stdout in production. Promtail collects container stdout/stderr via Docker log driver and ships to Loki. All log entries include `service`, `level`, `timestamp`, and contextual fields (`userId`, `event`, `ip`).

Key audit events logged: `user.signup`, `user.login`, `auth.login.failed`, `auth.token.reuse`, `user.logout.all`, `auth.tokens.cleaned`.

### Metrics

Prometheus scrapes `/metrics` every 15 seconds. Exposed metrics:

| Metric                          | Type      | Description                                     |
| ------------------------------- | --------- | ----------------------------------------------- |
| `http_requests_total`           | Counter   | Total requests by method, route, status         |
| `http_request_duration_seconds` | Histogram | Latency distribution by route                   |
| `http_active_requests`          | Gauge     | In-flight requests                              |
| `http_errors_total`             | Counter   | 4xx + 5xx by route                              |
| `nodejs_*`                      | Default   | Event loop, GC, heap via `prom-client` defaults |

Route labels are normalized — UUIDs and numeric IDs are replaced with `:id` to prevent cardinality explosion.

### Health Probes

| Endpoint      | Type      | Checks                                    |
| ------------- | --------- | ----------------------------------------- |
| `GET /health` | Liveness  | Process alive, uptime — no external calls |
| `GET /ready`  | Readiness | PostgreSQL `SELECT 1` + Redis `PING`      |

Split probes prevent database outages from triggering container restarts (a common Kubernetes misconfiguration).

### Alerting

Grafana is configured as the alert manager. Recommended alert rules (add to `monitoring/prometheus/rules/`):

- 5xx error rate > 1% over 5 minutes
- P99 request latency > 2 seconds
- Redis connection errors
- Disk usage > 85%
- No metrics scrape for > 2 minutes (instance down)

---

## Security

### Authentication & Sessions

- Passwords hashed with **Argon2id** (`memoryCost: 65536`, `timeCost: 3`, `parallelism: 4`)
- JWT access tokens (15 min) delivered via **httpOnly, Secure, SameSite=Lax cookies** — never in response bodies or localStorage
- Refresh tokens (7 days) stored in the database, **single-use with rotation** — reuse detection revokes all user sessions immediately
- Concurrent 401 refresh guard prevents thundering herd from triggering false token reuse alerts
- Timing attack mitigation on login: dummy Argon2 hash computed when user is not found

### Transport & Headers

- **Helmet** enforces `default-src 'none'` CSP on the API layer
- **Next.js CSP** via `headers()` in `next.config.ts` — separate policy for the frontend layer
- CORS restricted to `FRONTEND_URL` — no wildcard origins
- `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`

### Input Security

- Zod validation on every route — body, query, and path params
- Server-side HTML sanitization before DB write — strips scripts, iframes, event handlers, `javascript:` URIs
- Client-side DOM sanitization as defense-in-depth
- Next.js `remotePatterns` restricted to known image hosts — no SSRF-enabling wildcards

### Rate Limiting

| Limiter        | Window | Limit   | Store                           |
| -------------- | ------ | ------- | ------------------------------- |
| Global         | 15 min | 100 req | Redis (shared across instances) |
| Auth endpoints | 15 min | 10 req  | Redis                           |
| Search         | 1 min  | 30 req  | Redis                           |

### Access Control

- RBAC via `Role` enum (USER, ADMIN)
- `authorize(...roles)` and `requireOwnerOrAdmin(getter)` middleware composable on any route
- Soft deletes everywhere — no hard data deletion

### Supply Chain

- Dependabot weekly updates across npm, Docker, GitHub Actions, and Terraform
- Trivy image scanning on every deployment — CRITICAL CVEs block the pipeline
- All dependencies pinned to exact versions

---

## Development Workflow

### Branching Strategy

```
main          → production deployments (protected, requires PR + review)
develop       → integration branch
feature/*     → new features, merged to develop via PR
fix/*         → bug fixes
chore/*       → infrastructure, dependency, tooling changes
```

### Pull Request Process

1. Branch from `develop` (features) or `main` (hotfixes)
2. Ensure `npm run type-check` and `npm run lint` pass locally
3. Open PR with a description referencing the relevant issue
4. One approving review required; CI must pass
5. Squash and merge to maintain a clean linear history

### Commit Conventions

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(posts): add scheduled publish support
fix(auth): resolve refresh token rotation race condition
chore(deps): bump @prisma/client to 5.22.0
docs(readme): update architecture diagram
```

### Environment Parity

| Concern  | Local                         | Production                           |
| -------- | ----------------------------- | ------------------------------------ |
| Database | PostgreSQL via Docker Compose | RDS PostgreSQL                       |
| Cache    | Redis via Docker Compose      | ElastiCache                          |
| Env vars | `.env` files (not committed)  | AWS Secrets Manager / GitHub Secrets |
| TLS      | None (localhost)              | ACM via Nginx                        |
| Image    | Built locally                 | Multi-arch from Docker Hub           |

Copy `.env.example` to `.env` and fill in values. Never commit `.env` files.

---

## 📘 Implementation Guide

Detailed setup, local development, Docker usage, environment configuration, and deployment instructions are documented in [IMPLEMENTATION.md](./IMPLEMENTATION.md).

**Quick reference:**

```bash
# Clone and install
git clone https://github.com/your-org/penwave.git && cd penwave

# Start all services (backend, frontend, PostgreSQL, Redis)
docker compose up -d

# Apply database migrations
docker compose exec backend npx prisma migrate deploy

# Seed development data
docker compose exec backend npm run db:seed
```

Backend API: `http://localhost:4000`  
Frontend: `http://localhost:3000`  
Grafana: `http://localhost:3001` (admin / admin)  
Prometheus: `http://localhost:9090`

---

## Roadmap

| Priority | Item                                                                  | Status  |
| -------- | --------------------------------------------------------------------- | ------- |
| High     | Complete notification dispatch (likes, comments, follows)             | Planned |
| High     | Auth service unit + integration tests (token rotation, concurrency)   | Planned |
| High     | Replace regex sanitizer with `sanitize-html` allowlist                | Planned |
| High     | GIN index for full-text search; cursor-based pagination               | Planned |
| Medium   | API versioning (`/api/v1/*`)                                          | Planned |
| Medium   | OpenAPI spec generated from Zod schemas; frontend type generation     | Planned |
| Medium   | Kubernetes deployment manifests + Helm chart                          | Planned |
| Medium   | OpenTelemetry distributed tracing (Jaeger / AWS X-Ray)                | Planned |
| Medium   | Redis Streams for async analytics ingestion and notification delivery | Planned |
| Low      | Auto Scaling Group / ECS Fargate migration                            | Planned |
| Low      | AI-assisted post summarization and tag suggestions                    | Planned |
| Low      | Multi-region active-passive with RDS read replicas                    | Planned |
| Low      | Feature flag system (DB-backed + Redis cache)                         | Planned |

---

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a pull request.

**Before contributing:**

- Open an issue to discuss significant changes before implementation
- Ensure all existing type checks and lints pass
- Follow the commit convention described above
- Add or update tests for any changed behavior
- Keep PRs focused — one concern per PR

For bug reports, use the GitHub issue tracker with the `bug` label. For feature requests, use the `enhancement` label.

---

## License

This project is licensed under the [MIT License](./LICENSE).

---

<div align="center">

**Penwave** · Built with precision

[Documentation](./IMPLEMENTATION.md) · [Issues](https://github.com/your-org/penwave/issues) · [Discussions](https://github.com/your-org/penwave/discussions)

Maintained by [@your-handle](https://github.com/your-handle) · For support, open a [GitHub Discussion](https://github.com/your-org/penwave/discussions)

</div>

docker buildx build \
  --builder penwave-builder \
  --platform linux/amd64,linux/arm64 \
  --file frontend/Dockerfile \
  --build-arg NEXT_PUBLIC_API_URL=https://penwave.ddns.net/api \
  --tag $DOCKERHUB_USERNAME/penwave-frontend:$IMAGE_TAG \
  --tag $DOCKERHUB_USERNAME/penwave-frontend:latest \
  --push \
  ./frontend