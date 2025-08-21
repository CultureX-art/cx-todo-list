# TypeScript Types Documentation

This directory contains TypeScript type definitions for the cx-todo-list application.

## Files

### `index.ts`
- **User Types**: `User`, `AuthenticatedUser`
- **Task Types**: `Task`, `TaskStatus`, `TaskPriority`
- **Request/Response Types**: `AuthRequest`, `AuthResponse`, `CreateTaskRequest`, `UpdateTaskRequest`
- **Utility Types**: `PaginatedResponse<T>`, `AuthenticatedRequest<T>`, `ApiError`

### `services.ts`
- **Service Interfaces**: `IAuthService`, `ITaskService`, `IUserService`
- **Repository Interfaces**: `IUserRepository`, `ITaskRepository`
- **Filter Types**: `TaskFilters`

## Usage Examples

### Controller Implementation
```typescript
import { AuthenticatedRequest, Task, CreateTaskRequest } from '../types';

async function createTask(
  req: AuthenticatedRequest<CreateTaskRequest>,
  res: Response<Task>,
  next: NextFunction
): Promise<void> {
  // Implementation
}
```

### Service Implementation
```typescript
import { ITaskService, TaskFilters } from '../types/services';
import { Task, PaginatedResponse } from '../types';

class TaskService implements ITaskService {
  async getTasks(userId: string, filters: TaskFilters): Promise<PaginatedResponse<Task>> {
    // Implementation
  }
}
```

## Type Safety Features

1. **Request Validation**: Controllers now have proper type checking for request parameters, body, and query strings
2. **Response Formatting**: Responses are typed to ensure consistent API contract
3. **Error Handling**: Custom error types for better error management
4. **Service Contracts**: Interface definitions ensure service layer consistency
5. **Authentication**: Type-safe user authentication context