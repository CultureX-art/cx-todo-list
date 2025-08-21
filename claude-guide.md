# 📝 Todo Bootcamp Project – Claude Prompt Guide

## 📌 Context
We are building a **To-Do List app** as part of a 2-week intern bootcamp.  

**Stack**
- **Backend**: Node.js (Express) + Sequelize + MySQL  
- **Frontend**: React + Vite  
- **Infra**: AWS (EC2, RDS, S3, API Gateway, IAM, ALB, Route53) via Terraform  
- **Testing**: Jest + Supertest (BE), Vitest + React Testing Library (FE)  

**Rule**: **Tests must be written before code.**  
PRs should be small, reviewed, and CI (lint + tests) must pass before merge.  

---

## 🔑 Step 1: Define API Contract
Ask Claude:
```md
Generate an OpenAPI 3.0 spec in YAML for a Todo app with these endpoints:
- POST /auth/signup
- POST /auth/login
- GET /me
- GET /tasks (filters: status, search; pagination)
- POST /tasks
- PATCH /tasks/{id}
- DELETE /tasks/{id}
Models: User (id, email, passwordHash), Task (id, userId, title, description, dueDate, status, labels[])
```

---

## 🔑 Step 2: Write Backend Tests First
Ask Claude:
```md
Write Jest + Supertest test files for Express APIs defined in the OpenAPI spec.
Tests should include:
- Auth: signup, login, /me with valid + invalid JWT
- Tasks: create, read (filters, search, pagination), update, delete
- Validation: missing title → 400, invalid status → 400, invalid dueDate → 400
- Security: user cannot access or edit tasks of another user
Tests should fail initially because no implementation exists.
```

---

## 🔑 Step 3: Implement Backend to Pass Tests
Ask Claude:
```md
Implement backend code in Express + Sequelize + MySQL to make the Jest tests pass.
Use Sequelize models: User, Task.
Include middleware for auth (JWT).
Keep code minimal — only enough to pass tests.
```

---

## 🔑 Step 4: Write Frontend Tests First
Ask Claude:
```md
Write Vitest + React Testing Library tests for Todo app UI.
Tests should cover:
- Auth: login form, invalid creds show error, redirect on success
- Task List: renders tasks, filter by status, search by title
- Task Form: cannot save without title, valid task adds to list
- States: empty list, loading spinner, error message
- Accessibility: tab navigation, labels on buttons/inputs
Tests should fail initially.
```

---

## 🔑 Step 5: Implement Frontend to Pass Tests
Ask Claude:
```md
Implement React + Vite frontend to make Vitest + RTL tests pass.
Pages:
- Login page
- Signup page
- Todo List page (with filters/search)
- Task form (modal or inline)
Use fetch to call backend APIs.
Style with Tailwind.
```

---

## 🔑 Step 6: Infrastructure (Terraform)
Ask Claude:
```md
Write Terraform scripts to provision:
- VPC + subnets
- RDS MySQL instance
- EC2 instance for backend (with security group + IAM role)
- S3 bucket for frontend static hosting
- API Gateway → backend EC2
- ALB + Route53 for domain routing
Keep infra minimal, use free tier where possible.
```

---

## 🔑 Step 7: CI/CD
Ask Claude:
```md
Write GitHub Actions workflows:
1. On PR: run lint + tests (backend + frontend).
2. On merge to main: run tests, then deploy with Terraform apply.
```

---

## 🔑 Step 8: Demo & Teardown
- Deploy full stack to AWS.  
- Validate user can sign up, login, and manage tasks.  
- Run test suite → all green.  
- After demo, run `terraform destroy`.  

---

## ✅ Deliverables
- Passing tests (BE + FE)  
- Deployed app accessible via Route53 domain  
- Terraform scripts reproducible (`plan`, `apply`, `destroy`)  
- Demo video by interns  
