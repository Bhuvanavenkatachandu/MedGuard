import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePharmacy } from '../../context/PharmacyContext';
import { Logo } from '../ui/Logo';
import { Button } from '../ui/Button';
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
  User,
  ChevronRight,
  Bell,
  MessageSquare,
  BookOpen
} from 'lucide-react';

export const PharmacistLayout = ({ activeTab, setActiveTab, onSwitchToCustomer, children }) => {
  const navigate = useNavigate();
  const { pharmacy, profile, metrics, logoutPharmacist } = usePharmacy();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pos', label: 'Point of Sale (POS)', icon: ShoppingCart, highlight: true },
    { id: 'inventory', label: 'Inventory & Strips', icon: Package },
    { id: 'ai-chat', label: 'AI Chat Assistant', icon: MessageSquare, badge: 'Gemma 4' },
    { id: 'knowledge-base', label: 'Knowledge Base', icon: BookOpen },
    { id: 'ai-scanner', label: 'Scan Medicine (AI)', icon: Camera, badge: 'Gemma 4' },
    { id: 'add-stock', label: 'Add Stock', icon: PlusCircle },
    { id: 'expiry', label: 'FEFO & Expiry', icon: Clock, alertCount: ((metrics?.expiringSoonCount || 0) + (metrics?.expiredCount || 0)) },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'suppliers', label: 'Suppliers', icon: Truck },
    { id: 'invoices', label: 'Invoices & Billing', icon: FileText },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
    { id: 'movements', label: 'Stock Audit Movements', icon: History },
  ];

  const handleLogout = async () => {
    await logoutPharmacist();
    navigate('/pharmacist/login');
  };

  const currentTabLabel = navItems.find(n => n.id === activeTab)?.label || 'Dashboard';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      {/* Mobile Top Header */}
      <div className="md:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-40 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-ai text-white flex items-center justify-center font-bold text-sm shadow-xs">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 4v16m-8-8h16" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm text-white">MEDGUARD</span>
              <span className="text-[9px] bg-primary/40 text-blue-300 font-bold px-1 rounded">AI</span>
            </div>
            <p className="text-[10px] text-slate-400 truncate max-w-[150px]">{pharmacy?.name || 'Pharmacy'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('pos')}
            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-xs"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>POS</span>
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
            aria-label="Toggle menu"
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
          {/* Logo & Pharmacy Name Header */}
          <div className="hidden md:flex items-center gap-3 px-2 py-3 mb-4 border-b border-slate-800/80">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-ai text-white flex items-center justify-center font-bold text-sm shadow-md shadow-primary/20 flex-shrink-0">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 4v16m-8-8h16" />
              </svg>
            </div>
            <div className="overflow-hidden">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-white text-base tracking-tight">MedGuard</span>
                <span className="bg-primary/30 text-blue-300 text-[10px] font-bold px-1.5 py-0.2 rounded border border-primary/40">AI</span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">{pharmacy?.name || 'Licensed Pharmacy'}</p>
            </div>
          </div>

          {/* Quick POS Trigger Action */}
          <button
            onClick={() => {
              setActiveTab('pos');
              setMobileMenuOpen(false);
            }}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold py-2.5 px-3 rounded-xl mb-4 shadow-sm shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all transform active:scale-98 cursor-pointer"
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
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-primary text-white shadow-xs font-semibold'
                      : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {item.badge && (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-ai/20 text-cyan-300 border border-ai/30">
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

          {/* Footer Shortcuts & Profile Badge */}
          <div className="pt-4 mt-4 border-t border-slate-800 space-y-2">
            <button
              onClick={onSwitchToCustomer}
              className="w-full bg-slate-800/80 hover:bg-slate-800 text-cyan-300 text-xs font-semibold py-2 px-3 rounded-xl flex items-center justify-between border border-cyan-500/20 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-cyan-400" />
                <span>Customer Stock Radar</span>
              </div>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </button>

            {/* User Profile Info & Sign Out */}
            <div className="bg-slate-800/50 rounded-xl p-2.5 border border-slate-800">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-primary/20 text-primary-light flex items-center justify-center font-bold text-xs">
                  <User className="w-4 h-4 text-blue-400" />
                </div>
                <div className="overflow-hidden flex-1">
                  <p className="text-xs font-bold text-white truncate">{profile?.full_name || 'Pharmacist'}</p>
                  <p className="text-[10px] text-slate-400 truncate">{pharmacy?.owner_name || 'Licensed Member'}</p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-semibold py-1.5 px-3 rounded-lg transition-all cursor-pointer"
                title="Sign out of pharmacist session"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 flex flex-col overflow-y-auto pb-16 md:pb-0">
        {/* Desktop Header Top Bar */}
        <header className="hidden md:flex h-16 bg-white border-b border-slate-200/90 px-6 items-center justify-between sticky top-0 z-20 shadow-xs">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-bold text-slate-900 capitalize">
              {currentTabLabel}
            </h1>
            <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full border border-slate-200 font-medium">
              {pharmacy?.name || 'My Pharmacy'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Action Button */}
            <button
              onClick={() => setActiveTab('add-stock')}
              className="bg-primary hover:bg-primary-dark text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Stock</span>
            </button>

            {/* Quick Status Badges */}
            {metrics?.lowStockCount > 0 && (
              <button
                onClick={() => setActiveTab('inventory')}
                className="flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 text-xs px-2.5 py-1 rounded-lg font-semibold hover:bg-amber-100 transition-colors cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>{metrics.lowStockCount} Low Stock</span>
              </button>
            )}

            {metrics?.expiringSoonCount > 0 && (
              <button
                onClick={() => setActiveTab('expiry')}
                className="flex items-center gap-1.5 bg-rose-50 text-rose-700 border border-rose-200 text-xs px-2.5 py-1 rounded-lg font-semibold hover:bg-rose-100 transition-colors cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5 text-rose-600" />
                <span>{metrics.expiringSoonCount} Expiring</span>
              </button>
            )}

            <button
              onClick={onSwitchToCustomer}
              className="text-xs font-semibold text-primary hover:text-primary-dark flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors cursor-pointer"
            >
              <span>View Radar</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer"
              title="Sign out of pharmacist session"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-500" />
              <span>Logout</span>
            </button>
          </div>
        </header>

        {/* Tab Content Canvas */}
        <div className="p-4 sm:p-6 lg:p-8 flex-1">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar (Section 46) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-3 py-2 flex items-center justify-around z-40 shadow-lg">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-1 text-[10px] font-semibold py-1 px-2 rounded-lg ${
            activeTab === 'dashboard' ? 'text-primary' : 'text-slate-500'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex flex-col items-center gap-1 text-[10px] font-semibold py-1 px-2 rounded-lg ${
            activeTab === 'inventory' ? 'text-primary' : 'text-slate-500'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Inventory</span>
        </button>

        {/* Highlighted Scan Button */}
        <button
          onClick={() => setActiveTab('ai-scanner')}
          className="flex flex-col items-center justify-center -mt-5 bg-gradient-to-tr from-primary to-ai text-white w-12 h-12 rounded-full shadow-lg shadow-primary/30 border-2 border-white"
          aria-label="Scan Medicine Packaging"
        >
          <Camera className="w-5 h-5 text-white" />
        </button>

        <button
          onClick={() => setActiveTab('pos')}
          className={`flex flex-col items-center gap-1 text-[10px] font-semibold py-1 px-2 rounded-lg ${
            activeTab === 'pos' ? 'text-primary' : 'text-slate-500'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Sales</span>
        </button>

        <button
          onClick={() => setMobileMenuOpen(true)}
          className={`flex flex-col items-center gap-1 text-[10px] font-semibold py-1 px-2 rounded-lg ${
            mobileMenuOpen ? 'text-primary' : 'text-slate-500'
          }`}
        >
          <Menu className="w-4 h-4" />
          <span>More</span>
        </button>
      </div>
    </div>
  );
};
