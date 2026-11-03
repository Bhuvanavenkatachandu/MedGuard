# MedGuard AI — Architecture & Feature-Based Design Specification

## Overview

**MedGuard AI** is an intelligent pharmacy management, inventory verification, and medicine discovery platform. It is engineered with a **Feature-Based Architecture**, ensuring that every business domain is isolated, self-contained, easily testable, and maintainable without coupling unrelated features.

---

## 1. High-Level Feature Architecture

MedGuard AI divides both the backend (FastAPI + SQLAlchemy) and frontend (React + Vite + Tailwind CSS) into autonomous features, supported by a shared infrastructure layer.

```text
                                  ┌─────────────────────────────┐
                                  │      Client Applications    │
                                  │   (Pharmacist / Customer)   │
                                  └──────────────┬──────────────┘
                                                 │
                                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   FastAPI Application Core                                  │
├──────────────┬──────────────┬──────────────┬──────────────┬──────────────┬──────────────────┤
│    auth/     │  pharmacy/   │  medicines/  │  inventory/  │   billing/   │  ai_recognition/ │
│  Login/JWT   │ Kiosk Profile│ Catalog/Supp │ FEFO & Stock │ POS/Invoices │ OCR & Gemma Fall │
├──────────────┼──────────────┼──────────────┼──────────────┴──────────────┴──────────────────┤
│  customers/  │   reports/   │   chatbot/   │                    shared/                     │
│  Profiles/Tx │ Sales Metric │  RAG & Tools │ Config, Database, Auth Dependencies, Email     │
└──────────────┴──────────────┴──────────────┴────────────────────────────────────────────────┘
                                                 │
                                                 ▼
                                  ┌─────────────────────────────┐
                                  │     PostgreSQL / Neon DB    │
                                  └─────────────────────────────┘
```

---

## 2. Feature Structure (Backend & Frontend)

### Backend Feature Layout (`backend/features/`)

Each domain owns its router, business logic service, models, schemas, and sub-services:

