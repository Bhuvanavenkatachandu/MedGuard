# MedGuard AI — High-Precision Retail Pharmacy Operating System & Public Discovery Engine

**MedGuard AI** is a production-grade full-stack pharmacy operating system and medicine availability discovery engine. It bridges real-time pharmacy stock with customer geolocation discovery, automates medicine intake using Gemma 4 multimodal OCR, enforces First-Expired First-Out (FEFO) dispensing, guarantees atomic race-free checkout with PostgreSQL ACID transactions, and archives downloadable PDF tax invoices with automated email delivery.

---

## 🌟 Key Architecture & Highlights

```text
React 18 Frontend (Vite, Tailwind CSS, Lucide Icons)
       ↓  (Axios REST API with Bearer JWT)
FastAPI Python Backend (Pydantic v2, Uvicorn)
       ↓  (SQLAlchemy 2.0 ORM + Alembic Migrations)
PostgreSQL / Neon Serverless PostgreSQL
```

| Layer | Implementation |
| :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide Icons, Axios |
| **Backend API** | Python FastAPI, Uvicorn, Pydantic v2 |
| **Database & ORM** | PostgreSQL / Neon PostgreSQL, SQLAlchemy 2.0, Alembic Migrations |
| **Database Drivers** | `psycopg` (v3) and `psycopg2-binary` with connection pooling & `pool_pre_ping` |
| **Authentication** | JWT (JSON Web Tokens) with bcrypt password hashing |
| **Atomic POS Checkout** | ACID transactional checkout with FEFO earliest expiry deduction |
| **Public Customer Radar** | Geospatial Haversine calculation (`/api/public/medicines/search`), zero login required, strictly filters `total_pieces > 0`, nearest pharmacy first with Google Maps directions |
| **AI Packaging Scan** | Server-side Gemma 4 Vision-compatible OCR endpoint (`/api/ai/scan-medicine`) reading `GEMMA_API_KEY` (no key exposed to browser) |
| **Inventory Source of Truth** | Internal truth is **total pieces**; derived dynamic values: `strips = total_pieces // pcs_per_strip`, `loose = total_pieces % pcs_per_strip` |
| **Batch & FEFO Enforcement**| Automatic recommendation of the earliest expiring non-expired batch; zero dispensing permission for expired stock |
| **PDF Invoices** | ReportLab backend PDF generator (`/api/invoices/{id}/pdf`) and client jsPDF fallback |
| **Email Invoices** | Non-blocking SMTP email delivery service (`email_service.py`) with full delivery logs |
| **Audit Ledger** | Immutable `stock_movements` table recording every inward, sale, adjustment, and write-off |

---

## 📁 Repository Structure

