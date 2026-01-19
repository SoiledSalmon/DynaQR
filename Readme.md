# DynaQR

DynaQR is a dynamic QR code management system built with a modern web stack. This repository contains the source code for both the frontend and backend applications.

## High-Level Architecture

The project is structured as a monorepo:

*   **`frontend/`**: A Next.js (App Router) application handling the user interface and client-side logic.
*   **`backend/`**: A Node.js/Express application serving the API and handling business logic.

## Tech Stack

*   **Frontend**: Next.js (React), TypeScript, Tailwind CSS.
*   **Backend**: Node.js, Express.js, MongoDB.

---

## 1. Setup Instructions

### Prerequisites
*   **Node.js**: v18 or higher recommended.
*   **npm**: Included with Node.js.
*   **MongoDB**: Ensure you have a running MongoDB instance (local or Atlas).

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd DynaQR
    ```

2.  **Install Frontend Dependencies:**
    ```bash
    cd frontend
    npm install
    ```

3.  **Install Backend Dependencies:**
    ```bash
    cd ../backend
    npm install
    ```

### Running the Application

1.  **Start the Backend:**
    ```bash
    cd backend
    npm run dev
    # Server runs on http://localhost:5000
    ```

2.  **Start the Frontend:**
    Open a new terminal.
    ```bash
    cd frontend
    npm run dev
    # Client runs on http://localhost:3000
    ```

---

## 2. Environment Configuration

The application requires environment variables to function. We provide example files to get you started.

### Frontend
1.  Navigate to `frontend/`.
2.  Copy `.env.example` to `.env.local`:
    ```bash
    cp .env.example .env.local
    ```
3.  Review `.env.local`. The `NEXT_PUBLIC_API_URL` should point to your backend (default: `http://localhost:5000`).

### Backend
1.  Navigate to `backend/`.
2.  Copy `.env.example` to `.env`:
    ```bash
    cp .env.example .env
    ```
3.  Edit `.env` and provide your `MONGO_URI` (connection string).
4.  **CRITICAL**: Set a strong `JWT_SECRET`.
    *   It must be at least 32 characters long.
    *   It must be random and unguessable.
    *   The server will **refuse to start** if you use the insecure default.

---

## 3. Database Seeding

The application requires initial data (students and teachers) to function correctly.

1.  Ensure your MongoDB connection is configured in `backend/.env`.
2.  Run the seed script from the backend directory:
    ```bash
    cd backend
    node seed.js
    ```
3.  This will import mock data from `backend/data/` into your database.

---

## 4. Authentication (Current State)

This application currently uses **MOCK Authentication** for development speed and simplicity.

*   **Mechanism**: Login is handled via a standard JWT flow.
*   **Role Mapping**:
    *   **Internal (Database)**: The role is stored as `faculty`.
    *   **External (API/Frontend)**: The role is exposed as `teacher`.
    *   The backend automatically handles this mapping. Frontend developers should strictly use `teacher`.
*   **Behavior**:
    *   You must use a valid email address present in the database (e.g., from the seed data).
    *   **Password checks are disabled.** You can enter any password or leave it blank (frontend logic may vary, but backend ignores it).
    *   **Email Domain**: Only emails ending in `@rvce.edu.in` are allowed.
*   **Roles**: The system supports `student` and `teacher` roles. The backend authoritatively assigns roles based on the email address.

**Note:** This mock setup allows developers to test role-based features without setting up an external identity provider.

---

## 5. Authentication (Future Plan)

We plan to migrate to **Google OAuth** in a future release.

*   **Changes**:
    *   The login form will be replaced by a "Sign in with Google" button.
    *   The backend will validate Google ID tokens instead of checking passwords.
*   **No Changes**:
    *   The internal authorization logic (JWTs, roles, route protection) will remain exactly the same.
    *   The backend will still issue a JWT to the frontend after verifying the Google identity.

---

## Folder Structure

```
DynaQR/
├── backend/            # Backend API (Node.js/Express)
├── frontend/           # Frontend Application (Next.js)
├── .gitignore          # Git ignore rules
├── README.md           # Project documentation
└── API_CONTRACT.md     # API Contract documentation
```