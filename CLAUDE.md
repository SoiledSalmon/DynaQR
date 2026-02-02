# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DynaQR is a dynamic QR code-based attendance management system for educational institutions. Teachers create attendance sessions that generate QR codes; students scan them to mark attendance.

## Development Commands

### Backend (runs on http://localhost:5000)
```bash
cd backend
npm install
npm run dev          # Start with nodemon (auto-reload)
node seed-v2.js      # Seed database with new schema
node seed-v2.js --clean  # Clear and reseed
```

### Frontend (runs on http://localhost:3000)
```bash
cd frontend
npm install
npm run dev          # Development server
npm run build        # Production build
npm run lint         # ESLint
```

### Database Migration
```bash
cd backend
node migrations/run-all.js    # Run all migrations
node migrations/validate.js   # Validate migration
node migrations/cleanup-guard.js  # Check if safe to drop legacy collections
node migrations/cleanup-guard.js --drop  # Drop legacy collections (DESTRUCTIVE)
```

## Architecture

Monorepo structure with separate frontend and backend applications:
- **frontend/**: Next.js 16 (App Router), TypeScript, Tailwind CSS
- **backend/**: Express 5, MongoDB (Mongoose), JWT authentication

### Database Schema (v2 - Final)

**Identity Domain:**
- `Student` - students with email, usn, section, semester, is_registered
- `Faculty` - teachers with email, emp_id, department, is_registered

**Academic Domain:**
- `Subject` - normalized subjects with code (CS301), name, department
- `Teaching` - faculty-subject-section-semester assignments

**Attendance Domain:**
- `SessionNew` - attendance sessions with teaching_id, time window, status
- `QRToken` - rotating tokens for replay protection (TTL auto-delete)
- `AttendanceNew` - attendance records with verification metadata

**Audit Domain:**
- `AuditLog` - security events with 90-day TTL

### Key Backend Structure
- `controllers/` - Business logic (authController, attendanceController)
- `middleware/` - JWT verification and role authorization
- `models/` - Mongoose schemas (see backend/CLAUDE.md for details)
- `routes/` - API route definitions
- `migrations/` - Database migration scripts

### Key Frontend Structure
- `app/` - Next.js App Router pages (login, student/*, teacher/*)
- `lib/api.ts` - Axios instance with JWT interceptor (auto-attaches token)
- `lib/auth.ts` - Token management (localStorage)
- `lib/role.ts` - Role management utilities
- `lib/routeGuard.tsx` - Client-side route protection (UX only; server handles real auth)

## Critical Conventions

### Role Handling
- **Student**: `role` virtual returns `'student'`
- **Faculty**: `role` virtual returns `'teacher'` (API contract compliance)
- No role mapping logic needed in controllers - virtuals handle it

### LocalStorage Keys (defined in API_CONTRACT.md)
- `auth_token` - Raw JWT string
- `user_role` - `'student'` or `'teacher'`

### Authentication Flow
1. Login: Email must exist in Student or Faculty with `is_registered: true`
2. Register: Email must exist with `is_registered: false`, then set password and flag
3. User lookup: Try Student first, then Faculty. Fail closed if not found.
4. JWT payload: `{ id, email, role }` with 30-day expiration

### Attendance Flow
1. **Create Session**: Validate Teaching exists and faculty is assigned, check for overlaps, create session + first QRToken
2. **Mark Attendance**: Validate QR token, session status, time window, student enrollment (section + semester), then create record with verification metadata

### Security Features
- JWT_SECRET must be 32+ chars; server refuses to start with weak secret
- CORS whitelist: localhost:3000, localhost:5000
- Rate limiting: 100 requests per 15 minutes per IP
- QR token rotation for replay protection
- Audit logging for security events

### Attendance Rules
- Faculty can only create sessions for courses in their Teaching assignments
- Students can only mark attendance for courses matching their section + semester
- Duplicate attendance prevented by unique index `{ session_id, student_id }`
- Time window validation (must be within start_time and end_time)
- All failures are audit-logged

## API Contract

See `API_CONTRACT.md` for the frozen API specification. Key endpoints:
- `POST /api/auth/login` - Login (email only for mock auth; password support available)
- `POST /api/auth/register` - Register (email must be in whitelist)
- `POST /api/attendance/create` - Create session (teacher, validates Teaching)
- `POST /api/attendance/mark` - Mark attendance (student, validates enrollment)
- `GET /api/attendance/session/:sessionId` - Session details (teacher)
- `GET /api/attendance/student-metrics` - Student stats
- `GET /api/attendance/history` - Student attendance history
- `GET /api/attendance/teacher-dashboard` - Teacher stats + teachings
- `POST /api/attendance/session/:sessionId/rotate-token` - Rotate QR token (teacher)

The `secret_key` field must never be exposed in API responses (except on session creation).

### Session Creation Request Format
```json
{
  "teaching_id": "TEACHING_ID_FROM_DASHBOARD",
  "startTime": "2026-01-20T10:00:00.000Z",
  "endTime": "2026-01-20T11:00:00.000Z"
}
```
Note: Teachers must select from their assigned `teaching_id` values (from `/teacher-dashboard`).

### Session Status Enum
Sessions use a status enum: `'scheduled' | 'active' | 'completed' | 'cancelled'`
- Auto-updated based on current time vs start_time/end_time
- Frontend should check `status` field, not assume boolean `is_active`

## Post-Migration Cleanup

### Verifying Safety
Run before dropping legacy collections:
```bash
cd backend
node migrations/cleanup-guard.js
```

### Dropping Legacy Collections
Only after guard script passes:
```bash
node migrations/cleanup-guard.js --drop
```

### Legacy Collections (DO NOT USE IN CONTROLLERS)
- `users` → replaced by `students` + `faculties`
- `masterstudents` → merged into `students`
- `masterfaculties` → merged into `faculties`
- `sessions` → replaced by `sessionnews`
- `attendances` → replaced by `attendancenews`
- `classes` → removed (was unused)
