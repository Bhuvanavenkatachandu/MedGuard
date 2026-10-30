import React, { useState } from 'react';
import { PharmacyProvider, usePharmacy } from './context/PharmacyContext';
import { CustomerDiscovery } from './components/customer/CustomerDiscovery';
import { PharmacistAuth } from './components/auth/PharmacistAuth';
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

const MainApp = () => {
  // Top-level View Mode: 'customer' (public radar) or 'pharmacist' (private management)
  const [viewMode, setViewMode] = useState('customer');
  
  // Pharmacist Active Tab
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Auth Modal State
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Pre-filled data transferred from AI Scanner to Add Stock
  const [scanPrefillData, setScanPrefillData] = useState(null);

  const { profile } = usePharmacy();

  // Handler for transferring AI scan results into Add Stock
  const handleProceedToAddStock = (scannedData) => {
    setScanPrefillData(scannedData);
    setActiveTab('add-stock');
  };

  // If in Public Customer Radar mode
  if (viewMode === 'customer') {
    return (
      <CustomerDiscovery 
        onSwitchToPharmacist={() => {
          if (!profile) {
            setShowAuthModal(true);
          } else {
            setViewMode('pharmacist');
          }
        }} 
      />
    );
  }

  // If Authenticating / Registering Pharmacist
  if (showAuthModal) {
    return (
      <PharmacistAuth 
        onBackToDiscovery={() => {
          setShowAuthModal(false);
          setViewMode('customer');
        }} 
      />
    );
  }

  // Pharmacist Portal View with Layout Shell
  return (
    <PharmacistLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onSwitchToCustomer={() => setViewMode('customer')}
    >
      {activeTab === 'dashboard' && (
        <Dashboard setActiveTab={setActiveTab} />
      )}

      {activeTab === 'inventory' && (
        <InventoryList setActiveTab={setActiveTab} />
      )}

      {activeTab === 'add-stock' && (
        <AddStock 
          initialData={scanPrefillData}
          onDone={() => {
            setScanPrefillData(null);
            setActiveTab('inventory');
          }}
          onGoToScanner={() => setActiveTab('ai-scanner')}
        />
      )}

      {activeTab === 'ai-scanner' && (
        <AiScanner onProceedToAddStock={handleProceedToAddStock} />
      )}

      {activeTab === 'pos' && (
        <PointOfSale />
      )}

      {activeTab === 'expiry' && (
        <ExpiryManagement setActiveTab={setActiveTab} />
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
      <MainApp />
    </PharmacyProvider>
  );
}
