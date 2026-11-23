# Enabler Enterprise — Backend API

An enterprise-grade, modular Node.js & TypeScript REST API service for Enabler: hierarchical lead allocation, role-based governance, attendance auditing, and financial revenue calculations.

---

## 🏗️ Architecture & Features

- **Runtime**: Node.js & TypeScript (`tsx`, `ES2022`, `NodeNext`)
- **HTTP Server**: Express.js with JSON parsing, CORS, and centralized error handling
- **State & Store**: High-performance in-memory persistence layer pre-seeded with initial organizational data (Users, Teams, Leads, Attendance, Financial transactions)
- **Role-Based Access Control**: Strict multi-tier enforcement for `ADMIN`, `TEAM_LEAD`, and `BDE`
- **Lead Allocation Pipeline**:
  - `POST /api/leads/ingest`: Bulk CSV ingestion with phone/email deduplication
  - `POST /api/leads/allocate/stage1`: Stage 1 Admin allocation to Team Pools (Equal/Workload)
  - `POST /api/leads/allocate/stage2`: Stage 2 Team Lead allocation to BDE queues
  - `PATCH /api/leads/:id/status`: Disposition update with remarks and audit history
- **Attendance Tracking**:
  - `POST /api/attendance/punch-in`: Shift clock start with timestamps
  - `POST /api/attendance/punch-out`: Shift clock end with working duration calculation
- **Financial Module**:
  - `POST /api/finance/calculate-split`: 30:70 Company vs. Team revenue split calculator
  - `GET /api/finance/transactions`: Confirmed deal revenue ledger

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Run Development Server (Hot-Reload)
```bash
npm run dev
```
The server will start on `http://localhost:5000`.

### 3. Build & Production Run
```bash
npm run build
npm start
```

---

## 📡 API Endpoint Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Root server online check |
| `GET` | `/api/health` | Service health & uptime probe |
| `POST` | `/api/auth/login` | Session login & JWT generation |
| `GET` | `/api/auth/me` | Current authenticated user profile |
| `GET` | `/api/leads` | Filterable lead registry (by team, BDE, status, or search) |
| `POST` | `/api/leads/ingest` | Batch candidate ingestion with duplicate filter |
| `POST` | `/api/leads/allocate/stage1` | Dispatch leads from Admin pool to Teams |
| `POST` | `/api/leads/allocate/stage2` | Dispatch leads from Team pool to BDEs |
| `PATCH`| `/api/leads/:id/status` | Update lead disposition & schedule follow-up |
| `GET` | `/api/teams` | List all teams with active lead metrics |
| `POST` | `/api/teams` | Create a new team and designate Team Lead |
| `GET` | `/api/users` | List all users with role and team filters |
| `POST` | `/api/users` | Register a new user |
| `PATCH`| `/api/users/:id/toggle-status`| Toggle user `ACTIVE`/`INACTIVE` |
| `GET` | `/api/attendance` | Attendance records query |
| `POST` | `/api/attendance/punch-in` | Record shift punch in |
| `POST` | `/api/attendance/punch-out` | Record shift punch out |
| `GET` | `/api/finance/transactions` | Verified financial transactions ledger |
| `POST` | `/api/finance/calculate-split` | Real-time 30:70 revenue split calculator |
| `POST` | `/api/finance/transactions` | Record and verify new deal transaction |