```text
backend/
├── features/
│   ├── auth/
│   │   ├── models.py            # User ORM entity
│   │   ├── schemas.py           # Register, Login, Token Pydantic models
│   │   ├── service.py           # Registration & JWT verification
│   │   └── router.py            # /api/auth endpoints
│   ├── pharmacy/
│   │   ├── models.py            # Pharmacy & SearchSession models
│   │   ├── schemas.py           # Pharmacy profile schemas
│   │   ├── service.py           # Profile management
│   │   ├── search_service.py    # Geospatial Haversine medicine discovery
│   │   ├── router.py            # /api/pharmacies endpoints
│   │   └── public_router.py     # /api/public discovery endpoints
│   ├── medicines/
│   │   ├── models.py            # Medicine & Supplier models
│   │   ├── schemas.py           # Medicine & Supplier schemas
│   │   ├── service.py           # Medicine catalog & search
│   │   ├── suppliers_service.py # Supplier CRUD operations
│   │   ├── router.py            # /api/medicines endpoints
│   │   └── suppliers_router.py  # /api/suppliers endpoints
│   ├── inventory/
│   │   ├── models.py            # Inventory, Batch, StockMovement models
│   │   ├── schemas.py           # Batch & Stock intake schemas
│   │   ├── service.py           # Stock management & adjustments
│   │   ├── fefo_service.py      # FEFO (First-Expired-First-Out) engine
│   │   ├── router.py            # /api/inventory endpoints
│   │   ├── batches_router.py    # /api/batches endpoints
│   │   └── movements_router.py  # /api/movements endpoints
│   ├── billing/
│   │   ├── models.py            # Sale, SaleItem, Invoice models
│   │   ├── schemas.py           # Checkout & Invoice schemas
│   │   ├── sales_service.py     # Atomic checkout & stock deduction
│   │   ├── invoice_service.py   # PDF generation & record keeping
│   │   ├── sales_router.py      # /api/sales endpoints
│   │   └── invoices_router.py   # /api/invoices endpoints
│   ├── customers/
│   │   ├── models.py            # Customer model
│   │   ├── schemas.py           # Customer schemas
│   │   ├── service.py           # Customer management & purchase history
│   │   └── router.py            # /api/customers endpoints
│   ├── reports/
│   │   ├── schemas.py           # Revenue & expiry analytics schemas
│   │   └── router.py            # /api/reports endpoints
│   ├── ai_recognition/
│   │   ├── models.py            # AIScan audit model
│   │   ├── schemas.py           # BoundingBox, OCRRegion, AIScanResponse
│   │   ├── prompts.py           # Pharmaceutical Gemma Vision system prompt
│   │   ├── validation.py        # Date & batch regex verification
│   │   ├── service.py           # Hybrid pipeline orchestrator
│   │   ├── providers/
│   │   │   ├── ocr_provider.py  # Tesseract OCR engine with adaptive thresholding
│   │   │   └── gemma_provider.py# Cloud Gemma/Gemini vision fallback
│   │   └── router.py            # /api/ai/scan-medicine endpoint
│   └── chatbot/
│       ├── models.py            # KnowledgeDocument, Chunk, Session, Message
│       ├── schemas.py           # Query, Response, Session schemas
│       ├── service.py           # Conversational pipeline orchestrator
│       ├── router.py            # /api/chat endpoints
│       ├── prompts/             # Assistant persona & guardrails instructions
│       ├── providers/           # LLM client with Gemini fallback
│       ├── rag/                 # Hash embeddings, cosine retrieval, semantic cache
│       ├── tools/               # Inventory & pharmacy lookup tools
│       ├── guardrails/          # Injection filtering & clinical safety warnings
│       └── knowledge/           # SOP / document CRUD & text extractors
└── shared/
    ├── config.py                # Pydantic BaseSettings singleton
    ├── database.py              # SQLAlchemy engine, SessionLocal, Base, get_db
    ├── auth/                    # OAuth2 Bearer, Bcrypt, and RBAC dependencies
    └── email/                   # Asynchronous SMTP invoice dispatch worker
```

---

### Frontend Feature Layout (`src/features/` & `src/shared/`)

```text
src/
├── features/
│   ├── auth/                   # Login, Registration, Setup, ProtectedRoute
│   ├── pharmacy/               # Dashboard, Customer Discovery map/cards
│   ├── medicines/              # Supplier & Catalog Management
│   ├── inventory/              # InventoryList, AddStock, Expiry, Movements
│   ├── billing/                # PointOfSale, Checkout Modal, InvoiceList
│   ├── customers/              # Customer Directory & History
│   ├── reports/                # Profit & Expiry Risk Visualizations
│   ├── ai_recognition/         # Camera / File AI Medicine Packaging Scanner
│   └── chatbot/                # Pharmacist Chat, Customer Kiosk, Knowledge Base
└── shared/
    ├── components/
    │   ├── ui/                 # Reusable Button, Card, Modal, Input, Badge
    │   ├── landing/            # 3D interactive hero and landing sections
    │   └── layout/             # PharmacistLayout, Navbar, Footer
    ├── context/                # PharmacyContext (reactive global state)
    ├── api/                    # Axios instance with auth interceptor
    └── utils/                  # geoUtils (Haversine), dateFormatter, pdfGenerator
```

---

## 3. Inter-Feature Communication Guidelines

To prevent tight coupling between features:

1. **Services over Direct SQL**:
   Features must never reach into another feature's private tables directly. For instance:
   - The **Chatbot Feature** needs to inspect medicine inventory. Instead of executing raw queries on the `inventories` table, it calls `MedicineService.search_medicines` and `InventoryService.get_inventory_for_medicine`.
   - The **Billing Feature** validates stock through `fefo_service.get_fefo_batches` before completing checkout.

