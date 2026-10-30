import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getLocalStore, saveLocalStore, resetLocalStore } from '../lib/mockStore';
import { generateInvoicePdf, uploadInvoicePdf } from '../utils/pdfGenerator';

const PharmacyContext = createContext(null);

export const PharmacyProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [pharmacy, setPharmacy] = useState(null);
  const [loading, setLoading] = useState(true);

  // Entities
  const [medicines, setMedicines] = useState([]);
  const [batches, setBatches] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [sales, setSales] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [stockMovements, setStockMovements] = useState([]);
  const [emailLogs, setEmailLogs] = useState([]);

  // Load initial state
  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          await loadSupabaseData(session.user.id);
        } else {
          // Fallback to local demo store so user can explore immediately
          loadLocalData();
        }
      } else {
        loadLocalData();
      }
    } catch (err) {
      console.warn('Initialization using local demo store due to:', err);
      loadLocalData();
    } finally {
      setLoading(false);
    }
  };

  const loadLocalData = () => {
    const store = getLocalStore();
    setPharmacy(store.pharmacy);
    setMedicines(store.medicines || []);
    setBatches(store.batches || []);
    setInventory(store.inventory || []);
    setSuppliers(store.suppliers || []);
    setCustomers(store.customers || []);
    setSales(store.sales || []);
    setInvoices(store.invoices || []);
    setStockMovements(store.stock_movements || []);
    setEmailLogs(store.email_logs || []);
    
    // Set a default demo profile for pharmacist
    setProfile({
      id: 'demo-user-1',
      full_name: 'Dr. Rajesh Sharma',
      role: 'pharmacist',
    });
  };

  const loadSupabaseData = async (userId) => {
    try {
      // 1. Load profile & pharmacy
      const { data: prof } = await supabase
        .from('profiles')
        .select('*, pharmacies(*)')
        .eq('id', userId)
        .single();

      if (prof) {
        setProfile(prof);
        if (prof.pharmacies) {
          setPharmacy(prof.pharmacies);
        }
      }

      // 2. Load collections
      const [
        { data: meds },
        { data: bts },
        { data: invs },
        { data: sups },
        { data: custs },
        { data: sls },
        { data: invcs },
        { data: movs },
      ] = await Promise.all([
        supabase.from('medicines').select('*'),
        supabase.from('batches').select('*, suppliers(name)'),
        supabase.from('inventory').select('*, medicines(*), batches(*)'),
        supabase.from('suppliers').select('*'),
        supabase.from('customers').select('*'),
        supabase.from('sales').select('*, sale_items(*), customers(*)').order('created_at', { ascending: false }),
        supabase.from('invoices').select('*').order('created_at', { ascending: false }),
        supabase.from('stock_movements').select('*, medicines(name), batches(batch_number)').order('created_at', { ascending: false }),
      ]);

      if (meds) setMedicines(meds);
      if (bts) setBatches(bts);
      if (invs) setInventory(invs);
      if (sups) setSuppliers(sups);
      if (custs) setCustomers(custs);
      if (sls) setSales(sls);
      if (invcs) setInvoices(invcs);
      if (movs) setStockMovements(movs);
    } catch (err) {
      console.error('Error loading Supabase data, falling back to local store:', err);
      loadLocalData();
    }
  };

  // Sync to local store when in demo mode
  const syncLocalStore = (override = {}) => {
    const current = {
      pharmacy,
      medicines,
      batches,
      inventory,
      suppliers,
      customers,
      sales,
      invoices,
      stock_movements: stockMovements,
      email_logs: emailLogs,
      ...override,
    };
    saveLocalStore(current);
  };

  // ==========================================
  // CUSTOMER LOOKUP & NORMALIZATION
  // ==========================================
  const normalizePhone = (rawPhone) => {
    if (!rawPhone) return '';
    // Strip non-digits and leading +91 or 0
    let cleaned = rawPhone.toString().replace(/\D/g, '');
    if (cleaned.startsWith('91') && cleaned.length === 12) {
      cleaned = cleaned.substring(2);
    } else if (cleaned.startsWith('0') && cleaned.length === 11) {
      cleaned = cleaned.substring(1);
    }
    return cleaned;
  };

  const searchCustomerByPhone = (phone) => {
    const norm = normalizePhone(phone);
    if (!norm) return null;
    return customers.find(c => normalizePhone(c.phone) === norm) || null;
  };

  const getOrCreateCustomer = async ({ name, phone, email, address }) => {
    const normPhone = normalizePhone(phone);
    const existing = customers.find(c => normalizePhone(c.phone) === normPhone);
    if (existing) {
      // Update email if provided
      if (email && email !== existing.email) {
        const updated = { ...existing, email };
        const nextCustomers = customers.map(c => c.id === existing.id ? updated : c);
        setCustomers(nextCustomers);
        syncLocalStore({ customers: nextCustomers });
        return updated;
      }
      return existing;
    }

    const newCustomer = {
      id: `cust-${Date.now()}`,
      pharmacy_id: pharmacy?.id || 'ph-001',
      name: name?.trim() || 'Valued Patient',
      phone: normPhone,
      email: email?.trim() || '',
      address: address?.trim() || '',
      created_at: new Date().toISOString(),
    };

    const nextCustomers = [newCustomer, ...customers];
    setCustomers(nextCustomers);
    syncLocalStore({ customers: nextCustomers });

    if (isSupabaseConfigured && user) {
      try {
        await supabase.from('customers').insert(newCustomer);
      } catch (e) {
        console.warn('Customer Supabase insert fallback to local:', e);
      }
    }

    return newCustomer;
  };

  // ==========================================
  // INVENTORY & STOCK ADDITION
  // ==========================================
  const addStock = async ({
    medicine_name,
    generic_name,
    brand,
    strength,
    category,
    manufacturer,
    batch_number,
    supplier_id,
    manufacturing_date,
    expiry_date,
    pieces_per_strip,
    quantity_strips,
    price_per_strip,
    price_per_piece,
    min_stock_pieces,
  }) => {
    const pPerStrip = Number(pieces_per_strip) || 10;
    const stripsCount = Number(quantity_strips) || 0;
    const totalPiecesToAdd = stripsCount * pPerStrip;
    const pPerPieceCalc = price_per_piece 
      ? Number(price_per_piece) 
      : (Number(price_per_strip) / pPerStrip);

    // 1. Find or create Medicine
    let medicine = medicines.find(
      m => m.name.toLowerCase() === medicine_name.toLowerCase() && 
           (!strength || (m.strength || '').toLowerCase() === strength.toLowerCase())
    );

    let nextMedicines = [...medicines];
    if (!medicine) {
      medicine = {
        id: `med-${Date.now()}`,
        pharmacy_id: pharmacy?.id || 'ph-001',
        name: medicine_name,
        generic_name: generic_name || '',
        brand: brand || '',
        strength: strength || '',
        category: category || 'General',
        manufacturer: manufacturer || '',
        pieces_per_strip: pPerStrip,
        unit_of_measure: 'tablet',
      };
      nextMedicines = [medicine, ...nextMedicines];
      setMedicines(nextMedicines);
    }

    // 2. Find or create Batch
    let batch = batches.find(
      b => b.medicine_id === medicine.id && b.batch_number.toUpperCase() === batch_number.trim().toUpperCase()
    );

    let nextBatches = [...batches];
    if (!batch) {
      batch = {
        id: `batch-${Date.now()}`,
        pharmacy_id: pharmacy?.id || 'ph-001',
        medicine_id: medicine.id,
        supplier_id: supplier_id || null,
        batch_number: batch_number.trim().toUpperCase(),
        manufacturing_date: manufacturing_date || null,
        expiry_date: expiry_date,
        mrp_per_strip: Number(price_per_strip) || 0,
      };
      nextBatches = [batch, ...nextBatches];
      setBatches(nextBatches);
    }

    // 3. Find or update Inventory
    let existingInv = inventory.find(i => i.batch_id === batch.id);
    let nextInventory = [...inventory];
    let balanceAfter = totalPiecesToAdd;

    if (existingInv) {
      balanceAfter = existingInv.total_pieces + totalPiecesToAdd;
      nextInventory = nextInventory.map(i => 
        i.id === existingInv.id ? {
          ...i,
          total_pieces: balanceAfter,
          price_per_strip: Number(price_per_strip) || i.price_per_strip,
          price_per_piece: pPerPieceCalc,
          min_stock_pieces: min_stock_pieces !== undefined ? Number(min_stock_pieces) : i.min_stock_pieces,
        } : i
      );
    } else {
      const newInv = {
        id: `inv-${Date.now()}`,
        pharmacy_id: pharmacy?.id || 'ph-001',
        medicine_id: medicine.id,
        batch_id: batch.id,
        pieces_per_strip: pPerStrip,
        total_pieces: totalPiecesToAdd,
        price_per_strip: Number(price_per_strip) || 0,
        price_per_piece: pPerPieceCalc,
        min_stock_pieces: min_stock_pieces !== undefined ? Number(min_stock_pieces) : 20,
      };
      nextInventory = [newInv, ...nextInventory];
    }
    setInventory(nextInventory);

    // 4. Record stock movement
    const newMovement = {
      id: `sm-${Date.now()}`,
      pharmacy_id: pharmacy?.id || 'ph-001',
      medicine_name: medicine.name,
      batch_number: batch.batch_number,
      movement_type: 'stock_added',
      pieces_quantity: totalPiecesToAdd,
      balance_after: balanceAfter,
      reference_id: `INWARD-${batch.batch_number}`,
      notes: `Inward stock received: ${stripsCount} strip(s) (${totalPiecesToAdd} pieces)`,
      created_at: new Date().toISOString(),
    };

    const nextMovements = [newMovement, ...stockMovements];
    setStockMovements(nextMovements);

    // Persist to store
    syncLocalStore({
      medicines: nextMedicines,
      batches: nextBatches,
      inventory: nextInventory,
      stock_movements: nextMovements,
    });

    return {
      success: true,
      medicine,
      batch,
      totalPieces: totalPiecesToAdd,
    };
  };

  // ==========================================
  // ATOMIC SALE CHECKOUT & INVOICING
  // ==========================================
  const processSale = async ({
    customer_id,
    customer_data,
    items, // array of { medicine_id, batch_id, unit_type, quantity_units, pieces_count, unit_price, total_price, medicine_name, batch_number }
    subtotal,
    discount_amount = 0,
    tax_amount = 0,
    total_amount,
    payment_method = 'Cash',
    notes = '',
  }) => {
    // 1. Resolve customer
    let cust = null;
    if (customer_id) {
      cust = customers.find(c => c.id === customer_id);
    } else if (customer_data) {
      cust = await getOrCreateCustomer(customer_data);
    }

    // 2. Validate all stock and expiry before sale
    const today = new Date().toISOString().split('T')[0];
    for (const item of items) {
      const b = batches.find(x => x.id === item.batch_id);
      if (b && b.expiry_date < today) {
        throw new Error(`Cannot sell expired medicine from batch ${b.batch_number} (Expired on ${b.expiry_date})`);
      }

      const inv = inventory.find(x => x.batch_id === item.batch_id);
      if (!inv || inv.total_pieces < item.pieces_count) {
        throw new Error(`Insufficient stock for ${item.medicine_name}. Available: ${inv?.total_pieces || 0} pieces, requested: ${item.pieces_count} pieces.`);
      }
    }

    const saleNumber = `SALE-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(10000 + Math.random() * 90000)}`;
    const invoiceNumber = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(10000 + Math.random() * 90000)}`;

    // 3. Atomically update inventory & record movements
    let nextInventory = [...inventory];
    const newMovements = [];

    for (const item of items) {
      const invIndex = nextInventory.findIndex(x => x.batch_id === item.batch_id);
      if (invIndex !== -1) {
        const cur = nextInventory[invIndex];
        const newBalance = Math.max(0, cur.total_pieces - item.pieces_count);
        nextInventory[invIndex] = {
          ...cur,
          total_pieces: newBalance,
        };

        newMovements.push({
          id: `sm-${Date.now()}-${Math.random()}`,
          pharmacy_id: pharmacy?.id || 'ph-001',
          medicine_name: item.medicine_name,
          batch_number: item.batch_number,
          movement_type: 'sale',
          pieces_quantity: -item.pieces_count,
          balance_after: newBalance,
          reference_id: saleNumber,
          notes: `Sold ${item.quantity_units} ${item.unit_type}(s)`,
          created_at: new Date().toISOString(),
        });
      }
    }

    // 4. Create Sale Record
    const newSale = {
      id: `sale-${Date.now()}`,
      pharmacy_id: pharmacy?.id || 'ph-001',
      customer_id: cust?.id || null,
      customer_name: cust?.name || 'Walk-in Customer',
      customer_phone: cust?.phone || 'N/A',
      customer_email: cust?.email || '',
      sale_number: saleNumber,
      invoice_number: invoiceNumber,
      subtotal: Number(subtotal),
      discount_amount: Number(discount_amount),
      tax_amount: Number(tax_amount),
      total_amount: Number(total_amount),
      payment_method,
      notes,
      items,
      created_at: new Date().toISOString(),
    };

    // 5. Create Initial Invoice Record
    const newInvoice = {
      id: `inv-rec-${Date.now()}`,
      pharmacy_id: pharmacy?.id || 'ph-001',
      sale_id: newSale.id,
      invoice_number: invoiceNumber,
      customer_name: newSale.customer_name,
      customer_phone: newSale.customer_phone,
      customer_email: newSale.customer_email,
      total_amount: Number(total_amount),
      status: 'generated',
      pdf_url: null,
      created_at: new Date().toISOString(),
    };

    const nextSales = [newSale, ...sales];
    const nextInvoices = [newInvoice, ...invoices];
    const nextMovements = [...newMovements, ...stockMovements];

    setInventory(nextInventory);
    setSales(nextSales);
    setInvoices(nextInvoices);
    setStockMovements(nextMovements);

    syncLocalStore({
      inventory: nextInventory,
      sales: nextSales,
      invoices: nextInvoices,
      stock_movements: nextMovements,
    });

    // 6. Generate PDF Invoice & Attempt Background Email
    let pdfResult = null;
    let emailStatus = 'pending';
    let emailErrorMessage = null;

    try {
      pdfResult = generateInvoicePdf({
        pharmacy,
        sale: newSale,
        customer: cust,
        items,
      });

      // Upload PDF to Supabase Storage if configured
      if (pdfResult.blob) {
        const uploadRes = await uploadInvoicePdf(pdfResult.blob, invoiceNumber);
        if (uploadRes.success && uploadRes.publicUrl) {
          newInvoice.pdf_url = uploadRes.publicUrl;
        }
      }
    } catch (pdfErr) {
      console.warn('PDF generation notice:', pdfErr);
    }

    // 7. Dispatch Email via Supabase Edge Function if customer has email
    if (cust?.email && cust.email.includes('@')) {
      try {
        const emailRes = await triggerEmailInvoice({
          invoice_id: newInvoice.id,
          pharmacy_id: pharmacy?.id || 'ph-001',
          recipient_email: cust.email,
          customer_name: cust.name,
          invoice_number: invoiceNumber,
          total_amount: Number(total_amount),
          pharmacy_name: pharmacy?.name,
          pharmacy_phone: pharmacy?.phone,
          pharmacy_address: pharmacy?.address,
          items,
          pdf_url: newInvoice.pdf_url,
        });

        if (emailRes.success) {
          emailStatus = 'sent';
          newInvoice.status = 'emailed';
        } else {
          emailStatus = 'failed';
          emailErrorMessage = emailRes.error;
          newInvoice.status = 'email_failed';
        }
      } catch (emErr) {
        emailStatus = 'failed';
        emailErrorMessage = emErr.message;
        newInvoice.status = 'email_failed';
      }

      // Log email attempt
      const newEmailLog = {
        id: `el-${Date.now()}`,
        pharmacy_id: pharmacy?.id || 'ph-001',
        invoice_id: newInvoice.id,
        recipient_email: cust.email,
        status: emailStatus,
        error_message: emailErrorMessage,
        created_at: new Date().toISOString(),
      };
      setEmailLogs(prev => [newEmailLog, ...prev]);
    }

    // Save final updated invoice status
    setInvoices(prev => prev.map(inv => inv.id === newInvoice.id ? newInvoice : inv));
    syncLocalStore();

    return {
      success: true,
      sale: newSale,
      invoice: newInvoice,
      pdfResult,
      emailStatus,
      emailErrorMessage,
    };
  };

  // ==========================================
  // EMAIL DISPATCH VIA EDGE FUNCTION
  // ==========================================
  const triggerEmailInvoice = async (invoicePayload) => {
    if (!isSupabaseConfigured) {
      console.info('Mock mode: simulating email sent via Resend Edge Function to', invoicePayload.recipient_email);
      // Simulate success in demo mode
      return { success: true, status: 'sent', resend_id: 're_mock_sample' };
    }

    try {
      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/send-invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabase.supabaseKey,
        },
        body: JSON.stringify(invoicePayload),
      });

      const resData = await response.json();
      return resData;
    } catch (err) {
      console.error('Edge Function send-invoice network error:', err);
      return { success: false, error: err.message };
    }
  };

  const resendInvoiceEmail = async (invoiceId) => {
    const inv = invoices.find(i => i.id === invoiceId);
    if (!inv || !inv.customer_email) {
      throw new Error('Invoice or customer email not found.');
    }

    const sale = sales.find(s => s.id === inv.sale_id || s.sale_number === inv.invoice_number);

    const emailRes = await triggerEmailInvoice({
      invoice_id: inv.id,
      pharmacy_id: pharmacy?.id || 'ph-001',
      recipient_email: inv.customer_email,
      customer_name: inv.customer_name,
      invoice_number: inv.invoice_number,
      total_amount: inv.total_amount,
      pharmacy_name: pharmacy?.name,
      pharmacy_phone: pharmacy?.phone,
      pharmacy_address: pharmacy?.address,
      items: sale?.items || [],
      pdf_url: inv.pdf_url,
    });

    const newStatus = emailRes.success ? 'emailed' : 'email_failed';
    setInvoices(prev => prev.map(x => x.id === invoiceId ? { ...x, status: newStatus } : x));
    
    const newLog = {
      id: `el-${Date.now()}`,
      pharmacy_id: pharmacy?.id || 'ph-001',
      invoice_id: inv.id,
      recipient_email: inv.customer_email,
      status: emailRes.success ? 'sent' : 'failed',
      error_message: emailRes.error || null,
      created_at: new Date().toISOString(),
    };
    setEmailLogs(prev => [newLog, ...prev]);
    syncLocalStore();

    return emailRes;
  };

  // ==========================================
  // SUPPLIERS
  // ==========================================
  const addSupplier = (supplierData) => {
    const newSupplier = {
      id: `sup-${Date.now()}`,
      pharmacy_id: pharmacy?.id || 'ph-001',
      ...supplierData,
      created_at: new Date().toISOString(),
    };
    const next = [newSupplier, ...suppliers];
    setSuppliers(next);
    syncLocalStore({ suppliers: next });
    return newSupplier;
  };

  // ==========================================
  // STOCK ADJUSTMENT & EXPIRED REMOVAL
  // ==========================================
  const adjustStock = (inventoryId, newPiecesCount, reason = 'Inventory audit') => {
    const inv = inventory.find(i => i.id === inventoryId);
    if (!inv) return;

    const diff = newPiecesCount - inv.total_pieces;
    const med = medicines.find(m => m.id === inv.medicine_id);
    const bat = batches.find(b => b.id === inv.batch_id);

    const nextInv = inventory.map(i => i.id === inventoryId ? { ...i, total_pieces: Math.max(0, newPiecesCount) } : i);
    setInventory(nextInv);

    const movement = {
      id: `sm-${Date.now()}`,
      pharmacy_id: pharmacy?.id || 'ph-001',
      medicine_name: med?.name || 'Medicine',
      batch_number: bat?.batch_number || 'N/A',
      movement_type: 'adjustment',
      pieces_quantity: diff,
      balance_after: Math.max(0, newPiecesCount),
      reference_id: 'ADJ-MANUAL',
      notes: reason,
      created_at: new Date().toISOString(),
    };

    const nextMovs = [movement, ...stockMovements];
    setStockMovements(nextMovs);
    syncLocalStore({ inventory: nextInv, stock_movements: nextMovs });
  };

  const markBatchExpired = (batchId) => {
    const inv = inventory.find(i => i.batch_id === batchId);
    if (!inv) return;

    const med = medicines.find(m => m.id === inv.medicine_id);
    const bat = batches.find(b => b.id === batchId);
    const removedCount = inv.total_pieces;

    const nextInv = inventory.map(i => i.batch_id === batchId ? { ...i, total_pieces: 0 } : i);
    setInventory(nextInv);

    const movement = {
      id: `sm-${Date.now()}`,
      pharmacy_id: pharmacy?.id || 'ph-001',
      medicine_name: med?.name || 'Medicine',
      batch_number: bat?.batch_number || 'N/A',
      movement_type: 'expired_stock',
      pieces_quantity: -removedCount,
      balance_after: 0,
      reference_id: `EXP-BATCH-${bat?.batch_number}`,
      notes: `Written off expired batch stock (${removedCount} pieces)`,
      created_at: new Date().toISOString(),
    };

    const nextMovs = [movement, ...stockMovements];
    setStockMovements(nextMovs);
    syncLocalStore({ inventory: nextInv, stock_movements: nextMovs });
  };

  // ==========================================
  // REAL-TIME COMPUTED METRICS & ALERTS
  // ==========================================
  const todayStr = new Date().toISOString().split('T')[0];
  const thresholdDays = pharmacy?.near_expiry_threshold_days || 30;

  const totalSalesAmount = sales.reduce((acc, s) => acc + Number(s.total_amount || 0), 0);
  
  const todaySalesAmount = sales
    .filter(s => s.created_at?.startsWith(todayStr))
    .reduce((acc, s) => acc + Number(s.total_amount || 0), 0);

  const totalStockPieces = inventory.reduce((acc, i) => acc + Number(i.total_pieces || 0), 0);

  // Expiry groupings
  const todayDate = new Date();
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + thresholdDays);

  const expiredBatches = [];
  const expiringSoonBatches = [];
  const safeBatches = [];

  batches.forEach(b => {
    const exp = new Date(b.expiry_date);
    const inv = inventory.find(i => i.batch_id === b.id);
    const pieces = inv ? inv.total_pieces : 0;
    const med = medicines.find(m => m.id === b.medicine_id);

    const enriched = {
      ...b,
      medicine_name: med?.name || 'Unknown Medicine',
      generic_name: med?.generic_name,
      strength: med?.strength,
      total_pieces: pieces,
      available_strips: Math.floor(pieces / (inv?.pieces_per_strip || 10)),
      loose_pieces: pieces % (inv?.pieces_per_strip || 10),
      price_per_strip: inv?.price_per_strip || 0,
    };

    if (exp < todayDate) {
      expiredBatches.push(enriched);
    } else if (exp <= thresholdDate) {
      expiringSoonBatches.push(enriched);
    } else {
      safeBatches.push(enriched);
    }
  });

  // Low Stock Items
  const lowStockItems = inventory
    .filter(i => i.total_pieces > 0 && i.total_pieces <= (i.min_stock_pieces || 20))
    .map(i => {
      const med = medicines.find(m => m.id === i.medicine_id);
      const bat = batches.find(b => b.id === i.batch_id);
      return {
        ...i,
        medicine_name: med?.name || 'Unknown',
        strength: med?.strength,
        batch_number: bat?.batch_number,
        expiry_date: bat?.expiry_date,
        available_strips: Math.floor(i.total_pieces / i.pieces_per_strip),
        loose_pieces: i.total_pieces % i.pieces_per_strip,
      };
    });

  return (
    <PharmacyContext.Provider
      value={{
        user,
        profile,
        pharmacy,
        setPharmacy,
        loading,
        medicines,
        batches,
        inventory,
        suppliers,
        customers,
        sales,
        invoices,
        stockMovements,
        emailLogs,
        // Methods
        normalizePhone,
        searchCustomerByPhone,
        getOrCreateCustomer,
        addStock,
        processSale,
        resendInvoiceEmail,
        addSupplier,
        adjustStock,
        markBatchExpired,
        resetStore: () => {
          const fresh = resetLocalStore();
          loadLocalData();
        },
        // Metrics
        metrics: {
          totalSalesAmount,
          todaySalesAmount,
          totalMedicinesCount: medicines.length,
          totalStockPieces,
          lowStockCount: lowStockItems.length,
          expiringSoonCount: expiringSoonBatches.length,
          expiredCount: expiredBatches.length,
          expiredBatches,
          expiringSoonBatches,
          safeBatches,
          lowStockItems,
          thresholdDays,
        },
      }}
    >
      {children}
    </PharmacyContext.Provider>
  );
};

export const usePharmacy = () => {
  const ctx = useContext(PharmacyContext);
  if (!ctx) throw new Error('usePharmacy must be used within a PharmacyProvider');
  return ctx;
};
