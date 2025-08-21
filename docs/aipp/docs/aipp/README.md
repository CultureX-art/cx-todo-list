# AIPP (AI Pair Programming) Starter Kit

This kit operationalizes your 8‑stage, guard‑railed AI development flow for a Node/Express + Sequelize, React/Vite, AWS (Terraform) stack.

## Contents
- **Process**: PRD, ADR, Interface Pact, Unit/Integration Test Plans, Reviewer Checklist
- **Prompts**: generation, red-team, test-only, refactor, migration
- **Operational Tooling**: Feature flags, rollback procedures, canary deployments, schema evolution
- **Scaffolds**: Example service with signatures → tests → implementation path; integration test with Supertest

## 8 Stages (recap)
1) PRD → 2) Thought Experiment → 3) Function Signatures & Docstrings (freeze) → 4) Unit tests → 5) Implement to green → 6) Integration tests → 7) Integration to green → 8) Efficiency & hardening

### Interface Freeze Rule
Any change to public interfaces after Stage 3 requires returning to Stage 3, re-approval, and regenerating affected tests.

## Quick Start
1. Copy `/docs/aipp` and `/prompts` into your repo.
2. If using the example server scaffold (optional), copy `/server` and run:
   ```bash
   npm install
   npm run test:unit
   npm run test:int
   ```
3. Start a pilot with two low-risk tickets; manually track KPIs for evaluation.

## Future Extensions
### CI/CD Integration
- GitHub Actions workflows for automated quality gates
- GitLab CI/CD pipelines
- Jenkins integration
- Azure DevOps pipelines

### Metrics & Monitoring System
- Automated KPI tracking dashboard
- Real-time velocity metrics (story points, PR cycle time)
- Quality metrics collection (coverage, mutation scores, defect rates)
- AI usage analytics (token consumption, assist rates)
- Cost analysis and ROI reporting
- Developer satisfaction tracking
