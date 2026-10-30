// Local Mock Store & Seed State for offline / demo mode
// Allows immediate full end-to-end testing before or alongside Supabase integration

const STORAGE_KEY = 'medguard_demo_state_v1';

export const INITIAL_PHARMACY = {
  id: 'ph-001',
  name: 'Apollo Care Pharmacy - Indiranagar',
  owner_name: 'Dr. Rajesh Sharma',
  phone: '+91 98765 43210',
  email: 'apollo.indiranagar@medguard.io',
  address: '100 Feet Rd, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560038',
  latitude: 12.9719,
  longitude: 77.6412,
  license_number: 'DL-KA-2023-88741',
  near_expiry_threshold_days: 30,
};

export const INITIAL_PHARMACY_2 = {
  id: 'ph-002',
  name: 'MedPlus Wellness - Koramangala',
  owner_name: 'Priya Venkatesh',
  phone: '+91 98450 12345',
  email: 'medplus.koramangala@medguard.io',
  address: '80 Feet Rd, 4th Block, Koramangala, Bengaluru, Karnataka 560034',
  latitude: 12.9352,
  longitude: 77.6245,
  license_number: 'DL-KA-2022-55219',
  near_expiry_threshold_days: 30,
};

export const INITIAL_SUPPLIERS = [
  {
    id: 'sup-001',
    pharmacy_id: 'ph-001',
    name: 'Cipla Healthcare Distributors',
    contact_person: 'Ramesh Kumar',
    phone: '+91 98111 22334',
    email: 'orders@cipladist.in',
    address: 'Peenya Industrial Area, Phase 1, Bengaluru',
    gst_number: '29AAAAA0000A1Z5',
  },
  {
    id: 'sup-002',
    pharmacy_id: 'ph-001',
    name: 'Sun Pharma Logistics',
    contact_person: 'Anil Mehta',
    phone: '+91 98222 33445',
    email: 'supply@sunpharmabengaluru.com',
    address: 'Electronic City, Phase 2, Bengaluru',
    gst_number: '29BBBBB1111B2Z6',
  },
];

export const INITIAL_CUSTOMERS = [
  {
    id: 'cust-001',
    pharmacy_id: 'ph-001',
    name: 'Arun Nair',
    phone: '9876543210',
    email: 'arun.nair.test@gmail.com',
    address: 'Flat 402, Green Glen Layout, Bellandur, Bengaluru',
  },
  {
    id: 'cust-002',
    pharmacy_id: 'ph-001',
    name: 'Sneha Rao',
    phone: '9845123456',
    email: 'sneha.rao.test@gmail.com',
    address: '14, 5th Cross, Indiranagar, Bengaluru',
  },
];

// Helper to calculate days from now
const daysFromNow = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

export const INITIAL_MEDICINES = [
  {
    id: 'med-001',
    pharmacy_id: 'ph-001',
    name: 'Dolo 650',
    generic_name: 'Paracetamol',
    brand: 'Micro Labs',
    strength: '650mg',
    category: 'Antipyretic / Analgesic',
    manufacturer: 'Micro Labs Ltd',
    pieces_per_strip: 15,
    unit_of_measure: 'tablet',
  },
  {
    id: 'med-002',
    pharmacy_id: 'ph-001',
    name: 'Augmentin 625 Duo',
    generic_name: 'Amoxicillin + Clavulanic Acid',
    brand: 'GSK',
    strength: '625mg',
    category: 'Antibiotic',
    manufacturer: 'GlaxoSmithKline',
    pieces_per_strip: 10,
    unit_of_measure: 'tablet',
  },
  {
    id: 'med-003',
    pharmacy_id: 'ph-001',
    name: 'Pan 40',
    generic_name: 'Pantoprazole Gastro-resistant',
    brand: 'Alkem',
    strength: '40mg',
    category: 'Antacid / PPI',
    manufacturer: 'Alkem Laboratories',
    pieces_per_strip: 15,
    unit_of_measure: 'tablet',
  },
  {
    id: 'med-004',
    pharmacy_id: 'ph-001',
    name: 'Cetriz 10',
    generic_name: 'Cetirizine Hydrochloride',
    brand: 'Dr. Reddy',
    strength: '10mg',
    category: 'Antihistamine / Allergy',
    manufacturer: 'Dr. Reddy\'s Laboratories',
    pieces_per_strip: 10,
    unit_of_measure: 'tablet',
  },
  {
    id: 'med-005',
    pharmacy_id: 'ph-001',
    name: 'Azithral 500',
    generic_name: 'Azithromycin',
    brand: 'Alembic',
    strength: '500mg',
    category: 'Antibiotic',
    manufacturer: 'Alembic Pharmaceuticals',
    pieces_per_strip: 5,
    unit_of_measure: 'tablet',
  },
];

