# MedGuard AI — Intelligent Pharmacy Inventory & Discovery Platform

**MedGuard AI** is a production-grade pharmacy operating system and medicine availability discovery engine. It bridges real-time pharmacy stock with customer geolocation discovery, automates medicine intake using Gemma 4 multimodal OCR, enforces First-Expired First-Out (FEFO) dispensing, guarantees atomic race-free checkout, and archives downloadable PDF tax invoices with Resend email delivery.

---

## 🌟 Key Architecture & Highlights

| Capability | Implementation |
| :--- | :--- |
| **Frontend** | React 18, Vite 6, Tailwind CSS, Lucide Icons |
| **Database & Auth** | Supabase PostgreSQL with Row Level Security (RLS) & Supabase Auth |
| **Atomic POS Checkout** | PostgreSQL `process_sale` RPC function with `FOR UPDATE` row-level locks |
| **Public Customer Radar** | Geospatial Haversine calculation (`search_nearby_medicines` RPC), zero login required, strictly filters `pieces > 0`, nearest pharmacy first |
| **AI Packaging Scan** | Supabase Edge Function calling Gemma 4 Vision with structured extraction & confidence scoring |
| **Inventory Source of Truth** | Internal truth is **total pieces**; derived dynamic values: `strips = total_pieces / pcs_per_strip`, `loose = total_pieces % pcs_per_strip` |
| **Batch & FEFO Enforcement**| Automatic recommendation of the earliest expiring non-expired batch; zero dispensing permission for expired stock |
| **PDF Invoices** | Server & client compatible high-fidelity PDF invoice generator with Supabase Storage bucket archival |
| **Email Invoices** | Resend API integration via Supabase Edge Function with non-blocking error resilience |
| **Audit Ledger** | Immutable `stock_movements` table recording every inward, sale, adjustment, and write-off |

---

## 📁 Repository Structure

```text
MedGuard/
├── .env.example                     # Environment template
├── supabase/
│   ├── schema.sql                   # Complete PostgreSQL schema, tables, indexes, RLS, and RPCs
│   ├── storage.sql                  # Supabase Storage bucket configuration & policies
│   ├── seed.sql                     # Realistic demo seed data (Pharmacies, Medicines, Batches)
│   ├── README.md                    # Edge function deployment & secret guide
│   └── functions/
│       ├── scan-medicine/index.ts   # Gemma 4 Vision Edge Function
│       └── send-invoice/index.ts    # Resend email delivery Edge Function
├── src/
│   ├── context/
│   │   └── PharmacyContext.jsx      # Global state, FEFO rules, POS checkout, & Supabase sync
│   ├── lib/
│   │   ├── supabase.js              # Supabase client initializer & config detector
│   │   └── mockStore.js             # Realistic local demo store & offline fallback
│   ├── utils/
│   │   ├── geoUtils.js              # Haversine distance & Google Maps directions
│   │   └── pdfGenerator.js          # Professional jsPDF invoice generator & Supabase Storage uploader
│   ├── components/
│   │   ├── customer/
│   │   │   └── CustomerDiscovery.jsx # Public Medicine Discovery Radar (No Login)
│   │   ├── auth/
│   │   │   └── PharmacistAuth.jsx    # Pharmacist Auth & Pharmacy Registration (Lat/Lng)
│   │   ├── layout/
│   │   │   └── PharmacistLayout.jsx  # Pharmacist Dashboard Shell & Navigation
│   │   ├── dashboard/
│   │   │   └── Dashboard.jsx         # Real-time KPIs, near-expiry alerts, low-stock warnings
│   │   ├── inventory/
│   │   │   ├── InventoryList.jsx     # Strip & piece breakdown, stock adjustments
│   │   │   ├── AddStock.jsx          # Manual & AI-assisted batch inward
│   │   │   └── ExpiryManagement.jsx  # FEFO radar & configurable near-expiry window
│   │   ├── ai/
│   │   │   └── AiScanner.jsx         # Packaging upload/camera, Gemma 4 OCR, confidence meter
│   │   ├── pos/
│   │   │   └── PointOfSale.jsx       # Phone customer lookup, strip/piece cart, atomic checkout
│   │   ├── invoices/
│   │   │   └── InvoiceList.jsx       # Historical invoices, PDF download, Resend email action
│   │   ├── customers/
│   │   │   └── CustomerManagement.jsx # Normalized phone records & patient spend history
│   │   ├── suppliers/
│   │   │   └── SupplierManagement.jsx # Wholesale distributors & linked batch associations
│   │   ├── reports/
│   │   │   └── Reports.jsx           # Sales audit, inventory valuation, CSV export, medicine velocity
│   │   └── movements/
│   │       └── StockMovements.jsx    # Auditable stock movement ledger
│   ├── App.jsx                      # App root with seamless view switcher
│   └── main.jsx                     # Vite mount point
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18 or higher recommended)
- Supabase project (`https://jorghleuygkkxryvfmzr.supabase.co`)

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Frontend Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Update `.env` with your Supabase credentials:
```env
VITE_SUPABASE_URL=https://jorghleuygkkxryvfmzr.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_anon_key_here
```
*(Note: If you leave the publishable key unconfigured, MedGuard AI automatically activates its high-fidelity local demo store, allowing full exploration of all modules, POS checkout, PDF generation, and customer discovery out of the box).*

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🗄️ Supabase Database & Edge Functions Setup

