# PRD: <Feature Name>
**Owner:** <Name> | **Date:** <YYYY-MM-DD>

## Goal
What user value are we delivering?

## Users & Value
- Primary user(s): ...
- Value hypothesis: ...

## Acceptance Criteria (testable)
1. <Given/When/Then>
2. <...>
3. <...>

## Non-Functional Requirements (budgets)
- Performance: e.g., P95 < 200ms for endpoint /X, bundle delta < 50KB
- Security/Privacy: input validation, no secrets in logs
- Reliability: retries/backoff, idempotency for writes
- Accessibility/i18n: WCAG AA, language fallback

## Constraints
Libraries/versions required, backward-compat expectations, data contracts.

## Out of Scope
Explicitly list to avoid scope creep.

## Risks & Mitigations
Bullets with owners.

## Rollout & Guardrails
Phased rollout, flags, monitoring, rollback plan.

---

## PRD Validation Checklist
Before proceeding to Stage 2 (Thought Experiment), ensure:

### Business Value
- [ ] Clear business problem statement defined
- [ ] Success metrics are measurable and specific
- [ ] ROI estimation completed (if applicable)
- [ ] Stakeholder sign-off obtained

### Technical Feasibility
- [ ] Current system capacity assessed
- [ ] Dependencies identified and validated
- [ ] Technology stack compatibility confirmed
- [ ] Resource requirements estimated

### User Experience
- [ ] User journey mapped end-to-end
- [ ] Accessibility requirements defined
- [ ] Mobile/responsive considerations addressed
- [ ] Error states and edge cases covered

### Quality & Security
- [ ] Security requirements clearly defined
- [ ] Performance budgets established
- [ ] Testing strategy outlined
- [ ] Compliance requirements identified

### Risk Assessment Framework

#### Risk Categories & Impact Matrix
| Risk Level | Description | Response Strategy |
|------------|-------------|-------------------|
| 🔴 Critical | System outage, data loss, security breach | Immediate mitigation required |
| 🟡 High | Performance degradation, user experience impact | Mitigation plan before implementation |
| 🟢 Medium | Minor inconvenience, edge case issues | Monitor during rollout |
| ⚪ Low | Cosmetic issues, nice-to-have features | Document and address post-launch |

#### Technical Risks
- [ ] **Data Migration Risk**: _Impact:_ [Critical/High/Medium/Low] _Mitigation:_ 
- [ ] **Integration Risk**: _Impact:_ [Critical/High/Medium/Low] _Mitigation:_ 
- [ ] **Performance Risk**: _Impact:_ [Critical/High/Medium/Low] _Mitigation:_ 
- [ ] **Security Risk**: _Impact:_ [Critical/High/Medium/Low] _Mitigation:_ 

#### Business Risks
- [ ] **Market Timing**: _Impact:_ [Critical/High/Medium/Low] _Mitigation:_ 
- [ ] **Resource Availability**: _Impact:_ [Critical/High/Medium/Low] _Mitigation:_ 
- [ ] **Regulatory Compliance**: _Impact:_ [Critical/High/Medium/Low] _Mitigation:_ 

#### Operational Risks
- [ ] **Deployment Risk**: _Impact:_ [Critical/High/Medium/Low] _Mitigation:_ 
- [ ] **Monitoring Gaps**: _Impact:_ [Critical/High/Medium/Low] _Mitigation:_ 
- [ ] **Support Readiness**: _Impact:_ [Critical/High/Medium/Low] _Mitigation:_ 

### Decision Log
Track key decisions made during PRD development:

| Date | Decision | Rationale | Owner |
|------|----------|-----------|-------|
| | | | |

### Success Criteria Sign-off
- [ ] Product Owner approval
- [ ] Engineering Lead approval  
- [ ] Security review (if required)
- [ ] Legal/Compliance review (if required)
