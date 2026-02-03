# DynaQR

A dynamic QR code-based attendance management system for educational institutions. Teachers create attendance sessions that generate rotating QR codes; students scan them to mark attendance securely.

## Key Features

- **Dynamic QR Codes**: Token rotation every 60 seconds prevents screenshot sharing
- **Role-Based Access**: Separate flows for students and teachers
- **Teaching Assignments**: Teachers can only create sessions for their assigned courses
- **Enrollment Validation**: Students can only attend sessions matching their section and semester
- **Audit Logging**: Security events tracked with 90-day retention
- **Replay Protection**: Cryptographic tokens prevent duplicate or delayed attendance marking

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 |
| Backend | Express 5, MongoDB, Mongoose 9 |
| Auth | JWT (30-day tokens) |
| QR Library | html5-qrcode (scanning), external API (generation) |

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd DynaQR

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Environment Configuration

**Backend** (`backend/.env`):
```bash
cp .env.example .env
# Edit .env and set:
# - MONGO_URI: Your MongoDB connection string
# - JWT_SECRET: At least 32 random characters (server refuses weak secrets)
```

**Frontend** (`frontend/.env.local`):
```bash
cp .env.example .env.local
# Default NEXT_PUBLIC_API_URL=http://localhost:5000
```

### Database Seeding

```bash
cd backend
node seed-v2.js           # Seed with sample data
node seed-v2.js --clean   # Clear and reseed
```

### Running the Application

```bash
# Terminal 1 - Backend (http://localhost:5000)
cd backend
npm run dev

# Terminal 2 - Frontend (http://localhost:3000)
cd frontend
npm run dev
```

## Architecture

```
DynaQR/
├── backend/                 # Express API server
│   ├── controllers/         # Business logic
│   ├── middleware/          # JWT verification, role auth
│   ├── models/              # Mongoose schemas
│   ├── routes/              # API route definitions
│   ├── migrations/          # Database migration scripts
│   └── data/                # Seed data files
├── frontend/                # Next.js application
│   ├── app/                 # App Router pages
│   └── lib/                 # Utilities (api, auth, role)
├── API_CONTRACT.md          # Frozen API specification
└── CLAUDE.md                # AI assistant instructions
```

### Database Schema Domains

**Identity Domain**
- `Student` - USN, email, section, semester, registration status
- `Faculty` - Employee ID, email, department, registration status

**Academic Domain**
- `Subject` - Course code (e.g., CS301), name, department
- `Teaching` - Faculty-subject-section-semester assignments

**Attendance Domain**
- `SessionNew` - Attendance sessions with time windows and status
- `QRToken` - Rotating tokens (60s TTL) for replay protection
- `AttendanceNew` - Attendance records with verification metadata

**Audit Domain**
- `AuditLog` - Security events with 90-day TTL

### Security Features

- JWT authentication with 30-day expiration
- JWT_SECRET minimum 32 characters enforced at startup
- CORS whitelist for localhost origins
- Rate limiting: 100 requests per 15 minutes per IP
- QR token rotation prevents screenshot-based cheating
- All attendance failures are audit-logged

## Development Commands

### Backend

```bash
npm run dev              # Start with nodemon (auto-reload)
node seed-v2.js          # Seed database
node seed-v2.js --clean  # Clear and reseed
```

### Frontend

```bash
npm run dev              # Development server
npm run build            # Production build
npm run lint             # ESLint
```

### Database Migrations

```bash
cd backend
node migrations/run-all.js        # Run all migrations
node migrations/validate.js       # Validate migration
node migrations/cleanup-guard.js  # Check if safe to drop legacy
node migrations/cleanup-guard.js --drop  # Drop legacy (DESTRUCTIVE)
```

## API Overview

The API follows a RESTful design. Full specification in [API_CONTRACT.md](./API_CONTRACT.md).

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | Authenticate user |
| `/api/auth/register` | POST | Register new user |
| `/api/attendance/create` | POST | Create session (teacher) |
| `/api/attendance/mark` | POST | Mark attendance (student) |
| `/api/attendance/session/:id` | GET | Session details (teacher) |
| `/api/attendance/student-metrics` | GET | Student statistics |
| `/api/attendance/history` | GET | Student attendance history |
| `/api/attendance/teacher-dashboard` | GET | Teacher stats + teachings |
| `/api/attendance/session/:id/rotate-token` | POST | Rotate QR token |

### QR Code Payload Format

```json
{
  "sessionId": "MongoDB_ObjectId_String",
  "token": "6_CHAR_HEX_TOKEN"
}
```

## Project Documentation

- [API Contract](./API_CONTRACT.md) - Complete API specification
- [Backend CLAUDE.md](./backend/CLAUDE.md) - Backend conventions and schema details
- [Frontend CLAUDE.md](./frontend/CLAUDE.md) - Frontend architecture and patterns
- [Contributing](./CONTRIBUTING.md) - Development guidelines

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
