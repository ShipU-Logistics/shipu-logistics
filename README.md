# ShipU Logistics 🚚📦

A high-performance, **Modular Monolith** backend architecture built with a **Microservices-Ready, Class-Based Object-Oriented Design (OOP)**. Powered by a high-speed TypeScript Turborepo monorepo with Bun, Express 5, Prisma 7, PostgreSQL, Redis, and RabbitMQ.

---

## 📑 Table of Contents

- [Architecture Overview](#-architecture-overview)
- [Monorepo Structure](#-monorepo-structure)
- [Backend Modular Architecture](#-backend-modular-architecture)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
    - [Installation](#installation)
    - [Environment Variables](#environment-variables)
    - [Database Setup](#database-setup)
    - [Running the Services](#running-the-services)
- [API Documentation & Endpoints](#-api-documentation--endpoints)
  - [1. Health Diagnostics](#1-health-diagnostics)
  - [2. Testing Module](#2-testing-module)
- [Developer Guide: Adding a New Domain Module](#-developer-guide-adding-a-new-domain-module)
- [Cross-Cutting Concerns](#-cross-cutting-concerns)
  - [Redis Sliding-Window Rate Limiting](#redis-sliding-window-rate-limiting)
  - [Zod v4 Request Validation](#zod-v4-request-validation)
  - [Standardized Responses & Error Handling](#standardized-responses--error-handling)
  - [Graceful Shutdown](#graceful-shutdown)
- [Postman Setup](#-postman-setup)

---

## 🏛 Architecture Overview

ShipU Logistics employs a **Modular Monolith** pattern. All business domains are partitioned into self-contained modules (`health`, `testing`, `user`, etc.) that encapsulate their own Controller, Service, and Repository layers.

```mermaid
flowchart TD
    Client["Client / Postman / Frontend"] -->|"HTTP / REST"| App["Express App (apps/backend)"]

    subgraph Middlewares ["Global Middlewares Pipeline"]
        Cors["CORS & CookieParser"] --> RateLimit["Redis Sliding-Window RateLimiter"]
        RateLimit --> Logging["Morgan & Pino Logger"]
    end

    App --> Middlewares
    Middlewares --> AppRouter["AppRouter (/api/v1)"]

    subgraph DomainModules ["Self-Contained Domain Modules"]
        HealthModule["Health Module\n(HealthController -> HealthService)"]
        TestingModule["Testing Module\n(Controller -> Service -> Repository)"]
        UserModule["User Module\n(Controller -> Service -> Repository)"]
    end

    AppRouter --> HealthModule
    AppRouter --> TestingModule
    AppRouter --> UserModule

    subgraph SharedPackages ["Shared Monorepo Packages (@shipu/*)"]
        DBPkg["@shipu/database-schema\n(Prisma Client & Pool)"]
        RedisPkg["@shipu/redis\n(Cache & RateLimiter)"]
        RabbitPkg["@shipu/rabbitmq\n(AMQP Message Broker)"]
        ZodPkg["@shipu/zod-validation\n(Zod v4 Schemas)"]
        LoggerPkg["@shipu/logger\n(Pino Structured Logger)"]
    end

    DomainModules --> SharedPackages

    DBPkg --> Postgres[("PostgreSQL")]
    RedisPkg --> Redis[("Redis")]
    RabbitPkg --> RabbitMQ[("RabbitMQ Broker")]
```

### Why Modular Monolith?

- **Zero Premature Microservice Overhead**: Runs as a single unified deployable service with single-command local development.
- **Microservices-Ready**: Boundaries are strictly isolated. If a module (e.g. `shipment` or `driver`) needs to scale independently, its directory can be extracted directly into a standalone microservice with zero changes to business logic.
- **Strict OOP / Class-Based Code**: Uses abstract base classes (`BaseController`, `BaseService`, `BaseRepository`, `ShipUError`) enforcing consistency and clean code across all modules.

---

## 📂 Monorepo Structure

```text
shipu-logistics/
├── apps/
│   ├── backend/                     # Express 5 Class-Based Modular Monolith API
│   ├── frontend/                    # Vite + React Client Application
│   └── mobile/                      # Mobile Application workspace
│
├── packages/                        # Shared Internal Workspace Packages
│   ├── config/                      # Validated environment configuration
│   ├── database-schema/             # Prisma 7 schema, migrations & DatabaseService singleton
│   ├── eslint-config/               # Shared ESLint rules
│   ├── logger/                      # Pino structured logging factory
│   ├── rabbitmq/                    # RabbitMQ connection manager & QueueService
│   ├── redis/                       # Redis connection manager, CacheService & RateLimiter
│   ├── tailwind-config/             # Shared Tailwind styling configs
│   ├── types-config/                # Cross-package TypeScript interfaces
│   ├── typescript-config/           # Shared tsconfig.json bases
│   ├── ui/                          # Shared UI component library
│   └── zod-validation/              # Framework-agnostic Zod v4 validation schemas
│
├── package.json                     # Root Turborepo workspace configuration
├── turbo.json                       # Turborepo task pipelines and caching rules
└── bun.lock                         # Bun monorepo lockfile
```

---

## 📦 Backend Modular Architecture

Located at `apps/backend/src/`:

```text
apps/backend/src/
├── common/                          # Reusable abstract base classes
│   ├── app.error.ts                 # ShipUError hierarchy (BadRequest, NotFound, etc.)
│   ├── base.controller.ts          # BaseController (sendSuccess, sendError, catchAsync)
│   ├── base.service.ts             # BaseService (Contextual structured logging)
│   └── base.repository.ts          # BaseRepository (Generic Prisma CRUD delegate)
│
├── lib/                             # Core backend helpers
│   ├── logger.ts                    # Backend-scoped Pino logger
│   └── types.ts                     # SuccessResponse interface
│
├── middlewares/                     # Class-based Express middlewares
│   ├── error.middleware.ts          # ErrorMiddleware.handle (Global error interceptor)
│   ├── noFound.middleware.ts        # NotFoundMiddleware.handle (404 catch-all)
│   ├── rateLimit.middleware.ts      # RateLimitMiddleware.limit (Redis sliding-window)
│   └── validation.middleware.ts     # ValidationMiddleware.validateBody (Zod v4)
│
├── modules/                         # Domain bounded contexts
│   ├── health/                      # Diagnostic Module
│   │   ├── health.controller.ts     # HealthController
│   │   ├── health.service.ts        # HealthService (DB, Redis, RabbitMQ pings)
│   │   └── health.routes.ts         # GET /
│   │
│   └── testing/                     # Sandbox / Testing Module
│       ├── testing.controller.ts    # TestingController (create, list)
│       ├── testing.service.ts       # TestingService (business logic)
│       ├── testing.repository.ts    # TestingRepository (Prisma access)
│       └── testing.routes.ts        # POST / (validated) & GET /
│
├── routes/                          # Central API Gateway
│   └── app.routes.ts                # AppRouter mounting /health and /testing
│
├── index.ts                         # App class: Express setup, middlewares & error handling
└── server.ts                        # Server class: External connections & graceful shutdown
```

---

## ⚡ Tech Stack

| Component                     | Technology                                                                              | Description                                              |
| :---------------------------- | :-------------------------------------------------------------------------------------- | :------------------------------------------------------- |
| **Runtime & Package Manager** | [Bun](https://bun.sh/) (v1.3+)                                                          | High-speed native TypeScript runtime and package manager |
| **Monorepo Engine**           | [Turborepo](https://turbo.build/) (v2.10+)                                              | Optimized task orchestration and remote build caching    |
| **Web Framework**             | [Express 5](https://expressjs.com/)                                                     | Next-generation Node.js/Bun web framework                |
| **ORM & Database**            | [Prisma 7](https://www.prisma.io/) + PostgreSQL                                         | Multi-file schema database ORM with connection pooling   |
| **Caching & Rate Limiting**   | [Redis](https://redis.io/) + [ioredis](https://github.com/redis/ioredis)                | In-memory cache & sliding-window ZSET rate limiting      |
| **Message Broker**            | [RabbitMQ](https://www.rabbitmq.com/) + [amqplib](https://github.com/amqp-node/amqplib) | Message queuing and async event publication              |
| **Validation**                | [Zod v4](https://zod.dev/)                                                              | Type-safe schema declaration and input parsing           |
| **Logging**                   | [Pino](https://getpino.io/)                                                             | High-throughput structured JSON logging with redaction   |

---

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed on your machine:

- **[Bun](https://bun.sh/)** `>= 1.3.0`
- **[Docker](https://www.docker.com/)** or local running instances of:
  - PostgreSQL (port `5432`)
    - Redis (port `6379`)
    - RabbitMQ (port `5672`)

---

### Installation

Clone the repository and install all monorepo dependencies in a single step:

```bash
git clone https://github.com/your-org/shipu-logistics.git
cd shipu-logistics
bun install
```

---

### Environment Variables

1. Create a `.env` file in the monorepo root (refer to `.env.example`):

```bash
cp .env.example .env
```

1. Configure the required environment variables:

```env
# Node Environment
NODE_ENV="development"

# Server Configuration
PORT=5001
HOSTNAME="localhost"
LOG_LEVEL="info"

# PostgreSQL / Prisma Database URL
DATABASE_URL="postgresql://admin:admin123@localhost:5432/mydb?schema=public"

# Redis Cache URL
REDIS_URL="redis://localhost:6379"

# RabbitMQ Message Broker URL
RABBITMQ_URL="amqp://localhost:5672"
```

---

### Database Setup

To push the Prisma schema and run migrations on your database:

```bash
# Push database schema
bun --filter=@shipu/database-schema exec prisma db push

# (Optional) Open Prisma Studio UI to inspect data
bun --filter=@shipu/database-schema exec prisma studio
```

---

### Running the Services

#### Run the entire monorepo in development mode

```bash
bun run dev
```

#### Run only the backend service

```bash
bun run dev --filter=backend
```

_(Or directly inside `apps/backend` via `cd apps/backend && bun run dev`)_

When the server starts successfully, the console will output:

```text
[INFO] Connecting to infrastructure dependencies...
[INFO] RabbitMQ connection and ready
[INFO] Redis is connected and ready
[INFO] [ShipU Logistics] Server is successfully running on port 5001
```

---

## 📡 API Documentation & Endpoints

Base URL: `http://localhost:5001`

### 1. Health Diagnostics

#### Deep Health Check

Performs real-time checks on PostgreSQL, Redis, and RabbitMQ.

- **Route**: `GET /api/v1/health` _(Legacy alias: `GET /health-check`)_
- **Rate Limit**: 5 requests / 60s per IP

```bash
curl http://localhost:5001/api/v1/health
```

**Response (`200 OK`)**:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "All system dependencies are healthy",
  "responseData": {
    "database": true,
    "redis": true,
    "rabbitmq": true,
    "uptime": 18.42,
    "timestamp": "2026-09-13T11:45:00.000Z"
  }
}
```

---

### 2. Testing Module

#### Create Test Record

- **Route**: `POST /api/v1/testing` _(Legacy alias: `POST /post-db-check`)_
- **Rate Limit**: 5 requests / 60s per IP
- **Validation Rules**: `stringData` (required, max 20 chars), `intData` (positive number, max 50MB)

```bash
curl -X POST http://localhost:5001/api/v1/testing \
  -H "Content-Type: application/json" \
  -d '{
    "stringData": "ShipU Express",
    "intData": 1024
  }'
```

**Success Response (`201 Created`)**:

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Test record successfully created",
  "responseData": {
    "id": "cm1abcdef000001...",
    "stringData": "ShipU Express",
    "intData": 1024
  }
}
```

**Validation Error Response (`400 Bad Request`)**:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed: stringData: Cannot exceed the maximum limit"
}
```

#### List Test Records

- **Route**: `GET /api/v1/testing`
- **Rate Limit**: Global (100 requests / 60s)

```bash
curl http://localhost:5001/api/v1/testing
```

**Response (`200 OK`)**:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Test records fetched successfully",
  "responseData": [
    {
      "id": "cm1abcdef000001...",
      "stringData": "ShipU Express",
      "intData": 1024
    }
  ]
}
```

---

## 🛠 Developer Guide: Adding a New Domain Module

Every new domain feature (e.g. `shipment`, `driver`, `warehouse`) follows the **4-File Pattern**:

```text
src/modules/shipment/
├── shipment.repository.ts   # Database CRUD operations (extends BaseRepository)
├── shipment.service.ts      # Business logic & validations (extends BaseService)
├── shipment.controller.ts   # HTTP Request/Response handling (extends BaseController)
└── shipment.routes.ts       # Express router setup
```

### 1. Create Repository (`shipment.repository.ts`)

```typescript
import { prisma } from '@shipu/database-schema/prisma';
import { BaseRepository } from '../../common/base.repository.ts';

export class ShipmentRepository extends BaseRepository<typeof prisma.shipment> {
  constructor() {
    super(prisma.shipment);
  }

  public async findByTrackingNumber(trackingNumber: string) {
    return prisma.shipment.findUnique({ where: { trackingNumber } });
  }
}
```

### 2. Create Service (`shipment.service.ts`)

```typescript
import { BaseService } from '../../common/base.service.ts';
import { NotFoundError } from '../../common/app.error.ts';
import { ShipmentRepository } from './shipment.repository.ts';

export class ShipmentService extends BaseService {
  private repo: ShipmentRepository;

  constructor() {
    super('shipment-service');
    this.repo = new ShipmentRepository();
  }

  public async getShipment(trackingNumber: string) {
    const shipment = await this.repo.findByTrackingNumber(trackingNumber);
    if (!shipment) throw new NotFoundError('Shipment not found');
    this.logAction('shipment-fetched', { trackingNumber });
    return shipment;
  }
}
```

### 3. Create Controller (`shipment.controller.ts`)

```typescript
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { BaseController } from '../../common/base.controller.ts';
import { ShipmentService } from './shipment.service.ts';

export class ShipmentController extends BaseController {
  private service: ShipmentService;

  constructor() {
    super();
    this.service = new ShipmentService();
  }

  public getByTracking = this.catchAsync(async (req: Request, res: Response): Promise<void> => {
    const shipment = await this.service.getShipment(req.params.trackingNumber);
    this.sendSuccess(res, 'Shipment retrieved', shipment, StatusCodes.OK);
  });
}
```

### 4. Create Routes (`shipment.routes.ts`)

```typescript
import { Router } from 'express';
import { ShipmentController } from './shipment.controller.ts';

export class ShipmentRoutes {
  public readonly router = Router();
  private controller = new ShipmentController();

  constructor() {
    this.router.get('/:trackingNumber', this.controller.getByTracking);
  }
}
```

### 5. Mount in `routes/app.routes.ts`

```typescript
import { ShipmentRoutes } from '../modules/shipment/shipment.routes.ts';

// Inside mountRoutes():
this.router.use('/shipments', new ShipmentRoutes().router);
```

Your endpoint is now live at `GET /api/v1/shipments/:trackingNumber`!

---

## 🛡 Cross-Cutting Concerns

### Redis Sliding-Window Rate Limiting

- **Global Rate Limiter**: 100 req / 60s per client mounted in `src/index.ts`.
- **Route-Level Rate Limiter**: Stricter limits applied to individual endpoints (e.g. 5 req / 60s for health and test writes).
- **HTTP Response Headers**:
  - `X-RateLimit-Limit`: Maximum requests per window.
  - `X-RateLimit-Remaining`: Remaining allowance in current window.
  - `X-RateLimit-Reset`: Unix timestamp when quota resets.
  - `Retry-After`: Cooldown seconds returned on `429 Too Many Requests`.

### Zod v4 Request Validation

- Schemas live in `@shipu/zod-validation`.
- `ValidationMiddleware.validateBody(schema)` validates `req.body` and extracts issues from `result.error.issues`, returning formatted error strings on failure.

### Standardized Responses & Error Handling

- All successful responses use the `SuccessResponse<T>` shape:

  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Descriptive message",
    "responseData": { ... }
  }
  ```

- Errors inherit from `ShipUError` and are captured by `ErrorMiddleware.handle`. In development mode, stack traces are included for debugging.

### Graceful Shutdown

- `src/server.ts` registers signal listeners for `SIGINT` and `SIGTERM`.
- When triggered, it stops accepting HTTP connections, drains active in-flight requests, and disconnects Prisma, Redis, and RabbitMQ connection pools before exiting cleanly with status code `0`.

---

## 🧪 Postman Setup

To test and explore the API in Postman:

1. Open Postman → Click **Import** (top left).
2. Choose **Paste raw text**.
3. Import this collection specification:

```json
{
  "info": {
    "name": "ShipU Logistics API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [{ "key": "baseUrl", "value": "http://localhost:5001", "type": "string" }],
  "item": [
    {
      "name": "Health",
      "item": [
        {
          "name": "Check Health",
          "request": {
            "method": "GET",
            "url": {
              "raw": "{{baseUrl}}/api/v1/health",
              "host": ["{{baseUrl}}"],
              "path": ["api", "v1", "health"]
            }
          }
        }
      ]
    },
    {
      "name": "Testing",
      "item": [
        {
          "name": "Create Test Record",
          "request": {
            "method": "POST",
            "header": [{ "key": "Content-Type", "value": "application/json" }],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"stringData\": \"ShipU Express\",\n  \"intData\": 500\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/api/v1/testing",
              "host": ["{{baseUrl}}"],
              "path": ["api", "v1", "testing"]
            }
          }
        },
        {
          "name": "List Test Records",
          "request": {
            "method": "GET",
            "url": {
              "raw": "{{baseUrl}}/api/v1/testing",
              "host": ["{{baseUrl}}"],
              "path": ["api", "v1", "testing"]
            }
          }
        }
      ]
    }
  ]
}
```

---

## 📄 License

Internal proprietary software for **ShipU Logistics**. All rights reserved.
