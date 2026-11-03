import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { PharmacyProvider } from './context/PharmacyContext';
import { LandingPage } from './components/landing/LandingPage';
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
import { PharmacistChat } from './components/chat/PharmacistChat';
import { KnowledgeBase } from './components/knowledge/KnowledgeBase';

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
      onSwitchToCustomer={() => navigate('/find-medicine')}
    >
      {activeTab === 'dashboard' && (
        <Dashboard setActiveTab={handleTabChange} />
      )}

      {activeTab === 'pos' && (
        <PointOfSale onSaleComplete={() => handleTabChange('dashboard')} />
      )}

      {activeTab === 'inventory' && (
        <InventoryList setActiveTab={handleTabChange} />
      )}

      {activeTab === 'ai-chat' && (
        <PharmacistChat />
      )}

      {activeTab === 'knowledge-base' && (
        <KnowledgeBase />
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
          {/* Public Landing Page */}
          <Route path="/" element={<LandingPage />} />

          {/* Public Customer Medicine Discovery Route */}
          <Route path="/find-medicine" element={<CustomerDiscovery />} />
          <Route path="/customer" element={<Navigate to="/find-medicine" replace />} />

          {/* Pharmacist Authentication Routes */}
          <Route path="/pharmacist/login" element={<PharmacistLogin />} />
          <Route path="/pharmacist/register" element={<PharmacistRegister />} />

          {/* Pharmacy Details & Location Setup (Protected) */}
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
            path="/pharmacist/ai-chat"
            element={
              <ProtectedRoute>
                <PharmacistPortal activeTab="ai-chat" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pharmacist/knowledge-base"
            element={
              <ProtectedRoute>
                <PharmacistPortal activeTab="knowledge-base" />
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
