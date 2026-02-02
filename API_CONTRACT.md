# DynaQR System Contract & API Specification

**Version:** 2.0.0 (Post-Refactor)
**Status:** ACTIVE
**Audience:** Frontend Engineers, Backend Engineers, QA

This document serves as the **SINGLE SOURCE OF TRUTH** for the interface contract between the frontend and backend of the DynaQR application. All implementation MUST conform to these specifications. Any deviation is considered a critical bug.

---

## 1. Role Vocabulary & Mapping

The application recognizes exactly two roles externally. These values are case-sensitive and must be used exactly as defined.

### **Allowed Values**
```typescript
type Role = 'student' | 'teacher';
```

### **Internal Mapping**
- **Internal Database Role:** `faculty`
- **External API / Frontend Role:** `teacher`
- **Behavior:** The backend handles this mapping automatically. 
  - API responses and JWT payloads will always use `teacher`.
  - Frontend must submit `teacher` during registration.
  - The legacy term "faculty" is deprecated for all external communication.

---

## 2. JWT Payload Shape

The JSON Web Token (JWT) issued by the backend MUST contain the following claims in its payload.

### **Schema**
```json
{
  "id": "string (UUID or ObjectId)",
  "email": "string",
  "role": "student" | "teacher"
}
```

### **Rules**
- **Authoritative:** The backend is the sole authority for these claims.
- **Read-Only:** The frontend MUST treat the token payload as read-only.
- **Role Claim:** The `role` claim is MANDATORY for authorization.

---

## 3. Authentication Endpoints

### **Login**
- **Path:** `POST /api/auth/login`
- **Request Body:**
  ```json
  { "email": "user@rvce.edu.in" }
  ```
- **Response (200 Success):**
  ```json
  {
    "token": "JWT_STRING",
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@rvce.edu.in",
      "role": "student" | "teacher"
    }
  }
  ```

### **Register**
- **Path:** `POST /api/auth/register`
- **Request Body:**
  ```json
  {
    "email": "user@rvce.edu.in",
    "password": "...",
    "role": "student" | "teacher"
  }
  ```

---

## 4. Attendance Endpoints

### **Create Session (Teacher Only)**
- **Path:** `POST /api/attendance/create`
- **Auth:** Required (JWT)
- **Role:** `teacher`
- **Request Body:**
  ```json
  {
    "teaching_id": "TEACHING_ASSIGNMENT_ID",
    "startTime": "2026-01-20T10:00:00.000Z",
    "endTime": "2026-01-20T11:00:00.000Z"
  }
  ```
- **Note:** `teaching_id` must be a valid Teaching assignment owned by the logged-in faculty (from `/api/attendance/teacher-dashboard`).
- **Response (201 Success):**
  ```json
  {
    "_id": "SESSION_ID",
    "teaching_id": "TEACHING_ID",
    "start_time": "2026-01-20T10:00:00.000Z",
    "end_time": "2026-01-20T11:00:00.000Z",
    "status": "scheduled" | "active",
    "secret_key": "HEX_STRING",
    "current_token": "6_CHAR_TOKEN",
    "token_expires_at": "2026-01-20T10:01:00.000Z",
    "created_at": "2026-01-20T09:55:00.000Z"
  }
  ```
- **Important:** `secret_key` is ONLY returned on session creation. Subsequent GET requests exclude it.

### **Mark Attendance (Student Only)**
- **Path:** `POST /api/attendance/mark`
- **Auth:** Required (JWT)
- **Role:** `student`
- **Request Body:**
  ```json
  {
    "sessionId": "SESSION_ID_FROM_QR",
    "qr_token": "6_CHAR_TOKEN (optional)"
  }
  ```
- **Note:** If `qr_token` is provided, it must be valid and not expired.
- **Response (200 Success):**
  ```json
  { "message": "Attendance Marked Successfully!" }
  ```

### **Get Student Metrics (Student Only)**
- **Path:** `GET /api/attendance/student-metrics`
- **Auth:** Required (JWT)
- **Role:** `student`
- **Response (200 Success):**
  ```json
  {
    "totalSessions": 10,
    "attendedSessions": 8,
    "attendancePercentage": 80
  }
  ```

### **Get Attendance History (Student Only)**
- **Path:** `GET /api/attendance/history`
- **Auth:** Required (JWT)
- **Role:** `student`
- **Response (200 Success):** Array of attendance records with populated session details.

### **Get Session Details (Teacher Only)**
- **Path:** `GET /api/attendance/session/:sessionId`
- **Auth:** Required (JWT)
- **Role:** `teacher`
- **Response (200 Success):**
  ```json
  {
    "session": { ...metadata excluding secret_key },
    "attendees": [
      { "student_name": "...", "usn": "...", "timestamp": "..." }
    ]
  }
  ```

### **Get Teacher Dashboard (Teacher Only)**
- **Path:** `GET /api/attendance/teacher-dashboard`
- **Auth:** Required (JWT)
- **Role:** `teacher`
- **Response (200 Success):**
  ```json
  {
    "totalSessions": 25,
    "activeSessions": 1,
    "sessionsToday": 3,
    "recentSessions": [...],
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

### **Rotate QR Token (Teacher Only)**
- **Path:** `POST /api/attendance/session/:sessionId/rotate-token`
- **Auth:** Required (JWT)
- **Role:** `teacher`
- **Request Body:**
  ```json
  { "validity_ms": 60000 }
  ```
- **Note:** `validity_ms` is optional, defaults to 60000 (60 seconds).
- **Response (200 Success):**
  ```json
  {
    "token": "6_CHAR_TOKEN",
    "expires_at": "2026-01-20T10:01:00.000Z",
    "session_id": "SESSION_ID"
  }
  ```

---

## 5. Frontend Storage Keys

The frontend MUST store session data using **only** the following LocalStorage keys.

| Key | Purpose | Value Format |
| :--- | :--- | :--- |
| `auth_token` | Storing the raw JWT string | String |
| `user_role` | Storing the user's role for quick UI logic | `'student'` OR `'teacher'` |

---

## 6. Contract Checklist for Developers

- [ ] Does the API return `role: 'teacher'` (not 'faculty')?
- [ ] Is `secret_key` excluded from GET responses (only returned on session creation)?
- [ ] Do timestamps follow UTC format?
- [ ] Is the frontend saving to `auth_token`?