export const INITIAL_BATCHES = [
  {
    id: 'batch-001',
    pharmacy_id: 'ph-001',
    medicine_id: 'med-001',
    supplier_id: 'sup-001',
    batch_number: 'DL-7712E',
    manufacturing_date: daysFromNow(-330),
    expiry_date: daysFromNow(18), // Expiring in 18 days -> NEAR EXPIRY
    mrp_per_strip: 32.00,
  },
  {
    id: 'batch-002',
    pharmacy_id: 'ph-001',
    medicine_id: 'med-001',
    supplier_id: 'sup-001',
    batch_number: 'DL-8941A',
    manufacturing_date: daysFromNow(-180),
    expiry_date: daysFromNow(240), // Expiring in 8 months -> SAFE
    mrp_per_strip: 34.00,
  },
  {
    id: 'batch-003',
    pharmacy_id: 'ph-001',
    medicine_id: 'med-002',
    supplier_id: 'sup-002',
    batch_number: 'AUG-5542',
    manufacturing_date: daysFromNow(-90),
    expiry_date: daysFromNow(365),
    mrp_per_strip: 210.00,
  },
  {
    id: 'batch-004',
    pharmacy_id: 'ph-001',
    medicine_id: 'med-003',
    supplier_id: 'sup-001',
    batch_number: 'PAN-9021',
    manufacturing_date: daysFromNow(-120),
    expiry_date: daysFromNow(240),
    mrp_per_strip: 155.00,
  },
  {
    id: 'batch-005',
    pharmacy_id: 'ph-001',
    medicine_id: 'med-004',
    supplier_id: 'sup-002',
    batch_number: 'CTZ-1109',
    manufacturing_date: daysFromNow(-60),
    expiry_date: daysFromNow(450),
    mrp_per_strip: 45.00,
  },
  {
    id: 'batch-006',
    pharmacy_id: 'ph-001',
    medicine_id: 'med-005',
    supplier_id: 'sup-001',
    batch_number: 'AZI-001X',
    manufacturing_date: daysFromNow(-400),
    expiry_date: daysFromNow(-15), // Expired 15 days ago -> EXPIRED
    mrp_per_strip: 120.00,
  },
];

export const INITIAL_INVENTORY = [
  {
    id: 'inv-001',
    pharmacy_id: 'ph-001',
    medicine_id: 'med-001',
    batch_id: 'batch-001',
    pieces_per_strip: 15,
    total_pieces: 38, // 2 strips, 8 loose
    price_per_piece: 2.13,
    price_per_strip: 32.00,
    min_stock_pieces: 30,
  },
  {
    id: 'inv-002',
    pharmacy_id: 'ph-001',
    medicine_id: 'med-001',
    batch_id: 'batch-002',
    pieces_per_strip: 15,
    total_pieces: 150, // 10 strips, 0 loose
    price_per_piece: 2.27,
    price_per_strip: 34.00,
    min_stock_pieces: 30,
  },
  {
    id: 'inv-003',
    pharmacy_id: 'ph-001',
    medicine_id: 'med-002',
    batch_id: 'batch-003',
    pieces_per_strip: 10,
    total_pieces: 85, // 8 strips, 5 loose
    price_per_piece: 21.00,
    price_per_strip: 210.00,
    min_stock_pieces: 20,
  },
  {
    id: 'inv-004',
    pharmacy_id: 'ph-001',
    medicine_id: 'med-003',
    batch_id: 'batch-004',
    pieces_per_strip: 15,
    total_pieces: 12, // 0 strips, 12 loose -> LOW STOCK (min is 25)
    price_per_piece: 10.33,
    price_per_strip: 155.00,
    min_stock_pieces: 25,
  },
  {
    id: 'inv-005',
    pharmacy_id: 'ph-001',
    medicine_id: 'med-004',
    batch_id: 'batch-005',
    pieces_per_strip: 10,
    total_pieces: 190, // 19 strips, 0 loose
    price_per_piece: 4.50,
    price_per_strip: 45.00,
    min_stock_pieces: 20,
  },
  {
    id: 'inv-006',
    pharmacy_id: 'ph-001',
    medicine_id: 'med-005',
    batch_id: 'batch-006',
    pieces_per_strip: 5,
    total_pieces: 10, // Expired batch
    price_per_piece: 24.00,
    price_per_strip: 120.00,
    min_stock_pieces: 15,
  },
];

