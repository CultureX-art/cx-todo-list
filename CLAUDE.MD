# CLAUDE.md — Engineering Guardrails & Conventions

A single, opinionated reference for code produced by humans and AI in this repo. Use this as the source of truth; other docs can exist separately but must align with and link back here.

---

## 1) Overview

These conventions ensure clarity, reliability, and speed to production. They cover naming, structure, quality bars, safety, rollout, and operations. Treat them as **non‑negotiable defaults** unless explicitly overridden in a scoped ADR.

For folder structures, see [FOLDER\_STRUCTURE.md](./docs/FOLDER_STRUCTURE.md).

---

## 2) Naming Conventions (JavaScript Standard)

* **Files/Dirs:** `kebab-case` for files and folders.
* **Variables & Functions:** `camelCase`.
* **Classes & Constructors:** `PascalCase`.
* **Constants & Env Vars:** `UPPER_SNAKE_CASE`.
* **Database:** `snake_case` for tables/columns.
* **Booleans:** prefix with `is`, `has`, `can`, `should`.
* **Feature flags:** `areaFeaturePurpose` (e.g., `campaignsLalRollout`).
* **Metrics:** `domain.component.metric` (e.g., `ingest.worker.retryCount`).

---

## 3) Logging Convention

* Use structured logs (JSON). Mandatory fields: `timestamp`, `level`, `service`, `env`, `message`, optional: `err`, `trace_id`, `span_id` key business IDs.
* Levels: `debug` (local only), `info` (state changes), `warn` (degraded), `error` (actionable), `fatal` (process exit).
* Never log secrets/PII. Redact using an allowlist.
* One event per line; no stacktraces at `info`.

**Example**

```json
{"level":"error","service":"reporting","msg":"db write failed","order_id":"o_123","err":"unique_violation"}
```

---

## 4) Linting & Formatting

* Use Prettier and ESLint for JS/TS code.
* CI must fail on lint, type, or formatting errors.
* Style rules live in repo (`.eslintrc.*`, `.prettierrc`).

---

## 5) Database Conventions

* **Schema:** `snake_case` names; singular table names if domain objects are singular (`creator`, `campaign`), else plural consistently.
* **Keys:** surrogate primary keys as `id BIGINT/UUID`; natural keys with unique indexes.
* **Columns:** timestamps as `*_at` UTC; soft delete with `deleted_at` when needed.
* **Migrations:** forward‑only, backward‑compatible; never drop/rename in the same deploy—use 2‑phase (write old+new → backfill → read new → remove old).
* **Access:** use parameterized queries/ORM with explicit transactions.

---

## 6) Deployment Environments

* **Envs:** `local` → `testing` → `staging` → `prod`.
* **Parity:** config via env vars or config files committed per env; secrets in a vault/KMS.
* **Promotion:** artifact immutability; promote the same build through envs.
* **Rollout:** use feature flags and canaries.

---

## 7) Vendor Documentation (3rd‑party)

For each vendor/tooling integration keep a doc in `docs/vendors/<vendor>.md` with:

* Purpose & scope
* Auth/keys & secret path
* Quotas/limits & pricing gotchas
* API versions used and upgrade plan
* Failure modes & example errors
* Runbook: common ops tasks, dashboards, alerts

---

## 8) Internal Architecture

* Each service must have a high‑level block diagram (request flow, data stores, dependencies) and sequence diagram for critical paths.
* Maintain an ADR per significant decision in `docs/adrs/ADR-<id>-<slug>.md`.
* Explicit SLOs: availability, latency, error rates; attach dashboards and alerts.

---

## 9) No Dangling References

* All TODOs must link to an issue ID.
* Dead code, unused flags, and stale endpoints are removed within one sprint of deprecation window end.
* CI job `dangling-check` scans for broken links, missing README fields, and orphaned modules.

---

## 10) Memory Footprint

* Establish per‑process memory budgets; track with runtime metrics.
* Avoid unbounded caches and fan‑in buffers; set limits and eviction policies.
* Use streaming/iterators over full materialization for large datasets.
* Benchmark hot paths and regressions in CI for services with tight SLAs.

---

