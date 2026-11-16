# Industrial Inventory Management System (IMS)
### Discrete Manufacturing Barcode Tracking & Lifecycle Management System
**Industrial Attachment Assignment — Walton Hi-Tech Industries PLC**

![Project Status](https://img.shields.io/badge/Project_Phase-Phase_4:_Development_(Day_1%2F10)-0284c7)
![Stack](https://img.shields.io/badge/Stack-Next.js_16_|_Express_5_|_MongoDB_Atlas_|_TypeScript-0f172a)
![Node](https://img.shields.io/badge/Node-v24+-334155)
![License](https://img.shields.io/badge/License-ISC-emerald-600)

---

## 1. Executive Summary

This project is a professional, production-oriented **Barcode-Based Inventory Management System** built for discrete manufacturing plants (such as appliance manufacturing: refrigerators, air conditioners, compressors). 

The system tracks serialized physical products through an immutable 7-stage lifecycle:
1. **Component Tracking:** Binds 1..N serialized component barcodes (e.g., Compressor `94A600321852`) to the finished good product chassis (e.g., Refrigerator `2440701AK2057`).
2. **Product Receiving:** Admits the unit into warehouse stock at a physical Receive Point, incrementing available inventory.
3. **Inventory Management:** Derives real-time stock balances and locations purely from historical event streams.
4. **Product Delivery:** Dispatches stock through an outbound Delivery Point, decrementing available inventory.
5. **Transaction History:** Records every scan in an append-only, tamper-proof ledger (`inventory_transactions`).
6. **Reversal & Correction:** Allows administrators (`ADMIN`) to compensate mistakes with mandatory textual justification without deleting historic records.
7. **Reports & Analytics:** Delivers real-time stock details, date-range throughput graphs, and full barcode lifecycle timelines.

---

## 2. Core Architectural Principles

* **Append-Only Immutability:** No SQL/NoSQL `UPDATE` or `DELETE` is ever executed on transaction history. Mongoose pre-hooks actively throw exceptions if mutation is attempted.
* **Derived Stock Status:** There is **no mutable status column** on product tables. Current stock state (`UNREGISTERED`, `TRACKED`, `IN_STOCK`, `DELIVERED`) is computed dynamically via indexed aggregation pipelines.
* **Database-Level Exclusivity:** A component barcode can belong to only one product chassis. This rule is enforced at the database engine level via unique compound indexes on `component_bindings`.
* **Five Mutually Exclusive Roles:** `ADMIN`, `COMPONENT_TRACKER`, `RECEIVE_USER`, `DELIVERY_USER`, `REPORT_VIEWER`. Every user has exactly one role, strictly enforced via server-side RBAC middleware.

---

## 3. Technology Stack

| Layer | Technology | Key Libraries / Modules |
| :--- | :--- | :--- |
| **Frontend** | **Next.js 16 (App Router)** | React 19, TypeScript, Tailwind CSS v4 |
| **Backend** | **Node.js (v24+) & Express.js 5** | TypeScript, Helmet, CORS, Morgan, Zod |
| **Database** | **MongoDB Atlas / Replica Set** | Mongoose 9 ODM, Multi-Document ACID Transactions |
| **Security** | **JWT & bcryptjs** | Salt rounds: 12, HTTP-only Cookie / Bearer Tokens |
| **Tooling** | **tsx & tsc** | Hot-reloading TypeScript engine, strict typecheck |

---

## 4. Professional Project Directory Structure

```text
inventory-management-system/
├── backend/                        # Express.js REST API Server
│   ├── .env.example                # Sample backend environment configuration
│   ├── .gitignore                  # Backend git ignore rules
│   ├── package.json                # Dependencies: express, mongoose, zod, helmet, cors
│   ├── tsconfig.json               # Strict Node16 TypeScript configuration
│   └── src/
│       ├── app.ts                  # Express application setup, security, routes, error handlers
│       ├── server.ts               # HTTP bootstrap, DB connection, graceful shutdown
│       ├── config/
│       │   ├── env.ts              # Zod environment variable parsing & validation
│       │   └── database.ts         # Mongoose connection options & pool settings
│       ├── database/
│       │   ├── connection.ts       # Database lifecycle & health monitor
│       │   ├── seed.ts             # Deterministic seed script with official test record
│       │   └── models/             # Mongoose Schemas (User, Product, Component, Points, Tx)
│       ├── middlewares/
│       │   ├── errorHandler.ts     # Centralized error handler (Zod, Mongoose, AppError)
│       │   └── notFoundHandler.ts  # 404 handler for unmatched routes
│       ├── routes/
│       │   ├── health.routes.ts    # /api/v1/health monitoring endpoint
│       │   └── index.ts            # API v1 route aggregator
│       └── utils/
│           ├── AppError.ts         # Standard operational error class
│           └── response.ts         # Uniform API response formatter
├── frontend/                       # Next.js 16 Web Application
│   ├── .env.example                # Sample frontend environment configuration
│   ├── .gitignore                  # Frontend git ignore rules
│   ├── package.json                # Dependencies: next 16, react 19, tailwindcss 4
│   ├── tsconfig.json               # Next.js TypeScript configuration
│   ├── next.config.ts              # Turbopack & Next.js compiler settings
│   ├── app/
│   │   ├── globals.css             # Tailwind CSS v4 styling
│   │   ├── layout.tsx              # Root responsive layout with navigation header
│   │   └── page.tsx                # System status & live backend health diagnostic dashboard
│   └── src/
│       ├── lib/
│       │   └── api.ts              # Typed API fetch client with error normalization
│       └── types/
│           └── api.ts              # TypeScript contracts for API responses
├── docs/                           # Approved Architectural Documentation
│   ├── process_flows/              # 8 Workflow diagrams & Mermaid specifications
│   └── database/                   # Schema documentation, ERD, and aggregation pipelines
├── package.json                    # Monorepo convenience scripts
├── .gitignore                      # Root git ignore rules
└── README.md                       # Master project documentation
```

---

## 5. Getting Started & Installation

### Prerequisites
* **Node.js:** v20.x or v24.x
* **npm:** v10.x or v11.x
* **MongoDB:** MongoDB Atlas connection string OR local MongoDB v7+ configured with a replica set (`rs0`).

### 1. Clone the Repository
```bash
git clone https://github.com/romiz-khan/inventory-management-system.git
cd inventory-management-system
```

### 2. Configure Environment Variables

**Backend (`backend/.env`):**
```bash
cp backend/.env.example backend/.env
```
Default configuration:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/inventory_db?replicaSet=rs0
CORS_ORIGIN=http://localhost:3000
JWT_SECRET=walton_inventory_secret_key_2026_attachment
JWT_EXPIRES_IN=8h
BCRYPT_SALT_ROUNDS=12
```

**Frontend (`frontend/.env.local`):**
```bash
cp frontend/.env.example frontend/.env.local
```
Default configuration:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_APP_NAME="Walton Inventory Management System"
```

### 3. Initialize & Seed Database
Seed the 5 default user accounts, master data catalog, and the **official assignment sample test record**:
```bash
npm run seed
```

### 4. Run Development Servers
In two separate terminals:

```bash
# Terminal 1: Backend API Server (Port 5000)
npm run dev:backend

# Terminal 2: Frontend Next.js Client (Port 3000)
npm run dev:frontend
```

---

## 6. Verification & Health Monitoring

Access the live health endpoint directly or via browser:
```bash
curl http://localhost:5000/api/v1/health
```

Expected JSON response:
```json
{
  "success": true,
  "status": "UP",
  "message": "Inventory Management System API is operating normally",
  "uptimeSeconds": 42,
  "environment": "development",
  "version": "1.0.0",
  "database": {
    "status": "healthy",
    "state": "connected",
    "host": "127.0.0.1",
    "name": "inventory_db",
    "port": 27017
  }
}
```

Open the web frontend at `http://localhost:3000` to inspect the real-time diagnostic dashboard.

---

## 7. Project Development Lifecycle (18 Working Days)

| Phase | Duration | Scope | Status |
| :--- | :---: | :--- | :---: |
| **Phase 1: Requirement Analysis** | 1 Day | SRS Document, Role-Permission Matrix, Business Rules BR-01 to BR-23 | **Approved** |
| **Phase 2: Process Flow Diagram** | 2 Days | Role-Gated Swimlanes, 8 Process Flows, State Machine, 13 Exception Paths | **Approved** |
| **Phase 3: Database Design** | 2 Days | Mongoose Schemas, Append-Only Ledger, Derived Stock Aggregations, Seed Script | **Approved** |
| **Phase 4: Development** | 10 Days | **Day 1: Full-Stack Initialization & Health Infrastructure**<br>Day 2: Authentication & RBAC Middleware<br>Day 3: Master Data Management<br>Day 4: Component Tracking Module<br>Day 5: Product Receiving Module<br>Day 6: Product Delivery Module<br>Day 7: Reversal & Correction Module<br>Day 8: Stock Details & Date-Range Reporting<br>Day 9: Barcode History Timeline & CSV/Excel Export<br>Day 10: Executive Dashboard & UI Polishing | **In Progress** |
| **Phase 5: Testing** | 1 Day | End-to-End Test Suite, Role-Permission Tests, Assignment Sample Test Run | Pending |
| **Phase 6: Documentation** | 1 Day | Comprehensive User Guide with Screenshots & Deployment Manual | Pending |
| **Phase 7: Presentation** | 1 Day | 10-Minute Project Demonstration Video & Presentation Slides | Pending |

---

## 8. Default Test Credentials

All seeded test accounts use the password: `Walton@2026`

| Role | User Code | Email | Module Access |
| :--- | :--- | :--- | :--- |
| **`ADMIN`** | `ADMIN01` | `admin@waltonbd.com` | Full Master Data, IAM, Operations, Reversals, Reports |
| **`COMPONENT_TRACKER`** | `66798` | `tracker66798@waltonbd.com` | Component Tracking Scanning Station |
| **`RECEIVE_USER`** | `58877` | `receive58877@waltonbd.com` | Finished Goods Receiving Scanning Station |
| **`DELIVERY_USER`** | `54671` | `delivery54671@waltonbd.com` | Outbound Delivery Dispatch Station |
| **`REPORT_VIEWER`** | `VIEW01` | `viewer@waltonbd.com` | Read-only Reports, History & Analytics |

---

*Authored by Romiz Khan — Industrial Attachment 2026*
