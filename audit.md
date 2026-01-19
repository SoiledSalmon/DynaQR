# 🔍 DynaQR Repository Audit Report
**Date:** January 20, 2026  
**Auditor:** Senior Technical Reviewer  
**Scope:** Full-stack authentication & attendance system (Mock Auth + JWT)

---

## EXECUTIVE SUMMARY

This audit identifies **critical blocking issues** that prevent the application from functioning as designed. The frontend and backend were developed independently and contain **fundamental integration mismatches**. Multiple security vulnerabilities, logic flaws, and contract violations exist across both layers.

**Status:** ❌ **NOT PRODUCTION-READY** — Critical fixes required before deployment.

---

## 1. DOCUMENTATION CONSISTENCY CHECK

### ✅ Aligned Components
- Folder structure matches documented architecture (monorepo with `frontend/` and `backend/`)
- Mock authentication strategy is consistently described
- JWT-based session management is documented and implemented
- Role-based authorization principles are outlined

### ⚠️ Mismatches & Ambiguities

| Issue | Location | Severity |
|-------|----------|----------|
| **Email domain mismatch** | Documentation states `@rvce.edu.in` but test data uses `@college.edu` | Medium |
| **Missing .env.example files** | README references copying `.env.example` files that don't exist | High |
| **Incomplete setup instructions** | No database seeding instructions in README | Medium |
| **Undocumented student/teacher dashboards** | Documentation references `/student/dashboard` and `/teacher/dashboard` routes that don't exist | Critical |

---

## 2. FRONTEND REVIEW

### 🔴 CRITICAL ISSUES

#### 2.1 **Authentication Library Usage Inconsistency**
- **Location:** `frontend/app/login/page.tsx`
- **Problem:** Login page uses hardcoded `localStorage.setItem('token', ...)` and `localStorage.setItem('userRole', ...)` instead of using the centralized `auth.ts` and `role.ts` utility functions (`saveToken()`, `saveUserRole()`)
- **Impact:** Code duplication, inconsistent token/role storage keys (`'token'` vs `'auth_token'`, `'userRole'` vs `'user_role'`)
- **Risk:** Authentication state corruption, route guard failures

#### 2.2 **Missing Dashboard Routes**
- **Location:** Frontend routing structure
- **Problem:** Login page redirects to `/student/dashboard` and `/teacher/dashboard` but these routes **do not exist**
- **Impact:** Users will encounter 404 errors after successful login
- **Evidence:** No files found for `**/student/**/*.tsx` or `**/teacher/**/*.tsx`

#### 2.3 **Backend API Not Called**
- **Location:** `frontend/app/login/page.tsx` lines 75-82
- **Problem:** Login form uses `mockLoginApi()` function with setTimeout — **no actual HTTP request** is made to the backend `/api/auth/login` endpoint
- **Impact:** Frontend and backend are completely disconnected; backend auth logic is never executed
- **Risk:** Production deployment will fail immediately

#### 2.4 **Storage Key Mismatches**
- **Defined in lib/auth.ts:** `'auth_token'`
- **Defined in lib/role.ts:** `'user_role'`
- **Used in login/page.tsx:** `'token'` and `'userRole'`
- **Impact:** RouteGuard will always fail because it reads from `'auth_token'` and `'user_role'`, but login stores to `'token'` and `'userRole'`

### ⚠️ MODERATE ISSUES

#### 2.5 **Unsafe Server-Side localStorage Access**
- **Location:** `frontend/lib/auth.ts`, `frontend/lib/role.ts`
- **Problem:** All functions check `typeof window !== 'undefined'` but could still be called during SSR
- **Risk:** Runtime errors if called from server components or during build

#### 2.6 **No Logout Functionality**
- **Location:** Entire frontend
- **Problem:** No logout button, route, or handler exists
- **Impact:** Users cannot clear their session

