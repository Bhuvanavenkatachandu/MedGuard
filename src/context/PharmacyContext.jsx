import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getLocalStore, saveLocalStore, resetLocalStore } from '../lib/mockStore';
import { generateInvoicePdf, uploadInvoicePdf } from '../utils/pdfGenerator';

const DEMO_AUTH_KEY = 'medguard_demo_auth_session';

const PharmacyContext = createContext(null);

export const PharmacyProvider = ({ children }) => {
  const [session, setSession] = useState(null);
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

    if (isSupabaseConfigured) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user || null);
        if (newSession?.user) {
          await loadSupabaseData(newSession.user.id);
        } else {
          setProfile(null);
          setPharmacy(null);
          loadPublicCatalog();
        }
      });

      return () => {
        subscription?.unsubscribe();
      };
    }
  }, []);

  const initApp = async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured) {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
        if (currentSession?.user) {
          setUser(currentSession.user);
          await loadSupabaseData(currentSession.user.id);
        } else {
          setUser(null);
          setProfile(null);
          setPharmacy(null);
          await loadPublicCatalog();
        }
      } else {
        // Check local demo auth session
        const demoAuthRaw = localStorage.getItem(DEMO_AUTH_KEY);
        const store = getLocalStore();

        if (demoAuthRaw) {
          try {
            const demoAuth = JSON.parse(demoAuthRaw);
            setUser(demoAuth.user);
            setProfile(demoAuth.profile);
            if (demoAuth.profile?.pharmacy_id) {
              setPharmacy(store.pharmacy);
              loadLocalCollections(store);
            } else {
              setPharmacy(null);
              loadLocalCollections(store);
            }
          } catch (e) {
            setUser(null);
            setProfile(null);
            setPharmacy(null);
            loadLocalCollections(store);
          }
        } else {
          // Unauthenticated customer discovery by default
          setUser(null);
          setProfile(null);
          setPharmacy(null);
          loadLocalCollections(store);
        }
      }
    } catch (err) {
      console.warn('Initialization notice:', err);
      const store = getLocalStore();
      loadLocalCollections(store);
    } finally {
      setLoading(false);
    }
  };

  const loadLocalCollections = (store) => {
    setMedicines(store.medicines || []);
    setBatches(store.batches || []);
    setInventory(store.inventory || []);
    setSuppliers(store.suppliers || []);
    setCustomers(store.customers || []);
    setSales(store.sales || []);
    setInvoices(store.invoices || []);
    setStockMovements(store.stock_movements || []);
    setEmailLogs(store.email_logs || []);
  };

  const loadPublicCatalog = async () => {
    try {
      const [
        { data: meds, error: medErr },
        { data: bts },
        { data: invs },
      ] = await Promise.all([
        supabase.from('medicines').select('*'),
        supabase.from('batches').select('*'),
        supabase.from('inventory').select('*'),
      ]);

      if (medErr || !meds || meds.length === 0) {
        const store = getLocalStore();
        loadLocalCollections(store);
      } else {
        setMedicines(meds);
        if (bts) setBatches(bts);
        if (invs) setInventory(invs);
      }
    } catch (e) {
      const store = getLocalStore();
      loadLocalCollections(store);
    }
  };

  const loadSupabaseData = async (userId) => {
    try {
      // 1. Load profile & linked pharmacy
      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('*, pharmacies(*)')
        .eq('id', userId)
        .single();

      if (prof) {
        setProfile(prof);
        if (prof.pharmacy_id && prof.pharmacies) {
          setPharmacy(prof.pharmacies);
        } else {
          setPharmacy(null);
        }
      }

      // 2. Load collections
      const [
        { data: meds, error: medErr },
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

      if (!medErr && meds && meds.length > 0) {
        setMedicines(meds);
        if (bts) setBatches(bts);
        if (invs) setInventory(invs);
        if (sups) setSuppliers(sups);
        if (custs) setCustomers(custs);
        if (sls) setSales(sls);
        if (invcs) setInvoices(invcs);
        if (movs) setStockMovements(movs);
      } else {
        const store = getLocalStore();
        loadLocalCollections(store);
      }
    } catch (err) {
      console.error('Error loading Supabase data:', err);
      const store = getLocalStore();
      loadLocalCollections(store);
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
  // AUTHENTICATION FLOWS (SUPABASE AUTH)
  // ==========================================
  
  /**
   * Step 1: Create Account
   * Registers user with Supabase Auth.
   * Does NOT set pharmacy_id. Sends user to Step 2 (Pharmacy Setup).
   */
  const registerPharmacist = async ({ fullName, email, phone, password }) => {
    if (!fullName || !email || !password) {
      throw new Error('Please fill in all required fields.');
    }

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone || '',
          }
        }
      });
      if (error) throw error;

      if (data.user) {
        setUser(data.user);
        // Create initial profile without pharmacy_id (setup incomplete!)
        const { data: profData } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            full_name: fullName,
            phone: phone || '',
            role: 'pharmacist',
            pharmacy_id: null,
          })
          .select()
          .single();

        setProfile(profData || { id: data.user.id, full_name: fullName, phone, role: 'pharmacist', pharmacy_id: null });
        setPharmacy(null);
        return { success: true, user: data.user };
      }
      return { success: true };
    } else {
      // Demo registration
      const demoUser = {
        id: `demo-user-${Date.now()}`,
        email,
      };
      const demoProfile = {
        id: demoUser.id,
        full_name: fullName,
        phone,
        role: 'pharmacist',
        pharmacy_id: null, // Setup incomplete!
      };

      const demoAuthSession = {
        user: demoUser,
        profile: demoProfile,
      };
      localStorage.setItem(DEMO_AUTH_KEY, JSON.stringify(demoAuthSession));

      setUser(demoUser);
      setProfile(demoProfile);
      setPharmacy(null);
      return { success: true, user: demoUser };
    }
  };

  /**
   * Step 2, 3 & 4: Pharmacy Setup & Location Confirmation
   * Creates the pharmacy and atomically associates it with the logged-in user.
   * Frontend CANNOT choose an arbitrary pharmacy_id.
   */
  const setupPharmacy = async ({
    name,
    ownerName,
    phone,
    email,
    address,
    city,
    state,
    pincode,
    licenseNumber,
    latitude,
    longitude,
  }) => {
    if (!name || !ownerName || !address || latitude === undefined || longitude === undefined) {
      throw new Error('Please provide all pharmacy details and confirm physical location.');
    }

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.rpc('create_pharmacy_for_pharmacist', {
        p_name: name,
        p_owner_name: ownerName,
        p_phone: phone || 'N/A',
        p_email: email || '',
        p_address: address,
        p_city: city || '',
        p_state: state || '',
        p_pincode: pincode || '',
        p_license_number: licenseNumber || '',
        p_latitude: parseFloat(latitude),
        p_longitude: parseFloat(longitude),
      });

      if (error) throw error;

      if (user?.id) {
        await loadSupabaseData(user.id);
      }
      return { success: true, pharmacyId: data?.pharmacy_id };
    } else {
      // Demo pharmacy setup
      const newPharmacy = {
        id: `ph-${Date.now()}`,
        name,
        owner_name: ownerName,
        phone: phone || '+91 98765 43210',
        email: email || '',
        address,
        city: city || 'Bengaluru',
        state: state || 'Karnataka',
        pincode: pincode || '560038',
        license_number: licenseNumber || 'DL-KA-2026-99999',
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        near_expiry_threshold_days: 30,
      };

      const updatedProfile = {
        ...profile,
        pharmacy_id: newPharmacy.id,
      };

      const demoAuthSession = {
        user,
        profile: updatedProfile,
      };
      localStorage.setItem(DEMO_AUTH_KEY, JSON.stringify(demoAuthSession));

      const store = getLocalStore();
      store.pharmacy = newPharmacy;
      store.pharmacies = [newPharmacy, ...(store.pharmacies || [])];
      saveLocalStore(store);

      setPharmacy(newPharmacy);
      setProfile(updatedProfile);
      loadLocalCollections(store);
      return { success: true, pharmacyId: newPharmacy.id };
    }
  };

  /**
   * Pharmacist Login
   * Uses Supabase Auth.
   * If setup incomplete -> returns isSetupComplete: false
   */
  const loginPharmacist = async (email, password) => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      setUser(data.user);
      setSession(data.session);

      // Check profile & pharmacy setup
      const { data: prof } = await supabase
        .from('profiles')
        .select('*, pharmacies(*)')
        .eq('id', data.user.id)
        .single();

      if (prof) {
        setProfile(prof);
        if (prof.pharmacy_id && prof.pharmacies) {
          setPharmacy(prof.pharmacies);
          await loadSupabaseData(data.user.id);
          return { success: true, isSetupComplete: true };
        } else {
          setPharmacy(null);
          return { success: true, isSetupComplete: false };
        }
      }
      return { success: true, isSetupComplete: false };
    } else {
      // Demo login
      const store = getLocalStore();
      const demoUser = { id: 'demo-user-1', email };
      const demoProfile = {
        id: demoUser.id,
        full_name: store.pharmacy?.owner_name || 'Dr. Rajesh Sharma',
        role: 'pharmacist',
        pharmacy_id: store.pharmacy?.id || 'ph-001',
      };
      const demoAuthSession = {
        user: demoUser,
        profile: demoProfile,
      };
      localStorage.setItem(DEMO_AUTH_KEY, JSON.stringify(demoAuthSession));

      setUser(demoUser);
      setProfile(demoProfile);
      setPharmacy(store.pharmacy);
      loadLocalCollections(store);
      return { success: true, isSetupComplete: true };
    }
  };

  /**
   * 1-Click Instant Demo Login for reviewers
   */
  const loginWithDemoSession = () => {
    const store = getLocalStore();
    const demoUser = { id: 'demo-user-1', email: 'pharmacist@apollo.io' };
    const demoProfile = {
      id: demoUser.id,
      full_name: 'Dr. Rajesh Sharma',
      role: 'pharmacist',
      pharmacy_id: store.pharmacy?.id || 'ph-001',
    };
    const demoAuthSession = {
      user: demoUser,
      profile: demoProfile,
    };
    localStorage.setItem(DEMO_AUTH_KEY, JSON.stringify(demoAuthSession));

    setUser(demoUser);
    setProfile(demoProfile);
    setPharmacy(store.pharmacy);
    loadLocalCollections(store);
    return { success: true, isSetupComplete: true };
  };

  /**
   * Logout
   */
  const logoutPharmacist = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem(DEMO_AUTH_KEY);
    setUser(null);
    setSession(null);
    setProfile(null);
    setPharmacy(null);
  };

  // Auth indicators
  const isAuthenticated = Boolean(user);
  const isSetupComplete = Boolean(user && profile && pharmacy && pharmacy.id && profile.pharmacy_id);

  // ==========================================
  // CUSTOMER LOOKUP & NORMALIZATION
  // ==========================================
  const normalizePhone = (rawPhone) => {
    if (!rawPhone) return '';
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

    syncLocalStore({
      medicines: nextMedicines,
      batches: nextBatches,
      inventory: nextInventory,
      stock_movements: nextMovements,
    });

    // Live Supabase Sync
    if (isSupabaseConfigured && user && pharmacy?.id) {
      try {
        const { data: dbMed } = await supabase.from('medicines').upsert({
          pharmacy_id: pharmacy.id,
          name: medicine_name,
          generic_name: generic_name || '',
          brand: brand || '',
          strength: strength || '',
          category: category || 'General',
          manufacturer: manufacturer || '',
          pieces_per_strip: pPerStrip,
          unit_of_measure: 'tablet',
        }, { onConflict: 'pharmacy_id,name,strength' }).select().single();

        const medId = dbMed?.id || medicine.id;

        const { data: dbBatch } = await supabase.from('batches').upsert({
          pharmacy_id: pharmacy.id,
          medicine_id: medId,
          supplier_id: supplier_id || null,
          batch_number: batch_number.trim().toUpperCase(),
          manufacturing_date: manufacturing_date || null,
          expiry_date: expiry_date,
          mrp_per_strip: Number(price_per_strip) || 0,
        }, { onConflict: 'pharmacy_id,medicine_id,batch_number' }).select().single();

        const batchId = dbBatch?.id || batch.id;

        await supabase.from('inventory').upsert({
          pharmacy_id: pharmacy.id,
          medicine_id: medId,
          batch_id: batchId,
          pieces_per_strip: pPerStrip,
          total_pieces: balanceAfter,
          price_per_strip: Number(price_per_strip) || 0,
          price_per_piece: pPerPieceCalc,
          min_stock_pieces: min_stock_pieces !== undefined ? Number(min_stock_pieces) : 20,
        }, { onConflict: 'pharmacy_id,batch_id' });

        await supabase.from('stock_movements').insert({
          pharmacy_id: pharmacy.id,
          medicine_id: medId,
          batch_id: batchId,
          movement_type: 'stock_added',
          pieces_quantity: totalPiecesToAdd,
          balance_after: balanceAfter,
          reference_id: `INWARD-${batch_number}`,
          notes: `Inward stock received: ${stripsCount} strip(s) (${totalPiecesToAdd} pieces)`,
        });
      } catch (e) {
        console.warn('Supabase addStock sync notice:', e);
      }
    }

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
    items,
    subtotal,
    discount_amount = 0,
    tax_amount = 0,
    total_amount,
    payment_method = 'Cash',
    notes = '',
  }) => {
    let cust = null;
    if (customer_id) {
      cust = customers.find(c => c.id === customer_id);
    } else if (customer_data) {
      cust = await getOrCreateCustomer(customer_data);
    }

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

    // Live Supabase Atomic Sale Execution
    if (isSupabaseConfigured && user && pharmacy?.id) {
      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('process_sale', {
          p_pharmacy_id: pharmacy.id,
          p_customer_id: cust?.id || null,
          p_pharmacist_id: profile?.id || user.id,
          p_items: items.map(it => ({
            medicine_id: it.medicine_id,
            batch_id: it.batch_id,
            unit_type: it.unit_type,
            quantity_units: it.quantity_units,
            pieces_count: it.pieces_count,
            unit_price: it.unit_price,
            total_price: it.total_price,
          })),
          p_subtotal: Number(subtotal),
          p_discount: Number(discount_amount),
          p_tax: Number(tax_amount),
          p_total: Number(total_amount),
          p_payment_method: payment_method,
          p_notes: notes || null,
        });

        if (rpcErr) throw rpcErr;

        if (rpcRes?.sale_id) {
          newSale.id = rpcRes.sale_id;
          newSale.sale_number = rpcRes.sale_number;
          newInvoice.id = rpcRes.invoice_id;
          newInvoice.invoice_number = rpcRes.invoice_number;
        }
      } catch (e) {
        console.warn('Supabase process_sale RPC notice:', e);
      }
    }

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

      if (pdfResult.blob) {
        const uploadRes = await uploadInvoicePdf(pdfResult.blob, invoiceNumber);
        if (uploadRes.success && uploadRes.publicUrl) {
          newInvoice.pdf_url = uploadRes.publicUrl;
        }
      }
    } catch (pdfErr) {
      console.warn('PDF generation notice:', pdfErr);
    }

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

  const triggerEmailInvoice = async (invoicePayload) => {
    if (!isSupabaseConfigured) {
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

      return await response.json();
    } catch (err) {
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

  const addSupplier = async (supplierData) => {
    const newSupplier = {
      id: `sup-${Date.now()}`,
      pharmacy_id: pharmacy?.id || 'ph-001',
      ...supplierData,
      created_at: new Date().toISOString(),
    };
    const next = [newSupplier, ...suppliers];
    setSuppliers(next);
    syncLocalStore({ suppliers: next });

    if (isSupabaseConfigured && user && pharmacy?.id) {
      try {
        const { data } = await supabase.from('suppliers').insert({
          pharmacy_id: pharmacy.id,
          name: supplierData.name,
          contact_person: supplierData.contact_person,
          phone: supplierData.phone,
          email: supplierData.email,
          address: supplierData.address,
          gst_number: supplierData.gst_number,
        }).select().single();
        if (data) {
          newSupplier.id = data.id;
        }
      } catch (e) {
        console.warn('Supabase addSupplier sync notice:', e);
      }
    }

    return newSupplier;
  };

  const adjustStock = async (inventoryId, newPiecesCount, reason = 'Inventory audit') => {
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

    if (isSupabaseConfigured && user && pharmacy?.id) {
      try {
        await supabase.from('inventory').update({
          total_pieces: Math.max(0, newPiecesCount),
          updated_at: new Date().toISOString(),
        }).eq('id', inventoryId);

        await supabase.from('stock_movements').insert({
          pharmacy_id: pharmacy.id,
          medicine_id: inv.medicine_id,
          batch_id: inv.batch_id,
          movement_type: 'adjustment',
          pieces_quantity: diff,
          balance_after: Math.max(0, newPiecesCount),
          reference_id: 'ADJ-MANUAL',
          notes: reason,
        });
      } catch (e) {
        console.warn('Supabase adjustStock sync notice:', e);
      }
    }
  };

  const markBatchExpired = async (batchId) => {
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

    if (isSupabaseConfigured && user && pharmacy?.id) {
      try {
        await supabase.from('inventory').update({
          total_pieces: 0,
          updated_at: new Date().toISOString(),
        }).eq('batch_id', batchId);

        await supabase.from('stock_movements').insert({
          pharmacy_id: pharmacy.id,
          medicine_id: inv.medicine_id,
          batch_id: batchId,
          movement_type: 'expired_stock',
          pieces_quantity: -removedCount,
          balance_after: 0,
          reference_id: `EXP-BATCH-${bat?.batch_number}`,
          notes: `Written off expired batch stock (${removedCount} pieces)`,
        });
      } catch (e) {
        console.warn('Supabase markBatchExpired sync notice:', e);
      }
    }
  };

  // Metrics
  const todayStr = new Date().toISOString().split('T')[0];
  const thresholdDays = pharmacy?.near_expiry_threshold_days || 30;

  const totalSalesAmount = sales.reduce((acc, s) => acc + Number(s.total_amount || 0), 0);
  const todaySalesAmount = sales
    .filter(s => s.created_at?.startsWith(todayStr))
    .reduce((acc, s) => acc + Number(s.total_amount || 0), 0);

  const totalStockPieces = inventory.reduce((acc, i) => acc + Number(i.total_pieces || 0), 0);

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
        session,
        user,
        profile,
        pharmacy,
        setPharmacy,
        loading,
        isAuthenticated,
        isSetupComplete,
        // Auth Methods
        registerPharmacist,
        setupPharmacy,
        loginPharmacist,
        loginWithDemoSession,
        logoutPharmacist,
        // Entities
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
          resetLocalStore();
          initApp();
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
