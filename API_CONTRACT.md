# DynaQR System Contract & API Specification

**Version:** 1.0.0 (Baseline)
**Status:** FROZEN
**Audience:** Frontend Engineers, Backend Engineers, QA

This document serves as the **SINGLE SOURCE OF TRUTH** for the interface contract between the frontend and backend of the DynaQR application. All implementation MUST conform to these specifications. Any deviation is considered a critical bug.

---

## 1. Role Vocabulary

The application recognizes exactly two roles. These values are case-sensitive and must be used exactly as defined.

### **Allowed Values**
```typescript
type Role = 'student' | 'teacher';
```

### **Constraints**
- **Legacy term "faculty" is DEPRECATED.** It must NOT be used in API responses, role checks, or frontend logic.
- Backend database values (e.g., in MongoDB) must be mapped to `'teacher'` before being sent to the frontend.
- Frontend registration forms must submit `'teacher'` (not 'faculty').

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

## 3. Login Response Shape

The `/api/auth/login` endpoint (and its mock equivalent) MUST return the following JSON structure on success.

### **Schema**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@rvce.edu.in",
    "role": "student" | "teacher"
  }
}
```

### **Violations**
- Returning `role` at the top level is FORBIDDEN.
- Returning `details` mixed with user info is discouraged in the auth response (fetch separately if needed).
- The key `user` is MANDATORY.

---

## 4. Frontend Storage Keys

To ensure the `RouteGuard` and API interceptors function correctly, the frontend MUST store session data using **only** the following LocalStorage keys.

### **Keys**
| Key | Purpose | Value Format |
| :--- | :--- | :--- |
| `auth_token` | Storing the raw JWT string | String |
| `user_role` | Storing the user's role for quick UI logic | `'student'` OR `'teacher'` |

### **Directives**
- **Do NOT** use generic keys like `token` or `user`.
- **Do NOT** access `localStorage` directly in components. Use the centralized `auth.ts` utilities.

---

## 5. Contract Checklist for Developers

Before marking a task complete, verify:

- [ ] Does the API return `role: 'teacher'` (not 'faculty')?
- [ ] Does the JWT contain `{ role: '...' }`?
- [ ] Is the frontend saving to `auth_token` (not `token`)?
- [ ] Is the frontend saving to `user_role` (not `userRole`)?