#### 2.7 **Missing Protected Route Implementation**
- **Location:** Dashboard routes (which don't exist)
- **Problem:** Even when dashboards are created, there's no indication they'll use `<RouteGuard>`
- **Risk:** Routes may be accessible without authentication

### 💡 SUGGESTIONS

#### 2.8 **No Loading State During RouteGuard Check**
- **Location:** `frontend/lib/routeGuard.tsx` lines 61-63
- **Current:** Returns `null` while checking authorization
- **Better:** Return loading spinner to improve UX

#### 2.9 **No Error Handling for API Failures**
- **Location:** `frontend/app/login/page.tsx` lines 84-92
- **Problem:** Catch block only logs error; doesn't handle network failures, 401, 403, etc.

---

## 3. BACKEND REVIEW

### 🔴 CRITICAL ISSUES

#### 3.1 **Missing Role Verification in JWT**
- **Location:** `backend/middleware/authMiddleware.js`
- **Problem:** JWT verification extracts `decoded.id` but **does not include role** in the token payload
- **Expected:** Per documentation, JWT should contain `userId`, `email`, and `role`
- **Actual:** `generateToken()` only signs `{ id }` — no role or email
- **Impact:** Backend cannot enforce role-based authorization without additional DB queries

#### 3.2 **Logic Flaw in authMiddleware.js**
- **Location:** `backend/middleware/authMiddleware.js` lines 17-19
- **Problem:** 
```javascript
if (!token) {
  res.status(401).json({ message: 'Not authorized, no token' });
}
```
Missing `return` statement after sending response
- **Impact:** Code continues executing after error response, potential for "headers already sent" errors

#### 3.3 **Model Field Access Bug in Attendance Controller**
- **Location:** `backend/controllers/attendanceController.js` lines 69-70
- **Problem:** Code references `student.name` and `student.details.usn`
- **Reality:** User model stores these as `student_details.name` and `student_details.usn`
- **Impact:** Attendance marking will **fail with "Cannot read property 'name' of undefined"**

#### 3.4 **No Role Authorization on Protected Routes**
- **Location:** All protected routes in `backend/routes/attendanceRoutes.js`
- **Problem:** Only `protect` middleware is used — no check that students can't access `/create` or teachers can't access `/mark`
- **Impact:** **Any authenticated user can create sessions or mark attendance regardless of role**
- **Security:** Authorization is completely bypassed

### ⚠️ MODERATE ISSUES

#### 3.5 **Password Required for Mock Login**
- **Location:** `backend/controllers/authController.js` line 73
- **Problem:** Login endpoint requires password field, but frontend mock doesn't collect it
- **Documentation Conflict:** Readme2.md doesn't mention passwords for mock auth

#### 3.6 **Session Security: Secret Key Predictability**
- **Location:** `backend/controllers/attendanceController.js` line 9
- **Problem:** Secret key uses `Math.random()` which is not cryptographically secure
- **Risk:** Potential for QR code prediction/brute force

#### 3.7 **Email Domain Validation Missing**
- **Location:** `backend/controllers/authController.js`
- **Problem:** Documentation specifies `@rvce.edu.in` validation but backend has no such check
- **Impact:** Any email format can register if it exists in master lists

### 💡 SUGGESTIONS

#### 3.8 **Inefficient Duplicate Attendance Check**
- **Location:** `backend/controllers/attendanceController.js` lines 48-53
- **Performance:** Runs a separate DB query to check duplicates instead of using `findOne` with upsert logic

#### 3.9 **Missing Input Validation**
- **Location:** All controllers
- **Risk:** No validation for required fields, data types, or malicious input

---

## 4. FRONTEND ↔ BACKEND CONTRACT VALIDATION

### 🔴 BREAKING CONTRACT VIOLATIONS

| Contract Element | Frontend Expectation | Backend Reality | Status |
|------------------|---------------------|-----------------|--------|
| **Login endpoint** | `mockLoginApi()` (no request) | `POST /api/auth/login` | ❌ Not called |
| **Token storage key** | `'token'` | N/A (should be `'auth_token'`) | ❌ Mismatch |
| **Role storage key** | `'userRole'` | N/A (should be `'user_role'`) | ❌ Mismatch |
| **Login response shape** | `{ token, user: { id, email, role } }` | `{ _id, email, role, details, token }` | ⚠️ Partial match |
| **JWT payload** | Should contain `userId`, `email`, `role` | Contains only `{ id }` | ❌ Missing claims |
| **Authorization header** | `Bearer <token>` via `api.ts` | Expected by middleware | ✅ Aligned |
| **Role values** | `'student'` or `'teacher'` | `'student'` or `'faculty'` | ❌ **CRITICAL MISMATCH** |

### 🔴 CRITICAL: Role Value Inconsistency

**Frontend:**
```typescript
export type UserRole = 'student' | 'teacher';
```

**Backend:**
```javascript
role: { type: String, enum: ['student', 'faculty'], required: true }
```

**Impact:** Even if login were connected, role-based logic would fail because frontend expects `'teacher'` but backend returns `'faculty'`.

### ⚠️ Token Shape Mismatch

**Frontend expects:**
```typescript
{ token: string, user: { id: string, email: string, role: Role } }
```

**Backend returns:**
```javascript
{ _id, email, role, details: { name, usn, ... }, token }
```

The frontend login handler accesses `data.user.role` but backend returns `data.role` at the top level.

---

## 5. SECURITY & LOGIC RISKS

### 🔴 CRITICAL SECURITY VULNERABILITIES

#### 5.1 **Complete Authorization Bypass**
- **Severity:** CRITICAL
- **Location:** Backend API routes
- **Problem:** No role checks on any endpoint — students can create sessions, teachers can mark attendance
- **Exploit:** `curl -H "Authorization: Bearer <student-token>" -X POST /api/attendance/create`

#### 5.2 **JWT Claims Insufficiency**
- **Severity:** HIGH
- **Location:** `backend/controllers/authController.js` line 6
- **Problem:** Token doesn't include role; backend must query DB on every request to check authorization
- **Risk:** Performance degradation + potential for stale role data

#### 5.3 **XSS Vulnerability via localStorage**
- **Severity:** MEDIUM (documented as known risk)
- **Location:** Frontend auth.ts
- **Problem:** JWT stored in localStorage is accessible to any JavaScript (including injected scripts)
- **Note:** Documentation acknowledges this; migration to HttpOnly cookies is planned

#### 5.4 **No CSRF Protection**
- **Severity:** MEDIUM
- **Location:** All state-changing endpoints
- **Problem:** No CSRF tokens; relies solely on JWT in Authorization header

### ⚠️ LOGIC VULNERABILITIES

#### 5.5 **Session Timing Edge Case**
- **Location:** `backend/controllers/attendanceController.js` lines 40-47
- **Scenario:** If `class_start_time` or `class_end_time` are in different timezones, validation fails
- **Problem:** Using `new Date()` for server time vs `new Date(session.class_start_time)` without timezone normalization

#### 5.6 **Race Condition in Duplicate Check**
- **Location:** `backend/controllers/attendanceController.js` lines 48-68
- **Problem:** Check and insert are not atomic; two simultaneous requests could both pass duplicate check
- **Solution:** Use unique compound index on `(session_id, student_id)`

#### 5.7 **No Session Expiration Logic**
- **Location:** Session model
- **Problem:** `is_active` field exists but is never checked or updated
- **Risk:** QR codes remain valid indefinitely unless manually deactivated

---

## 6. SYNTAX & BUILD RISK SCAN

### ✅ No TypeScript Errors Found
Running `get_errors()` returned no compilation errors.

### ⚠️ POTENTIAL RUNTIME ISSUES

#### 6.1 **Unhandled Promise Rejections**
- **Location:** `frontend/app/login/page.tsx`, multiple backend controllers
- **Risk:** Async errors may crash the app without proper try-catch

#### 6.2 **MongoDB Connection Dependency**
- **Location:** `backend/server.js` line 14, `backend/config/db.js`
- **Problem:** `connectDB()` is called but server starts regardless of success/failure
- **Risk:** API will return 500 errors if DB connection fails after startup

#### 6.3 **Missing Environment Variables**
- **Required but undocumented:**
  - `MONGO_URI`
  - `JWT_SECRET`
  - `PORT`
  - `NEXT_PUBLIC_API_URL`
- **Risk:** App won't run without manual configuration; no .env.example to guide users

#### 6.4 **Unused Dependencies**
- **Frontend:** `next-auth` is installed but never imported or used
- **Backend:** All dependencies appear utilized

### 💡 BUILD WARNINGS

#### 6.5 **TypeScript Compiler Option Issue**
- **Location:** `frontend/tsconfig.json` line 15
- **Problem:** `"jsx": "react-jsx"` is unusual for Next.js (typically uses `preserve`)
- **Risk:** Potential JSX transform issues

#### 6.6 **DNS Resolver Override**
- **Location:** `backend/server.js` lines 1-2, `backend/seed.js` lines 2-3
- **Problem:** Hardcoded Google DNS servers (`8.8.8.8`)
- **Risk:** May not work in corporate/restricted networks

---

## 7. TASK LIST GOING FORWARD

### 🔴 REQUIRED FIXES (Blocking — Must Complete)

#### **COORDINATION**
1. **[CRITICAL] Resolve role value mismatch** — Align on `'teacher'` vs `'faculty'` across frontend and backend
2. **[CRITICAL] Create missing dashboard routes** — Implement `/student/dashboard` and `/teacher/dashboard`
3. **[CRITICAL] Connect frontend login to backend API** — Replace `mockLoginApi()` with actual `fetch('/api/auth/login')`

#### **FRONTEND**
4. **[CRITICAL] Fix localStorage key mismatches** — Use `saveToken()` and `saveUserRole()` from utility files, not direct `localStorage.setItem()`
5. **[CRITICAL] Protect dashboard routes** — Wrap dashboards with `<RouteGuard allowedRoles={['student']}>`
6. **[HIGH] Implement logout functionality** — Add logout button, clear tokens, redirect to login
7. **[HIGH] Fix login response handling** — Update to access `data.role` not `data.user.role`, store `data.details`

#### **BACKEND**
8. **[CRITICAL] Add role to JWT payload** — Modify `generateToken()` to sign `{ id, role, email }`
9. **[CRITICAL] Fix authMiddleware logic bug** — Add `return` after "no token" error response
10. **[CRITICAL] Fix attendance controller field access** — Change `student.name` → `student.student_details.name`, `student.details.usn` → `student.student_details.usn`
11. **[CRITICAL] Implement role-based authorization middleware** — Create `authorizeRole(['faculty'])` middleware and apply to routes
12. **[HIGH] Add email domain validation** — Enforce `@rvce.edu.in` check in registration (or update docs to match `@college.edu`)
13. **[HIGH] Make password optional for mock login** — Remove password requirement or update frontend to collect it

#### **DOCUMENTATION**
14. **[HIGH] Create .env.example files** — Add templates for both frontend and backend with all required variables
15. **[MEDIUM] Update README with seeding instructions** — Document how to run `node seed.js` before first use
16. **[MEDIUM] Document actual vs planned auth flow** — Clarify that current implementation is mock-only, backend exists but isn't connected

---

### ⚠️ RECOMMENDED IMPROVEMENTS (Non-Blocking)

#### **SECURITY**
17. **[MEDIUM] Add CORS origin whitelist** — Replace `app.use(cors())` with specific allowed origins
18. **[MEDIUM] Use crypto.randomBytes() for session secrets** — Replace `Math.random()` with cryptographically secure generator
19. **[MEDIUM] Add rate limiting** — Protect login and attendance endpoints from brute force
20. **[MEDIUM] Add unique index to prevent duplicate attendance** — Create compound index on `(session_id, student_id)`

#### **BACKEND**
21. **[MEDIUM] Add input validation middleware** — Use express-validator or Joi for all request bodies
22. **[MEDIUM] Normalize timezones** — Store all dates in UTC, convert on frontend display
23. **[MEDIUM] Check `is_active` flag** — Validate session is active before allowing attendance
24. **[LOW] Add request logging** — Use morgan or similar for API request logs

#### **FRONTEND**
25. **[MEDIUM] Add loading spinner to RouteGuard** — Replace `return null` with visual feedback
26. **[MEDIUM] Improve error handling** — Show user-friendly messages for different HTTP error codes
27. **[LOW] Add form validation** — Client-side validation for email format and role selection
28. **[LOW] Add session timeout warning** — Detect JWT expiration and prompt re-login

---

### 💡 OPTIONAL ENHANCEMENTS

#### **FEATURES**
29. **[LOW] Add "Remember Me" checkbox** — Persist login state for longer duration
30. **[LOW] Add QR code generation library** — Display actual scannable QR on teacher dashboard
31. **[LOW] Add attendance statistics** — Show student attendance percentage, faculty session history

#### **DEVELOPER EXPERIENCE**
32. **[LOW] Add API documentation** — Create Swagger/OpenAPI docs for backend endpoints
33. **[LOW] Add frontend component library** — Standardize button, input, card components
34. **[LOW] Add pre-commit hooks** — Run linting/formatting automatically

---

## CONCLUSION

### Current State Assessment

**Authentication Layer:** ❌ Non-functional  
- Frontend and backend are not connected
- Storage keys don't match utility functions
- Role values incompatible between layers

**Authorization Layer:** ❌ Broken  
- No role enforcement on backend
- JWT lacks role claim
- Critical security vulnerabilities

**Attendance Logic:** ⚠️ Partially Implemented  
- Core logic exists but has field access bugs
- Timing validation present but lacks edge case handling
- No protection against duplicate entries at DB level

**Documentation:** ⚠️ Inconsistent  
- High-level architecture is accurate
- Missing critical setup details
- Assumptions don't match implementation

### Recommended Next Steps

1. **Immediate Priority:** Fix the 16 CRITICAL/HIGH required fixes in order
2. **Week 1 Goal:** Achieve end-to-end login flow (items 1-7, 14)
3. **Week 2 Goal:** Secure backend authorization (items 8-13)
4. **Week 3 Goal:** Address recommended security improvements (items 17-20)

### Risk Assessment

**If deployed as-is:**
- ❌ Users cannot log in (frontend doesn't call backend)
- ❌ Any logged-in user can perform any action (no role checks)
- ❌ Application crashes on attendance marking (field access errors)
- ⚠️ Vulnerable to XSS (documented limitation of localStorage)
- ⚠️ Vulnerable to timing attacks on QR codes (weak randomness)

**Estimated effort to minimum viable product:** 3-5 days for one developer addressing items 1-16.

---

**End of Audit Report**
