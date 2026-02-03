# Contributing to DynaQR

Thank you for your interest in contributing to DynaQR! This document provides guidelines for development and contribution.

## Development Setup

### Prerequisites

- Node.js 18+
- MongoDB (local instance or Atlas)
- Git

### Initial Setup

1. Fork and clone the repository
2. Install dependencies for both workspaces:

```bash
cd backend && npm install
cd ../frontend && npm install
```

3. Set up environment files:

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your MongoDB URI and a strong JWT_SECRET (32+ chars)

# Frontend
cp frontend/.env.example frontend/.env.local
```

4. Seed the database:

```bash
cd backend && node seed-v2.js
```

5. Start development servers:

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

## Code Style Guidelines

### Frontend (TypeScript)

- Use TypeScript for all new code
- Follow existing patterns in `lib/` for utilities
- Use App Router conventions for pages
- Prefer functional components with hooks
- Use Tailwind CSS for styling (no inline styles or CSS modules)

### Backend (JavaScript/CommonJS)

- Use CommonJS (`require`/`module.exports`)
- Follow existing controller/route/model structure
- Use async/await for asynchronous operations
- Handle errors with try/catch and appropriate HTTP status codes

### General

- Use meaningful variable and function names
- Keep functions focused and small
- Add JSDoc comments for complex logic
- No console.log in production code (use proper logging)

## Database Conventions

See `backend/CLAUDE.md` for detailed schema documentation.

### Key Rules

- **Never modify legacy models** (`User.js`, `MasterStudent.js`, etc.) - they're kept for migration reference only
- Use the new schema models: `Student`, `Faculty`, `Subject`, `Teaching`, `SessionNew`, `AttendanceNew`, `QRToken`, `AuditLog`
- All new collections use camelCase field names
- Timestamps are handled by Mongoose (`createdAt`, `updatedAt`)

### Model Naming

- Mongoose models use PascalCase: `Student`, `Faculty`, `SessionNew`
- Collection names are lowercase plural: `students`, `faculties`, `sessionnews`

## API Contract Rules

**All API changes must update `API_CONTRACT.md`.**

The API contract is frozen for stability. If you need to modify an endpoint:

1. Ensure backward compatibility when possible
2. Update `API_CONTRACT.md` with the changes
3. Update corresponding CLAUDE.md files
4. Add migration notes if breaking changes are unavoidable

### Response Format

All API responses follow this pattern:

```javascript
// Success
res.status(200).json({ data: result });
res.status(201).json({ message: "Created", data: result });

// Error
res.status(400).json({ error: "Validation error message" });
res.status(401).json({ error: "Unauthorized" });
res.status(404).json({ error: "Resource not found" });
res.status(500).json({ error: "Internal server error" });
```

## Git Workflow

### Branching

- `main` - stable, production-ready code
- `feature/*` - new features
- `fix/*` - bug fixes
- `refactor/*` - code refactoring

### Commit Messages

Use conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```
feat(attendance): add QR token rotation endpoint
fix(auth): handle expired JWT gracefully
docs(readme): update installation instructions
refactor(models): extract validation helpers
```

### Pull Requests

1. Create a feature branch from `main`
2. Make your changes
3. Test locally (backend starts, frontend builds)
4. Update documentation if needed
5. Submit PR with clear description
6. Address review feedback

## Testing

### Manual Testing Checklist

Before submitting a PR, verify:

- [ ] Backend starts without errors: `cd backend && npm run dev`
- [ ] Frontend builds successfully: `cd frontend && npm run build`
- [ ] Frontend dev server works: `cd frontend && npm run dev`
- [ ] Login flow works for both student and teacher roles
- [ ] Core features work (create session, mark attendance)

### Database Testing

```bash
# Reseed database
cd backend && node seed-v2.js --clean

# Validate migrations
node migrations/validate.js
```

## Security Guidelines

- Never commit `.env` files or secrets
- JWT_SECRET must be 32+ characters
- Validate all user input on the backend
- Use parameterized queries (Mongoose handles this)
- Log security events to AuditLog
- Follow OWASP guidelines for web security

## Getting Help

- Check existing [CLAUDE.md](./CLAUDE.md) files for context
- Review [API_CONTRACT.md](./API_CONTRACT.md) for API details
- Open an issue for bugs or feature requests

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
