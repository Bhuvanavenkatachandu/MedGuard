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
        return <span className="bg-slate-100 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Initial Count</span>;
      case 'stock_added':
        return <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Inward Added</span>;
      case 'sale':
        return <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">POS Sale</span>;
      case 'adjustment':
        return <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Manual Audit</span>;
      case 'expired_stock':
        return <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Expired Write-off</span>;
      case 'return':
        return <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Return</span>;
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
            <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 font-bold">
              <History className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Stock Movements Audit Trail
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Complete immutable ledger of every inventory inward, sale deduction, adjustment, and write-off.
          </p>
        </div>

        <div className="text-xs font-semibold bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs">
          Total Logged Movements: <strong className="text-blue-600">{stockMovements.length}</strong>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by medicine, batch, reference ID, or audit note..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-medium"
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
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                filterType === t.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Movements Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredMovements.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No stock movements found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4 font-semibold">Timestamp</th>
                  <th className="py-3 px-4 font-semibold">Medicine</th>
                  <th className="py-3 px-4 font-semibold">Batch</th>
                  <th className="py-3 px-4 font-semibold text-center">Movement Type</th>
                  <th className="py-3 px-4 font-semibold text-right">Quantity (Pieces)</th>
                  <th className="py-3 px-4 font-semibold text-right">Balance After</th>
                  <th className="py-3 px-4 font-semibold">Reference</th>
                  <th className="py-3 px-4 font-semibold">Audit Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMovements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                      {new Date(m.created_at).toLocaleDateString('en-IN')}{' '}
                      <span className="text-[10px] text-slate-400">
                        {new Date(m.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {m.medicine_name}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                      {m.batch_number}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {getBadgeForType(m.movement_type)}
                    </td>

                    <td className={`py-3.5 px-4 font-mono font-extrabold text-right ${
                      m.pieces_quantity > 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {m.pieces_quantity > 0 ? `+${m.pieces_quantity}` : m.pieces_quantity}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 text-right">
                      {m.balance_after}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                      {m.reference_id || 'N/A'}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                      {m.notes || '—'}
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