### Step 1: Run PostgreSQL Schema
1. Open your Supabase Dashboard: **[https://jorghleuygkkxryvfmzr.supabase.co](https://jorghleuygkkxryvfmzr.supabase.co)**
2. Go to **SQL Editor** -> **New Query**.
3. Paste and execute the contents of [`supabase/schema.sql`](file:///Users/eluribhuvanavenkatachandu/Downloads/MedGuard/supabase/schema.sql).
   This creates:
   - Tables: `profiles`, `pharmacies`, `medicines`, `suppliers`, `batches`, `inventory`, `customers`, `sales`, `sale_items`, `invoices`, `ai_scans`, `search_sessions`, `stock_movements`, `email_logs`.
   - RPC function `process_sale`: Atomic ACID checkout function with row-locking (`FOR UPDATE`).
   - RPC function `search_nearby_medicines`: Geolocation distance search returning pharmacies with `available_stock > 0`.
   - Row Level Security (RLS) policies isolating pharmacy private data while allowing safe public medicine availability discovery.

### Step 2: Configure Storage Buckets
Run [`supabase/storage.sql`](file:///Users/eluribhuvanavenkatachandu/Downloads/MedGuard/supabase/storage.sql) in SQL Editor:
- Bucket `medicine-scans`: Stores uploaded medicine packaging photos.
- Bucket `invoices`: Stores generated official invoice PDFs.

### Step 3: Populate Demo Seed Data (Optional)
Run [`supabase/seed.sql`](file:///Users/eluribhuvanavenkatachandu/Downloads/MedGuard/supabase/seed.sql) to seed sample pharmacies (Apollo Care Indiranagar & MedPlus Koramangala), suppliers (Cipla, Sun Pharma), medicines (Dolo 650, Augmentin 625 Duo, Pan 40, Cetriz 10), and batches with various expiry dates to test FEFO.

### Step 4: Configure Edge Function Secrets
In Supabase Dashboard, navigate to **Project Settings** -> **Edge Functions** -> **Add Secret**:
- `GEMMA_API_KEY`: Your OpenRouter or Gemma 4 compatible vision API key.
- `RESEND_API_KEY`: Your Resend API key for emailing invoices.

Or via Supabase CLI:
```bash
supabase secrets set GEMMA_API_KEY="your_api_key_here"
supabase secrets set RESEND_API_KEY="your_resend_api_key_here"
```

### Step 5: Deploy Edge Functions
```bash
supabase functions deploy scan-medicine --no-verify-jwt
supabase functions deploy send-invoice --no-verify-jwt
```

---

## 🧪 Detailed Functional Modules

### 1. Customer Discovery Module (No Login Required)
- **Public access**: Patients do NOT log in.
- **Search radar**: Search by medicine commercial name, brand, generic salt, or strength (e.g. *Dolo 650*, *Paracetamol*, *Augmentin*, *650mg*).
- **Geolocation**: One-click GPS location detection or instant demo presets (Indiranagar, Koramangala, etc.).
- **Strict stock filter**: Only pharmacies with `available_pieces > 0` are displayed. Zero-stock pharmacies are completely hidden.
- **Distance sorting**: Sorted strictly nearest to farthest with live distance badges (e.g., `0.8 km away`).
- **Stock & price breakdown**: Shows available full strips, loose pieces, price per strip, and price per piece.
- **Google Maps directions**: One-click button opens real-time navigation directions to the pharmacy's verified GPS coordinates.
- **Search Session ID**: Generates a temporary session token (e.g., `SS-489211`) with clear disclaimers that searches do not create transactions or reservations.

### 2. Pharmacist Authentication & Pharmacy Setup
- Uses Supabase Auth for pharmacist login and registration.
- Stores pharmacy name, owner name, phone, address, latitude, and longitude for geolocation search.
- Isolates multi-tenant pharmacy records using Supabase RLS.

### 3. AI Medicine Packaging Scanner (Gemma 4 Vision)
- Accepts file upload or real-time camera capture.
- Analyzes medicine strip foil, box, or bottle packaging using Gemma 4 multimodal OCR via Supabase Edge Function.
- Extracts medicine commercial name, active salt, strength, manufacturer, batch number, manufacturing date, and expiry date.
- Computes AI confidence score (0-100%).
- Flags blurry images, missing batch, or expired packaging.
- **Never auto-trusts low confidence**: Displays extracted fields to the pharmacist for verification before transferring directly into inventory.

### 4. Inventory, Strip & Piece Mathematics
- **Internal source of truth**: `total_pieces`.
- Real-time calculations:
  - $\text{available\_strips} = \lfloor \text{total\_pieces} / \text{pieces\_per\_strip} \rfloor$
  - $\text{loose\_pieces} = \text{total\_pieces} \pmod{\text{pieces\_per\_strip}}$
- Guaranteed non-negative inventory via PostgreSQL constraints and frontend validation.

### 5. FEFO (First-Expired, First-Out) Engine
- During POS counter sales, MedGuard automatically prioritizes and recommends the valid non-expired batch with the earliest expiry date.
- Expired stock is automatically blocked from dispensing.
- Configurable near-expiry threshold (default 30 days) with real-time alert banners on the dashboard.

### 6. Atomic POS Billing Counter
- **Phone search**: Entering customer phone number automatically normalizes digits and searches existing records to load customer name and Gmail.
- **Dispensing unit**: Pharmacist can sell full strips, loose individual pieces, or a combination.
- **Atomic checkout**: Executes atomic database transaction (`process_sale` RPC) with PostgreSQL `FOR UPDATE` row locking to prevent overselling or race conditions.
- Updates inventory, creates sale items, logs immutable stock movements, and generates invoice.

### 7. Professional PDF Invoices & Email Delivery
- Generates vector PDF invoices featuring pharmacy details, customer details, itemized table with batch/expiry breakdown, taxes, discounts, and signature block.
- Uploads PDF to Supabase Storage bucket `invoices`.
- Sends invoice PDF to the customer's Gmail via the `send-invoice` Supabase Edge Function using Resend.
- **Resilience**: If email fails, the sale is NOT rolled back. The UI displays `Sale successful • Invoice generated • Email failed` with a one-click **Resend Invoice** button.

### 8. Auditable Stock Movement Ledger
- Complete auditable ledger tracking movement types: `initial_stock`, `stock_added`, `sale`, `adjustment`, `return`, `expired_stock`.
- Tracks delta quantity and balance after every operation.

---

## 🔒 Security & Data Isolation
- **Row Level Security (RLS)**: Pharmacists can only read and write data belonging to their own pharmacy.
- **Public API Privacy**: The public customer search RPC exposes only non-sensitive availability info (pharmacy name, address, coordinates, stock availability, and retail pricing). Private customer lists, internal sales numbers, purchase costs, and supplier details are never exposed to anonymous callers.
- **No Secret Leakage**: `GEMMA_API_KEY`, `RESEND_API_KEY`, and database service credentials reside exclusively in Supabase Edge Function environment secrets.
