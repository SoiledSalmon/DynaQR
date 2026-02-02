# CLAUDE.md - Backend

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Development server with nodemon (http://localhost:5000)
npm start            # Production server
node seed-v2.js      # Seed new schema (Student, Faculty, Subject, Teaching)
node seed-v2.js --clean  # Clear and reseed new schema
```

### Migrations

```bash
node migrations/run-all.js           # Run all migrations
node migrations/run-all.js --dry-run # Preview migrations
node migrations/run-all.js --from 3  # Resume from migration 3
node migrations/validate.js          # Validate migration results
node migrations/cleanup-guard.js     # Verify safe to drop legacy collections
node migrations/cleanup-guard.js --drop  # Drop legacy collections (DESTRUCTIVE)
```

No testing or linting is configured.

## Architecture

Express.js 5 backend with MongoDB/Mongoose. CommonJS modules throughout.

```
controllers/     # Business logic (async/await with try-catch)
middleware/      # protect (JWT auth), authorizeRole (RBAC)
models/          # Mongoose schemas (see Database Schema below)
routes/          # API endpoints mapping to controllers
config/db.js     # MongoDB connection
data/            # Seed JSON files
migrations/      # Database migration scripts
```

## Database Schema (v2 - Final)

### Identity Domain
```
Student           Faculty
├─ email          ├─ email
├─ password       ├─ password
├─ name           ├─ name
├─ usn            ├─ emp_id
├─ section        ├─ department
├─ semester       └─ is_registered
└─ is_registered
```

### Academic Domain
```
Subject                Teaching
├─ code (CS301)        ├─ faculty_id → Faculty
├─ name                ├─ subject_id → Subject
└─ department          ├─ section
                       ├─ semester
                       ├─ academic_year
                       └─ is_active
```

### Attendance Domain
```
SessionNew              QRToken                AttendanceNew
├─ teaching_id →        ├─ session_id →        ├─ session_id → SessionNew
├─ start_time           ├─ token               ├─ student_id → Student
├─ end_time             └─ expires_at (TTL)    ├─ student_name (snapshot)
├─ secret_key                                  ├─ student_usn (snapshot)
└─ status (enum)                               ├─ qr_token_used
                                               ├─ marked_at
                                               └─ ip_address, user_agent
```

### Audit Domain
```
AuditLog
├─ action (LOGIN, SESSION_CREATE, ATTENDANCE_MARK, etc.)
├─ actor_type (student | faculty | system)
├─ actor_id
├─ target_type, target_id
├─ metadata
└─ created_at (TTL 90 days)
```

## Model Relationships

```
Faculty ──1:N──→ Teaching ──1:N──→ SessionNew ──1:N──→ AttendanceNew
                    │                    │                    │
                    ↓                    ↓                    ↓
                Subject              QRToken              Student
                                  (rotating)
```

- **Student/Faculty**: Separate collections (no polymorphism)
- **is_registered**: false = whitelist only, true = can login
- **Teaching**: Links faculty to subjects they teach
- **QRToken**: Rotating tokens for replay protection (TTL auto-delete)
- **AttendanceNew**: Snapshots student data + verification metadata

## Critical Conventions

### Role Handling
- **Student.role**: Virtual getter returns `'student'`
- **Faculty.role**: Virtual getter returns `'teacher'` (API contract compliance)
- No `faculty` ↔ `teacher` mapping needed - virtuals handle it

### Session Status Lifecycle
```
scheduled → active → completed
    ↓
cancelled
```
Status is an enum, not boolean. Use `session.updateStatusByTime()` for auto-updates.

### QR Token Rotation
```javascript
// Generate new token (60s validity)
const token = await QRToken.generateForSession(sessionId, 60000);

// Validate token on attendance mark
const valid = await QRToken.validateToken(sessionId, scannedToken);
```

### Secret Key Handling
- `SessionNew.secret_key`: 16-byte random hex, primary session secret
- Must be **excluded** from `GET /api/attendance/session/:sessionId` response
- Only returned on session creation

### Email Domain
- All emails must end with `@rvce.edu.in`
- Enforced via regex in Student/Faculty schemas

### Audit Logging
```javascript
const AuditLog = require('./models/AuditLog');
await AuditLog.logLogin('student', studentId, true, { ip: req.ip });
await AuditLog.logAttendance(studentId, sessionId, success, { reason: 'expired' });
await AuditLog.logSessionCreate(facultyId, sessionId, { teaching_id });
```

## Authentication Flow

1. **Registration**: Email must exist in Student or Faculty collection with `is_registered: false`
2. **Login**: Find Student/Faculty by email (Student first, then Faculty), verify password (mock auth disabled for dev), return JWT
3. **JWT**: 30-day expiration, payload contains `{ id, email, role }`
4. **Protected routes**: `protect` middleware → `authorizeRole(['teacher'])` or `authorizeRole(['student'])`
5. **User lookup**: Middleware tries Student first, then Faculty. Fails closed if not found.

## Attendance Flow

### Create Session (Teacher)
1. Validate input (teaching_id, startTime, endTime)
2. Verify Teaching exists, is active, and belongs to the logged-in faculty
3. Check for overlapping active/scheduled sessions
4. Create SessionNew with auto-generated secret_key
5. Generate first QRToken (60s validity)
6. Audit-log session creation
7. Return session with secret_key and token

### Mark Attendance (Student)
1. Validate sessionId (and optionally qr_token)
2. If qr_token provided, validate it exists and is not expired
3. Fetch session with populated Teaching
4. Auto-update session status based on time
5. Validate session is active and within time window
6. Validate student enrollment (section + semester match teaching)
7. Check for duplicate attendance
8. Create AttendanceNew with verification metadata (ip, user-agent, qr_token_used)
9. Audit-log success or failure

## Environment Variables

```
PORT=5000
MONGO_URI=mongodb://localhost:27017/dynaqr
JWT_SECRET=<min 32 chars, server refuses to start with default>
```

## API Routes

**Auth** (`/api/auth`):
- `POST /register` - Requires email in Student/Faculty with is_registered=false
- `POST /login` - Email + password (mock auth still active during transition)

**Attendance** (`/api/attendance`):
- `POST /create` - Teacher: create session (validates Teaching assignment)
- `POST /mark` - Student: mark attendance (validates enrollment, time, QR token)
- `GET /student-metrics` - Student dashboard stats
- `GET /history` - Student attendance records
- `GET /session/:sessionId` - Teacher: session details without secret_key
- `GET /teacher-dashboard` - Teacher dashboard stats + teachings list
- `POST /session/:sessionId/rotate-token` - Teacher: generate new QR token

## Post-Migration Cleanup

### Before Dropping Legacy Collections

**MANDATORY**: Run the cleanup guard script to verify safety:

```bash
node migrations/cleanup-guard.js
```

This script checks:
1. No controller imports legacy models
2. No middleware imports legacy models
3. All files use new models only

### Dropping Legacy Collections

Only after the guard script passes:

```bash
node migrations/cleanup-guard.js --drop
```

Or manually in MongoDB:
```javascript
use dynaqr
db.users.drop()
db.masterstudents.drop()
db.masterfaculties.drop()
db.sessions.drop()
db.attendances.drop()
db.classes.drop()
```

### Legacy Collections (DO NOT USE)

These collections exist only for migration purposes:
- `users` → replaced by `students` + `faculties`
- `masterstudents` → merged into `students.is_registered`
- `masterfaculties` → merged into `faculties.is_registered`
- `sessions` → replaced by `sessionnews`
- `attendances` → replaced by `attendancenews`
- `classes` → removed (was unused)

**Controllers and middleware must NEVER import legacy models.**
