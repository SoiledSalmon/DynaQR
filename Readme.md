# DynaQR

DynaQR is a dynamic QR code management system built with a modern web stack. This repository contains the source code for both the frontend and backend applications.

## High-Level Architecture

The project is structured as a monorepo:

*   **`frontend/`**: A Next.js (App Router) application handling the user interface and client-side logic.
*   **`backend/`**: A Node.js/Express application serving the API and handling business logic.

## Tech Stack

*   **Frontend**: Next.js (React), TypeScript, Tailwind CSS (assumed based on standard Next.js setup).
*   **Backend**: Node.js, Express.js.

## Prerequisites

*   Node.js (v18 or higher recommended)
*   npm or yarn

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd DynaQR
```

### 2. Frontend Setup

Navigate to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Set up environment variables:

```bash
cp .env.example .env.local
```
Review `.env.local` to ensure `NEXT_PUBLIC_API_URL` points to your backend (default: `http://localhost:5000`).

Run the development server:

```bash
npm run dev
```
The frontend will be available at `http://localhost:3000`.

### 3. Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Set up environment variables:

```bash
cp .env.example .env
```
Review `.env` to configure the port and environment.

Run the development server:

```bash
npm run dev
# or
npm start
```
The backend will run on `http://localhost:5000` (or the port specified in your `.env`).

## Authentication

*   **Current Status**: The application currently uses **mock authentication** for development purposes.
*   **Future Plans**: OAuth integration is planned for a future release to handle secure user authentication.

## Folder Structure

```
DynaQR/
├── backend/            # Backend API (Node.js/Express)
├── frontend/           # Frontend Application (Next.js)
├── .gitignore          # Git ignore rules
└── README.md           # Project documentation
```