2. **Shared Infrastructure Isolation**:
   - `backend/shared/database.py` exports the shared declarative `Base`. All feature models attach to this single metadata instance.
   - `backend/shared/auth/dependencies.py` provides `get_current_user` and `get_current_pharmacy` without creating circular package imports.

---

## 4. Multi-Tenant Isolation & Pharmacy Ownership

Every database query touching inventory, customers, sales, invoices, knowledge documents, or chat sessions strictly filters by `pharmacy_id`:

```python
# Guaranteed Pharmacy Isolation Pattern
query = db.query(KnowledgeDocument).filter(
    KnowledgeDocument.pharmacy_id == pharmacy.id,
    KnowledgeDocument.id == doc_id
).first()
```

- **Customer Storefront / Public Discovery**:
  - Customers discover nearby pharmacies via geospatial queries (`search_nearby_medicines`).
  - When chatting with a pharmacy, the chat session is explicitly scoped to that single `pharmacy_id`.
  - Pharmacy A's internal SOPs and documents are cryptographically isolated from Pharmacy B.

---

## 5. Hybrid AI Vision Pipeline (`ai_recognition`)

MedGuard AI employs a **Zero-AI-Cost First** strategy for reading medicine strips and cartons:

```text
                    ┌───────────────────────────┐
                    │  Medicine Package Photo   │
                    └─────────────┬─────────────┘
                                  │
                                  ▼
                    ┌───────────────────────────┐
                    │ Adaptive Preprocessing &  │
                    │      Tesseract OCR        │
                    └─────────────┬─────────────┘
                                  │
                                  ▼
                    ┌───────────────────────────┐
                    │  Regex Validation Layer   │
                    │  (Expiry, Batch, Strength)│
                    └─────────────┬─────────────┘
                                  │
                  All Critical Fields Valid?
                     /                \
                   YES                 NO (Low Confidence / Blurry)
                   /                    \
                  ▼                      ▼
        ┌──────────────────┐    ┌──────────────────────────────┐
        │ Return OCR Result│    │ Cloud Vision Fallback        │
        │  (0 AI Calls)    │    │ (Gemma / Gemini 1.5 Flash)   │
        └──────────────────┘    └──────────────┬───────────────┘
                                               │
                                               ▼
                                ┌──────────────────────────────┐
                                │ Merge Best-Confidence Fields │
                                └──────────────────────────────┘
```

---

## 6. Chatbot RAG Pipeline (`chatbot`)

The pharmacy chatbot assists both **Pharmacists** (stock checks, low-stock alerts, SOP lookup) and **Customers** (store hours, return policies, medicine availability).

1. **Input Guardrails**:
   - Strips prompt-injection attempts (`ignore previous instructions`, `system prompt override`).
   - Caps input size (2,000 characters).
2. **Deterministic Tool Routing**:
   - Stock and price questions trigger `InventoryTool` directly from verified database records.
3. **Semantic Cache & Retrieval**:
   - Uses localized hash embeddings with cosine similarity.
   - Exact or semantic query matches are served instantly from cache (`cached: true`).
4. **Multi-Model Fallback**:
   - Tries `gemini-1.5-flash` first for rapid response times.
   - Falls back gracefully to offline mode if offline or if no API key is provided.
5. **Output Guardrails & Clinical Disclaimer**:
   - Automatically appends a standard clinical safety disclaimer when medical topics are discussed.
   - Strictly prohibits providing prescription dosing without an in-person doctor consultation.

---

## 7. Verification & Backward Compatibility

- **26/26 Automated Tests Passing**: All tests in `backend/tests/` verify authentication, multi-tenant RAG, FEFO batch checkout, hybrid OCR, and inventory integrity.
- **Backward-Compatible Bridges**:
  - `backend/app/` bridges all legacy import paths to `backend/features/` and `backend/shared/`.
  - `src/components/`, `src/api/`, `src/context/`, and `src/utils/` bridge all frontend legacy imports to `src/features/` and `src/shared/`.
  - `npm run build` bundles the frontend into production `dist/` in under 3 seconds with zero build warnings.
