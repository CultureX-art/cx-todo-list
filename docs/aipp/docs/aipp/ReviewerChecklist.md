# Reviewer Checklist

- [ ] ACs satisfied exactly; public interfaces unchanged after Stage 3
- [ ] Unit tests: happy/edge/error; coverage targets met
- [ ] Integration tests isolated; seed/cleanup correct
- [ ] Security: input validation, no secrets in code/tests/logs
- [ ] Performance budgets respected; no n^2 on hot paths
- [ ] Observability: correlation IDs logged; no PII in logs
- [ ] Small focused diffs; clear changelog
