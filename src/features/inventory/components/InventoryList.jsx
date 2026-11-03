import React, { useState, useMemo } from 'react';
import { usePharmacy } from '../../../shared/context/PharmacyContext';
import { 
  Search, 
  Filter, 
  Package, 
  PlusCircle, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  Edit3, 
  Trash2,
  Clock, 
  ChevronDown,
  ArrowUpDown,
  SlidersHorizontal,
  X
} from 'lucide-react';
import { Button } from '../../../shared/components/ui/Button';
import { StatusBadge } from '../../../shared/components/ui/StatusBadge';
import { Modal } from '../../../shared/components/ui/Modal';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { formatMedicineDate } from '../../../shared/utils/dateFormatter';

export const InventoryList = ({ setActiveTab }) => {
  const { inventory, medicines, batches, adjustStock, deleteInventoryItem } = usePharmacy();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'in_stock', 'low_stock', 'expired', 'out_of_stock'
  const [sortBy, setSortBy] = useState('name'); // 'name', 'stock', 'expiry'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc', 'desc'

  // Stock Adjustment Modal
  const [editingItem, setEditingItem] = useState(null);
  const [adjustPieces, setAdjustPieces] = useState('');
  const [adjustReason, setAdjustReason] = useState('Stock count physical audit correction');

  const todayStr = new Date().toISOString().split('T')[0];

  // Enriched inventory items with computed strip and piece metrics
  const enrichedInventory = useMemo(() => {
    return inventory.map((inv) => {
      const med = medicines.find(m => m.id === inv.medicine_id) || {};
      const batch = batches.find(b => b.id === inv.batch_id) || {};
      const piecesPerStrip = inv.pieces_per_strip || med.pieces_per_strip || 10;
      const totalPieces = Number(inv.total_pieces) || 0;

      // Exact strip and piece formula:
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
        category: med.category || 'General',
        manufacturer: med.manufacturer || 'Authorized Pharma',
        batch_number: batch.batch_number || 'N/A',
        expiry_date: batch.expiry_date || '',
        formatted_expiry: formatMedicineDate(batch.expiry_date),
        piecesPerStrip,
        totalPieces,
        availableStrips,
        loosePieces,
        pricePerStrip: Number(inv.price_per_strip || 0),
        pricePerPiece: Number(inv.price_per_piece || 0),
        status,
      };
    });
  }, [inventory, medicines, batches, todayStr]);

  // Filtering & Sorting
  const filteredItems = useMemo(() => {
    let list = enrichedInventory.filter((item) => {
      const query = searchTerm.toLowerCase().trim();
      const matchesSearch = 
        !query ||
        item.medicine_name.toLowerCase().includes(query) ||
        item.generic_name.toLowerCase().includes(query) ||
        item.batch_number.toLowerCase().includes(query) ||
        item.strength.toLowerCase().includes(query) ||
        item.manufacturer.toLowerCase().includes(query);

      const matchesStatus = 
        statusFilter === 'all' || 
        item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    list.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.medicine_name.localeCompare(b.medicine_name);
      } else if (sortBy === 'stock') {
        comparison = a.totalPieces - b.totalPieces;
      } else if (sortBy === 'expiry') {
        comparison = (a.expiry_date || '').localeCompare(b.expiry_date || '');
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return list;
  }, [enrichedInventory, searchTerm, statusFilter, sortBy, sortOrder]);

  const handleOpenAdjust = (item) => {
    setEditingItem(item);
    setAdjustPieces(item.totalPieces.toString());
    setAdjustReason('Routine stock count reconciliation');
  };

  const handleSaveAdjustment = async (e) => {
    e.preventDefault();
    if (!editingItem) return;
    const pieces = parseInt(adjustPieces, 10);
    if (isNaN(pieces) || pieces < 0) {
      alert('Total pieces must be a non-negative number.');
      return;
    }

    try {
      await adjustStock({
        inventoryId: editingItem.id,
        newTotalPieces: pieces,
        reason: adjustReason,
      });
      setEditingItem(null);
    } catch (err) {
      alert(err.message || 'Failed to adjust stock');
    }
  };

  const handleDeleteItem = async (item) => {
    if (confirm(`Are you sure you want to delete ${item.medicine_name} (${item.batch_number}) from your pharmacy catalog?`)) {
      try {
        await deleteInventoryItem(item.id);
      } catch (err) {
        alert(err.message || 'Failed to delete item');
      }
    }
  };

  // Live conversion calculations for adjust modal
  const adjustPiecesNum = parseInt(adjustPieces, 10) || 0;
  const adjustStripsCalculated = editingItem ? Math.floor(adjustPiecesNum / editingItem.piecesPerStrip) : 0;
  const adjustLooseCalculated = editingItem ? adjustPiecesNum % editingItem.piecesPerStrip : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Inventory & Strip/Piece Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Internal source of truth is total pieces. Live calculation for strips and loose units.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setActiveTab('add-stock')}
          leftIcon={<PlusCircle className="w-4 h-4" />}
        >
          Add New Stock
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-card flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search medicine, salt composition, batch number, strength..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-primary font-medium"
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
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors whitespace-nowrap cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-primary text-white border-primary shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2 w-full md:w-auto text-xs text-slate-600">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:border-primary"
          >
            <option value="name">Sort by Name</option>
            <option value="stock">Sort by Stock</option>
            <option value="expiry">Sort by Expiry</option>
          </select>
        </div>
      </div>

      {/* Main Inventory Table (Section 23) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card overflow-hidden">
        {filteredItems.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No Medicines Matching Filter"
            description={
              searchTerm
                ? `No inventory matches "${searchTerm}". Try clearing your search term or adjusting status filter.`
                : 'Your pharmacy inventory is empty. Add your first medicine manually or use the AI packaging scanner.'
            }
            actionLabel="Add Medicine"
            onAction={() => setActiveTab('add-stock')}
            secondaryActionLabel={searchTerm ? 'Clear Search' : undefined}
            onSecondaryAction={() => setSearchTerm('')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200/80 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4 font-semibold">Medicine Details</th>
                  <th className="py-3 px-4 font-semibold">Batch Number</th>
                  <th className="py-3 px-4 font-semibold">Expiry Date</th>
                  <th className="py-3 px-4 font-semibold">Strip Config</th>
                  <th className="py-3 px-4 font-semibold">Current Stock</th>
                  <th className="py-3 px-4 font-semibold text-right">Pricing (₹)</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                  <th className="py-3 px-4 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Medicine */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-slate-900 text-sm">{item.medicine_name}</span>
                        {item.strength && (
                          <span className="bg-blue-50 text-primary text-[10px] font-bold px-1.5 py-0.2 rounded border border-blue-200">
                            {item.strength}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {item.generic_name && <span>{item.generic_name}</span>}
                        {item.brand && <span> • {item.brand}</span>}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {item.manufacturer}
                      </div>
                    </td>

                    {/* Batch */}
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                      {item.batch_number}
                    </td>

                    {/* Expiry */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{item.formatted_expiry}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{item.expiry_date}</div>
                    </td>

                    {/* Pack size */}
                    <td className="py-3.5 px-4 text-slate-600 font-mono">
                      {item.piecesPerStrip} pcs / strip
                    </td>

                    {/* Stock (Strips + Loose + Total) */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-baseline gap-1">
                        <span className="font-black text-slate-900 text-sm font-mono">{item.totalPieces}</span>
                        <span className="text-[10px] text-slate-500">total pcs</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        {item.availableStrips} strip(s) + {item.loosePieces} loose
                      </div>
                    </td>

                    {/* Price */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="font-bold text-slate-900 font-mono">
                        ₹{item.pricePerStrip.toFixed(2)} <span className="text-[10px] text-slate-400 font-normal">/ strip</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        ₹{item.pricePerPiece.toFixed(2)} / pc
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4 text-center">
                      <StatusBadge status={item.status} size="xs" />
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenAdjust(item)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-primary hover:text-white text-slate-600 transition-colors cursor-pointer"
                          title="Adjust physical stock pieces count"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-400 transition-colors cursor-pointer"
                          title="Delete catalog record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stock Adjustment Modal */}
      {editingItem && (
        <Modal
          isOpen={Boolean(editingItem)}
          onClose={() => setEditingItem(null)}
          title={`Adjust Physical Stock: ${editingItem.medicine_name}`}
          subtitle={`Batch: ${editingItem.batch_number} • Current Total: ${editingItem.totalPieces} pieces`}
        >
          <form onSubmit={handleSaveAdjustment} className="space-y-4 text-xs">
            {/* Strip / Piece Calculation Helper (Section 29) */}
            <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3.5 space-y-2">
              <span className="font-bold text-primary block">
                Strip & Piece Inventory Helper
              </span>
              <p className="text-slate-600 text-[11px]">
                Pack configuration: <strong>1 strip = {editingItem.piecesPerStrip} pieces</strong>.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
                <div className="bg-white p-2 rounded-lg border border-blue-100">
                  <span className="text-[10px] text-slate-400 block">Converted Strips</span>
                  <span className="font-bold text-slate-900 text-sm">{adjustStripsCalculated} strips</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-blue-100">
                  <span className="text-[10px] text-slate-400 block">Remaining Loose Pieces</span>
                  <span className="font-bold text-slate-900 text-sm">{adjustLooseCalculated} loose</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                New Total Pieces Count *
              </label>
              <input
                type="number"
                min="0"
                value={adjustPieces}
                onChange={(e) => setAdjustPieces(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 font-mono focus:outline-none focus:border-primary"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Enter the exact total number of tablets/capsules counted on shelf.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Adjustment Reason (Auditable) *
              </label>
              <input
                type="text"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-primary"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingItem(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
              >
                Save Adjustment
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
