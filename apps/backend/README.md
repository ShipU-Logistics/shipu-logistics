# ShipU Logistics - Backend Service 🚀

The core API engine for ShipU Logistics, implemented as a **Modular Monolith** using **Express 5**, **Bun**, **Prisma 7**, **Redis**, and **RabbitMQ**.

---

## 🏗 Architecture Principles

- **Modular Monolith**: All domains (`health`, `testing`, etc.) live in `src/modules/` as self-contained feature slices.
- **Class-Based OOP**: All Controllers, Services, Repositories, and Middlewares inherit from typed abstract base classes in `src/common/`.
- **Sliding-Window Rate Limiting**: Redis Sorted Set (ZSET) sliding-window algorithm with fail-open resilience.
- **Microservices Ready**: Clean boundaries make carving out independent microservices straightforward.

---

## 📁 Directory Structure

```text
src/
├── common/               # Reusable abstract base classes
│   ├── app.error.ts      # Custom domain errors (BadRequestError, NotFoundError, etc.)
│   ├── base.controller.ts# sendSuccess, sendError, catchAsync wrappers
│   ├── base.service.ts   # BaseService with structured contextual logging
│   └── base.repository.ts# BaseRepository with generic Prisma CRUD delegate
│
├── lib/
│   ├── logger.ts         # Service-scoped Pino logger instance
│   └── types.ts          # Standardized response envelopes
│
├── middlewares/          # Express middleware pipeline
│   ├── error.middleware.ts     # Global centralized error handler
│   ├── noFound.middleware.ts   # 404 Route catch-all handler
│   ├── rateLimit.middleware.ts # Redis sliding-window rate limiter
│   └── validation.middleware.ts# Zod v4 request body validation
│
├── modules/              # Self-contained domain modules
│   ├── health/           # Deep infrastructure connectivity diagnostics
│   │   ├── health.controller.ts
│   │   ├── health.service.ts
│   │   └── health.routes.ts
│   └── testing/          # Database sandbox module
│       ├── testing.controller.ts
│       ├── testing.service.ts
│       ├── testing.repository.ts
│       └── testing.routes.ts
│
├── routes/
│   └── app.routes.ts     # Primary API gateway (/api/v1)
│
├── index.ts              # App class: Express middlewares, routing & error handling
└── server.ts             # Server class: External connections & graceful shutdown
```

---

## 🏃 Quick Start

### 1. Install Dependencies

From monorepo root:

```bash
bun install
```

### 2. Configure Environment Variables

Ensure `.env` exists in the project root with:

```env
PORT=5001
DATABASE_URL="postgresql://admin:admin123@localhost:5432/mydb?schema=public"
REDIS_URL="redis://localhost:6379"
RABBITMQ_URL="amqp://localhost:5672"
```

### 3. Run Development Server

```bash
# From apps/backend:
bun run dev

# Or from monorepo root:
bun run dev --filter=backend
```

---

## 🧭 Endpoints Quick Reference

| Method | Path              | Description                             | Rate Limit    |
| :----- | :---------------- | :-------------------------------------- | :------------ |
| `GET`  | `/api/v1/health`  | Deep checks PostgreSQL, Redis, RabbitMQ | 5 req / 60s   |
| `GET`  | `/health-check`   | Backward-compatible health alias        | 5 req / 60s   |
| `POST` | `/api/v1/testing` | Create record with Zod validation       | 5 req / 60s   |
| `POST` | `/post-db-check`  | Backward-compatible test write alias    | 5 req / 60s   |
| `GET`  | `/api/v1/testing` | List all records from DB                | 100 req / 60s |

---

## 📦 Adding a New Domain Module

Follow the 4-file pattern in `src/modules/<feature>/`:

1. `<feature>.repository.ts`: extends `BaseRepository`
2. `<feature>.service.ts`: extends `BaseService`
3. `<feature>.controller.ts`: extends `BaseController`
4. `<feature>.routes.ts`: registers endpoints on Express `Router`

Then mount it inside `src/routes/app.routes.ts`.
