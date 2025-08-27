# FOLDER_STRUCTURE.md

> Canonical, JS‑first layout for the **backend repo**. This file is referenced by **CLAUDE.md** and must remain in sync with it.

---

## Backend Repo Layout

```
backend/
  README.md                  # Central repo README (see template below)
  SERVICE_DOC.md             # Central service doc (index + links to service READMEs)
  src/
    <service-name>/
      configs/             # config defaults & examples
      controllers/         # HTTP controllers (route handlers only)
      services/            # business logic (use-cases)
      repositories/        # DB access + queries
      models/              # domain models / ORM schemas
      clients/             # 3rd-party API clients (Stripe, OpenAI, AWS)
      adapters/            # DTO mappers; in/out transformations
      middleware/          # Express/Koa middlewares
      validators/          # Zod/Joi/Yup schemas for inputs
      utils/               # pure helpers (stateless)
      routes/              # route registration (per resource)
      api/                 # OpenAPI/JSON Schemas (versioned)
      migrations/          # DB migrations (forward-only)
      observability/       # logging, metrics, tracing setup
      infra/               # service-scoped IaC (TF modules, helm charts)
      docs/                # service-scoped docs (runbooks, ADRs, READMEs)
    shared/                  # cross-service libs (type-safe, small)
  __tests__/                 # unit/integration tests mirroring src tree
  docs/                      # ROOT docs: ADRs, runbooks, vendor notes
  infra/                     # ROOT IaC: environments, pipelines, shared modules
  scripts/                   # one-off ops/dev scripts
```

### Allowed Dependencies

```
controllers  → validators, middleware, adapters
services     → repositories, clients, adapters, utils
repositories → models
clients      → utils
adapters     → utils, clients
```

**Not allowed:** controllers → repositories directly; services → controllers; repositories → services.

---

## Routing Conventions

- Define routes in `routes/<resource>.routes.ts` and mount controllers.
- Keep controllers lean: parameter extraction → service call → response.
- Mount routes in server entrypoint (e.g., `src/index.ts` or `src/server.ts`).

**Example**

```
src/
  curated-list/
    routes/creators.routes.ts
    controllers/creators/get-creator.controller.ts
    services/creators/get-creator.service.ts
    repositories/creators.repository.ts
    validators/creators.schemas.ts
```

---

## Naming (JS Standard)

- Files & folders: **kebab-case** (e.g., `get-creator.service.ts`)
- Variables & functions: **camelCase**
- Classes & constructors: **PascalCase**
- Constants & env: **UPPER_SNAKE_CASE**
- DB tables/columns: **snake_case**

> See **CLAUDE.md → Naming Conventions** for the canonical rules.

---

## Testing Layout

- Mirror source structure under `__tests__/` at repo root.
- Unit tests colocate per area; integration tests under `__tests__/integration/`.
- Use `testdata/` within each service for deterministic fixtures and golden files.

```
backend/__tests__/
  controllers/
  services/
  repositories/
  integration/
```

---

## Central README Template

```md
# Backend

## Overview

Brief description of the platform’s backend, major services, and tech stack.

## Getting Started

- Prereqs (Node, Docker, DB)
- Install & bootstrap
- Run: `pnpm dev` / `npm run dev`
- Env: `.env.example` → `.env`

## Structure

- `src/services/<service-name>`: bounded context services
- `shared/`: cross-service utilities (avoid tight coupling)
- `docs/`, `infra/`, `scripts/`

## Development

- Lint/format/test commands
- Commit style (Conventional Commits)
- Branching & release (SemVer)

## Operations

- Envs & config
- Observability (logs, metrics, tracing)
- Runbooks & dashboards (links)
```

---

## Central SERVICE_DOC.md

```md
# Service Directory

Lists all services, their purpose, owners, and links.

| Service     | Purpose                  | Owners    | APIs                           | Status |
| ----------- | ------------------------ | --------- | ------------------------------ | ------ |
| creator-svc | Creator profile & lookup | @team-xyz | ./src/services/creator-svc/api | prod   |

## Authoring a New Service

1. Create `src/services/<service-name>/` using the standard skeleton.
2. Fill in `<service-name>/README.md` using the Service README template in **CLAUDE.md**.
3. Add `docs/` and `infra/` at service-level as needed.
4. Register routes in `<service-name>/routes/` and mount in server entrypoint.
5. Add SLOs, dashboards, and alerts; link them here.
```

---

## Per‑Service README Quickstart

Each service must include `README.md` with:

- Purpose & contracts (API spec link, events)
- Run (env vars, local dev, seed data)
- Operations (dashboards, SLOs, runbooks)
- Deployment (CI/CD, rollout flags)
- Data (storage, retention, PII class)
- Security (secrets, IAM roles, threat notes)

> Use the **Service README Template** in **CLAUDE.md**.

---

## Infra & Docs Placement

- **Infra at two levels:**
  - **Root `infra/`** → environment-wide IaC (Terraform stacks, shared modules, CI/CD pipelines).
  - **Service `infra/`** → service-scoped IaC (Helm charts, Terraform modules/variables specific to that service). Root pipelines should reference these modules.

- **Docs at two levels:**
  - **Root `docs/`** → cross-cutting docs (ADR index, vendor guides, ops runbooks, platform overview).
  - **Service `docs/`** → service-specific docs (SLOs, runbooks, sequence diagrams, local setup, API notes). Link each service doc from `SERVICE_DOC.md`.

---

## Keep In Sync

- This document is referenced by **CLAUDE.md**. Any changes here **must** be reflected there (and vice‑versa) via PR + ADR.
