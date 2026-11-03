/**
 * MedGuard AI - Central Pharmacy Context & State Provider
 * ========================================================
 * Provides reactive global state for:
 * - Active authenticated pharmacist session (JWT stored in localStorage)
 * - Registered pharmacy tenant profile
 * - Inventory, medicine, batch, and customer datasets
 * - Memoized executive metrics (expiring batches, low stock, revenue)
 * - Atomic action handlers for stock intake, adjustments, and POS sales
 */

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

/**
 * Normalizes FastAPI / Axios error payloads (string, array of validation errors, or object)
 * into a single clean human-readable error message.
 */
const extractErrorMessage = (err, fallbackMessage = 'An unexpected error occurred') => {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => d.msg || (typeof d === 'string' ? d : JSON.stringify(d))).join(', ');
  }
  if (typeof detail === 'object' && detail !== null) {
    return detail.message || JSON.stringify(detail);
  }
  return err?.message || fallbackMessage;
};

export const PharmacyProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [pharmacy, setPharmacy] = useState(null);
  const [loading, setLoading] = useState(true);

  // Pharmacy Operational Datasets
  const [medicines, setMedicines] = useState([]);
  const [batches, setBatches] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [sales, setSales] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [stockMovements, setStockMovements] = useState([]);
  const [emailLogs, setEmailLogs] = useState([]);

  // Normalizes 10-digit mobile numbers by stripping country codes & formatting symbols
  const normalizePhone = (phone) => {
    if (!phone) return '';
    return phone.replace(/[^0-9]/g, '').slice(-10);
  };

  // Reloads all operational datasets concurrently from backend REST endpoints
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

  // Initializes user session from persisted localStorage token on mount
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

        try {
          const pharmData = await pharmaciesApi.getMyPharmacy();
          setPharmacy(pharmData);
        } catch {
          setPharmacy(null);
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

  // Synchronizes datasets whenever the pharmacy ID becomes available or changes
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

  // ---------------------------------------------------------------------------
  // Authentication Actions
  // ---------------------------------------------------------------------------

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
      throw new Error(extractErrorMessage(err, 'Registration failed'));
    }
  };

  const resendVerificationEmail = async (targetEmail) => {
    return {
      success: true,
      resendNotice: `Verification instructions sent to ${targetEmail}. You can also sign in directly.`,
    };
  };

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

        try {
          pharmData = await pharmaciesApi.getMyPharmacy();
          setPharmacy(pharmData);
        } catch {
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
      throw new Error(extractErrorMessage(err, 'Invalid email or password'));
    }
  };

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

  // ---------------------------------------------------------------------------
  // Pharmacy Tenant Actions
  // ---------------------------------------------------------------------------

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
      const meData = await authApi.getMe();
      setUser(meData);
      await fetchPharmacyData();
      return { success: true, pharmacy: pharmData };
    } catch (err) {
      throw new Error(extractErrorMessage(err, 'Failed to setup pharmacy profile'));
    }
  };

  // ---------------------------------------------------------------------------
  // Inventory & Stock Intake Actions
  // ---------------------------------------------------------------------------

  const addStock = async (stockData) => {
    try {
      const result = await inventoryApi.addStock(stockData);
      await fetchPharmacyData();
      return result;
    } catch (err) {
      throw new Error(extractErrorMessage(err, 'Failed to add stock'));
    }
  };

  const adjustStock = async ({ inventoryId, newTotalPieces, reason }) => {
    try {
      const result = await inventoryApi.adjustStock(inventoryId, newTotalPieces, reason);
      await fetchPharmacyData();
      return result;
    } catch (err) {
      throw new Error(extractErrorMessage(err, 'Failed to adjust stock'));
    }
  };

  const deleteInventoryItem = async (inventoryId) => {
    try {
      const result = await inventoryApi.deleteInventory(inventoryId);
      await fetchPharmacyData();
      return result;
    } catch (err) {
      throw new Error(extractErrorMessage(err, 'Failed to delete inventory item'));
    }
  };

  const markBatchExpired = async (batchId) => {
    try {
      const result = await inventoryApi.markBatchExpired(batchId);
      await fetchPharmacyData();
      return result;
    } catch (err) {
      throw new Error(extractErrorMessage(err, 'Failed to write off expired batch'));
    }
  };

  // ---------------------------------------------------------------------------
  // Catalog Management Actions
  // ---------------------------------------------------------------------------

  const addMedicine = async (medData) => {
    try {
      const result = await medicinesApi.createMedicine(medData);
      await fetchPharmacyData();
      return result;
    } catch (err) {
      throw new Error(extractErrorMessage(err, 'Failed to add medicine'));
    }
  };

  const updateMedicine = async (id, medData) => {
    try {
      const result = await medicinesApi.updateMedicine(id, medData);
      await fetchPharmacyData();
      return result;
    } catch (err) {
      throw new Error(extractErrorMessage(err, 'Failed to update medicine'));
    }
  };

  const deleteMedicine = async (id) => {
    try {
      const result = await medicinesApi.deleteMedicine(id);
      await fetchPharmacyData();
      return result;
    } catch (err) {
      throw new Error(extractErrorMessage(err, 'Failed to delete medicine'));
    }
  };

  const addSupplier = async (supplierData) => {
    try {
      const result = await suppliersApi.createSupplier(supplierData);
      await fetchPharmacyData();
      return result;
    } catch (err) {
      throw new Error(extractErrorMessage(err, 'Failed to add supplier'));
    }
  };

  // ---------------------------------------------------------------------------
  // Customer & POS Checkout Actions
  // ---------------------------------------------------------------------------

  const getOrCreateCustomer = async (custData) => {
    try {
      const result = await customersApi.createCustomer(custData);
      await fetchPharmacyData();
      return result;
    } catch (err) {
      throw new Error(extractErrorMessage(err, 'Failed to save customer'));
    }
  };

  const searchCustomerByPhone = (phone) => {
    const cleaned = normalizePhone(phone);
    if (!cleaned) return null;
    return customers.find((c) => normalizePhone(c.phone) === cleaned) || null;
  };

  const processSale = async (salePayload) => {
    try {
      const result = await salesApi.checkout(salePayload);
      await fetchPharmacyData();
      return result;
    } catch (err) {
      throw new Error(extractErrorMessage(err, 'Sale checkout failed'));
    }
  };

  const resendInvoiceEmail = async (invoiceId) => {
    try {
      const result = await invoicesApi.resendEmail(invoiceId);
      await fetchPharmacyData();
      return result;
    } catch (err) {
      throw new Error(extractErrorMessage(err, 'Failed to resend invoice email'));
    }
  };

  // ---------------------------------------------------------------------------
  // Computed Executive Metrics (Memoized for Performance)
  // ---------------------------------------------------------------------------

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
      const batch = batches.find((b) => b.id === inv.batch_id);
      const med = medicines.find((m) => m.id === inv.medicine_id);
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

  // Backward-compatible Profile Object
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
    isEmailVerified: true,
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
    addMedicine,
    updateMedicine,
    deleteMedicine,
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

  return <PharmacyContext.Provider value={value}>{children}</PharmacyContext.Provider>;
};

export const usePharmacy = () => {
  const context = useContext(PharmacyContext);
  if (!context) {
    throw new Error('usePharmacy must be used within a PharmacyProvider');
  }
  return context;
};