export const INITIAL_SALES = [
  {
    id: 'sale-001',
    pharmacy_id: 'ph-001',
    sale_number: 'SALE-20261029-44120',
    customer_id: 'cust-001',
    customer_name: 'Arun Nair',
    customer_phone: '9876543210',
    customer_email: 'arun.nair.test@gmail.com',
    subtotal: 96.00,
    discount_amount: 0,
    tax_amount: 0,
    total_amount: 96.00,
    payment_method: 'UPI',
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    items: [
      {
        medicine_name: 'Dolo 650',
        batch_number: 'DL-7712E',
        unit_type: 'strip',
        quantity_units: 3,
        pieces_count: 45,
        unit_price: 32.00,
        total_price: 96.00,
      }
    ]
  }
];

export const INITIAL_INVOICES = [
  {
    id: 'inv-rec-001',
    pharmacy_id: 'ph-001',
    sale_id: 'sale-001',
    invoice_number: 'INV-20261029-44120',
    customer_name: 'Arun Nair',
    customer_phone: '9876543210',
    customer_email: 'arun.nair.test@gmail.com',
    total_amount: 96.00,
    status: 'emailed',
    pdf_url: null,
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
  }
];

export const INITIAL_STOCK_MOVEMENTS = [
  {
    id: 'sm-001',
    pharmacy_id: 'ph-001',
    medicine_name: 'Dolo 650',
    batch_number: 'DL-8941A',
    movement_type: 'initial_stock',
    pieces_quantity: 150,
    balance_after: 150,
    reference_id: 'INIT-001',
    notes: 'Opening stock count',
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'sm-002',
    pharmacy_id: 'ph-001',
    medicine_name: 'Dolo 650',
    batch_number: 'DL-7712E',
    movement_type: 'initial_stock',
    pieces_quantity: 83,
    balance_after: 83,
    reference_id: 'INIT-002',
    notes: 'Opening stock count',
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'sm-003',
    pharmacy_id: 'ph-001',
    medicine_name: 'Dolo 650',
    batch_number: 'DL-7712E',
    movement_type: 'sale',
    pieces_quantity: -45,
    balance_after: 38,
    reference_id: 'SALE-20261029-44120',
    notes: 'Sold 3 strip(s)',
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
];

// Local state accessor & mutator
export const getLocalStore = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = {
        pharmacy: INITIAL_PHARMACY,
        pharmacies: [INITIAL_PHARMACY, INITIAL_PHARMACY_2],
        suppliers: INITIAL_SUPPLIERS,
        customers: INITIAL_CUSTOMERS,
        medicines: INITIAL_MEDICINES,
        batches: INITIAL_BATCHES,
        inventory: INITIAL_INVENTORY,
        sales: INITIAL_SALES,
        invoices: INITIAL_INVOICES,
        stock_movements: INITIAL_STOCK_MOVEMENTS,
        email_logs: [
          {
            id: 'el-001',
            invoice_id: 'inv-rec-001',
            recipient_email: 'arun.nair.test@gmail.com',
            status: 'sent',
            resend_id: 're_mock_982348',
            created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
          }
        ],
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('LocalStore read error:', e);
    return {
      pharmacy: INITIAL_PHARMACY,
      pharmacies: [INITIAL_PHARMACY, INITIAL_PHARMACY_2],
      suppliers: INITIAL_SUPPLIERS,
      customers: INITIAL_CUSTOMERS,
      medicines: INITIAL_MEDICINES,
      batches: INITIAL_BATCHES,
      inventory: INITIAL_INVENTORY,
      sales: INITIAL_SALES,
      invoices: INITIAL_INVOICES,
      stock_movements: INITIAL_STOCK_MOVEMENTS,
      email_logs: [],
    };
  }
};

export const saveLocalStore = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('LocalStore save error:', e);
  }
};

export const resetLocalStore = () => {
  localStorage.removeItem(STORAGE_KEY);
  return getLocalStore();
};
