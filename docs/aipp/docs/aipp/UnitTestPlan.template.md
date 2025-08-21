# Unit Test Plan

## Functions Under Test
- listUserItems

## Risks to Cover
- Input validation, empty datasets, pagination boundaries, error mapping

## Equivalence Classes
- limit missing → default 20
- limit below 1 or above 100 → UserError
- nextCursor present/absent

## Edge Cases
- 0 items, exactly limit items, > limit items
- DB transient error → SystemError with retry hint

## Error Paths
- Validation errors, DB errors

## Coverage Targets
- ≥90% statements/branches on touched files
- Mutation score ≥60% (optional, if using Stryker)
