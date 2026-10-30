import React, { useState, useMemo } from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import { 
  Search, 
  Filter, 
  Package, 
  PlusCircle, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  Edit3, 
  Clock, 
  ChevronDown
} from 'lucide-react';

export const InventoryList = ({ setActiveTab }) => {
  const { inventory, medicines, batches, adjustStock } = usePharmacy();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'in_stock', 'low_stock', 'expired'
  const [editingItem, setEditingItem] = useState(null);
  const [adjustPieces, setAdjustPieces] = useState('');
  const [adjustReason, setAdjustReason] = useState('Stock count correction');

  const todayStr = new Date().toISOString().split('T')[0];

  // Enriched inventory items with computed strip and piece metrics
  const enrichedInventory = useMemo(() => {
    return inventory.map((inv) => {
      const med = medicines.find(m => m.id === inv.medicine_id) || {};
      const batch = batches.find(b => b.id === inv.batch_id) || {};
      const piecesPerStrip = inv.pieces_per_strip || med.pieces_per_strip || 10;
      const totalPieces = inv.total_pieces || 0;

      // STRICT REQUIREMENT FORMULA:
      const availableStrips = Math.floor(totalPieces / piecesPerStrip);
      const loosePieces = totalPieces % piecesPerStrip;

      const isExpired = batch.expiry_date && batch.expiry_date < todayStr;
      const isLowStock = !isExpired && totalPieces > 0 && totalPieces <= (inv.min_stock_pieces || 20);
      const isOutOfStock = totalPieces === 0;

      let status = 'in_stock';
      if (isExpired) status = 'expired';
      else if (isOutOfStock) status = 'out_of_stock';
      else if (isLowStock) status = 'low_stock';

      return {
        ...inv,
        medicine: med,
        batch: batch,
        medicine_name: med.name || 'Unknown Medicine',
        generic_name: med.generic_name || '',
        strength: med.strength || '',
        brand: med.brand || '',
        batch_number: batch.batch_number || 'N/A',
        expiry_date: batch.expiry_date || 'N/A',
        piecesPerStrip,
        availableStrips,
        loosePieces,
        status,
      };
    });
  }, [inventory, medicines, batches, todayStr]);

  // Filtering
  const filteredItems = useMemo(() => {
    return enrichedInventory.filter((item) => {
      const query = searchTerm.toLowerCase().trim();
      const matchesSearch = 
        !query ||
        item.medicine_name.toLowerCase().includes(query) ||
        item.generic_name.toLowerCase().includes(query) ||
        item.batch_number.toLowerCase().includes(query) ||
        item.strength.toLowerCase().includes(query);

      const matchesStatus = 
        statusFilter === 'all' || 
        item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [enrichedInventory, searchTerm, statusFilter]);

  const handleSaveAdjustment = (e) => {
    e.preventDefault();
    if (!editingItem) return;
    const pieces = parseInt(adjustPieces, 10);
    if (isNaN(pieces) || pieces < 0) {
      alert('Total pieces must be a non-negative number.');
      return;
    }

    adjustStock(editingItem.id, pieces, adjustReason);
    setEditingItem(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Inventory & Strip/Piece Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Internal source of truth is total pieces. Live calculation for strips and loose pieces.
          </p>
        </div>

        <button
          onClick={() => setActiveTab('add-stock')}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-2 transition-all shadow-md shadow-blue-500/20"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add New Stock</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter by medicine name, generic salt, batch number, strength..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-medium"
          />
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: 'All Items' },
            { id: 'in_stock', label: 'In Stock' },
            { id: 'low_stock', label: 'Low Stock' },
            { id: 'expired', label: 'Expired' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4 font-semibold">Medicine & Generic</th>
                <th className="py-3 px-4 font-semibold">Batch No</th>
                <th className="py-3 px-4 font-semibold">Expiry Date</th>
                <th className="py-3 px-4 font-semibold text-center">Pcs / Strip</th>
                <th className="py-3 px-4 font-semibold text-center">Available Stock</th>
                <th className="py-3 px-4 font-semibold text-right">Strip Price</th>
                <th className="py-3 px-4 font-semibold text-right">Piece Price</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No matching inventory found.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Medicine Name & Strength */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{item.medicine_name}</span>
                        {item.strength && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-blue-50 text-blue-700 rounded border border-blue-100">
                            {item.strength}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {item.generic_name || item.brand || 'General Category'}
                      </div>
                    </td>

                    {/* Batch Number */}
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                      {item.batch_number}
                    </td>

                    {/* Expiry Date */}
                    <td className="py-3.5 px-4">
                      <div className={`font-mono ${
                        item.status === 'expired' 
                          ? 'text-rose-600 font-bold' 
                          : item.batch.expiry_date && new Date(item.batch.expiry_date) <= new Date(Date.now() + 30 * 86400000)
                          ? 'text-amber-600 font-bold'
                          : 'text-slate-600'
                      }`}>
                        {item.expiry_date}
                      </div>
                    </td>

                    {/* Pieces Per Strip */}
                    <td className="py-3.5 px-4 text-center font-mono text-slate-600">
                      {item.piecesPerStrip}
                    </td>

                    {/* Available Stock Breakdown */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex flex-col items-center">
                        <div className="font-extrabold text-slate-900 text-sm">
                          {item.availableStrips} <span className="text-[10px] font-normal text-slate-500">strips</span> + {item.loosePieces} <span className="text-[10px] font-normal text-slate-500">loose</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Total: <strong>{item.total_pieces}</strong> pieces
                        </div>
                      </div>
                    </td>

                    {/* Strip Price */}
                    <td className="py-3.5 px-4 font-bold text-slate-900 text-right">
                      ₹{Number(item.price_per_strip).toFixed(2)}
                    </td>

                    {/* Piece Price */}
                    <td className="py-3.5 px-4 font-bold text-blue-600 text-right">
                      ₹{Number(item.price_per_piece).toFixed(2)}
                    </td>

                    {/* Stock Status Badge */}
                    <td className="py-3.5 px-4 text-center">
                      {item.status === 'expired' && (
                        <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-200">
                          Expired
                        </span>
                      )}
                      {item.status === 'low_stock' && (
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">
                          Low Stock
                        </span>
                      )}
                      {item.status === 'out_of_stock' && (
                        <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Out of Stock
                        </span>
                      )}
                      {item.status === 'in_stock' && (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                          In Stock
                        </span>
                      )}
                    </td>

                    {/* Action Button */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => {
                          setEditingItem(item);
                          setAdjustPieces(item.total_pieces.toString());
                        }}
                        className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-slate-800 transition-colors"
                        title="Adjust Total Pieces"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Stock Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Adjust Stock: {editingItem.medicine_name}
            </h3>
            <p className="text-xs text-slate-500 mb-4 font-mono">
              Batch: {editingItem.batch_number} • Currently {editingItem.total_pieces} pieces
            </p>

            <form onSubmit={handleSaveAdjustment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Total Pieces (Source of Truth)
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={adjustPieces}
                  onChange={(e) => setAdjustPieces(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono font-bold"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Will represent {Math.floor((parseInt(adjustPieces, 10) || 0) / editingItem.piecesPerStrip)} full strips and {(parseInt(adjustPieces, 10) || 0) % editingItem.piecesPerStrip} loose pieces.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Adjustment Reason (Audit Trail)
                </label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
                >
                  Confirm Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
