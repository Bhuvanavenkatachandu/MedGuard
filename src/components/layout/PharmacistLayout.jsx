import React, { useState } from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Camera, 
  PlusCircle, 
  Clock, 
  Users, 
  Truck, 
  FileText, 
  BarChart3, 
  History, 
  LogOut, 
  Menu, 
  X, 
  Search, 
  Building2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

export const PharmacistLayout = ({ activeTab, setActiveTab, onSwitchToCustomer, children }) => {
  const { pharmacy, profile, metrics, resetStore } = usePharmacy();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pos', label: 'POS & Billing', icon: ShoppingCart, highlight: true },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'ai-scanner', label: 'AI Medicine Scanner', icon: Camera, badge: 'Gemma 4' },
    { id: 'add-stock', label: 'Add Stock', icon: PlusCircle },
    { id: 'expiry', label: 'FEFO & Expiry', icon: Clock, alertCount: metrics.expiringSoonCount + metrics.expiredCount },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'suppliers', label: 'Suppliers', icon: Truck },
    { id: 'invoices', label: 'Invoices & Billing', icon: FileText },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
    { id: 'movements', label: 'Stock Movements Audit', icon: History },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <div className="md:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-40 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-xl">🛡️</span>
          <div>
            <h1 className="font-bold text-sm leading-tight text-white">MedGuard AI</h1>
            <p className="text-[10px] text-slate-400 truncate max-w-[180px]">{pharmacy?.name || 'Pharmacy'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onSwitchToCustomer}
            className="text-xs bg-blue-600 px-2 py-1 rounded text-white font-medium"
          >
            Radar
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`${
          mobileMenuOpen ? 'block' : 'hidden'
        } md:block w-full md:w-64 bg-slate-900 text-slate-300 flex-shrink-0 flex flex-col justify-between border-r border-slate-800 z-30 sticky top-0 md:h-screen`}
      >
        <div className="p-4 flex flex-col h-full overflow-y-auto">
          {/* Logo & Pharmacy Badge */}
          <div className="hidden md:flex items-center gap-3 px-2 py-3 mb-4 border-b border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-blue-500 text-white flex items-center justify-center font-bold text-xl shadow-lg shadow-blue-500/20 flex-shrink-0">
              🛡️
            </div>
            <div className="overflow-hidden">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-white text-base tracking-tight">MedGuard</span>
                <span className="bg-blue-500/20 text-blue-400 text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-500/30">AI</span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">{pharmacy?.name || 'Care Pharmacy'}</p>
            </div>
          </div>

          {/* Quick POS Trigger Button */}
          <button
            onClick={() => {
              setActiveTab('pos');
              setMobileMenuOpen(false);
            }}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold py-2.5 px-3 rounded-xl mb-4 shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all transform active:scale-98"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>New Sale / POS Counter</span>
          </button>

          {/* Nav List */}
          <nav className="space-y-1 flex-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25 font-semibold'
                      : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {item.badge && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
                        {item.badge}
                      </span>
                    )}

                    {item.alertCount > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-rose-500 text-white">
                        {item.alertCount}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </nav>

          {/* Customer Discovery Shortcut & Demo Reset */}
          <div className="pt-4 mt-4 border-t border-slate-800 space-y-2">
            <button
              onClick={onSwitchToCustomer}
              className="w-full bg-slate-800 hover:bg-slate-700 text-blue-300 text-xs font-semibold py-2 px-3 rounded-xl flex items-center justify-between border border-blue-500/20 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-blue-400" />
                <span>Customer Stock Radar</span>
              </div>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </button>

            <div className="flex items-center justify-between px-2 pt-2 text-[11px] text-slate-500">
              <span className="truncate">{profile?.full_name || 'Pharmacist'}</span>
              <button
                onClick={resetStore}
                title="Reset demo data to default clean state"
                className="hover:text-amber-400 flex items-center gap-1 text-[10px]"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reset Demo</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 flex flex-col overflow-y-auto">
        {/* Top Header Bar for Desktop */}
        <header className="hidden md:flex h-16 bg-white border-b border-slate-200 px-6 items-center justify-between sticky top-0 z-20 shadow-xs">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-slate-800 capitalize">
              {navItems.find(n => n.id === activeTab)?.label || 'Dashboard'}
            </h2>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
              {pharmacy?.name}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Near Expiry / Low stock rapid status indicators */}
            {metrics.lowStockCount > 0 && (
              <button
                onClick={() => setActiveTab('inventory')}
                className="flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 text-xs px-2.5 py-1 rounded-lg font-medium hover:bg-amber-100 transition-colors"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>{metrics.lowStockCount} Low Stock</span>
              </button>
            )}

            {metrics.expiringSoonCount > 0 && (
              <button
                onClick={() => setActiveTab('expiry')}
                className="flex items-center gap-1.5 bg-rose-50 text-rose-700 border border-rose-200 text-xs px-2.5 py-1 rounded-lg font-medium hover:bg-rose-100 transition-colors"
              >
                <Clock className="w-3.5 h-3.5 text-rose-600" />
                <span>{metrics.expiringSoonCount} Expiring Soon</span>
              </button>
            )}

            <button
              onClick={onSwitchToCustomer}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors"
            >
              <span>View Public Radar</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Tab Content Canvas */}
        <div className="p-4 sm:p-6 flex-1">
          {children}
        </div>
      </main>
    </div>
  );
};
