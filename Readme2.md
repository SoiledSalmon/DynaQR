✦ Authentication & Authorization Architecture

  1. Mock Login Flow

  The application currently utilizes a mock authentication flow to simulate user identity without external dependencies. This facilitates rapid development of  
  frontend features and role-based logic.

   1. User Input: The user navigates to the login page and provides an institutional email address (must end in @rvce.edu.in) and explicitly selects a role
      (student or teacher).
   2. Validation: The frontend performs immediate validation on the email domain and ensures a role is selected.
   3. Submission: The credentials are submitted to the authentication handler.
   4. Response: Upon successful validation, the system mimics a backend response, returning a payload that includes a JSON Web Token (JWT) and a User Object
      containing the immutable ID, email, and role.

  2. Token Issuance

  Security and session management are handled via JSON Web Tokens (JWT).

   * Issuance: A JWT is generated and issued immediately upon successful login.
   * Claims: The token payload contains essential identity claims, specifically the userId, email, and the authoritative role.
   * Client Storage: The frontend stores the received token in localStorage. This persistence allows the user to remain logged in across page reloads and       
     browser sessions.
   * Transmission: For all subsequent API requests, the frontend automatically retrieves the stored token and attaches it to the Authorization HTTP header using
     the Bearer schema.

  3. Role Persistence

  Roles are the central mechanism for defining user access within the application.

   * Assignment: In the current mock phase, the role is selected by the user. In the future production environment, this will be determined by the backend based
     on the authenticated user's profile in the database.
   * Source of Truth: The backend—and specifically the signed JWT—is the single source of truth for a user's role.
   * Frontend Availability: To facilitate UI logic, the role is extracted from the initial login response and stored locally (e.g., user_role in localStorage).
     This allows the client application to make immediate routing decisions without repeatedly querying the API.

  4. Authorization Enforcement

  Security is enforced using a defense-in-depth strategy, distinguishing between User Experience (UX) and User Security.

   * Backend (Security): The backend API is the ultimate enforcer of authorization. Every protected endpoint verifies the incoming JWT's signature and validity.
     The backend explicitly checks the role claim within the token before processing a request. Requests with missing, invalid, or insufficient permissions are
     rejected with HTTP 401 (Unauthorized) or 403 (Forbidden) status codes.
   * Frontend (UX): The frontend implements Client-Side Route Guards. These guards inspect the locally stored token and role before rendering a page.
       * If a user attempts to access a /teacher route with a student role, they are redirected to an Unauthorized error page.
       * If no token exists, they are redirected to the Login page.
       * Note: This frontend logic prevents users from seeing irrelevant UI but does not prevent malicious actors from attempting to call the API directly;
         hence, backend enforcement is mandatory.

  5. OAuth Replacement Plan

  The architecture is designed to support a seamless transition from Mock Authentication to Google OAuth (restricted to the @rvce.edu.in domain).

   * The Change: The "Mock Login" form will be replaced by a "Sign in with Google" button.
   * The Flow:
       1. The user authenticates via Google.
       2. The backend validates the Google ID token.
       3. The backend identifies the user in the database and determines their role.
       4. The backend issues the same standard JWT structure used currently.
   * The Constants: The rest of the application remains unchanged. The token storage mechanism, the Authorization header attachment, the frontend route guards,
     and the backend role verification logic will continue to function exactly as designed without modification. This decouples the authentication method (how
     we know who you are) from the authorization logic (what you are allowed to do).