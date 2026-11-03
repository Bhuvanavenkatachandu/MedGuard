import React, { useState } from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import { 
  History, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  AlertOctagon, 
  Sliders, 
  RotateCcw,
  Package
} from 'lucide-react';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';

export const StockMovements = () => {
  const { stockMovements } = usePharmacy();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  const filteredMovements = stockMovements.filter(m => {
    const q = searchTerm.toLowerCase().trim();
    const medName = m.medicine_name || '';
    const bNumber = m.batch_number || '';
    const refId = m.reference_id || '';
    const notes = m.notes || '';
    const matchesSearch = 
      !q ||
      medName.toLowerCase().includes(q) ||
      bNumber.toLowerCase().includes(q) ||
      refId.toLowerCase().includes(q) ||
      notes.toLowerCase().includes(q);

    const matchesType = filterType === 'all' || m.movement_type === filterType;

    return matchesSearch && matchesType;
  });

  const getBadgeForType = (type) => {
    switch (type) {
      case 'initial_stock':
        return <span className="bg-slate-100 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200">Initial Count</span>;
      case 'stock_added':
        return <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">Inward Added</span>;
      case 'sale':
        return <span className="bg-blue-50 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200">POS Sale</span>;
      case 'adjustment':
        return <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">Manual Audit</span>;
      case 'expired_stock':
        return <span className="bg-rose-50 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-200">Expired Write-off</span>;
      case 'return':
        return <span className="bg-purple-50 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-200">Return</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 text-[10px] font-medium px-2 py-0.5 rounded-full">{type}</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-100 text-primary font-bold">
              <History className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Stock Movements Audit Trail
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Complete immutable ledger of every inventory inward, sale deduction, adjustment, and write-off.
          </p>
        </div>

        <div className="text-xs font-semibold bg-white border border-slate-200/90 px-3 py-1.5 rounded-xl shadow-xs">
          Total Logged Movements: <strong className="text-primary">{stockMovements.length}</strong>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-card flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by medicine, batch, reference ID, or audit note..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-primary font-medium"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: 'All Movements' },
            { id: 'sale', label: 'Sales' },
            { id: 'stock_added', label: 'Inward Added' },
            { id: 'adjustment', label: 'Adjustments' },
            { id: 'expired_stock', label: 'Expired' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setFilterType(t.id)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors whitespace-nowrap cursor-pointer ${
                filterType === t.id
                  ? 'bg-primary text-white border-primary shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card overflow-hidden">
        {filteredMovements.length === 0 ? (
          <EmptyState
            icon={History}
            title="No Movements Found"
            description={
              searchTerm
                ? `No movements match "${searchTerm}".`
                : 'No stock movements recorded yet. Inward additions and sales deductions will automatically log here.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4 font-semibold">Movement Type</th>
                  <th className="py-3 px-4 font-semibold">Medicine & Batch</th>
                  <th className="py-3 px-4 font-semibold text-right">Quantity (Pieces)</th>
                  <th className="py-3 px-4 font-semibold">Reference</th>
                  <th className="py-3 px-4 font-semibold">Audit Notes</th>
                  <th className="py-3 px-4 font-semibold text-center">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMovements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      {getBadgeForType(m.movement_type)}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-slate-900 text-xs">{m.medicine_name || 'Medicine'}</div>
                      <div className="text-[10px] text-slate-400 font-mono">Batch: {m.batch_number || 'N/A'}</div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <span className={`font-mono font-extrabold text-xs ${
                        m.quantity_change > 0
                          ? 'text-emerald-600'
                          : m.quantity_change < 0
                          ? 'text-rose-600'
                          : 'text-slate-600'
                      }`}>
                        {m.quantity_change > 0 ? `+${m.quantity_change}` : m.quantity_change} pcs
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {m.reference_id || <span className="text-slate-400 italic">None</span>}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                      {m.notes || <span className="text-slate-400 italic">—</span>}
                    </td>

                    <td className="py-3.5 px-4 text-center text-slate-500 text-[11px]">
                      {m.created_at ? new Date(m.created_at).toLocaleString('en-IN') : 'Just now'}
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
