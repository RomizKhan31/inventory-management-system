# Industrial Inventory Management System (IMS)
### Discrete Manufacturing Barcode Tracking & Lifecycle Management System
**Industrial Attachment Assignment — Walton Hi-Tech Industries PLC**

![Project Status](https://img.shields.io/badge/Project_Phase-Phase_4:_Development_Completed_(Day_10%2F10)-059669)
![Build](https://img.shields.io/badge/Next.js-16.4.5_(Turbopack)-black)
![Node](https://img.shields.io/badge/Node-v24+-334155)
![Backend](https://img.shields.io/badge/Express-v5.3-blue)
![Database](https://img.shields.io/badge/MongoDB-Atlas_Replica_Set-10b981)
![Tests](https://img.shields.io/badge/Automated_Tests-10_Suites_|_220+_Assertions_Passing-emerald)
![License](https://img.shields.io/badge/License-ISC-slate)

---

## 1. Executive Summary

This project is a financial-grade, production-oriented **Barcode-Based Inventory Management System** built for discrete manufacturing plants (such as appliance manufacturing: refrigerators, air conditioners, compressors). 

The system tracks serialized physical products through an immutable 7-stage lifecycle:
1. **Component Tracking:** Binds 1..N serialized modular component barcodes (e.g., Compressor `94A600321852`) to the finished good product chassis (e.g., Refrigerator `2440701AK2057`) with strict 1:1 database exclusivity.
2. **Product Receiving:** Admits the unit into warehouse inventory at a physical Receive Point, transitioning state to `IN_STOCK`.
3. **Inventory Management:** Derives real-time stock balances and locations purely from historical event streams.
4. **Product Delivery:** Dispatches stock through an outbound Delivery Point, transitioning state to `DELIVERED` while preserving origin intake point reference.
5. **Transaction History:** Records every operational scan in an append-only, tamper-proof ledger (`inventory_transactions`).
6. **Reversal & Correction:** Allows administrators (`ADMIN`) to compensate mistakes with mandatory textual justification without deleting historic records.
7. **Reports & Analytics:** Delivers real-time stock details, date-range throughput graphs, and full barcode lifecycle timelines with CSV export.

---

## 2. Core Architectural Invariants

* **Append-Only Immutability:** No SQL/NoSQL `UPDATE` or `DELETE` is ever executed on transaction history. Mongoose pre-hooks actively throw exceptions (`MUTATION_PROHIBITED`) if mutation is attempted.
* **Derived Stock Status:** There is **no mutable status column** on product tables. Current stock state (`NEW_UNTRACKED`, `TRACKED`, `IN_STOCK`, `DELIVERED`) is computed dynamically from the transaction ledger.
* **Database-Level Exclusivity:** A component barcode can belong to only one product chassis. This rule is enforced at the database engine level via unique compound indexes on `component_bindings`.
* **Five Mutually Exclusive Roles:** `ADMIN`, `COMPONENT_TRACKER`, `RECEIVE_USER`, `DELIVERY_USER`, `REPORT_VIEWER`. Every user has exactly one role, strictly enforced via server-side RBAC middleware.
* **Compensating Ledger Corrections:** Reversals do not erase past records; they append compensating documents (`REVERSED_RECEIVE`, `REVERSED_DELIVERY`, `REVERSED_COMPONENT`) with mandatory reasons ($\ge 10$ chars) and explicit links (`reversedTransactionId`).

---

## 3. Technology Stack

| Layer | Technology | Key Libraries / Features |
| :--- | :--- | :--- |
| **Frontend** | **Next.js 16 (App Router)** | React 19, TypeScript, Tailwind CSS v4, HTML5 Barcode Camera Scanner |
| **Backend** | **Node.js (v24+) & Express.js 5** | TypeScript, Helmet, CORS, Morgan, Zod, Mutex Locks |
| **Database** | **MongoDB Atlas / Replica Set** | Mongoose 9 ODM, Multi-Document ACID Transaction Sessions |
| **Security** | **JWT & bcryptjs** | Salt rounds: 12, Bearer Token validation, soft deactivation, forced logout |
| **Tooling** | **tsx & tsc** | Hot-reloading TypeScript engine, strict typecheck, automated suites |

---

## 4. Production Seed Accounts & Credentials

The system includes pre-configured accounts for all 5 operational roles matching the assignment specification:

| Role | User Code (Employee ID) | Email | Default Password | Permitted Operations |
| :--- | :--- | :--- | :--- | :--- |
| **ADMIN** | `ADMIN01` | `admin@waltonbd.com` | `Walton@2026` | Full System Access, Master Data, User CRUD, Reversals |
| **COMPONENT_TRACKER** | `66798` | `tracker66798@waltonbd.com` | `Walton@2026` | Component Tracking & modular assembly |
| **RECEIVE_USER** | `58877` | `receive58877@waltonbd.com` | `Walton@2026` | Warehouse Stock Admission at Receive Points |
| **DELIVERY_USER** | `54671` | `delivery54671@waltonbd.com` | `Walton@2026` | Warehouse Gate Dispatch at Delivery Points |
| **REPORT_VIEWER** | `VIEW01` | `viewer@waltonbd.com` | `Walton@2026` | Read-only access to all reports & analytics |

---

## 5. Official Assignment Sample Product Lifecycle

The assignment test scenario is fully verified:

* **Product Model:** `Refrigerator` (Chassis Barcode: `2440701AK2057`)
* **Component:** `Compressor` (Component Barcode: `94A600321852`)

### Required Event Sequence:
1. **Component Tracked:** Timestamp `2026-03-27 10:00:00`, Operator: `66798`, Point: `Refrigerator Component Track Point 1`
2. **Received:** Timestamp `2026-03-28 10:15:00`, Operator: `58877`, Point: `Refrigerator Receive Point 1`
3. **Delivered:** Timestamp `2026-03-30 11:30:00`, Operator: `54671`, Point: `Refrigerator Delivery Point 1`

### Lifecycle Post-Conditions Verified:
- Product status is `DELIVERED`.
- Product does **not** appear in current available stock (`/reports/stock-details?status=IN_STOCK`).
- Barcode history displays all 3 events chronologically with responsible operators, points, and timestamps.
- Delivery reversal restores the product to `IN_STOCK` at `Refrigerator Receive Point 1`.
- Receive reversal returns the product to `TRACKED` state.
- Component reversal liberates component `94A600321852` for re-use on another chassis.

---

## 6. API Endpoint Reference

### Authentication & Profiles
| Method | Endpoint | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | Public | Authenticate user with identifier and password; returns JWT token |
| `POST` | `/api/v1/auth/logout` | Authenticated | Terminate session and audit logout event |
| `GET` | `/api/v1/auth/me` | Authenticated | Retrieve sanitized current user profile |
| `POST` | `/api/v1/auth/change-password` | Authenticated | Change user password with current password verification |

### Inventory Operations
| Method | Endpoint | Permitted Roles | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/inventory/dashboard` | All Roles | Real-time stock count, today's received/delivered, aging inventory |
| `GET` | `/api/v1/inventory/product-scan/:barcode` | All Roles | Scan chassis barcode and retrieve derived lifecycle state |
| `GET` | `/api/v1/inventory/component-scan/:barcode` | All Roles | Validate component barcode, master registration & 1:1 binding |
| `POST` | `/api/v1/inventory/track-components` | `ADMIN`, `TRACKER` | Attach modular components to product chassis |
| `POST` | `/api/v1/inventory/receive` | `ADMIN`, `RECEIVE` | Admit tracked product into warehouse inventory |
| `POST` | `/api/v1/inventory/deliver` | `ADMIN`, `DELIVERY` | Dispatch in-stock product from warehouse delivery dock |
| `GET` | `/api/v1/inventory/transactions` | All Roles | Filterable & paginated transaction ledger with reversal lineage |

### Reversals & Corrections (Admin Only)
| Method | Endpoint | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/inventory/reverse-receive` | `ADMIN` | Reverses intake, removes unit from stock, returns status to `TRACKED` |
| `POST` | `/api/v1/inventory/reverse-delivery` | `ADMIN` | Reverses delivery, restores unit to stock at original receive bay |
| `POST` | `/api/v1/inventory/reverse-component` | `ADMIN` | Detaches component, liberates component serial for re-assignment |
| `POST` | `/api/v1/inventory/reverse` | `ADMIN` | Unified reversal dispatcher |

### Reports, Analytics & Export
| Method | Endpoint | Permitted Roles | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/reports/stock-details` | `ADMIN`, `VIEWER` | Multi-dimensional stock balance, location, components, and aging |
| `GET` | `/api/v1/reports/summary` | `ADMIN`, `VIEWER` | Date-range throughput, net receipts, daily activity timeseries |
| `GET` | `/api/v1/reports/barcode-history/:barcode` | `ADMIN`, `VIEWER` | Full chronological lifecycle journey & audit trail for a barcode |
| `GET` | `/api/v1/reports/export` | `ADMIN`, `VIEWER` | RFC-4180 CSV export for stock details, summary, and barcode history |
| `GET` | `/api/v1/reports/audit-logs` | `ADMIN` | Filterable and paginated system audit trail |

---

## 7. Running the Project & Automated Tests

### Prerequisites
- Node.js (v20+ or v24+)
- MongoDB Atlas or local MongoDB replica set

### Installation
```bash
# Clone the repository
git clone https://github.com/romiz-khan/inventory-management-system.git
cd inventory-management-system

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### Seeding Master Data
```bash
cd backend
npm run seed
```

### Running Backend API
```bash
cd backend
npm run dev
# Server listening on http://localhost:5000
```

### Running Frontend Application
```bash
cd frontend
npm run dev
# Application accessible at http://localhost:3000
```

---

## 8. Automated Test Suite (10 Comprehensive Suites)

Execute the full integration test suite:
```bash
cd backend
npm test
```

### Individual Test Suites:
| Command | Test Description | Assertions |
| :--- | :--- | :--- |
| `npm run test:auth` | Authentication, JWT, bcrypt hashing, password change, logout | 15/15 passed |
| `npm run test:deactivation` | Inactive user blocking, forced logout on deactivation | Passed |
| `npm run test:rbac` | Complete 5-role authorization matrix across all restricted endpoints | 48/48 passed |
| `npm run test:admin` | User management CRUD, soft deactivation, master data CRUD | 28/28 passed |
| `npm run test:tracking` | Component tracking, 1:1 exclusivity, duplicate scan rejection | 15/15 passed |
| `npm run test:receiving` | Product receiving, stock derivation, invalid intake rejection | 18/18 passed |
| `npm run test:delivery` | Product delivery, origin receive bay preservation, duplicate prevention | 18/18 passed |
| `npm run test:reversal` | Reversal scenarios, duplicate reversal rejection (409), concurrency | 21/21 passed |
| `npm run test:reports` | Stock details, date-range summary, barcode history, CSV exports | 31/31 passed |
| `npm run test:e2e` | End-to-end official assignment sample unit `2440701AK2057` and live run | 30/30 passed |

**Total Automated Assertions: >220 assertions, 100% passing.**

---

## 9. Project Directory Layout

```text
inventory-management-system/
├── backend/                        # Express.js REST API Server
│   ├── src/
│   │   ├── config/                 # Env validation, RBAC definitions, DB config
│   │   ├── database/               # Mongoose connection, seed.ts, models (User, Product, Component, Points, InventoryTransaction, AuditLog, ComponentBinding)
│   │   ├── middlewares/            # Auth, RBAC, centralized error handling
│   │   ├── modules/
│   │   │   ├── admin/              # Master data & user management
│   │   │   ├── audit/              # Audit trail logger & query service
│   │   │   ├── auth/               # User authentication & session management
│   │   │   ├── inventory/          # Component tracking, receiving, delivery, reversals, dashboard
│   │   │   └── reports/            # Stock details, date summary, barcode history, CSV export
│   │   ├── utils/                  # AppError, response wrapper, mutex
│   │   ├── app.ts                  # Express application setup
│   │   └── server.ts               # HTTP bootstrap & graceful shutdown
│   └── tests/                      # 10 Automated Integration Test Suites
├── frontend/                       # Next.js 16 Web Application
│   ├── app/
│   │   ├── admin/                  # User management & Master Data management
│   │   ├── operations/             # Component Tracking, Receiving, Delivery, Reversals
│   │   ├── reports/                # Stock Details, Summary Trends, Barcode History, Audit Logs
│   │   ├── login/                  # Authentication & Sign-in
│   │   └── page.tsx                # Operational Dashboard & Aging Inventory Analysis
│   └── src/
│       ├── components/             # Reusable UI components, modals, camera scanner, toasts
│       ├── context/                # AuthContext & Session management
│       ├── lib/                    # Typed API client
│       └── types/                  # TypeScript interface contracts
└── README.md                       # Master Documentation
```

---

## 10. Development Completion Sign-Off

- **Development Phase:** Completed (Day 10 of 10).
- **Core Requirements:** 100% Implemented and Verified.
- **Assignment Sample Unit (`2440701AK2057`):** Fully Verified against requirements.
- **Outstanding Defects:** **0**. All edge cases, concurrency races, duplicate reversals, and deactivated sessions are handled with defensive architecture.
