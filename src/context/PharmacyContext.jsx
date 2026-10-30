import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getLocalStore, saveLocalStore, resetLocalStore } from '../lib/mockStore';
import { generateInvoicePdf, uploadInvoicePdf } from '../utils/pdfGenerator';

const DEMO_AUTH_KEY = 'medguard_demo_auth_session';

const isValidUUID = (str) => {
  if (!str || typeof str !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
};

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const normalizeSale = (sale, medicinesMap = new Map(), batchesMap = new Map()) => {
  if (!sale) return sale;
  const cust = sale.customers || {};
  const rawItems = sale.sale_items || sale.items || [];
  const normalizedItems = rawItems.map(it => {
    const med = medicinesMap.get(it.medicine_id);
    const bat = batchesMap.get(it.batch_id);
    return {
      ...it,
      medicine_name: it.medicine_name || med?.name || 'Unknown Medicine',
      batch_number: it.batch_number || bat?.batch_number || 'N/A',
      expiry_date: it.expiry_date || bat?.expiry_date || 'N/A',
    };
  });

  return {
    ...sale,
    customer_name: cust.name || sale.customer_name || 'Walk-in Customer',
    customer_phone: cust.phone || sale.customer_phone || 'N/A',
    customer_email: cust.email || sale.customer_email || '',
    items: normalizedItems,
  };
};

const normalizeMovement = (m, medicinesMap = new Map(), batchesMap = new Map()) => {
  if (!m) return m;
  const med = m.medicines || (m.medicine_id ? medicinesMap.get(m.medicine_id) : null);
  const bat = m.batches || (m.batch_id ? batchesMap.get(m.batch_id) : null);
  return {
    ...m,
    medicine_name: m.medicine_name || med?.name || 'Unknown Medicine',
    batch_number: m.batch_number || bat?.batch_number || 'N/A',
  };
};

const normalizeInventoryItem = (inv, medicinesMap = new Map(), batchesMap = new Map()) => {
  if (!inv) return inv;
  const med = inv.medicines || (inv.medicine_id ? medicinesMap.get(inv.medicine_id) : null);
  const bat = inv.batches || (inv.batch_id ? batchesMap.get(inv.batch_id) : null);
  const pPerStrip = Number(inv.pieces_per_strip) || Number(med?.pieces_per_strip) || 10;
  const totalPieces = Number(inv.total_pieces) || 0;
  return {
    ...inv,
    pieces_per_strip: pPerStrip,
    total_pieces: totalPieces,
    available_strips: Math.floor(totalPieces / pPerStrip),
    loose_pieces: totalPieces % pPerStrip,
    medicine_name: med?.name || inv.medicine_name || 'Unknown Medicine',
    batch_number: bat?.batch_number || inv.batch_number || 'N/A',
    expiry_date: bat?.expiry_date || inv.expiry_date || 'N/A',
  };
};

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
          // Check local session before clearing
          const demoAuthRaw = localStorage.getItem(DEMO_AUTH_KEY);
          if (demoAuthRaw) {
            try {
              const demoAuth = JSON.parse(demoAuthRaw);
              setUser(demoAuth.user);
              setProfile(demoAuth.profile);
              const store = getLocalStore();
              if (demoAuth.profile?.pharmacy_id && store.pharmacy) {
                setPharmacy(store.pharmacy);
              }
              loadLocalCollections(store);
            } catch (e) {
              setProfile(null);
              setPharmacy(null);
              loadPublicCatalog();
            }
          } else {
            setProfile(null);
            setPharmacy(null);
            loadPublicCatalog();
          }
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
          // Check local session if no active Supabase Auth token
          const demoAuthRaw = localStorage.getItem(DEMO_AUTH_KEY);
          if (demoAuthRaw) {
            try {
              const demoAuth = JSON.parse(demoAuthRaw);
              setUser(demoAuth.user);
              setProfile(demoAuth.profile);
              const store = getLocalStore();
              if (demoAuth.profile?.pharmacy_id && store.pharmacy) {
                setPharmacy(store.pharmacy);
              } else {
                setPharmacy(null);
              }
              loadLocalCollections(store);
            } catch (e) {
              setUser(null);
              setProfile(null);
              setPharmacy(null);
              await loadPublicCatalog();
            }
          } else {
            setUser(null);
            setProfile(null);
            setPharmacy(null);
            await loadPublicCatalog();
          }
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

      if (medErr) {
        console.warn('Public catalog query error:', medErr);
        const store = getLocalStore();
        loadLocalCollections(store);
      } else {
        setMedicines(meds || []);
        setBatches(bts || []);
        setInventory(invs || []);
      }
    } catch (e) {
      console.warn('Public catalog load exception:', e);
      const store = getLocalStore();
      loadLocalCollections(store);
    }
  };

  const loadSupabaseData = async (userId, targetPharmacyId = null) => {
    try {
      let prof = null;
      let activePharmId = targetPharmacyId;

      // 1. Load profile & linked pharmacy if userId is provided
      if (userId && isValidUUID(userId)) {
        const { data: profData } = await supabase
          .from('profiles')
          .select('*, pharmacies(*)')
          .eq('id', userId)
          .maybeSingle();

        if (profData) {
          prof = profData;
          setProfile(profData);
          if (!activePharmId && profData.pharmacy_id) {
            activePharmId = profData.pharmacy_id;
          }
          if (profData.pharmacy_id && profData.pharmacies) {
            setPharmacy(profData.pharmacies);
          }
        }
      }

      if (!activePharmId && pharmacy?.id && isValidUUID(pharmacy.id)) {
        activePharmId = pharmacy.id;
      }

      // If active pharmacy object is not yet loaded, fetch it
      if (activePharmId && (!pharmacy || pharmacy.id !== activePharmId)) {
        const { data: phData } = await supabase
          .from('pharmacies')
          .select('*')
          .eq('id', activePharmId)
          .maybeSingle();
        if (phData) {
          setPharmacy(phData);
        }
      }

      // If no active pharmacy ID can be resolved, fall back to public catalog
      if (!activePharmId) {
        await loadPublicCatalog();
        return;
      }

      // 2. Load collections strictly scoped by active pharmacy
      const [
        { data: meds, error: medErr },
        { data: bts },
        { data: invs },
        { data: sups },
        { data: custs },
        { data: sls },
        { data: invcs },
        { data: movs },
        { data: elogs },
      ] = await Promise.all([
        supabase.from('medicines').select('*').eq('pharmacy_id', activePharmId),
        supabase.from('batches').select('*, suppliers(name)').eq('pharmacy_id', activePharmId),
        supabase.from('inventory').select('*, medicines(*), batches(*)').eq('pharmacy_id', activePharmId),
        supabase.from('suppliers').select('*').eq('pharmacy_id', activePharmId),
        supabase.from('customers').select('*').eq('pharmacy_id', activePharmId).order('created_at', { ascending: false }),
        supabase.from('sales').select('*, sale_items(*), customers(*)').eq('pharmacy_id', activePharmId).order('created_at', { ascending: false }),
        supabase.from('invoices').select('*').eq('pharmacy_id', activePharmId).order('created_at', { ascending: false }),
        supabase.from('stock_movements').select('*, medicines(name), batches(batch_number)').eq('pharmacy_id', activePharmId).order('created_at', { ascending: false }),
        supabase.from('email_logs').select('*').eq('pharmacy_id', activePharmId).order('created_at', { ascending: false }),
      ]);

      if (!medErr) {
        const finalMeds = meds || [];
        const finalBts = bts || [];
        const finalSups = sups || [];
        const finalCusts = custs || [];
        const finalInvcs = invcs || [];
        const finalElogs = elogs || [];

        // Build lookup maps for relational joining
        const medicinesMap = new Map(finalMeds.map(m => [m.id, m]));
        const batchesMap = new Map(finalBts.map(b => [b.id, b]));

        // Normalize relational structures so frontend UI always has clean, flat properties
        const normalizedSales = (sls || []).map(s => normalizeSale(s, medicinesMap, batchesMap));
        const normalizedMovements = (movs || []).map(m => normalizeMovement(m, medicinesMap, batchesMap));
        const normalizedInventory = (invs || []).map(i => normalizeInventoryItem(i, medicinesMap, batchesMap));

        setMedicines(finalMeds);
        setBatches(finalBts);
        setInventory(normalizedInventory);
        setSuppliers(finalSups);
        setCustomers(finalCusts);
        setSales(normalizedSales);
        setInvoices(finalInvcs);
        setStockMovements(normalizedMovements);
        setEmailLogs(finalElogs);

        // Keep local storage in sync as offline cache
        saveLocalStore({
          pharmacy: pharmacy?.id === activePharmId ? pharmacy : null,
          medicines: finalMeds,
          batches: finalBts,
          inventory: normalizedInventory,
          suppliers: finalSups,
          customers: finalCusts,
          sales: normalizedSales,
          invoices: finalInvcs,
          stock_movements: normalizedMovements,
          email_logs: finalElogs,
        });
      } else {
        console.warn('Supabase query error:', medErr);
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
      let createdPharmacyId = null;

      try {
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

        if (!error && data?.pharmacy_id) {
          createdPharmacyId = data.pharmacy_id;
        }
      } catch (rpcErr) {
        console.warn('RPC create_pharmacy_for_pharmacist notice:', rpcErr);
      }

      // Direct table insert fallback if RPC was not created in Supabase SQL editor
      if (!createdPharmacyId) {
        try {
          const { data: newPharm, error: phErr } = await supabase
            .from('pharmacies')
            .insert({
              name,
              owner_name: ownerName,
              phone: phone || '+91 98765 43210',
              email: email || '',
              address,
              city: city || 'Bengaluru',
              state: state || 'Karnataka',
              pincode: pincode || '',
              license_number: licenseNumber || 'DL-KA-2026-99999',
              latitude: parseFloat(latitude),
              longitude: parseFloat(longitude),
              near_expiry_threshold_days: 30,
            })
            .select()
            .single();

          if (phErr) throw phErr;
          createdPharmacyId = newPharm.id;

          if (user?.id) {
            await supabase.from('profiles').upsert({
              id: user.id,
              pharmacy_id: createdPharmacyId,
              full_name: ownerName,
              phone: phone || '',
              role: 'pharmacist',
            });
          }
        } catch (directErr) {
          console.error('Direct pharmacy creation fallback failed:', directErr);
          throw directErr;
        }
      }

      if (user?.id) {
        await loadSupabaseData(user.id);
      }
      return { success: true, pharmacyId: createdPharmacyId };
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
      // Local fallback login
      const store = getLocalStore();
      const demoUser = { id: 'user-local', email };
      const demoProfile = {
        id: demoUser.id,
        full_name: store.pharmacy?.owner_name || 'Pharmacist',
        role: 'pharmacist',
        pharmacy_id: store.pharmacy?.id || null,
      };
      const demoAuthSession = {
        user: demoUser,
        profile: demoProfile,
      };
      localStorage.setItem(DEMO_AUTH_KEY, JSON.stringify(demoAuthSession));

      setUser(demoUser);
      setProfile(demoProfile);
      setPharmacy(store.pharmacy || null);
      loadLocalCollections(store);
      return { success: true, isSetupComplete: Boolean(store.pharmacy?.id) };
    }
  };

  /**
   * Fast Local Login
   */
  const loginWithDemoSession = () => {
    const store = getLocalStore();
    const demoUser = { id: 'user-local', email: 'pharmacist@pharmacy.com' };
    const demoProfile = {
      id: demoUser.id,
      full_name: store.pharmacy?.owner_name || 'Pharmacist',
      role: 'pharmacist',
      pharmacy_id: store.pharmacy?.id || null,
    };
    const demoAuthSession = {
      user: demoUser,
      profile: demoProfile,
    };
    localStorage.setItem(DEMO_AUTH_KEY, JSON.stringify(demoAuthSession));

    setUser(demoUser);
    setProfile(demoProfile);
    setPharmacy(store.pharmacy || null);
    loadLocalCollections(store);
    return { success: true, isSetupComplete: Boolean(store.pharmacy?.id) };
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
    const activePharmacyId = (pharmacy?.id && isValidUUID(pharmacy.id)) 
      ? pharmacy.id 
      : (profile?.pharmacy_id && isValidUUID(profile.pharmacy_id) ? profile.pharmacy_id : null);

    // 1. Check in-memory customers state first
    let existing = customers.find(c => 
      (!activePharmacyId || c.pharmacy_id === activePharmacyId) && 
      normalizePhone(c.phone) === normPhone
    );

    // 2. If Supabase is connected and pharmacy ID is known, query or upsert in database
    if (isSupabaseConfigured && activePharmacyId) {
      try {
        const { data: dbExisting } = await supabase
          .from('customers')
          .select('*')
          .eq('pharmacy_id', activePharmacyId)
          .eq('phone', normPhone)
          .maybeSingle();

        if (dbExisting) {
          existing = dbExisting;
          const updates = {};
          if (email && email.trim() && email.trim() !== existing.email) {
            updates.email = email.trim();
          }
          if (name && name.trim() && name.trim() !== existing.name && existing.name === 'Walk-in Customer') {
            updates.name = name.trim();
          }
          if (address && address.trim() && address.trim() !== existing.address) {
            updates.address = address.trim();
          }

          if (Object.keys(updates).length > 0) {
            const { data: updatedDb } = await supabase
              .from('customers')
              .update(updates)
              .eq('id', existing.id)
              .select()
              .single();
            if (updatedDb) existing = updatedDb;
          }
        } else {
          // Customer does not exist in DB yet, insert
          const { data: dbCustomer, error: insertErr } = await supabase
            .from('customers')
            .insert({
              pharmacy_id: activePharmacyId,
              name: name?.trim() || 'Valued Patient',
              phone: normPhone,
              email: email?.trim() || null,
              address: address?.trim() || null,
            })
            .select()
            .single();

          if (!insertErr && dbCustomer) {
            existing = dbCustomer;
          } else if (insertErr) {
            console.warn('Customer insert conflict or notice:', insertErr);
            const { data: retryDb } = await supabase
              .from('customers')
              .select('*')
              .eq('pharmacy_id', activePharmacyId)
              .eq('phone', normPhone)
              .maybeSingle();
            if (retryDb) existing = retryDb;
          }
        }
      } catch (e) {
        console.warn('Customer DB resolution notice:', e);
      }
    }

    // 3. Fallback for demo / offline mode
    if (!existing) {
      existing = {
        id: generateUUID(),
        pharmacy_id: activePharmacyId || '00000000-0000-0000-0000-000000000001',
        name: name?.trim() || 'Valued Patient',
        phone: normPhone,
        email: email?.trim() || '',
        address: address?.trim() || '',
        created_at: new Date().toISOString(),
      };
    }

    const nextCustomers = [existing, ...customers.filter(c => c.id !== existing.id && normalizePhone(c.phone) !== normPhone)];
    setCustomers(nextCustomers);
    syncLocalStore({ customers: nextCustomers });

    return existing;
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

        await loadSupabaseData(user.id, pharmacy.id);
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
    const activePharmacyId = (pharmacy?.id && isValidUUID(pharmacy.id)) 
      ? pharmacy.id 
      : (profile?.pharmacy_id && isValidUUID(profile.pharmacy_id) ? profile.pharmacy_id : null);

    // 1. Resolve Customer
    let cust = null;
    if (customer_id && isValidUUID(customer_id)) {
      cust = customers.find(c => c.id === customer_id);
      if (!cust && isSupabaseConfigured && activePharmacyId) {
        const { data: dbCust } = await supabase
          .from('customers')
          .select('*')
          .eq('id', customer_id)
          .eq('pharmacy_id', activePharmacyId)
          .maybeSingle();
        if (dbCust) cust = dbCust;
      }
    }
    if (!cust && customer_data) {
      cust = await getOrCreateCustomer(customer_data);
    }

    // 2. Validate FEFO and inventory balance for each item
    const today = new Date().toISOString().split('T')[0];
    for (const item of items) {
      const b = batches.find(x => x.id === item.batch_id);
      if (b && b.expiry_date < today) {
        throw new Error(`Cannot sell expired medicine from batch ${b.batch_number} (Expired on ${b.expiry_date})`);
      }

      const inv = inventory.find(x => x.batch_id === item.batch_id);
      const availablePieces = inv ? Number(inv.total_pieces) : 0;
      const requestedPieces = Number(item.pieces_count);
      if (availablePieces < requestedPieces) {
        throw new Error(`Insufficient stock for ${item.medicine_name}. Available: ${availablePieces} pieces, requested: ${requestedPieces} pieces.`);
      }
    }

    const saleNumber = `SALE-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(10000 + Math.random() * 90000)}`;
    const invoiceNumber = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(10000 + Math.random() * 90000)}`;

    const saleId = generateUUID();
    const invoiceId = generateUUID();

    const newSale = {
      id: saleId,
      pharmacy_id: activePharmacyId || '00000000-0000-0000-0000-000000000001',
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
      id: invoiceId,
      pharmacy_id: activePharmacyId || '00000000-0000-0000-0000-000000000001',
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

    // 3. Supabase Live Atomic Sale Execution
    if (isSupabaseConfigured && activePharmacyId) {
      try {
        const validCustomerId = (cust?.id && isValidUUID(cust.id)) ? cust.id : null;
        const validPharmacistId = (profile?.id && isValidUUID(profile.id)) 
          ? profile.id 
          : (user?.id && isValidUUID(user.id) ? user.id : null);

        let rpcSuccess = false;
        try {
          const { data: rpcRes, error: rpcErr } = await supabase.rpc('process_sale', {
            p_pharmacy_id: activePharmacyId,
            p_customer_id: validCustomerId,
            p_pharmacist_id: validPharmacistId,
            p_items: items.map(it => ({
              medicine_id: (it.medicine_id && isValidUUID(it.medicine_id)) ? it.medicine_id : null,
              batch_id: (it.batch_id && isValidUUID(it.batch_id)) ? it.batch_id : null,
              unit_type: it.unit_type,
              quantity_units: Number(it.quantity_units),
              pieces_count: Number(it.pieces_count),
              unit_price: Number(it.unit_price),
              total_price: Number(it.total_price),
            })),
            p_subtotal: Number(subtotal),
            p_discount: Number(discount_amount),
            p_tax: Number(tax_amount),
            p_total: Number(total_amount),
            p_payment_method: payment_method,
            p_notes: notes || null,
          });

          if (!rpcErr && rpcRes?.sale_id) {
            newSale.id = rpcRes.sale_id;
            newSale.sale_number = rpcRes.sale_number;
            newInvoice.id = rpcRes.invoice_id;
            newInvoice.invoice_number = rpcRes.invoice_number;
            rpcSuccess = true;
          } else if (rpcErr) {
            console.warn('RPC process_sale error, proceeding to table fallback:', rpcErr);
          }
        } catch (rpcEx) {
          console.warn('RPC process_sale exception, trying table fallback:', rpcEx);
        }

        // Direct table insert fallback if RPC fails or is unavailable
        if (!rpcSuccess) {
          // A. Insert Sale Header
          const { data: saleData, error: saleErr } = await supabase.from('sales').insert({
            pharmacy_id: activePharmacyId,
            customer_id: validCustomerId,
            pharmacist_id: validPharmacistId,
            sale_number: saleNumber,
            subtotal: Number(subtotal),
            discount_amount: Number(discount_amount),
            tax_amount: Number(tax_amount),
            total_amount: Number(total_amount),
            payment_method,
            notes: notes || null,
          }).select().single();

          if (saleErr) throw saleErr;
          newSale.id = saleData.id;
          newSale.sale_number = saleData.sale_number;

          // B. Insert Sale Items, Deduct Inventory, Record Stock Movements
          for (const it of items) {
            const medId = (it.medicine_id && isValidUUID(it.medicine_id)) ? it.medicine_id : null;
            const batId = (it.batch_id && isValidUUID(it.batch_id)) ? it.batch_id : null;

            await supabase.from('sale_items').insert({
              sale_id: saleData.id,
              medicine_id: medId,
              batch_id: batId,
              unit_type: it.unit_type,
              quantity_units: Number(it.quantity_units),
              pieces_count: Number(it.pieces_count),
              unit_price: Number(it.unit_price),
              total_price: Number(it.total_price),
            });

            // Deduct inventory pieces
            const invMatch = inventory.find(x => x.batch_id === it.batch_id);
            const currentStock = invMatch ? Number(invMatch.total_pieces) : 0;
            const newBal = Math.max(0, currentStock - Number(it.pieces_count));

            await supabase.from('inventory')
              .update({ total_pieces: newBal, updated_at: new Date().toISOString() })
              .eq('batch_id', it.batch_id)
              .eq('pharmacy_id', activePharmacyId);

            // Record stock movement audit trail
            await supabase.from('stock_movements').insert({
              pharmacy_id: activePharmacyId,
              medicine_id: medId,
              batch_id: batId,
              movement_type: 'sale',
              pieces_quantity: -Number(it.pieces_count),
              balance_after: newBal,
              reference_id: saleData.sale_number,
              notes: `Sale checkout (${it.quantity_units} ${it.unit_type})`,
            });
          }

          // C. Insert Invoice
          const { data: invData, error: invErr } = await supabase.from('invoices').insert({
            pharmacy_id: activePharmacyId,
            sale_id: saleData.id,
            invoice_number: invoiceNumber,
            customer_name: newSale.customer_name,
            customer_phone: newSale.customer_phone,
            customer_email: newSale.customer_email,
            total_amount: Number(total_amount),
            status: 'generated',
          }).select().single();

          if (invData) {
            newInvoice.id = invData.id;
            newInvoice.invoice_number = invData.invoice_number;
          }
        }

        // CRITICAL STEP: IMMEDIATELY RELOAD DATABASE STATE!
        // This guarantees the database is the source of truth, updating:
        // - inventory (decreased total_pieces)
        // - sales (contains new sale with items and customer)
        // - invoices (contains new invoice)
        // - stock_movements (contains new audit trail entry)
        // - metrics (automatically recalculated!)
        // - customer purchase history (linked via sales)
        await loadSupabaseData(user?.id, activePharmacyId);
      } catch (e) {
        console.error('Supabase atomic sale transaction notice:', e);
        throw e;
      }
    } else {
      // Local / Demo mode fallback
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

      setInventory(nextInventory);
      setSales([newSale, ...sales]);
      setInvoices([newInvoice, ...invoices]);
      setStockMovements([...newMovements, ...stockMovements]);

      syncLocalStore({
        inventory: nextInventory,
        sales: [newSale, ...sales],
        invoices: [newInvoice, ...invoices],
        stock_movements: [...newMovements, ...stockMovements],
      });
    }

    // 4. Generate PDF Invoice & Upload
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
        const uploadRes = await uploadInvoicePdf(pdfResult.blob, newInvoice.invoice_number);
        if (uploadRes.success && uploadRes.publicUrl) {
          newInvoice.pdf_url = uploadRes.publicUrl;
          if (isSupabaseConfigured && newInvoice.id && isValidUUID(newInvoice.id)) {
            await supabase.from('invoices').update({ pdf_url: uploadRes.publicUrl }).eq('id', newInvoice.id);
          }
        }
      }
    } catch (pdfErr) {
      console.warn('PDF generation notice:', pdfErr);
    }

    // 5. Trigger Email Invoice if Customer Provided Email
    if (cust?.email && cust.email.includes('@')) {
      try {
        const emailRes = await triggerEmailInvoice({
          invoice_id: newInvoice.id,
          pharmacy_id: activePharmacyId || pharmacy?.id || 'ph-001',
          recipient_email: cust.email,
          customer_name: cust.name,
          invoice_number: newInvoice.invoice_number,
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
        if (isSupabaseConfigured && newInvoice.id && isValidUUID(newInvoice.id)) {
          await supabase.from('invoices').update({ status: newInvoice.status }).eq('id', newInvoice.id);
        }
      } catch (emErr) {
        emailStatus = 'failed';
        emailErrorMessage = emErr.message;
        newInvoice.status = 'email_failed';
      }

      const newEmailLog = {
        id: `el-${Date.now()}`,
        pharmacy_id: activePharmacyId || pharmacy?.id || 'ph-001',
        invoice_id: newInvoice.id,
        recipient_email: cust.email,
        status: emailStatus,
        error_message: emailErrorMessage,
        created_at: new Date().toISOString(),
      };
      setEmailLogs(prev => [newEmailLog, ...prev]);

      if (isSupabaseConfigured && activePharmacyId && newInvoice.id && isValidUUID(newInvoice.id)) {
        try {
          await supabase.from('email_logs').insert({
            pharmacy_id: activePharmacyId,
            invoice_id: newInvoice.id,
            recipient_email: cust.email,
            status: emailStatus === 'emailed' ? 'sent' : (emailStatus === 'email_failed' ? 'failed' : 'pending'),
            error_message: emailErrorMessage,
          });
        } catch (elErr) {
          console.warn('Could not record to email_logs in Supabase:', elErr);
        }
      }
    }

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
    // 1. Try Supabase Edge Function first if deployed
    if (isSupabaseConfigured) {
      try {
        const response = await fetch(`${supabase.supabaseUrl}/functions/v1/send-invoice`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabase.supabaseKey,
          },
          body: JSON.stringify(invoicePayload),
        });

        if (response.ok) {
          const data = await response.json();
          if (data && data.success) return data;
        }
      } catch (err) {
        console.warn('Edge function unreachable, falling back to direct Resend proxy...', err);
      }
    }

    // 2. Direct Resend proxy fallback (via Vite proxy configured with RESEND_API_KEY)
    try {
      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <div style="display: flex; align-items: center; border-bottom: 2px solid #0d9488; padding-bottom: 12px; margin-bottom: 20px;">
            <h2 style="color: #0f172a; margin: 0; font-size: 20px;">${invoicePayload.pharmacy_name || pharmacy?.name || 'MedGuard AI Pharmacy'}</h2>
          </div>
          <p style="color: #334155; font-size: 15px; margin: 0 0 12px;">Dear <strong>${invoicePayload.customer_name || 'Customer'}</strong>,</p>
          <p style="color: #64748b; font-size: 14px; margin: 0 0 20px;">Thank you for your purchase. Here is your official tax invoice details:</p>
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #64748b; font-size: 13px;">Invoice Number:</span>
              <strong style="color: #0f172a; font-size: 13px;">${invoicePayload.invoice_number || 'INV-001'}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #64748b; font-size: 13px;">Total Amount:</span>
              <strong style="color: #0d9488; font-size: 18px;">₹${Number(invoicePayload.total_amount || 0).toFixed(2)}</strong>
            </div>
          </div>
          ${invoicePayload.pdf_url ? `<div style="text-align: center; margin: 24px 0;"><a href="${invoicePayload.pdf_url}" style="background-color: #0d9488; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">Download Tax Invoice PDF</a></div>` : ''}
          <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
          <p style="font-size: 12px; color: #94a3b8; margin: 0; text-align: center;">Sent securely via MedGuard AI · Powered by Resend</p>
        </div>
      `;

      const res = await fetch('/api/resend/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'MedGuard AI <onboarding@resend.dev>',
          to: [invoicePayload.recipient_email],
          subject: `Tax Invoice ${invoicePayload.invoice_number || ''} from ${invoicePayload.pharmacy_name || pharmacy?.name || 'MedGuard AI'}`,
          html: emailHtml,
        }),
      });

      if (res.ok) {
        const resData = await res.json();
        return { success: true, status: 'sent', resend_id: resData.id };
      } else {
        const errData = await res.json().catch(() => ({}));
        return { success: false, status: 'failed', error: errData.message || `Resend HTTP ${res.status}` };
      }
    } catch (fallbackErr) {
      console.warn('Direct Resend proxy attempt failed:', fallbackErr);
      return { success: false, status: 'failed', error: fallbackErr.message };
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

    if (isSupabaseConfigured && pharmacy?.id && isValidUUID(inv.id)) {
      try {
        await supabase.from('invoices').update({ status: newStatus }).eq('id', inv.id);
        await supabase.from('email_logs').insert({
          pharmacy_id: pharmacy.id,
          invoice_id: inv.id,
          recipient_email: inv.customer_email,
          status: emailRes.success ? 'sent' : 'failed',
          error_message: emailRes.error || null,
        });
      } catch (elErr) {
        console.warn('Could not record to email_logs in Supabase:', elErr);
      }
    }
    syncLocalStore();

    return emailRes;
  };

  const addSupplier = async (supplierData) => {
    const newId = generateUUID();
    const activePharmacyId = (pharmacy?.id && isValidUUID(pharmacy.id)) ? pharmacy.id : null;

    let newSupplier = {
      id: newId,
      pharmacy_id: activePharmacyId || '00000000-0000-0000-0000-000000000001',
      ...supplierData,
      created_at: new Date().toISOString(),
    };
    const next = [newSupplier, ...suppliers];
    setSuppliers(next);
    syncLocalStore({ suppliers: next });

    if (isSupabaseConfigured && activePharmacyId) {
      try {
        const { data } = await supabase.from('suppliers').insert({
          pharmacy_id: activePharmacyId,
          name: supplierData.name,
          contact_person: supplierData.contact_person,
          phone: supplierData.phone,
          email: supplierData.email,
          address: supplierData.address,
          gst_number: supplierData.gst_number,
        }).select().single();
        if (data) {
          newSupplier = data;
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

        await loadSupabaseData(user.id, pharmacy.id);
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

        await loadSupabaseData(user.id, pharmacy.id);
      } catch (e) {
        console.warn('Supabase markBatchExpired sync notice:', e);
      }
    }
  };

  // Metrics
  const todayStr = new Date().toISOString().split('T')[0];
  const thresholdDays = pharmacy?.near_expiry_threshold_days || 30;

  const isSameDay = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() &&
           d.getMonth() === now.getMonth() &&
           d.getDate() === now.getDate();
  };

  const totalSalesAmount = sales.reduce((acc, s) => acc + Number(s.total_amount || 0), 0);
  const todaySalesAmount = sales
    .filter(s => isSameDay(s.created_at) || s.created_at?.startsWith(todayStr))
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
    .filter(i => Number(i.total_pieces || 0) <= Number(i.min_stock_pieces !== undefined && i.min_stock_pieces !== null ? i.min_stock_pieces : 20))
    .map(i => {
      const med = medicines.find(m => m.id === i.medicine_id);
      const bat = batches.find(b => b.id === i.batch_id);
      return {
        ...i,
        medicine_name: med?.name || 'Unknown',
        strength: med?.strength,
        batch_number: bat?.batch_number,
        expiry_date: bat?.expiry_date,
        available_strips: Math.floor(Number(i.total_pieces || 0) / (i.pieces_per_strip || 10)),
        loose_pieces: Number(i.total_pieces || 0) % (i.pieces_per_strip || 10),
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
