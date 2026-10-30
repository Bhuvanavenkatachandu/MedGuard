import React from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import { 
  TrendingUp, 
  DollarSign, 
  Package, 
  AlertTriangle, 
  Clock, 
  PlusCircle, 
  ShoppingCart, 
  Camera, 
  ArrowRight, 
  FileText, 
  AlertOctagon,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { generateInvoicePdf } from '../../utils/pdfGenerator';

export const Dashboard = ({ setActiveTab }) => {
  const { pharmacy, metrics, sales } = usePharmacy();

  const handleDownloadInvoice = (sale) => {
    try {
      const pdf = generateInvoicePdf({
        pharmacy,
        sale,
        customer: {
          name: sale.customer_name,
          phone: sale.customer_phone,
          email: sale.customer_email,
        },
        items: sale.items || [],
      });
      pdf.save(`Invoice_${sale.sale_number}.pdf`);
    } catch (e) {
      console.error('Download error:', e);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Welcome & Quick Actions Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">👋</span>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Welcome to {pharmacy?.name || 'MedGuard AI'}
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time FEFO inventory monitoring, AI packaging extraction, and public discovery sync.
          </p>
        </div>

        {/* Quick CTA Actions */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={() => setActiveTab('add-stock')}
            className="flex-1 md:flex-initial bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-500/20"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add New Stock</span>
          </button>

          <button
            onClick={() => setActiveTab('ai-scanner')}
            className="flex-1 md:flex-initial bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <Camera className="w-4 h-4 text-blue-400" />
            <span>Scan Packaging</span>
          </button>

          <button
            onClick={() => setActiveTab('pos')}
            className="flex-1 md:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>POS Billing</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sales */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Today's Sales</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            ₹{Number(metrics.todaySalesAmount).toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-500" />
            <span>Total Lifetime: ₹{Number(metrics.totalSalesAmount).toFixed(2)}</span>
          </p>
        </div>

        {/* Total Stock in Pieces */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Total Stock</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {metrics.totalStockPieces.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Across {metrics.totalMedicinesCount} registered medicines
          </p>
        </div>

        {/* Expiring Soon (< 30 days) */}
        <div 
          onClick={() => setActiveTab('expiry')}
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm cursor-pointer hover:border-amber-300 transition-all"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Expiring Soon</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-600">
            {metrics.expiringSoonCount}
          </div>
          <p className="text-[11px] text-amber-600/80 mt-1 flex items-center justify-between">
            <span>Threshold: {metrics.thresholdDays} days</span>
            <span className="font-semibold underline">FEFO Alert →</span>
          </p>
        </div>

        {/* Low Stock Items */}
        <div 
          onClick={() => setActiveTab('inventory?filter=low_stock')}
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm cursor-pointer hover:border-rose-300 transition-all"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Low Stock Alerts</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-rose-600">
            {metrics.lowStockCount}
          </div>
          <p className="text-[11px] text-rose-600/80 mt-1 flex items-center justify-between">
            <span>Below minimum pieces</span>
            <span className="font-semibold underline">Reorder →</span>
          </p>
        </div>
      </div>

      {/* Critical Alert Banners */}
      {(metrics.expiringSoonCount > 0 || metrics.lowStockCount > 0 || metrics.expiredCount > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Near Expiry Banner */}
          {metrics.expiringSoonCount > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                    FEFO Priority: {metrics.expiringSoonCount} Batch(es) Expiring Soon
                  </h3>
                  <button
                    onClick={() => setActiveTab('expiry')}
                    className="text-[11px] font-bold text-amber-800 underline hover:text-amber-950"
                  >
                    View Batches
                  </button>
                </div>
                <p className="text-xs text-amber-800 mt-1">
                  Batches are recommended first during POS checkout under FEFO rules. Please dispense these before fresh batches.
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {metrics.expiringSoonBatches.slice(0, 3).map(b => (
                    <span key={b.id} className="text-[10px] bg-white text-amber-900 px-2 py-0.5 rounded border border-amber-300 font-medium">
                      {b.medicine_name} ({b.batch_number} • Exp: {b.expiry_date})
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Low Stock Banner */}
          {metrics.lowStockCount > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-rose-900 uppercase tracking-wide">
                    Restock Alert: {metrics.lowStockCount} Medicine(s) Low
                  </h3>
                  <button
                    onClick={() => setActiveTab('add-stock')}
                    className="text-[11px] font-bold text-rose-800 underline hover:text-rose-950"
                  >
                    Add Stock Now
                  </button>
                </div>
                <p className="text-xs text-rose-800 mt-1">
                  Stock is at or below the configured minimum pieces threshold.
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {metrics.lowStockItems.slice(0, 3).map(i => (
                    <span key={i.id} className="text-[10px] bg-white text-rose-900 px-2 py-0.5 rounded border border-rose-300 font-medium">
                      {i.medicine_name} ({i.total_pieces} pcs left)
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Sales & Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Recent Sales & Invoices</h2>
            <p className="text-xs text-slate-500">Atomic POS transactions with instant PDF invoice archival</p>
          </div>
          <button
            onClick={() => setActiveTab('invoices')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {sales.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No sales recorded yet. Use the <strong>POS Billing</strong> counter to create your first invoice!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4 font-semibold">Sale / Invoice #</th>
                  <th className="py-3 px-4 font-semibold">Customer</th>
                  <th className="py-3 px-4 font-semibold">Date & Time</th>
                  <th className="py-3 px-4 font-semibold">Items</th>
                  <th className="py-3 px-4 font-semibold text-right">Total Amount</th>
                  <th className="py-3 px-4 font-semibold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sales.slice(0, 5).map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-800">
                      {sale.sale_number}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{sale.customer_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{sale.customer_phone}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(sale.created_at).toLocaleDateString('en-IN')}{' '}
                      <span className="text-[10px] text-slate-400">
                        {new Date(sale.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {sale.items?.length || 1} item(s)
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 text-right">
                      ₹{Number(sale.total_amount).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleDownloadInvoice(sale)}
                        className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors"
                        title="Download official PDF invoice"
                      >
                        <FileText className="w-3 h-3 text-blue-600" />
                        <span>PDF</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
