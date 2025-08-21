# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Todo List application being built as part of a 2-week intern bootcamp project with the following stack:
- **Backend**: Node.js (Express) + TypeScript + Sequelize + MySQL  
- **Frontend**: React + Vite  
- **Infrastructure**: AWS (EC2, RDS, S3, API Gateway, IAM, ALB, Route53) via Terraform  
- **Testing**: Jest + Supertest (backend), Vitest + React Testing Library (frontend)

## Development Commands

```bash
# Install dependencies
npm install

# Build TypeScript to JavaScript
npm run build

# Run development server (with TypeScript compilation)
npm run dev

# Start production server (requires build first)
npm start

# Run tests (when implemented)
npm test
```

## TypeScript Configuration

The project has been converted to TypeScript with the following setup:
- **TypeScript**: v5.9.2 with strict mode enabled
- **Build Output**: Compiled JavaScript files go to `/dist` directory
- **Type Definitions**: Complete interfaces for all models, services, and API contracts
- **Development**: Uses `ts-node` for development server with auto-compilation

## Architecture

The codebase follows a modular architecture with clear separation of concerns:

### Backend Structure (`/src`)

- **controllers/**: HTTP request handlers, validation, response formatting
- **services/**: Core business logic and workflows
- **repositories/**: Database access and query logic
- **models/**: Data schemas and entity definitions (Sequelize models)
- **routes/**: API endpoint definitions
- **middlewares/**: Authentication, error handling, request logging
- **validators/**: Input validation rules
- **utils/**: Reusable helper functions
- **clients/**: External API integrations
- **adapters/**: Data transformation between internal/external formats
- **config/**: Configuration files (database, environment)

## API Contract

The API follows the OpenAPI specification defined in `openapi.yaml`:
- Authentication: `/auth/signup`, `/auth/login`, `/me`
- Tasks: CRUD operations with filters, search, and pagination
- Security: JWT-based authentication, user isolation

## Development Workflow

1. **Test-First Development**: Tests must be written before implementation
2. **Small PRs**: Keep pull requests focused and reviewable
3. **CI Requirements**: Lint and tests must pass before merge
4. **User Isolation**: Users can only access their own tasks

## Key Implementation Notes

- Authentication uses JWT tokens
- Tasks are user-scoped (userId foreign key)
- Task model includes: title, description, dueDate, status, labels[]
- Validation returns 400 for invalid inputs
- Security enforces user data isolation