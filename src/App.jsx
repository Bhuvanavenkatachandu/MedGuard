import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { PharmacyProvider, usePharmacy } from './context/PharmacyContext';
import { CustomerDiscovery } from './components/customer/CustomerDiscovery';
import { PharmacistLogin } from './components/auth/PharmacistLogin';
import { PharmacistRegister } from './components/auth/PharmacistRegister';
import { PharmacySetup } from './components/auth/PharmacySetup';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { PharmacistLayout } from './components/layout/PharmacistLayout';
import { Dashboard } from './components/dashboard/Dashboard';
import { InventoryList } from './components/inventory/InventoryList';
import { AddStock } from './components/inventory/AddStock';
import { AiScanner } from './components/ai/AiScanner';
import { PointOfSale } from './components/pos/PointOfSale';
import { ExpiryManagement } from './components/inventory/ExpiryManagement';
import { CustomerManagement } from './components/customers/CustomerManagement';
import { SupplierManagement } from './components/suppliers/SupplierManagement';
import { InvoiceList } from './components/invoices/InvoiceList';
import { Reports } from './components/reports/Reports';
import { StockMovements } from './components/movements/StockMovements';

/**
 * Pharmacist Portal Shell
 * Wraps all protected pharmacist views inside PharmacistLayout
 */
const PharmacistPortal = ({ activeTab }) => {
  const navigate = useNavigate();
  const [scanPrefillData, setScanPrefillData] = useState(null);

  const handleTabChange = (tabId) => {
    navigate(`/pharmacist/${tabId}`);
  };

  const handleProceedToAddStock = (scannedData) => {
    setScanPrefillData(scannedData);
    navigate('/pharmacist/add-stock');
  };

  return (
    <PharmacistLayout
      activeTab={activeTab}
      setActiveTab={handleTabChange}
      onSwitchToCustomer={() => navigate('/')}
    >
      {activeTab === 'dashboard' && (
        <Dashboard setActiveTab={handleTabChange} />
      )}

      {activeTab === 'pos' && (
        <PointOfSale />
      )}

      {activeTab === 'inventory' && (
        <InventoryList setActiveTab={handleTabChange} />
      )}

      {activeTab === 'ai-scanner' && (
        <AiScanner onProceedToAddStock={handleProceedToAddStock} />
      )}

      {activeTab === 'add-stock' && (
        <AddStock
          initialData={scanPrefillData}
          onDone={() => {
            setScanPrefillData(null);
            navigate('/pharmacist/inventory');
          }}
          onGoToScanner={() => navigate('/pharmacist/ai-scanner')}
        />
      )}

      {activeTab === 'expiry' && (
        <ExpiryManagement setActiveTab={handleTabChange} />
      )}

      {activeTab === 'customers' && (
        <CustomerManagement />
      )}

      {activeTab === 'suppliers' && (
        <SupplierManagement />
      )}

      {activeTab === 'invoices' && (
        <InvoiceList />
      )}

      {activeTab === 'reports' && (
        <Reports />
      )}

      {activeTab === 'movements' && (
        <StockMovements />
      )}
    </PharmacistLayout>
  );
};

export default function App() {
  return (
    <PharmacyProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Customer Route (Zero Login Required) */}
          <Route path="/" element={<CustomerDiscovery />} />

          {/* Pharmacist Authentication Routes */}
          <Route path="/pharmacist/login" element={<PharmacistLogin />} />
          <Route path="/pharmacist/register" element={<PharmacistRegister />} />

          {/* Step 2 & 3: Pharmacy Details & Location Setup (Protected) */}
          <Route
            path="/pharmacist/setup"
            element={
              <ProtectedRoute>
                <PharmacySetup />
              </ProtectedRoute>
            }
          />

          {/* Protected Pharmacist Operations */}
          <Route
            path="/pharmacist/dashboard"
            element={
              <ProtectedRoute>
                <PharmacistPortal activeTab="dashboard" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pharmacist/pos"
            element={
              <ProtectedRoute>
                <PharmacistPortal activeTab="pos" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pharmacist/inventory"
            element={
              <ProtectedRoute>
                <PharmacistPortal activeTab="inventory" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pharmacist/ai-scanner"
            element={
              <ProtectedRoute>
                <PharmacistPortal activeTab="ai-scanner" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pharmacist/add-stock"
            element={
              <ProtectedRoute>
                <PharmacistPortal activeTab="add-stock" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pharmacist/expiry"
            element={
              <ProtectedRoute>
                <PharmacistPortal activeTab="expiry" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pharmacist/customers"
            element={
              <ProtectedRoute>
                <PharmacistPortal activeTab="customers" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pharmacist/suppliers"
            element={
              <ProtectedRoute>
                <PharmacistPortal activeTab="suppliers" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pharmacist/invoices"
            element={
              <ProtectedRoute>
                <PharmacistPortal activeTab="invoices" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pharmacist/reports"
            element={
              <ProtectedRoute>
                <PharmacistPortal activeTab="reports" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pharmacist/movements"
            element={
              <ProtectedRoute>
                <PharmacistPortal activeTab="movements" />
              </ProtectedRoute>
            }
          />

          {/* Redirects */}
          <Route path="/pharmacist" element={<Navigate to="/pharmacist/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </PharmacyProvider>
  );
}