```text
MedGuard/
├── backend/
│   ├── alembic/                        # Alembic migration scripts
│   │   ├── versions/                   # Migration revision versions
│   │   └── env.py                      # Dynamic migration runner
│   ├── app/
│   │   ├── main.py                     # FastAPI entry point, CORS, routes & static mounts
│   │   ├── config.py                   # Pydantic Settings & DATABASE_URL normalization
│   │   ├── database.py                 # PostgreSQL connection pool, sessionmaker & Base
│   │   ├── dependencies.py             # JWT auth, user/pharmacy resolution & password hashing
│   │   ├── models/                     # SQLAlchemy Models
│   │   │   ├── user.py                 # Pharmacist users
│   │   │   ├── pharmacy.py             # Pharmacy profiles & location
│   │   │   ├── medicine.py             # Medicine master catalog
│   │   │   ├── supplier.py             # Wholesale suppliers
│   │   │   ├── batch.py                # Batches with expiry dates & MRP
│   │   │   ├── inventory.py            # Total pieces (authoritative source of truth)
│   │   │   ├── customer.py             # Customer directory
│   │   │   ├── sale.py                 # Sales master & line items
│   │   │   ├── invoice.py              # Invoices & PDF paths
│   │   │   ├── stock_movement.py       # Full immutable audit trail
│   │   │   ├── ai_scan.py              # AI vision scan audit logs (JSON)
│   │   │   ├── search_session.py       # Public search analytics
│   │   │   └── email_log.py            # Automated email delivery status
│   │   ├── schemas/                    # Pydantic Schemas for validation & serialization
│   │   ├── services/                   # Core business logic (FEFO, Sales, PDF, Email, Search, AI)
│   │   └── routers/                    # REST API routes
│   ├── data/
│   │   └── medguard.db                 # Historical SQLite backup (preserved for data migration)
│   ├── storage/
│   │   ├── invoices/                   # Stored PDF tax invoices
│   │   └── scans/                      # Temporary AI packaging scans
│   ├── tests/                          # Pytest PostgreSQL test suite
│   ├── seed.py                         # Demo database seeding script
│   └── requirements.txt                # Python backend dependencies
├── scripts/
│   ├── migrate_sqlite_to_postgres.py   # Complete SQLite -> PostgreSQL data transfer script
│   └── check_database.py               # PostgreSQL connection & health verification script
├── alembic.ini                         # Alembic root configuration
├── src/                                # React 18 frontend source code
├── .env                                # Frontend environment variables
├── backend/.env                        # Backend environment variables
└── README.md
```

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- **Node.js**: v18 or higher
- **Python**: v3.10, v3.11, or v3.12
- **PostgreSQL**: PostgreSQL 15/16 or a cloud instance on [Neon](https://neon.tech)

---

### 2. Backend Setup (PostgreSQL)

#### Step A: Configure Environment
In `backend/.env`:
```env
# Local PostgreSQL
DATABASE_URL=postgresql://localhost:5432/medguard

# OR Neon PostgreSQL (Serverless)
# DATABASE_URL=postgresql://username:password@ep-your-project.us-east-2.aws.neon.tech/neondb?sslmode=require

JWT_SECRET=your_jwt_secret_key_here
GEMMA_API_KEY=your_gemma_api_key_here
```

#### Step B: Install Python Dependencies
```bash
python3 -m venv backend/venv
source backend/venv/bin/activate  # On Windows: backend\venv\Scripts\activate
pip install -r backend/requirements.txt
```

#### Step C: Run Alembic Database Migrations
Create tables directly in PostgreSQL:
```bash
alembic upgrade head
```

#### Step D: Verify Database Connection & Tables
```bash
python scripts/check_database.py
```

#### Step E: (Optional) Migrate Existing SQLite Data into PostgreSQL
If you have an existing `backend/data/medguard.db` database and want to transfer all existing users, medicines, inventory, and sales:
```bash
python scripts/migrate_sqlite_to_postgres.py
```
Or seed initial demo data:
```bash
python backend/seed.py
```

#### Step F: Start FastAPI Server
```bash
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
The FastAPI backend will be live at `http://localhost:8000` with interactive Swagger docs at `http://localhost:8000/docs`.

---

### 3. Frontend Setup

In a new terminal:
```bash
# 1. Install dependencies
npm install

# 2. Start Vite development server
npm run dev
```
The React frontend will be live at `http://localhost:5173`.

---

## ☁️ Neon PostgreSQL Setup Instructions

To deploy MedGuard AI with [Neon](https://neon.tech):

1. **Create Project**: Sign in to [console.neon.tech](https://console.neon.tech) and click **New Project**.
2. **Name Project**: Name it `medguard-ai` and select your nearest region.
3. **Copy Connection String**: From the Neon dashboard, copy the **Connection string** (Pooled or Direct).
   Example:
   ```text
   postgresql://medguard_owner:npg_abcdef123@ep-proud-waterfall-a5p6789.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. **Configure Environment**: Paste this URL as `DATABASE_URL` in your deployment environment (Render, Railway, Fly.io, AWS, etc.) or `backend/.env`.
5. **Run Migrations**:
   ```bash
   alembic upgrade head
   ```
6. **Import Existing Data**:
   ```bash
   python scripts/migrate_sqlite_to_postgres.py --postgres-url "your_neon_url"
   ```

> [!NOTE]
> MedGuard AI includes `pool_pre_ping=True` and `pool_recycle=300` in `database.py`. When Neon automatically scales down to zero during idle periods, SQLAlchemy will automatically wake the database compute node on incoming API requests without dropping connections or returning 500 errors.

---

## 🧪 Testing Suite

### 1. Backend Pytest Suite (PostgreSQL)
```bash
backend/venv/bin/pytest backend/tests -v
```
All tests run against PostgreSQL and verify:
- System health and connection status
- User registration, login, and JWT token validation
- Dynamic piece and strip inventory calculation
- FEFO batch ordering and atomic checkout deduction
- Stock movements audit recording
- Public customer search with Haversine distance

### 2. End-to-End Full Flow Integration Test
```bash
backend/venv/bin/python backend/test_e2e_full_flow.py
# or
node test_e2e_flow.cjs
```
Simulates the entire customer discovery $\rightarrow$ pharmacist registration $\rightarrow$ location setup $\rightarrow$ supplier creation $\rightarrow$ inward FEFO batch addition $\rightarrow$ POS checkout $\rightarrow$ stock deduction $\rightarrow$ PDF invoice generation $\rightarrow$ returning user dashboard login.

### 3. Frontend Production Build
```bash
npm run build
```

---

## 🔐 Authentication & Security

- **Password Hashing**: Secure `bcrypt` algorithm. Plaintext passwords are never stored.
- **JWT Authentication**: HS256 tokens containing `user_id`, `pharmacy_id`, and `role`.
- **Row-Level Security**: Every API endpoint verifies `get_current_pharmacy` to ensure pharmacists cannot access other stores' stock, sales, or customer data.

---

## 📄 License
MIT License. Built for healthcare accessibility and high-precision pharmacy management.
