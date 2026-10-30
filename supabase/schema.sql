-- ==============================================================================
-- MEDGUARD AI - PRODUCTION DATABASE SCHEMA & RPC FUNCTIONS
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PHARMACIES TABLE
CREATE TABLE IF NOT EXISTS public.pharmacies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    address TEXT NOT NULL,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    license_number TEXT,
    near_expiry_threshold_days INTEGER NOT NULL DEFAULT 30,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for geospatial search and lookup
CREATE INDEX IF NOT EXISTS idx_pharmacies_lat_lng ON public.pharmacies (latitude, longitude);

-- 2. PROFILES TABLE (Associated with Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    pharmacy_id UUID REFERENCES public.pharmacies(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'pharmacist' CHECK (role IN ('pharmacist', 'admin', 'manager')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_profiles_pharmacy ON public.profiles (pharmacy_id);

-- 3. MEDICINES TABLE
CREATE TABLE IF NOT EXISTS public.medicines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    generic_name TEXT,
    brand TEXT,
    strength TEXT,
    category TEXT DEFAULT 'General',
    manufacturer TEXT,
    pieces_per_strip INTEGER NOT NULL DEFAULT 10 CHECK (pieces_per_strip > 0),
    unit_of_measure TEXT NOT NULL DEFAULT 'tablet',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_pharmacy_medicine UNIQUE (pharmacy_id, name, strength)
);

CREATE INDEX IF NOT EXISTS idx_medicines_search ON public.medicines (name, generic_name, brand, strength);
CREATE INDEX IF NOT EXISTS idx_medicines_pharmacy ON public.medicines (pharmacy_id);

-- 4. SUPPLIERS TABLE
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    gst_number TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_suppliers_pharmacy ON public.suppliers (pharmacy_id);

-- 5. BATCHES TABLE
CREATE TABLE IF NOT EXISTS public.batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
    medicine_id UUID NOT NULL REFERENCES public.medicines(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    batch_number TEXT NOT NULL,
    manufacturing_date DATE,
    expiry_date DATE NOT NULL,
    mrp_per_strip NUMERIC(10, 2) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_batch_number_per_medicine UNIQUE (pharmacy_id, medicine_id, batch_number)
);

CREATE INDEX IF NOT EXISTS idx_batches_expiry ON public.batches (expiry_date ASC);
CREATE INDEX IF NOT EXISTS idx_batches_medicine ON public.batches (medicine_id);
CREATE INDEX IF NOT EXISTS idx_batches_pharmacy ON public.batches (pharmacy_id);

-- 6. INVENTORY TABLE
CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
    medicine_id UUID NOT NULL REFERENCES public.medicines(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
    pieces_per_strip INTEGER NOT NULL DEFAULT 10 CHECK (pieces_per_strip > 0),
    total_pieces INTEGER NOT NULL DEFAULT 0 CHECK (total_pieces >= 0),
    price_per_piece NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (price_per_piece >= 0),
    price_per_strip NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (price_per_strip >= 0),
    min_stock_pieces INTEGER NOT NULL DEFAULT 20 CHECK (min_stock_pieces >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_pharmacy_batch_inventory UNIQUE (pharmacy_id, batch_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_pharmacy ON public.inventory (pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_inventory_medicine ON public.inventory (medicine_id);
CREATE INDEX IF NOT EXISTS idx_inventory_pieces ON public.inventory (total_pieces);

-- 7. CUSTOMERS TABLE (Pharmacist customer records)
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_pharmacy_customer_phone UNIQUE (pharmacy_id, phone)
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers (pharmacy_id, phone);

-- 8. SALES TABLE
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    pharmacist_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    sale_number TEXT NOT NULL UNIQUE,
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL DEFAULT 'Cash' CHECK (payment_method IN ('Cash', 'Card', 'UPI', 'NetBanking')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_sales_pharmacy ON public.sales (pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_sales_created ON public.sales (created_at DESC);

-- 9. SALE ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    medicine_id UUID NOT NULL REFERENCES public.medicines(id),
    batch_id UUID NOT NULL REFERENCES public.batches(id),
    unit_type TEXT NOT NULL CHECK (unit_type IN ('strip', 'piece')),
    quantity_units INTEGER NOT NULL CHECK (quantity_units > 0),
    pieces_count INTEGER NOT NULL CHECK (pieces_count > 0),
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    total_price NUMERIC(10, 2) NOT NULL CHECK (total_price >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON public.sale_items (sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_medicine ON public.sale_items (medicine_id);

-- 10. INVOICES TABLE
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE UNIQUE,
    invoice_number TEXT NOT NULL UNIQUE,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    total_amount NUMERIC(10, 2) NOT NULL,
    pdf_url TEXT,
    status TEXT NOT NULL DEFAULT 'generated' CHECK (status IN ('generated', 'emailed', 'email_failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_invoices_pharmacy ON public.invoices (pharmacy_id);

-- 11. AI SCANS TABLE
CREATE TABLE IF NOT EXISTS public.ai_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    raw_response JSONB,
    extracted_data JSONB,
    confidence_score NUMERIC(5, 2) DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'verified')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_ai_scans_pharmacy ON public.ai_scans (pharmacy_id);

-- 12. SEARCH SESSIONS TABLE (Public Customer Search)
CREATE TABLE IF NOT EXISTS public.search_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_token TEXT NOT NULL UNIQUE,
    search_query TEXT,
    user_lat NUMERIC(10, 7),
    user_lng NUMERIC(10, 7),
    results_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_search_sessions_created ON public.search_sessions (created_at DESC);

-- 13. STOCK MOVEMENTS TABLE (Full Audit Trail)
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
    medicine_id UUID NOT NULL REFERENCES public.medicines(id),
    batch_id UUID NOT NULL REFERENCES public.batches(id),
    movement_type TEXT NOT NULL CHECK (movement_type IN ('initial_stock', 'stock_added', 'sale', 'adjustment', 'return', 'expired_stock')),
    pieces_quantity INTEGER NOT NULL, -- positive for addition, negative for deduction
    balance_after INTEGER NOT NULL,
    reference_id TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_pharmacy ON public.stock_movements (pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_batch ON public.stock_movements (batch_id);

-- 14. EMAIL LOGS TABLE
CREATE TABLE IF NOT EXISTS public.email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    recipient_email TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'pending')),
    error_message TEXT,
    resend_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_email_logs_invoice ON public.email_logs (invoice_id);


-- ==============================================================================
-- ATOMIC SALE TRANSACTION RPC FUNCTION: process_sale
-- Prevents race conditions and overselling by locking inventory rows
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.process_sale(
    p_pharmacy_id UUID,
    p_customer_id UUID,
    p_pharmacist_id UUID,
    p_items JSONB,              -- Array of: { "medicine_id": "...", "batch_id": "...", "unit_type": "strip"|"piece", "quantity_units": 1, "pieces_count": 10, "unit_price": 50, "total_price": 50 }
    p_subtotal NUMERIC,
    p_discount NUMERIC,
    p_tax NUMERIC,
    p_total NUMERIC,
    p_payment_method TEXT,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sale_id UUID;
    v_sale_number TEXT;
    v_invoice_number TEXT;
    v_item RECORD;
    v_curr_stock INTEGER;
    v_balance_after INTEGER;
    v_batch_exp DATE;
    v_customer_name TEXT := 'Walk-in Customer';
    v_customer_phone TEXT := 'N/A';
    v_customer_email TEXT := NULL;
    v_invoice_id UUID;
BEGIN
    -- 1. Generate unique human-readable sale and invoice numbers
    v_sale_number := 'SALE-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 90000 + 10000)::TEXT, 5, '0');
    v_invoice_number := 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 90000 + 10000)::TEXT, 5, '0');

    -- 2. Lookup customer info if provided
    IF p_customer_id IS NOT NULL THEN
        SELECT name, phone, email INTO v_customer_name, v_customer_phone, v_customer_email
        FROM public.customers
        WHERE id = p_customer_id AND pharmacy_id = p_pharmacy_id;
    END IF;

    -- 3. Lock & validate all inventory items in the sale
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        medicine_id UUID,
        batch_id UUID,
        unit_type TEXT,
        quantity_units INTEGER,
        pieces_count INTEGER,
        unit_price NUMERIC,
        total_price NUMERIC
    )
    LOOP
        -- Check expiry date of the batch
        SELECT expiry_date INTO v_batch_exp
        FROM public.batches
        WHERE id = v_item.batch_id AND pharmacy_id = p_pharmacy_id;

        IF v_batch_exp IS NULL THEN
            RAISE EXCEPTION 'Batch % not found for pharmacy %', v_item.batch_id, p_pharmacy_id;
        END IF;

        IF v_batch_exp < CURRENT_DATE THEN
            RAISE EXCEPTION 'Cannot sell expired medicine from batch. Expiry date was %', v_batch_exp;
        END IF;

        -- Lock inventory row FOR UPDATE to prevent race conditions
        SELECT total_pieces INTO v_curr_stock
        FROM public.inventory
        WHERE batch_id = v_item.batch_id AND pharmacy_id = p_pharmacy_id
        FOR UPDATE;

        IF v_curr_stock IS NULL THEN
            RAISE EXCEPTION 'Inventory not found for batch %', v_item.batch_id;
        END IF;

        IF v_curr_stock < v_item.pieces_count THEN
            RAISE EXCEPTION 'Insufficient stock for batch %. Available: % pieces, Requested: % pieces', 
                v_item.batch_id, v_curr_stock, v_item.pieces_count;
        END IF;
    END LOOP;

    -- 4. Insert Sale Master Record
    INSERT INTO public.sales (
        pharmacy_id,
        customer_id,
        pharmacist_id,
        sale_number,
        subtotal,
        discount_amount,
        tax_amount,
        total_amount,
        payment_method,
        notes
    ) VALUES (
        p_pharmacy_id,
        p_customer_id,
        p_pharmacist_id,
        v_sale_number,
        p_subtotal,
        p_discount,
        p_tax,
        p_total,
        p_payment_method,
        p_notes
    ) RETURNING id INTO v_sale_id;

    -- 5. Insert Sale Items, Deduct Inventory, and Record Stock Movements
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        medicine_id UUID,
        batch_id UUID,
        unit_type TEXT,
        quantity_units INTEGER,
        pieces_count INTEGER,
        unit_price NUMERIC,
        total_price NUMERIC
    )
    LOOP
        -- Insert line item
        INSERT INTO public.sale_items (
            sale_id,
            medicine_id,
            batch_id,
            unit_type,
            quantity_units,
            pieces_count,
            unit_price,
            total_price
        ) VALUES (
            v_sale_id,
            v_item.medicine_id,
            v_item.batch_id,
            v_item.unit_type,
            v_item.quantity_units,
            v_item.pieces_count,
            v_item.unit_price,
            v_item.total_price
        );

        -- Deduct inventory
        UPDATE public.inventory
        SET total_pieces = total_pieces - v_item.pieces_count,
            updated_at = timezone('utc'::text, now())
        WHERE batch_id = v_item.batch_id AND pharmacy_id = p_pharmacy_id
        RETURNING total_pieces INTO v_balance_after;

        -- Record stock movement audit trail
        INSERT INTO public.stock_movements (
            pharmacy_id,
            medicine_id,
            batch_id,
            movement_type,
            pieces_quantity,
            balance_after,
            reference_id,
            notes
        ) VALUES (
            p_pharmacy_id,
            v_item.medicine_id,
            v_item.batch_id,
            'sale',
            -v_item.pieces_count,
            v_balance_after,
            v_sale_number,
            'Sale checkout (' || v_item.quantity_units || ' ' || v_item.unit_type || ')'
        );
    END LOOP;

    -- 6. Create Initial Invoice Record
    INSERT INTO public.invoices (
        pharmacy_id,
        sale_id,
        invoice_number,
        customer_name,
        customer_phone,
        customer_email,
        total_amount,
        status
    ) VALUES (
        p_pharmacy_id,
        v_sale_id,
        v_invoice_number,
        v_customer_name,
        v_customer_phone,
        v_customer_email,
        p_total,
        'generated'
    ) RETURNING id INTO v_invoice_id;

    RETURN jsonb_build_object(
        'success', true,
        'sale_id', v_sale_id,
        'sale_number', v_sale_number,
        'invoice_id', v_invoice_id,
        'invoice_number', v_invoice_number,
        'customer_name', v_customer_name,
        'customer_phone', v_customer_phone,
        'customer_email', v_customer_email,
        'total_amount', p_total
    );
END;
$$;


-- ==============================================================================
-- PUBLIC MEDICINE DISCOVERY RPC FUNCTION: search_nearby_medicines
-- Safe public function: Returns pharmacies with stock > 0, calculates distance
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.search_nearby_medicines(
    p_query TEXT,
    p_lat NUMERIC,
    p_lng NUMERIC,
    p_max_distance_km NUMERIC DEFAULT 50
)
RETURNS TABLE (
    medicine_id UUID,
    medicine_name TEXT,
    generic_name TEXT,
    brand TEXT,
    strength TEXT,
    category TEXT,
    pharmacy_id UUID,
    pharmacy_name TEXT,
    pharmacy_address TEXT,
    pharmacy_phone TEXT,
    pharmacy_lat NUMERIC,
    pharmacy_lng NUMERIC,
    distance_km NUMERIC,
    available_pieces INTEGER,
    pieces_per_strip INTEGER,
    available_strips INTEGER,
    loose_pieces INTEGER,
    price_per_piece NUMERIC,
    price_per_strip NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH matching_inventory AS (
        SELECT 
            m.id AS medicine_id,
            m.name AS medicine_name,
            m.generic_name,
            m.brand,
            m.strength,
            m.category,
            p.id AS pharmacy_id,
            p.name AS pharmacy_name,
            p.address AS pharmacy_address,
            p.phone AS pharmacy_phone,
            p.latitude AS pharmacy_lat,
            p.longitude AS pharmacy_lng,
            -- Haversine Distance formula in Kilometers
            ROUND(
                (6371 * acos(
                    LEAST(1.0, GREATEST(-1.0, 
                        cos(radians(p_lat)) * cos(radians(p.latitude)) * 
                        cos(radians(p.longitude) - radians(p_lng)) + 
                        sin(radians(p_lat)) * sin(radians(p.latitude))
                    ))
                ))::numeric, 2
            ) AS distance_km,
            SUM(i.total_pieces)::INTEGER AS available_pieces,
            MAX(i.pieces_per_strip)::INTEGER AS pieces_per_strip,
            MAX(i.price_per_piece) AS price_per_piece,
            MAX(i.price_per_strip) AS price_per_strip
        FROM public.inventory i
        JOIN public.medicines m ON m.id = i.medicine_id
        JOIN public.batches b ON b.id = i.batch_id
        JOIN public.pharmacies p ON p.id = i.pharmacy_id
        WHERE 
            b.expiry_date >= CURRENT_DATE -- Filter out expired batches
            AND i.total_pieces > 0        -- Filter: available stock in pieces > 0
            AND (
                p_query IS NULL OR TRIM(p_query) = '' OR
                m.name ILIKE '%' || TRIM(p_query) || '%' OR
                m.generic_name ILIKE '%' || TRIM(p_query) || '%' OR
                m.brand ILIKE '%' || TRIM(p_query) || '%' OR
                m.strength ILIKE '%' || TRIM(p_query) || '%'
            )
        GROUP BY 
            m.id, m.name, m.generic_name, m.brand, m.strength, m.category,
            p.id, p.name, p.address, p.phone, p.latitude, p.longitude
    )
    SELECT 
        mi.medicine_id,
        mi.medicine_name,
        mi.generic_name,
        mi.brand,
        mi.strength,
        mi.category,
        mi.pharmacy_id,
        mi.pharmacy_name,
        mi.pharmacy_address,
        mi.pharmacy_phone,
        mi.pharmacy_lat,
        mi.pharmacy_lng,
        mi.distance_km,
        mi.available_pieces,
        mi.pieces_per_strip,
        FLOOR(mi.available_pieces / mi.pieces_per_strip)::INTEGER AS available_strips,
        (mi.available_pieces % mi.pieces_per_strip)::INTEGER AS loose_pieces,
        mi.price_per_piece,
        mi.price_per_strip
    FROM matching_inventory mi
    WHERE mi.distance_km <= p_max_distance_km
    ORDER BY mi.distance_km ASC; -- Nearest pharmacy first!
END;
$$;


-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all private tables
ALTER TABLE public.pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get the current authenticated user's pharmacy_id
CREATE OR REPLACE FUNCTION public.get_auth_pharmacy_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT pharmacy_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- 1. Profiles: Users can view & update their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE TO authenticated USING (id = auth.uid());

-- 2. Pharmacies: Public can read basic pharmacy details; Pharmacists can edit their own
CREATE POLICY "Public can view pharmacies" ON public.pharmacies
    FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Pharmacists can insert pharmacy" ON public.pharmacies
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Pharmacists can update own pharmacy" ON public.pharmacies
    FOR UPDATE TO authenticated USING (id = public.get_auth_pharmacy_id());

-- 3. Medicines: Public read-only for active discovery; Pharmacist full access for own pharmacy
CREATE POLICY "Public can view medicines" ON public.medicines
    FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Pharmacists manage own medicines" ON public.medicines
    FOR ALL TO authenticated USING (pharmacy_id = public.get_auth_pharmacy_id())
    WITH CHECK (pharmacy_id = public.get_auth_pharmacy_id());

-- 4. Inventory: Public can select; Pharmacists manage own
CREATE POLICY "Public can view inventory" ON public.inventory
    FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Pharmacists manage own inventory" ON public.inventory
    FOR ALL TO authenticated USING (pharmacy_id = public.get_auth_pharmacy_id())
    WITH CHECK (pharmacy_id = public.get_auth_pharmacy_id());

-- 5. Batches: Public can view non-expired; Pharmacists manage own
CREATE POLICY "Public can view batches" ON public.batches
    FOR SELECT TO anon, authenticated USING (expiry_date >= CURRENT_DATE);
CREATE POLICY "Pharmacists manage own batches" ON public.batches
    FOR ALL TO authenticated USING (pharmacy_id = public.get_auth_pharmacy_id())
    WITH CHECK (pharmacy_id = public.get_auth_pharmacy_id());

-- 6. Suppliers: Pharmacist private only
CREATE POLICY "Pharmacists manage own suppliers" ON public.suppliers
    FOR ALL TO authenticated USING (pharmacy_id = public.get_auth_pharmacy_id())
    WITH CHECK (pharmacy_id = public.get_auth_pharmacy_id());

-- 7. Customers: Pharmacist private only
CREATE POLICY "Pharmacists manage own customers" ON public.customers
    FOR ALL TO authenticated USING (pharmacy_id = public.get_auth_pharmacy_id())
    WITH CHECK (pharmacy_id = public.get_auth_pharmacy_id());

-- 8. Sales: Pharmacist private only
CREATE POLICY "Pharmacists manage own sales" ON public.sales
    FOR ALL TO authenticated USING (pharmacy_id = public.get_auth_pharmacy_id())
    WITH CHECK (pharmacy_id = public.get_auth_pharmacy_id());

-- 9. Sale Items: Pharmacist private only
CREATE POLICY "Pharmacists manage own sale items" ON public.sale_items
    FOR ALL TO authenticated USING (
        sale_id IN (SELECT id FROM public.sales WHERE pharmacy_id = public.get_auth_pharmacy_id())
    )
    WITH CHECK (
        sale_id IN (SELECT id FROM public.sales WHERE pharmacy_id = public.get_auth_pharmacy_id())
    );

-- 10. Invoices: Pharmacists view & manage own; Public can never read arbitrary invoices
CREATE POLICY "Pharmacists manage own invoices" ON public.invoices
    FOR ALL TO authenticated USING (pharmacy_id = public.get_auth_pharmacy_id())
    WITH CHECK (pharmacy_id = public.get_auth_pharmacy_id());

-- 11. AI Scans: Pharmacist private only
CREATE POLICY "Pharmacists manage own ai scans" ON public.ai_scans
    FOR ALL TO authenticated USING (pharmacy_id = public.get_auth_pharmacy_id())
    WITH CHECK (pharmacy_id = public.get_auth_pharmacy_id());

-- 12. Search Sessions: Anonymous and Authenticated can insert session tokens
CREATE POLICY "Anyone can insert search sessions" ON public.search_sessions
    FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can view search sessions" ON public.search_sessions
    FOR SELECT TO anon, authenticated USING (true);

-- 13. Stock Movements: Pharmacist private only
CREATE POLICY "Pharmacists manage own stock movements" ON public.stock_movements
    FOR ALL TO authenticated USING (pharmacy_id = public.get_auth_pharmacy_id())
    WITH CHECK (pharmacy_id = public.get_auth_pharmacy_id());

-- 14. Email Logs: Pharmacist private only
CREATE POLICY "Pharmacists manage own email logs" ON public.email_logs
    FOR ALL TO authenticated USING (pharmacy_id = public.get_auth_pharmacy_id())
    WITH CHECK (pharmacy_id = public.get_auth_pharmacy_id());
