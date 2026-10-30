-- ==============================================================================
-- MEDGUARD AI - SEED DATA FOR DEMO & TESTING
-- ==============================================================================

DO $$
DECLARE
    v_pharmacy1_id UUID;
    v_pharmacy2_id UUID;
    v_supplier1_id UUID;
    v_supplier2_id UUID;
    v_med1_id UUID;
    v_med2_id UUID;
    v_med3_id UUID;
    v_med4_id UUID;
    v_batch1_id UUID;
    v_batch2_id UUID;
    v_batch3_id UUID;
    v_batch4_id UUID;
    v_batch5_id UUID;
BEGIN
    -- 1. Insert Sample Pharmacies (with real-world coords, e.g. Bangalore / Tech Hub)
    INSERT INTO public.pharmacies (name, owner_name, phone, email, address, latitude, longitude, license_number)
    VALUES (
        'Apollo Care Pharmacy - Indiranagar',
        'Dr. Rajesh Sharma',
        '+91 98765 43210',
        'apollo.indiranagar@medguard.io',
        '100 Feet Rd, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560038',
        12.9719,
        77.6412,
        'DL-KA-2023-88741'
    ) RETURNING id INTO v_pharmacy1_id;

    INSERT INTO public.pharmacies (name, owner_name, phone, email, address, latitude, longitude, license_number)
    VALUES (
        'MedPlus Wellness - Koramangala',
        'Priya Venkatesh',
        '+91 98450 12345',
        'medplus.koramangala@medguard.io',
        '80 Feet Rd, 4th Block, Koramangala, Bengaluru, Karnataka 560034',
        12.9352,
        77.6245,
        'DL-KA-2022-55219'
    ) RETURNING id INTO v_pharmacy2_id;

    -- 2. Insert Suppliers for Pharmacy 1
    INSERT INTO public.suppliers (pharmacy_id, name, contact_person, phone, email, address, gst_number)
    VALUES (
        v_pharmacy1_id,
        'Cipla Healthcare Distributors',
        'Ramesh Kumar',
        '+91 98111 22334',
        'orders@cipladist.in',
        'Peenya Industrial Area, Phase 1, Bengaluru',
        '29AAAAA0000A1Z5'
    ) RETURNING id INTO v_supplier1_id;

    INSERT INTO public.suppliers (pharmacy_id, name, contact_person, phone, email, address, gst_number)
    VALUES (
        v_pharmacy1_id,
        'Sun Pharma Logistics',
        'Anil Mehta',
        '+91 98222 33445',
        'supply@sunpharmabengaluru.com',
        'Electronic City, Phase 2, Bengaluru',
        '29BBBBB1111B2Z6'
    ) RETURNING id INTO v_supplier2_id;

    -- 3. Insert Medicines for Pharmacy 1
    -- Med 1: Dolo 650 (Paracetamol)
    INSERT INTO public.medicines (pharmacy_id, name, generic_name, brand, strength, category, manufacturer, pieces_per_strip, unit_of_measure)
    VALUES (
        v_pharmacy1_id,
        'Dolo 650',
        'Paracetamol',
        'Micro Labs',
        '650mg',
        'Antipyretic / Analgesic',
        'Micro Labs Ltd',
        15,
        'tablet'
    ) RETURNING id INTO v_med1_id;

    -- Med 2: Augmentin 625 Duo
    INSERT INTO public.medicines (pharmacy_id, name, generic_name, brand, strength, category, manufacturer, pieces_per_strip, unit_of_measure)
    VALUES (
        v_pharmacy1_id,
        'Augmentin 625 Duo',
        'Amoxicillin + Clavulanic Acid',
        'GSK',
        '625mg',
        'Antibiotic',
        'GlaxoSmithKline',
        10,
        'tablet'
    ) RETURNING id INTO v_med2_id;

    -- Med 3: Pan 40
    INSERT INTO public.medicines (pharmacy_id, name, generic_name, brand, strength, category, manufacturer, pieces_per_strip, unit_of_measure)
    VALUES (
        v_pharmacy1_id,
        'Pan 40',
        'Pantoprazole Gastro-resistant',
        'Alkem',
        '40mg',
        'Antacid / PPI',
        'Alkem Laboratories',
        15,
        'tablet'
    ) RETURNING id INTO v_med3_id;

    -- Med 4: Cetriz 10
    INSERT INTO public.medicines (pharmacy_id, name, generic_name, brand, strength, category, manufacturer, pieces_per_strip, unit_of_measure)
    VALUES (
        v_pharmacy1_id,
        'Cetriz 10',
        'Cetirizine Hydrochloride',
        'Dr. Reddy''s',
        '10mg',
        'Antihistamine / Allergy',
        'Dr. Reddy''s Laboratories',
        10,
        'tablet'
    ) RETURNING id INTO v_med4_id;

    -- 4. Batches for Pharmacy 1
    -- Dolo 650 Batch 1 (Expiring in 6 months)
    INSERT INTO public.batches (pharmacy_id, medicine_id, supplier_id, batch_number, manufacturing_date, expiry_date, mrp_per_strip)
    VALUES (
        v_pharmacy1_id,
        v_med1_id,
        v_supplier1_id,
        'DL-8941A',
        (CURRENT_DATE - INTERVAL '6 months')::DATE,
        (CURRENT_DATE + INTERVAL '6 months')::DATE,
        34.00
    ) RETURNING id INTO v_batch1_id;

    -- Dolo 650 Batch 2 (Expiring in 20 days - NEAR EXPIRY for testing FEFO & alerts)
    INSERT INTO public.batches (pharmacy_id, medicine_id, supplier_id, batch_number, manufacturing_date, expiry_date, mrp_per_strip)
    VALUES (
        v_pharmacy1_id,
        v_med1_id,
        v_supplier1_id,
        'DL-7712E',
        (CURRENT_DATE - INTERVAL '11 months')::DATE,
        (CURRENT_DATE + INTERVAL '20 days')::DATE,
        32.00
    ) RETURNING id INTO v_batch2_id;

    -- Augmentin Batch (Expiring in 1 year)
    INSERT INTO public.batches (pharmacy_id, medicine_id, supplier_id, batch_number, manufacturing_date, expiry_date, mrp_per_strip)
    VALUES (
        v_pharmacy1_id,
        v_med2_id,
        v_supplier2_id,
        'AUG-5542',
        (CURRENT_DATE - INTERVAL '3 months')::DATE,
        (CURRENT_DATE + INTERVAL '12 months')::DATE,
        210.00
    ) RETURNING id INTO v_batch3_id;

    -- Pan 40 Batch (Expiring in 8 months, LOW STOCK for alert testing)
    INSERT INTO public.batches (pharmacy_id, medicine_id, supplier_id, batch_number, manufacturing_date, expiry_date, mrp_per_strip)
    VALUES (
        v_pharmacy1_id,
        v_med3_id,
        v_supplier1_id,
        'PAN-9021',
        (CURRENT_DATE - INTERVAL '4 months')::DATE,
        (CURRENT_DATE + INTERVAL '8 months')::DATE,
        155.00
    ) RETURNING id INTO v_batch4_id;

    -- Cetriz Batch
    INSERT INTO public.batches (pharmacy_id, medicine_id, supplier_id, batch_number, manufacturing_date, expiry_date, mrp_per_strip)
    VALUES (
        v_pharmacy1_id,
        v_med4_id,
        v_supplier2_id,
        'CTZ-1109',
        (CURRENT_DATE - INTERVAL '2 months')::DATE,
        (CURRENT_DATE + INTERVAL '18 months')::DATE,
        45.00
    ) RETURNING id INTO v_batch5_id;

    -- 5. Inventory Records
    -- Dolo Batch 1: 15 pieces per strip, 150 pieces (10 strips, 0 loose)
    INSERT INTO public.inventory (pharmacy_id, medicine_id, batch_id, pieces_per_strip, total_pieces, price_per_piece, price_per_strip, min_stock_pieces)
    VALUES (
        v_pharmacy1_id,
        v_med1_id,
        v_batch1_id,
        15,
        150,
        2.27,
        34.00,
        30
    );

    -- Dolo Batch 2: 15 pieces per strip, 38 pieces (2 strips, 8 loose) - FEFO first priority!
    INSERT INTO public.inventory (pharmacy_id, medicine_id, batch_id, pieces_per_strip, total_pieces, price_per_piece, price_per_strip, min_stock_pieces)
    VALUES (
        v_pharmacy1_id,
        v_med1_id,
        v_batch2_id,
        15,
        38,
        2.13,
        32.00,
        30
    );

    -- Augmentin 625: 10 pieces per strip, 85 pieces (8 strips, 5 loose)
    INSERT INTO public.inventory (pharmacy_id, medicine_id, batch_id, pieces_per_strip, total_pieces, price_per_piece, price_per_strip, min_stock_pieces)
    VALUES (
        v_pharmacy1_id,
        v_med2_id,
        v_batch3_id,
        10,
        85,
        21.00,
        210.00,
        20
    );

    -- Pan 40: 15 pieces per strip, 12 pieces (0 strips, 12 loose) -> LOW STOCK (threshold 20)
    INSERT INTO public.inventory (pharmacy_id, medicine_id, batch_id, pieces_per_strip, total_pieces, price_per_piece, price_per_strip, min_stock_pieces)
    VALUES (
        v_pharmacy1_id,
        v_med3_id,
        v_batch4_id,
        15,
        12,
        10.33,
        155.00,
        25
    );

    -- Cetriz: 10 pieces per strip, 200 pieces (20 strips)
    INSERT INTO public.inventory (pharmacy_id, medicine_id, batch_id, pieces_per_strip, total_pieces, price_per_piece, price_per_strip, min_stock_pieces)
    VALUES (
        v_pharmacy1_id,
        v_med4_id,
        v_batch5_id,
        10,
        200,
        4.50,
        45.00,
        20
    );

    -- Sample Initial Stock Movements
    INSERT INTO public.stock_movements (pharmacy_id, medicine_id, batch_id, movement_type, pieces_quantity, balance_after, reference_id, notes)
    VALUES 
    (v_pharmacy1_id, v_med1_id, v_batch1_id, 'initial_stock', 150, 150, 'INIT-001', 'Opening inventory batch DL-8941A'),
    (v_pharmacy1_id, v_med1_id, v_batch2_id, 'initial_stock', 38, 38, 'INIT-002', 'Opening inventory batch DL-7712E'),
    (v_pharmacy1_id, v_med2_id, v_batch3_id, 'initial_stock', 85, 85, 'INIT-003', 'Opening inventory batch AUG-5542'),
    (v_pharmacy1_id, v_med3_id, v_batch4_id, 'initial_stock', 12, 12, 'INIT-004', 'Opening inventory batch PAN-9021');

    -- Sample Customer
    INSERT INTO public.customers (pharmacy_id, name, phone, email, address)
    VALUES (
        v_pharmacy1_id,
        'Arun Nair',
        '9876543210',
        'arun.nair.test@gmail.com',
        'Flat 402, Green Glen Layout, Bellandur, Bengaluru'
    );

END $$;
