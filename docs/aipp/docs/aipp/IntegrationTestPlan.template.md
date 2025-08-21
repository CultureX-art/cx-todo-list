# Integration Test Plan

## Boundaries
- HTTP layer → service → Sequelize (using a test DB or testcontainers)

## External Deps & Fakes
- Use testcontainers for MySQL; or an in-memory alternative for speed

## Seed Data
- Users table: userId present
- Items table: 0, 15, 40 rows across cases

## Assertions (incl. Observability)
- Response codes/body; structured logs include correlationId
- No secrets/PII in logs

## Cleanup Strategy
- Truncate tables between tests; destroy containers at suite end