## 11) Conventional Commits + SemVer

* **Commits:**

  * `feat:`, `fix:`, `perf:`, `refactor:`, `docs:`, `test:`, `build:`, `ci:`, `revert:`
  * Scopes allowed: `api`, `db`, `ui`, `infra`, `auth`.
  * Body explains why, not just what; link issues.
* **Releases (SemVer):**

  * MAJOR for breaking public API changes
  * MINOR for backward‑compatible features
  * PATCH for backward‑compatible fixes

---

## 12) API Versioning & Deprecation Policy

* **Versioning:** prefix base path with version (`/v1/…`).
* **Compatibility:** additive changes only within a major; breaking changes require new major.
* **Deprecation:**

  * Announce with `Deprecation`/`Sunset` headers; doc the migration path.
  * Deprecation window: default 90 days.
  * Telemetry to see remaining traffic; do targeted outreach.

---

## 13) Request/Response Schemas (OpenAPI/JSON Schema)

* Every external API has a machine‑readable spec in `api/` and is validated at runtime.
* Required fields explicit; enums enumerated; error shapes standardized.
* **Error model:**

```json
{
  "error": {
    "code": "string",
    "message": "human readable",
    "details": [{"field": "path", "issue": "constraint"}]
  }
}
```

---

## 14) Timeouts, Retries, Backoff, Idempotency

* **Client timeouts:** set per hop.
* **Retries:** only for idempotent, transient errors; use exponential backoff + jitter.
* **Idempotency:** endpoints accept `Idempotency-Key`.
* **Circuit breakers** on flaky dependencies; emit health metrics.

---

## 15) Feature Flags & Safe Rollout

* Flags are typed and server‑side.
* Rollout ladder: dev enable → staging → prod canary → progressive rollout.
* Guard with kill‑switch; document clean‑up date; remove stale flags.

---

## 16) Backward‑Compatible Migrations

* Additive first; dual‑write if needed; backfill with verifiable checks; then flip reads; finally remove legacy.
* Rollback plan documented per migration.

---

## 17) Test Data Management

* Deterministic fixtures in `testdata/`.
* Synthetic data for privacy; contract tests against vendor sandboxes.
* Seed scripts for local/dev.

---

## 18) Latency Budgets per Endpoint

* Document per endpoint: **P50/P95 targets**, **timeout**, **max payload**.
* Include budget split (app vs. DB vs. network).

**Example**

```
GET /v1/reports/:id
  P50 120ms, P95 400ms; timeout 800ms; payload ≤ 256KB
```

---

## 19) Least‑Privilege IAM

* Deny by default; explicit allow for needed actions only.
* Separate roles for CI, runtime, and humans.
* Key rotation and secret scanning enforced in CI.

---

## 29) Service README Template

Create `<service>/README.md` using this template:

```
# <Service Name>

## Purpose
One paragraph on the problem and users.

## Contracts
- API: link to OpenAPI in ./api
- Events: list topics/subjects and payload schemas

## Run
- Dependencies, env vars, make targets
- Local dev (how to run), seed data

## Operations
- Dashboards & alerts
- SLOs & error budgets
- Runbooks (oncall procedures)

## Deployment
- CI/CD pipeline, promotion steps, feature flags

## Data
- Storage used, retention, backfill jobs, PII classification

## Security
- Secrets, IAM roles, threat model notes
```

---

## 21) Quality Bars & Checklists

* **PR Checklist:** tests updated, migrations safe, docs updated, logs/traces added, flags scoped, perf budget met.
* **Release Checklist:** changelog generated, rollout plan, dashboards ready, oncall notified.

---

## 22) Tooling Defaults

* Pre-commit hooks: format, lint, typecheck, secret scan.
* CI stages: `lint → build → unit → integration → security → perf (critical paths) → package`.
* Required approvals: at least 1 domain reviewer + 1 QA sign-off for user-facing changes.

---

## 23) Exceptions

If you must diverge, open an ADR with:

* Rationale & scope, risk analysis, alternative considered
* Sunset/reeval date
* Owner responsible for re-alignment

---

**This document is living.** Propose changes via PR + ADR. Ensure all services link their README and specs back to this file.
