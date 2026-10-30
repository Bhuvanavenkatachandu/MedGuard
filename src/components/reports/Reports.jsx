import React, { useState, useMemo } from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import { 
  BarChart3, 
  Calendar, 
  Download, 
  TrendingUp, 
  Package, 
  AlertTriangle, 
  Clock, 
  DollarSign,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

export const Reports = () => {
  const { sales, inventory, medicines, batches, metrics } = usePharmacy();
  const [reportType, setReportType] = useState('sales'); // 'sales', 'inventory', 'velocity'
  
  // Date filtering
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  // Filtered sales by date
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const saleDate = s.created_at ? s.created_at.split('T')[0] : '';
      return (!startDate || saleDate >= startDate) && (!endDate || saleDate <= endDate);
    });
  }, [sales, startDate, endDate]);

  const totalFilteredSalesAmount = filteredSales.reduce((acc, s) => acc + Number(s.total_amount || 0), 0);

  // Velocity analysis: Fast-moving vs slow-moving medicines
  const medicineVelocity = useMemo(() => {
    const counts = {};
    sales.forEach(s => {
      (s.items || []).forEach(it => {
        const name = it.medicine_name || 'Unknown';
        counts[name] = (counts[name] || 0) + (it.pieces_count || it.quantity_units || 1);
      });
    });

    const list = Object.keys(counts).map(name => ({
      name,
      piecesSold: counts[name],
    }));

    list.sort((a, b) => b.piecesSold - a.piecesSold);
    return list;
  }, [sales]);

  // Export CSV
  const handleExportCsv = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';

    if (reportType === 'sales') {
      csvContent += 'Sale Number,Date,Customer Name,Phone,Email,Payment Method,Subtotal,Discount,Tax,Total\n';
      filteredSales.forEach(s => {
        csvContent += `"${s.sale_number}","${s.created_at}","${s.customer_name}","${s.customer_phone}","${s.customer_email || ''}","${s.payment_method}","${s.subtotal}","${s.discount_amount}","${s.tax_amount}","${s.total_amount}"\n`;
      });
    } else {
      csvContent += 'Medicine,Batch,Expiry Date,Pieces Per Strip,Total Pieces,Available Strips,Loose Pieces,Price Strip,Price Piece\n';
      inventory.forEach(i => {
        const m = medicines.find(x => x.id === i.medicine_id);
        const b = batches.find(x => x.id === i.batch_id);
        const strips = Math.floor(i.total_pieces / i.pieces_per_strip);
        const loose = i.total_pieces % i.pieces_per_strip;
        csvContent += `"${m?.name || 'Medicine'}","${b?.batch_number || 'N/A'}","${b?.expiry_date || 'N/A'}","${i.pieces_per_strip}","${i.total_pieces}","${strips}","${loose}","${i.price_per_strip}","${i.price_per_piece}"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MedGuard_Report_${reportType}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 font-bold">
              <BarChart3 className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Reports & Business Intelligence
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Sales audit, stock valuation, inventory movements, and fast-vs-slow moving medicine velocity.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-2 transition-all shadow-sm"
        >
          <Download className="w-4 h-4 text-blue-400" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Report Type Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        {[
          { id: 'sales', label: 'Sales Reports & Date Filter' },
          { id: 'inventory', label: 'Inventory Valuation & Stock Status' },
          { id: 'velocity', label: 'Medicine Velocity (Fast vs Slow Moving)' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setReportType(t.id)}
            className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 ${
              reportType === t.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* SALES TAB */}
      {reportType === 'sales' && (
        <div className="space-y-5">
          {/* Date Range Selector */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="font-semibold text-slate-700">Custom Date Range:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-800 font-mono"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-800 font-mono"
              />
            </div>

            <div className="flex items-center gap-3">
              <span className="text-slate-500">Sales in Period:</span>
              <span className="text-base font-extrabold text-blue-600 font-mono">
                ₹{totalFilteredSalesAmount.toFixed(2)} ({filteredSales.length} bills)
              </span>
            </div>
          </div>

          {/* Sales Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4 font-semibold">Sale #</th>
                    <th className="py-3 px-4 font-semibold">Date</th>
                    <th className="py-3 px-4 font-semibold">Customer</th>
                    <th className="py-3 px-4 font-semibold">Payment</th>
                    <th className="py-3 px-4 font-semibold text-right">Subtotal</th>
                    <th className="py-3 px-4 font-semibold text-right">Discount</th>
                    <th className="py-3 px-4 font-semibold text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{sale.sale_number}</td>
                      <td className="py-3.5 px-4 text-slate-500">{new Date(sale.created_at).toLocaleDateString('en-IN')}</td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">{sale.customer_name}</td>
                      <td className="py-3.5 px-4 text-slate-600">{sale.payment_method}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-700 text-right">₹{Number(sale.subtotal).toFixed(2)}</td>
                      <td className="py-3.5 px-4 font-mono text-emerald-600 text-right">-₹{Number(sale.discount_amount).toFixed(2)}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 text-right">₹{Number(sale.total_amount).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* INVENTORY TAB */}
      {reportType === 'inventory' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Stock Units</span>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">{metrics.totalStockPieces} pieces</div>
              <p className="text-[11px] text-slate-400 mt-0.5">{metrics.totalMedicinesCount} unique medicines</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Low Stock Threshold</span>
              <div className="text-2xl font-extrabold text-amber-600 mt-1">{metrics.lowStockCount} items</div>
              <p className="text-[11px] text-slate-400 mt-0.5">Need restock order</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Expired Stock</span>
              <div className="text-2xl font-extrabold text-rose-600 mt-1">{metrics.expiredCount} batches</div>
              <p className="text-[11px] text-slate-400 mt-0.5">Zero dispensing permission</p>
            </div>
          </div>
        </div>
      )}

      {/* VELOCITY TAB */}
      {reportType === 'velocity' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100">
            Medicine Dispensing Velocity Analysis
          </h2>

          <div className="space-y-3">
            {medicineVelocity.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No sales velocity recorded yet.</p>
            ) : (
              medicineVelocity.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px]">
                      #{idx + 1}
                    </span>
                    <div>
                      <span className="font-bold text-slate-900">{item.name}</span>
                      <span className="text-[10px] text-slate-400 block">
                        {idx === 0 ? 'Top High-Frequency Seller' : idx > 2 ? 'Slow-moving / Steady' : 'Fast-moving'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-mono font-extrabold text-slate-800">{item.piecesSold} pieces sold</span>
                    {idx === 0 ? (
                      <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
