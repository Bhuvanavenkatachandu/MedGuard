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
  ArrowDownRight,
  Layers,
  FileSpreadsheet
} from 'lucide-react';
import { Button } from '../ui/Button';

export const Reports = () => {
  const { sales, inventory, medicines, batches, metrics } = usePharmacy();
  const [reportType, setReportType] = useState('sales'); // 'sales', 'inventory', 'velocity'
  
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const saleDate = s.created_at ? s.created_at.split('T')[0] : '';
      return (!startDate || saleDate >= startDate) && (!endDate || saleDate <= endDate);
    });
  }, [sales, startDate, endDate]);

  const totalFilteredSalesAmount = filteredSales.reduce((acc, s) => acc + Number(s.total_amount || 0), 0);

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
            <span className="p-1.5 rounded-lg bg-blue-100 text-primary font-bold">
              <BarChart3 className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Reports & Business Intelligence
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Sales audit, stock valuation, and fast-vs-slow moving medicine velocity.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCsv}
          leftIcon={<Download className="w-3.5 h-3.5" />}
        >
          Export CSV Report
        </Button>
      </div>

      {/* Filter & Metric Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {['sales', 'inventory', 'velocity'].map((type) => (
            <button
              key={type}
              onClick={() => setReportType(type)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors capitalize cursor-pointer ${
                reportType === type
                  ? 'bg-primary text-white border-primary shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {type === 'velocity' ? 'Medicine Velocity' : `${type} Analysis`}
            </button>
          ))}
        </div>

        {reportType === 'sales' && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-semibold">Date Range:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-primary"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-primary"
            />
          </div>
        )}
      </div>

      {/* Report Dynamic Content */}
      {reportType === 'sales' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-card">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Filtered Revenue</span>
              <div className="text-2xl font-extrabold text-slate-900 font-mono mt-1">
                ₹{totalFilteredSalesAmount.toFixed(2)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Across {filteredSales.length} invoice(s)</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-card">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Average Order Value</span>
              <div className="text-2xl font-extrabold text-slate-900 font-mono mt-1">
                ₹{filteredSales.length > 0 ? (totalFilteredSalesAmount / filteredSales.length).toFixed(2) : '0.00'}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Per completed customer bill</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-card">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Lifetime Turnover</span>
              <div className="text-2xl font-extrabold text-emerald-600 font-mono mt-1">
                ₹{Number(metrics?.totalSalesAmount || 0).toFixed(2)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Total revenue since registration</p>
            </div>
          </div>
        </div>
      )}

      {reportType === 'velocity' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-6">
          <h2 className="text-sm font-bold text-slate-900 mb-1">Fast-Moving vs Slow-Moving Medicines</h2>
          <p className="text-xs text-slate-500 mb-6">Dispensary units sold across all completed sales transactions</p>

          <div className="space-y-3">
            {medicineVelocity.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No sales recorded yet to compute medicine velocity.</p>
            ) : (
              medicineVelocity.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-slate-900">{item.name}</span>
                  </div>
                  <div className="font-mono font-extrabold text-slate-800">
                    {item.piecesSold} units sold
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {reportType === 'inventory' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-6">
          <h2 className="text-sm font-bold text-slate-900 mb-1">Inventory Valuation Summary</h2>
          <p className="text-xs text-slate-500 mb-6">Aggregate stock counts and retail inventory valuation</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Total Stock in Pieces</span>
              <div className="text-2xl font-black text-slate-900 font-mono mt-1">
                {(metrics?.totalStockPieces || 0).toLocaleString()} pieces
              </div>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Total Retail Valuation</span>
              <div className="text-2xl font-black text-primary font-mono mt-1">
                ₹{Number(metrics?.totalInventoryValue || 0).toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
