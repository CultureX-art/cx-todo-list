# AIPP Context: Type Safety & Team Scale Requirements

## Team Context & Resource Constraints

**Current Team**: Small-medium engineering team (2-8 developers)
- Limited dedicated QA resources - automated type checking essential
- Cross-functional contributors - strict guardrails prevent accidental regressions
- Fast iteration cycles - early error detection critical
- Remote/distributed - self-documenting code reduces communication overhead

## Type Safety Requirements (Zero Tolerance)

### Forbidden Types
- **`any`** - Use specific union types: `string | number | boolean` instead
- **`unknown`** - Use specific types: `Record<string, string>`, `Error | null`, etc.  
- **`{}`** - Use specific object interfaces: `{ id: number; name: string }`
- **`object`** - Use specific record types: `Record<string, unknown>`
- **`Function`** - Use specific signatures: `(param: string) => boolean`

### Replacement Patterns
```typescript
// ❌ FORBIDDEN
function process(data: any): any { }
function handle(error: unknown): void { }
function validate(obj: {}): boolean { }

// ✅ REQUIRED  
function process(data: TaskData): ProcessResult { }
function handle(error: Error | ValidationError | null): void { }
function validate(obj: { id: number; name: string }): boolean { }
```

### Exception Process (Human Approval Required)
1. Create ADR documenting business need
2. Get tech lead + 1 senior engineer approval  
3. Use scoped `eslint-disable-next-line` with ADR link
4. Set 30-day sunset date with TODO
5. Document specific remediation steps

## Context Passing Requirements

### Service Context Pattern
```typescript
// ✅ All service methods must accept ServiceContext
interface ServiceContext {
  user?: { id: number; email: string };
  correlationId: string; 
  timestamp: Date;
  clientIp?: string;
  userAgent?: string;
}

// ✅ Required pattern
async createTask(request: CreateTaskRequest, context: ServiceContext): Promise<Task> {
  // correlationId propagated through call chain
  const task = await this.repository.create(request, context);
  await this.auditService.logTaskEvent({ 
    type: 'task_created', 
    taskId: task.id 
  }, context);
  return task;
}
```

## Folder Structure Compliance

### Reference Pattern Before Creating Files
1. Check `docs/FOLDER_STRUCTURE.md` for placement rules
2. Examine 3+ existing files in target directory for patterns
3. Follow domain-driven structure: `src/{domain}/{api,services,repositories}`

### Standard Placement Rules
- Common utilities: `src/common/{validation,error,types,database}/`
- Domain logic: `src/{domain}/{api,services,repositories}/`  
- Configuration: `src/config/`
- Tests: `__tests__/{domain}/` (mirrors src structure)
- Integration: `__tests__/integration/{api,database,services,workflows}/`

## AI Code Generation Guidelines

### Before Creating New Files
- [ ] Reference existing patterns in similar modules
- [ ] Check folder structure documentation
- [ ] Ensure imports follow established conventions  
- [ ] Validate type safety with specific, meaningful types

### During Implementation  
- [ ] Use ServiceContext for all service method calls
- [ ] Propagate correlation IDs for traceability
- [ ] Apply database transaction context where needed
- [ ] Follow established error handling patterns

### Quality Gates
- [ ] ESLint passes with zero exceptions (unless ADR approved)
- [ ] TypeScript compilation with strict mode
- [ ] Unit tests cover edge cases and error paths
- [ ] Integration tests validate cross-service communication

## Example: Compliant Code Generation

```typescript
// ✅ Domain service with proper typing and context
export class TaskService implements ITaskService {
  constructor(
    private repository: TaskRepository,
    private auditService: AuditService
  ) {}

  async createTask(
    request: CreateTaskRequest, 
    context: ServiceContext
  ): Promise<TaskResponse> {
    // Validate input with specific types
    if (!request.title || request.title.trim().length === 0) {
      throw new ValidationError('Title is required', [
        { field: 'title', issue: 'Cannot be empty' }
      ]);
    }

    // Use transaction context for data consistency
    const task = await this.repository.create({
      userId: context.user!.id,
      title: request.title.trim(),
      description: request.description?.trim() || null,
      status: 'not-started',
      labels: request.labels || []
    });

    // Propagate context through service boundaries
    await this.auditService.logTaskEvent({
      type: 'task_created',
      taskId: task.id,
      userId: context.user!.id,
      metadata: { correlationId: context.correlationId }
    }, context);

    return {
      id: task.id,
      title: task.title,
      status: task.status,
      createdAt: task.createdAt
    };
  }
}
```

This approach ensures:
- **Type Safety**: Zero `any`/`unknown` usage
- **Context Propagation**: Traceability across service calls  
- **Team Scalability**: Self-documenting, maintainable code
- **Resource Efficiency**: Early error detection reduces manual testing overhead