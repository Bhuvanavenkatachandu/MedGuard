# MedGuard AI — High-Precision Retail Pharmacy Operating System & Public Discovery Engine

**MedGuard AI** is a production-grade full-stack pharmacy operating system and medicine availability discovery engine. It bridges real-time pharmacy stock with customer geolocation discovery, automates medicine intake using Gemma 4 multimodal OCR, enforces First-Expired First-Out (FEFO) dispensing, guarantees atomic race-free checkout, and archives downloadable PDF tax invoices with Resend email delivery.

---

## 🌟 Key Architecture & Highlights

| Layer | Implementation |
| :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide Icons, Axios |
| **Backend API** | Python FastAPI, Uvicorn, Pydantic v2 |
| **Database & ORM** | SQLite (`backend/data/medguard.db`), SQLAlchemy 2.0 |
| **Authentication** | JWT (JSON Web Tokens) with bcrypt password hashing |
| **Atomic POS Checkout** | ACID transactional SQLite checkout with FEFO earliest expiry deduction |
| **Public Customer Radar** | Geospatial Haversine calculation (`/api/public/medicines/search`), zero login required, strictly filters `pieces > 0`, nearest pharmacy first with Google Maps directions link |
| **AI Packaging Scan** | Server-side Gemma 4 Vision-compatible OCR endpoint (`/api/ai/scan-medicine`) reading `GEMMA_API_KEY` (no key exposed to browser) |
| **Inventory Source of Truth** | Internal truth is **total pieces**; derived dynamic values: `strips = total_pieces // pcs_per_strip`, `loose = total_pieces % pcs_per_strip` |
| **Batch & FEFO Enforcement**| Automatic recommendation of the earliest expiring non-expired batch; zero dispensing permission for expired stock |
| **PDF Invoices** | ReportLab backend PDF generator (`/api/invoices/{id}/pdf`) and client jsPDF fallback |
| **Email Invoices** | Non-blocking Resend email delivery service (`email_service.py`) with full delivery logs |
| **Audit Ledger** | Immutable `stock_movements` table recording every inward, sale, adjustment, and write-off |

---

## 📁 Repository Structure

```text
MedGuard/
├── backend/
│   ├── app/
│   │   ├── main.py                     # FastAPI entry point, CORS, routes & static mounts
│   │   ├── config.py                   # Pydantic Settings (.env configuration)
│   │   ├── database.py                 # SQLite database engine, sessionmaker & Base
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
│   │   │   ├── ai_scan.py              # AI vision scan audit logs
│   │   │   ├── search_session.py       # Public search analytics
│   │   │   └── email_log.py            # Resend email delivery status
│   │   ├── schemas/                    # Pydantic Schemas for validation & serialization
│   │   ├── services/                   # Core business logic (FEFO, Sales, PDF, Email, Search, AI)
│   │   └── routers/                    # REST API routes
│   ├── data/
│   │   └── medguard.db                 # SQLite database file
│   ├── storage/
│   │   └── invoices/                   # Stored PDF tax invoices
│   ├── tests/                          # Pytest unit & integration test suite
│   ├── seed.py                         # Demo database seeding script
│   └── requirements.txt                # Python backend dependencies
├── src/
│   ├── api/                            # Axios REST API client modules
│   │   ├── axios.js                    # Base Axios instance with JWT interceptor
│   │   ├── authApi.js                  # Authentication API
│   │   ├── pharmaciesApi.js            # Pharmacy profile API
│   │   ├── inventoryApi.js             # Stock management API
│   │   ├── salesApi.js                 # POS checkout API
│   │   ├── aiApi.js                    # AI vision OCR API
│   │   ├── publicApi.js                # Public customer search API
│   │   └── ...
│   ├── context/
│   │   └── PharmacyContext.jsx         # Global state & operational hooks
│   ├── components/
│   │   ├── customer/                   # Public customer discovery radar
│   │   ├── auth/                       # Pharmacist login, register & setup
│   │   ├── dashboard/                  # Dashboard KPIs & alerts
│   │   ├── inventory/                  # Inward stock, inventory list & expiry management
│   │   ├── pos/                        # Point of Sale (POS) checkout
│   │   ├── ai/                         # Multimodal medicine strip scanner
│   │   └── ...
│   ├── utils/
│   │   ├── geoUtils.js                 # Haversine & Google Maps directions
│   │   └── pdfGenerator.js             # Client-side jsPDF helper
│   ├── App.jsx                         # Main route tree
│   └── main.jsx                        # React 18 bootstrap
├── .env                                # Frontend environment variables
├── package.json                        # Frontend dependencies
└── vite.config.js                      # Vite configuration
```

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- **Node.js**: v18 or higher
- **Python**: v3.10, v3.11, or v3.12

### 2. Backend Setup

```bash
# 1. Create and activate virtual environment
python3 -m venv backend/venv
source backend/venv/bin/activate  # On Windows: backend\venv\Scripts\activate

# 2. Install dependencies
pip install -r backend/requirements.txt

# 3. Seed initial demo data (Pharmacies, Medicines, Batches)
python backend/seed.py

# 4. Start FastAPI server
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
The FastAPI backend will be live at `http://localhost:8000` with Swagger docs at `http://localhost:8000/docs`.

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

## 🧪 Testing

### Backend Unit & Integration Tests (Pytest)
```bash
backend/venv/bin/pytest backend/tests -v
```
All tests verify:
- Health check
- User registration, login, and JWT validation
- Inventory inward calculation and manual adjustment
- FEFO batch ordering and atomic POS checkout stock deduction
- Invoice PDF creation
- Public customer search with Haversine distance

### End-to-End Integration Flow Test
```bash
backend/venv/bin/python backend/test_e2e_full_flow.py
# or
node test_e2e_flow.cjs
```

### Frontend Production Build
```bash
npm run build
```

---

## 🔐 Authentication & Flow Integrity

1. **New User Flow**:
   - `Register (/pharmacist/register)` $\rightarrow$ Automatically authenticated via JWT
   - Route guard detects `isSetupComplete == false` $\rightarrow$ Redirects to `Pharmacy Details & Location (/pharmacist/setup)`
   - Submits pharmacy details and confirms location $\rightarrow$ Atomically links pharmacy to user
   - Automatically navigates to `Dashboard (/pharmacist/dashboard)`.

2. **Returning User Flow**:
   - `Login (/pharmacist/login)` $\rightarrow$ Validates credentials
   - Route guard verifies `pharmacy_id` exists $\rightarrow$ Directly routes to `Dashboard (/pharmacist/dashboard)`.
   - Never sends returning users back to Pharmacy Details.

3. **Public Discovery Flow (Customer)**:
   - Zero login or registration required at `http://localhost:5173/`.
   - Search by medicine name, generic composition, or brand.
   - Live distance in km calculated with nearest pharmacy first.
   - Displays exact available strips and loose pieces.
   - One-click Google Maps directions link.

---

## 📄 License
MIT License. Built for healthcare accessibility and pharmacy efficiency.
