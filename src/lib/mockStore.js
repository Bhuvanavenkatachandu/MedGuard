// Clean Store State
// All sample test data removed — populate records via the application or Supabase

const STORAGE_KEY = 'medguard_state_v2';

export const INITIAL_PHARMACY = null;
export const INITIAL_PHARMACY_2 = null;
export const INITIAL_SUPPLIERS = [];
export const INITIAL_CUSTOMERS = [];
export const INITIAL_MEDICINES = [];
export const INITIAL_BATCHES = [];
export const INITIAL_INVENTORY = [];
export const INITIAL_SALES = [];
export const INITIAL_INVOICES = [];
export const INITIAL_STOCK_MOVEMENTS = [];

export const getLocalStore = () => {
  try {
    // Clear any previous mock storage keys from user's browser
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('medguard_demo_state_v1');
    }

    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) {
      const initial = {
        pharmacy: null,
        pharmacies: [],
        suppliers: [],
        customers: [],
        medicines: [],
        batches: [],
        inventory: [],
        sales: [],
        invoices: [],
        stock_movements: [],
        email_logs: [],
      };
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      }
      return initial;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('LocalStore read error:', e);
    return {
      pharmacy: null,
      pharmacies: [],
      suppliers: [],
      customers: [],
      medicines: [],
      batches: [],
      inventory: [],
      sales: [],
      invoices: [],
      stock_movements: [],
      email_logs: [],
    };
  }
};

export const saveLocalStore = (data) => {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  } catch (e) {
    console.error('LocalStore save error:', e);
  }
};

export const resetLocalStore = () => {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('medguard_demo_state_v1');
    localStorage.removeItem('medguard_demo_auth_session');
  }
  return getLocalStore();
};
