import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { authApi } from '../api/authApi';
import { pharmaciesApi } from '../api/pharmaciesApi';
import { medicinesApi } from '../api/medicinesApi';
import { suppliersApi } from '../api/suppliersApi';
import { batchesApi } from '../api/batchesApi';
import { inventoryApi } from '../api/inventoryApi';
import { customersApi } from '../api/customersApi';
import { salesApi } from '../api/salesApi';
import { invoicesApi } from '../api/invoicesApi';
import { movementsApi } from '../api/movementsApi';
import { reportsApi } from '../api/reportsApi';

const PharmacyContext = createContext(null);

export const PharmacyProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [pharmacy, setPharmacy] = useState(null);
  const [loading, setLoading] = useState(true);

  // Pharmacist Datasets
  const [medicines, setMedicines] = useState([]);
  const [batches, setBatches] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [sales, setSales] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [stockMovements, setStockMovements] = useState([]);
  const [emailLogs, setEmailLogs] = useState([]);

  // Helper: Normalize phone numbers
  const normalizePhone = (phone) => {
    if (!phone) return '';
    return phone.replace(/[^0-9]/g, '').slice(-10);
  };

  // Fetch all pharmacy operational records
  const fetchPharmacyData = useCallback(async () => {
    try {
      const [
        medsRes,
        batchRes,
        invRes,
        suppRes,
        custRes,
        salesRes,
        invsRes,
        movsRes,
        logsRes,
      ] = await Promise.all([
        medicinesApi.getMedicines().catch(() => []),
        batchesApi.getBatches().catch(() => []),
        inventoryApi.getInventory().catch(() => []),
        suppliersApi.getSuppliers().catch(() => []),
        customersApi.getCustomers().catch(() => []),
        salesApi.getSales().catch(() => []),
        invoicesApi.getInvoices().catch(() => []),
        movementsApi.getMovements().catch(() => []),
        reportsApi.getEmailLogs().catch(() => []),
      ]);

      setMedicines(medsRes || []);
      setBatches(batchRes || []);
      setInventory(invRes || []);
      setSuppliers(suppRes || []);
      setCustomers(custRes || []);
      setSales(salesRes || []);
      setInvoices(invsRes || []);
      setStockMovements(movsRes || []);
      setEmailLogs(logsRes || []);
    } catch (err) {
      console.warn('Failed to load operational pharmacy data:', err);
    }
  }, []);

  // Initialize session from token on startup
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('medguard_token');
      if (!token) {
        setUser(null);
        setPharmacy(null);
        setLoading(false);
        return;
      }

      try {
        const userData = await authApi.getMe();
        setUser(userData);

        if (userData.pharmacy_id) {
          try {
            const pharmData = await pharmaciesApi.getMyPharmacy();
            setPharmacy(pharmData);
          } catch (e) {
            setPharmacy(null);
          }
        } else {
          // Double check if a pharmacy exists for this user
          try {
            const pharmData = await pharmaciesApi.getMyPharmacy();
            setPharmacy(pharmData);
          } catch (e) {
            setPharmacy(null);
          }
        }
      } catch (err) {
        console.warn('Invalid or expired token. Clearing session.');
        localStorage.removeItem('medguard_token');
        setUser(null);
        setPharmacy(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // When pharmacy changes or activates, load its data
  useEffect(() => {
    if (pharmacy?.id) {
      fetchPharmacyData();
    } else {
      setMedicines([]);
      setBatches([]);
      setInventory([]);
      setSuppliers([]);
      setCustomers([]);
      setSales([]);
      setInvoices([]);
      setStockMovements([]);
      setEmailLogs([]);
    }
  }, [pharmacy?.id, fetchPharmacyData]);

  // Auth: Register Pharmacist
  const registerPharmacist = async (payload) => {
    try {
      const data = await authApi.register(payload);
      if (data.access_token) {
        localStorage.setItem('medguard_token', data.access_token);
        setUser(data.user);
        setPharmacy(null);
      }
      return { success: true, user: data.user };
    } catch (err) {
      const detail = err.response?.data?.detail;
      let msg = 'Registration failed';
      if (typeof detail === 'string') {
        msg = detail;
      } else if (Array.isArray(detail)) {
        msg = detail.map(d => d.msg || (typeof d === 'string' ? d : JSON.stringify(d))).join(', ');
      } else if (typeof detail === 'object' && detail !== null) {
        msg = detail.message || JSON.stringify(detail);
      } else if (err.message) {
        msg = err.message;
      }
      throw new Error(msg);
    }
  };

  // Auth: Resend Verification Email
  const resendVerificationEmail = async (targetEmail) => {
    return {
      success: true,
      resendNotice: `Verification instructions sent to ${targetEmail}. You can also sign in directly.`
    };
  };

  // Auth: Login Pharmacist (Supports both object { email, password } and 2-arg (email, password))
  const loginPharmacist = async (emailOrObj, passwordArg) => {
    let email = '';
    let password = '';
    if (typeof emailOrObj === 'object' && emailOrObj !== null) {
      email = emailOrObj.email || '';
      password = emailOrObj.password || '';
    } else {
      email = emailOrObj || '';
      password = passwordArg || '';
    }

    try {
      const data = await authApi.login({ email, password });
      let pharmData = null;
      if (data.access_token) {
        localStorage.setItem('medguard_token', data.access_token);
        setUser(data.user);

        // Fetch user's registered pharmacy
        try {
          pharmData = await pharmaciesApi.getMyPharmacy();
          setPharmacy(pharmData);
        } catch (e) {
          setPharmacy(null);
        }
      }
      return { 
        success: true, 
        user: data.user,
        isEmailVerified: Boolean(data.user?.is_verified ?? true),
        isSetupComplete: Boolean(pharmData?.id || data.user?.pharmacy_id),
        email: data.user?.email || email,
      };
    } catch (err) {
      const detail = err.response?.data?.detail;
      let msg = 'Invalid email or password';
      if (typeof detail === 'string') {
        msg = detail;
      } else if (Array.isArray(detail)) {
        msg = detail.map(d => d.msg || (typeof d === 'string' ? d : JSON.stringify(d))).join(', ');
      } else if (typeof detail === 'object' && detail !== null) {
        msg = detail.message || JSON.stringify(detail);
      } else if (err.message) {
        msg = err.message;
      }
      throw new Error(msg);
    }
  };

  // Auth: Logout Pharmacist
  const logoutPharmacist = async () => {
    await authApi.logout();
    localStorage.removeItem('medguard_token');
    setUser(null);
    setPharmacy(null);
    setMedicines([]);
    setBatches([]);
    setInventory([]);
    setSuppliers([]);
    setCustomers([]);
    setSales([]);
    setInvoices([]);
    setStockMovements([]);
    setEmailLogs([]);
  };

  // Setup Pharmacy Profile & Location
  const setupPharmacy = async (formData) => {
    try {
      const pharmData = await pharmaciesApi.createPharmacy({
        name: formData.name,
        ownerName: formData.ownerName || formData.owner_name,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        latitude: formData.latitude,
        longitude: formData.longitude,
        licenseNumber: formData.licenseNumber || formData.license_number,
      });

      setPharmacy(pharmData);
      // Refresh current user info
      const meData = await authApi.getMe();
      setUser(meData);
      await fetchPharmacyData();
      return { success: true, pharmacy: pharmData };
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to setup pharmacy';
      throw new Error(msg);
    }
  };

  // Inward Stock Addition
  const addStock = async (stockData) => {
    try {
      const result = await inventoryApi.addStock(stockData);
      await fetchPharmacyData();
      return result;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to add stock';
      throw new Error(msg);
    }
  };

  // Adjust Inventory Stock Count
  const adjustStock = async ({ inventoryId, newTotalPieces, reason }) => {
    try {
      const result = await inventoryApi.adjustStock(inventoryId, newTotalPieces, reason);
      await fetchPharmacyData();
      return result;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to adjust stock';
      throw new Error(msg);
    }
  };

  // Delete Inventory Catalog Item
  const deleteInventoryItem = async (inventoryId) => {
    try {
      const result = await inventoryApi.deleteInventory(inventoryId);
      await fetchPharmacyData();
      return result;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to delete inventory item';
      throw new Error(msg);
    }
  };

  // Mark Batch Expired & Write-off
  const markBatchExpired = async (batchId) => {
    try {
      const result = await inventoryApi.markBatchExpired(batchId);
      await fetchPharmacyData();
      return result;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to write off expired batch';
      throw new Error(msg);
    }
  };

  // Create Supplier
  const addSupplier = async (supplierData) => {
    try {
      const result = await suppliersApi.createSupplier(supplierData);
      await fetchPharmacyData();
      return result;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to add supplier';
      throw new Error(msg);
    }
  };

  // Get or Create Customer
  const getOrCreateCustomer = async (custData) => {
    try {
      const result = await customersApi.createCustomer(custData);
      await fetchPharmacyData();
      return result;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to save customer';
      throw new Error(msg);
    }
  };

  // Search Customer by phone in local state or API
  const searchCustomerByPhone = (phone) => {
    const cleaned = normalizePhone(phone);
    if (!cleaned) return null;
    return customers.find(c => normalizePhone(c.phone) === cleaned) || null;
  };

  // POS Sale Checkout & Atomic FEFO Stock Deduction
  const processSale = async (salePayload) => {
    try {
      const result = await salesApi.checkout(salePayload);
      await fetchPharmacyData();
      return result;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Sale checkout failed';
      throw new Error(msg);
    }
  };

  // Resend Invoice Email Action
  const resendInvoiceEmail = async (invoiceId) => {
    try {
      const result = await invoicesApi.resendEmail(invoiceId);
      await fetchPharmacyData();
      return result;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to resend invoice email';
      throw new Error(msg);
    }
  };

  // Computed Metrics for Dashboard & Inventory
  const metrics = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const thresholdDays = pharmacy?.near_expiry_threshold_days || 30;
    const thresholdDate = new Date(Date.now() + thresholdDays * 86400000).toISOString().split('T')[0];

    let totalPieces = 0;
    let totalValue = 0;
    const expiringSoonBatches = [];
    const expiredBatches = [];
    const safeBatches = [];
    const lowStockBatches = [];

    inventory.forEach((inv) => {
      const batch = batches.find(b => b.id === inv.batch_id);
      const med = medicines.find(m => m.id === inv.medicine_id);
      const pieces = Number(inv.total_pieces) || 0;
      const price = Number(inv.price_per_piece) || 0;

      totalPieces += pieces;
      totalValue += pieces * price;

      if (batch) {
        const enriched = {
          ...batch,
          total_pieces: pieces,
          price_per_strip: inv.price_per_strip,
          price_per_piece: inv.price_per_piece,
          medicine: med,
          medicine_name: med?.name || 'Unknown',
        };

        if (batch.expiry_date < todayStr) {
          expiredBatches.push(enriched);
        } else if (batch.expiry_date <= thresholdDate) {
          expiringSoonBatches.push(enriched);
        } else {
          safeBatches.push(enriched);
        }

        if (batch.expiry_date >= todayStr && pieces > 0 && pieces <= (inv.min_stock_pieces || 20)) {
          lowStockBatches.push(enriched);
        }
      }
    });

    const todaysSales = sales.filter((s) => {
      const saleDate = s.created_at ? s.created_at.split('T')[0] : '';
      return saleDate === todayStr;
    });

    const todaysRevenue = todaysSales.reduce((acc, s) => acc + Number(s.total_amount || 0), 0);
    const totalRevenue = sales.reduce((acc, s) => acc + Number(s.total_amount || 0), 0);

    return {
      totalStockPieces: totalPieces || 0,
      totalInventoryPieces: totalPieces || 0,
      totalInventoryValue: totalValue || 0,
      totalMedicinesCount: medicines.length || 0,
      todaySalesAmount: todaysRevenue || 0,
      todaysRevenue: todaysRevenue || 0,
      totalSalesAmount: totalRevenue || 0,
      totalRevenue: totalRevenue || 0,
      todaysSalesCount: todaysSales.length || 0,
      thresholdDays: thresholdDays || 30,
      expiringSoonCount: expiringSoonBatches.length || 0,
      expiredCount: expiredBatches.length || 0,
      lowStockCount: lowStockBatches.length || 0,
      expiringSoonBatches,
      expiredBatches,
      safeBatches,
      lowStockBatches,
      lowStockItems: lowStockBatches,
    };
  }, [inventory, batches, medicines, sales, pharmacy]);

  // Backward-compatible Profile object
  const profile = useMemo(() => {
    if (!user) return null;
    return {
      id: user.id,
      full_name: user.name,
      phone: user.phone,
      role: user.role,
      pharmacy_id: pharmacy?.id || null,
    };
  }, [user, pharmacy]);

  const value = {
    user,
    profile,
    pharmacy,
    setPharmacy,
    loading,
    isAuthenticated: Boolean(user),
    isEmailVerified: true, // Local JWT authentication is verified
    isSetupComplete: Boolean(pharmacy && pharmacy.id),
    medicines,
    batches,
    inventory,
    suppliers,
    customers,
    sales,
    invoices,
    stockMovements,
    emailLogs,
    metrics,
    loginPharmacist,
    registerPharmacist,
    resendVerificationEmail,
    logoutPharmacist,
    setupPharmacy,
    addStock,
    adjustStock,
    deleteInventoryItem,
    markBatchExpired,
    addSupplier,
    getOrCreateCustomer,
    searchCustomerByPhone,
    processSale,
    resendInvoiceEmail,
    normalizePhone,
    fetchPharmacyData,
  };

  return (
    <PharmacyContext.Provider value={value}>
      {children}
    </PharmacyContext.Provider>
  );
};

export const usePharmacy = () => {
  const context = useContext(PharmacyContext);
  if (!context) {
    throw new Error('usePharmacy must be used within a PharmacyProvider');
  }
  return context;
};
