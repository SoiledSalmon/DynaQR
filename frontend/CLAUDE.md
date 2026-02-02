# CLAUDE.md - Frontend

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Development server (http://localhost:3000)
npm run build    # Production build
npm start        # Production server
npm run lint     # ESLint
```

No testing framework configured.

## Architecture

Next.js 16 with App Router, React 19, TypeScript, Tailwind CSS v4.

### App Router Pages
- `/` → redirects to `/login`
- `/login` → email + role selection (role is UX only; backend determines actual role)
- `/student/dashboard` → attendance metrics and history
- `/student/scan` → QR code scanner (html5-qrcode)
- `/teacher/dashboard` → session management with course selector + QR generation
- `/teacher/session/[id]` → session details, QR display, attendee list
- `/unauthorized` → 403 error page

### Lib Utilities
- **`api.ts`**: Axios instance with request interceptor that auto-attaches JWT from localStorage
- **`auth.ts`**: Token management (`saveToken`, `getToken`, `clearToken`) using localStorage key `auth_token`
- **`role.ts`**: Role management (`saveUserRole`, `getUserRole`, `clearUserRole`) using localStorage key `user_role`
- **`routeGuard.tsx`**: HOC for client-side route protection; wraps all protected pages

## Authentication Flow

1. Login sends `{ email }` to `POST /api/auth/login`
2. Backend returns `{ token, user: { id, email, role } }`
3. Frontend stores token and role in localStorage
4. Axios interceptor attaches token as `Authorization: Bearer <token>`
5. RouteGuard checks token/role on mount, redirects if invalid

**Important**: Frontend auth is UX-level only. Real authorization happens on backend.

## Backend Integration

The frontend connects to the backend API which uses the new schema:
- **Student/Faculty**: Separate collections (no polymorphic User)
- **Teaching**: Faculty teaching assignments
- **SessionNew**: Attendance sessions with QR token rotation
- **AttendanceNew**: Attendance records with verification metadata

### Key API Endpoints & Response Formats

#### `POST /api/auth/login`
- **Request**: `{ email }`
- **Response**: `{ token, user: { id, email, role } }`

#### `GET /api/attendance/student-metrics`
- **Response**:
```json
{
  "totalSessions": 10,
  "attendedSessions": 8,
  "overallPercent": 80,
  "attendancePercentage": 80,
  "classes": [
    {
      "classId": "subject-0",
      "name": "Computer Networks",
      "code": "CS301",
      "attended": 5,
      "total": 6,
      "percent": 83
    }
  ]
}
```

#### `GET /api/attendance/history`
- **Response**: Array of attendance records with nested session info
```json
[
  {
    "_id": "...",
    "marked_at": "2026-01-20T10:30:00.000Z",
    "session": {
      "_id": "...",
      "subject": "Computer Networks",
      "subject_code": "CS301",
      "section": "A",
      "class_start_time": "2026-01-20T10:00:00.000Z"
    }
  }
]
```

#### `GET /api/attendance/teacher-dashboard`
- **Response**:
```json
{
  "totalSessions": 25,
  "activeSessions": 1,
  "sessionsToday": 3,
  "recentSessions": [
    {
      "_id": "...",
      "subject": "Mathematics",
      "subject_code": "MATH201",
      "section": "A",
      "class_start_time": "...",
      "class_end_time": "...",
      "status": "active",
      "is_active": true
    }
  ],
  "teachings": [
    {
      "_id": "TEACHING_ID",
      "subject": "Mathematics",
      "subject_code": "MATH201",
      "section": "A",
      "semester": 3
    }
  ]
}
```

#### `POST /api/attendance/create`
- **Request**: `{ teaching_id, startTime, endTime }` (teaching_id from teachings list)
- **Response**: Session object with `secret_key` and `current_token`

#### `GET /api/attendance/session/:sessionId`
- **Response**:
```json
{
  "session": {
    "_id": "...",
    "subject": "...",
    "subject_code": "...",
    "section": "...",
    "semester": 3,
    "class_start_time": "...",
    "class_end_time": "...",
    "status": "active",
    "created_at": "..."
  },
  "attendees": [
    { "student_name": "...", "usn": "...", "timestamp": "..." }
  ]
}
```

#### `POST /api/attendance/mark`
- **Request**: `{ sessionId, qr_token }` (both REQUIRED)
- **Response**: `{ message: "Attendance Marked Successfully!" }`

## QR Code Handling

### QR Generation (Teacher)
QR codes encode a JSON payload with rotating tokens:
```typescript
const qrPayload = JSON.stringify({ sessionId, token: currentToken });
const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrPayload)}`;
```

### Token Rotation
- Tokens rotate every **55 seconds** (5s buffer before 60s expiry)
- Use `useEffect` with `setInterval` to auto-rotate
- Call `POST /api/attendance/session/:sessionId/rotate-token` to get new token
- Clear interval on unmount or view change

### QR Scanning (Student)
Parse the scanned QR as JSON:
```typescript
const payload = JSON.parse(decodedText);
const { sessionId, token } = payload;
await api.post('/api/attendance/mark', { sessionId, qr_token: token });
```

### Security
- `qr_token` is **MANDATORY** - plain sessionId QRs are rejected
- Tokens expire after 60 seconds to prevent screenshot sharing
- Token validation happens server-side

## Critical Conventions

### Roles
- Only two values: `'student'` | `'teacher'`
- Role comes from backend response, not user selection
- Type defined in `lib/role.ts`: `UserRole = 'student' | 'teacher'`

### Session Status
Backend uses enum: `'scheduled' | 'active' | 'completed' | 'cancelled'`
- `scheduled`: Session not yet started
- `active`: Session in progress
- `completed`: Session ended normally
- `cancelled`: Session cancelled

### RouteGuard Usage
```tsx
<RouteGuard allowedRoles={['student']}>
  {/* page content */}
</RouteGuard>
```

### Path Aliases
- `@/*` maps to project root (configured in tsconfig.json)
- Example: `import api from '@/lib/api'`

### Session Creation (Teacher)
When creating a session, the teacher must select a `teaching_id` from their assigned courses (returned by `/api/attendance/teacher-dashboard`). The form shows a dropdown of available teaching assignments.

### Attendance Marking (Student)
When marking attendance, the frontend sends:
- `sessionId` (from QR code)
- Optionally `qr_token` (from QR code, for extra security)

## Styling

- Tailwind CSS v4 with PostCSS
- Dark mode default (zinc-950 backgrounds)
- Color palette: zinc (neutral), indigo (primary), emerald (success), red (error), amber (warning)
- Geist Sans and Geist Mono fonts via next/font
- Custom autofill styles in `globals.css` for dark mode form inputs

## Environment

```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

Defaults to localhost:5000 if not set.

## Frontend-Backend Contract Alignment

The frontend has been aligned with the backend API contract (see `API_CONTRACT.md`):

1. **Session Creation**: Uses `teaching_id` instead of separate `subject`/`section` fields
2. **History API**: Expects `session.subject`, `session.class_start_time` (nested under `session`)
3. **Session Status**: Uses `status` enum instead of boolean `is_active`
4. **Attendee Format**: Expects `{ student_name, usn, timestamp }`
5. **Metrics**: Uses `overallPercent` and `attendancePercentage` (both provided for compatibility)
