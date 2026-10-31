import React, { useState, useEffect } from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import { 
  PackagePlus, 
  Camera, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Truck, 
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';

export const AddStock = ({ initialData, onDone, onGoToScanner }) => {
  const { suppliers, addStock, medicines } = usePharmacy();

  const [medicineName, setMedicineName] = useState(initialData?.medicine_name || '');
  const [genericName, setGenericName] = useState(initialData?.generic_name || '');
  const [brand, setBrand] = useState(initialData?.brand || '');
  const [strength, setStrength] = useState(initialData?.strength || '');
  const [category, setCategory] = useState(initialData?.category || 'General');
  const [manufacturer, setManufacturer] = useState(initialData?.manufacturer || '');
  
  // Batch & Stock
  const [batchNumber, setBatchNumber] = useState(initialData?.batch_number || '');
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || '');
  const [mfgDate, setMfgDate] = useState(initialData?.manufacturing_date || '');
  const [expiryDate, setExpiryDate] = useState(initialData?.expiry_date || '');
  const [piecesPerStrip, setPiecesPerStrip] = useState(initialData?.pieces_per_strip || 10);
  const [quantityStrips, setQuantityStrips] = useState('');
  const [pricePerStrip, setPricePerStrip] = useState(initialData?.price_per_strip || '');
  const [minStockPieces, setMinStockPieces] = useState(20);

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Sync if initialData changes from AI scanner
  useEffect(() => {
    if (initialData) {
      if (initialData.medicine_name) setMedicineName(initialData.medicine_name);
      if (initialData.generic_name) setGenericName(initialData.generic_name);
      if (initialData.brand) setBrand(initialData.brand);
      if (initialData.strength) setStrength(initialData.strength);
      if (initialData.manufacturer) setManufacturer(initialData.manufacturer);
      if (initialData.batch_number) setBatchNumber(initialData.batch_number);
      if (initialData.manufacturing_date) setMfgDate(initialData.manufacturing_date);
      if (initialData.expiry_date) setExpiryDate(initialData.expiry_date);
      if (initialData.pieces_per_strip) setPiecesPerStrip(initialData.pieces_per_strip);
      if (initialData.price_per_strip) setPricePerStrip(initialData.price_per_strip);
    }
  }, [initialData]);

  // Computed Values
  const totalPieces = (parseInt(quantityStrips, 10) || 0) * (parseInt(piecesPerStrip, 10) || 10);
  const calculatedPricePerPiece = (parseFloat(pricePerStrip) || 0) / (parseInt(piecesPerStrip, 10) || 10);

  // When medicineName is typed, check if it's already an existing medicine to auto-populate generic, brand, strength
  const handleMedicineSelect = (name) => {
    setMedicineName(name);
    const existing = medicines.find(m => m.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      if (existing.generic_name) setGenericName(existing.generic_name);
      if (existing.brand) setBrand(existing.brand);
      if (existing.strength) setStrength(existing.strength);
      if (existing.category) setCategory(existing.category);
      if (existing.manufacturer) setManufacturer(existing.manufacturer);
      if (existing.pieces_per_strip) setPiecesPerStrip(existing.pieces_per_strip);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!medicineName || !batchNumber || !expiryDate) {
      setErrorMsg('Please complete Medicine Name, Batch Number, and Expiry Date.');
      setLoading(false);
      return;
    }

    try {
      await addStock({
        medicine_name: medicineName.trim(),
        generic_name: genericName.trim(),
        brand: brand.trim(),
        strength: strength.trim(),
        category,
        manufacturer: manufacturer.trim(),
        batch_number: batchNumber.trim(),
        supplier_id: supplierId || null,
        manufacturing_date: mfgDate || null,
        expiry_date: expiryDate,
        pieces_per_strip: parseInt(piecesPerStrip, 10) || 10,
        quantity_strips: parseInt(quantityStrips, 10) || 0,
        price_per_strip: parseFloat(pricePerStrip) || 0,
        price_per_piece: calculatedPricePerPiece,
        min_stock_pieces: parseInt(minStockPieces, 10) || 20,
      });

      setSuccessMsg(`Successfully added ${quantityStrips} strip(s) (${totalPieces} pieces) of ${medicineName} (Batch: ${batchNumber})!`);
      
      // Reset form fields
      setBatchNumber('');
      setQuantityStrips('');
      setPricePerStrip('');

      if (onDone) {
        setTimeout(onDone, 1200);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to add stock.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Banner with Mode Selector */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 font-bold">
              <PackagePlus className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Inward Stock Entry
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Register new medicine batches, define strip sizing, pricing, and audit inward movements.
          </p>
        </div>

        <button
          onClick={onGoToScanner}
          className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-2 transition-all shadow-sm"
        >
          <Camera className="w-4 h-4 text-blue-400" />
          <span>Use Gemma 4 AI Scan</span>
        </button>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3.5 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3.5 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Medicine Information */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100">
            1. Medicine Master Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Medicine Commercial Name *
              </label>
              <input
                type="text"
                required
                value={medicineName}
                onChange={(e) => handleMedicineSelect(e.target.value)}
                placeholder="e.g. Dolo 650, Augmentin 625 Duo"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Strength / Dosage
              </label>
              <input
                type="text"
                value={strength}
                onChange={(e) => setStrength(e.target.value)}
                placeholder="e.g. 650mg, 500mg, 10ml"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Generic Name / Active Ingredients
              </label>
              <input
                type="text"
                value={genericName}
                onChange={(e) => setGenericName(e.target.value)}
                placeholder="e.g. Paracetamol, Amoxicillin + Clavulanic Acid"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500"
              >
                <option value="General">General</option>
                <option value="Antipyretic / Analgesic">Antipyretic / Analgesic</option>
                <option value="Antibiotic">Antibiotic</option>
                <option value="Antacid / PPI">Antacid / PPI</option>
                <option value="Antihistamine / Allergy">Antihistamine / Allergy</option>
                <option value="Cardiovascular">Cardiovascular</option>
                <option value="Antidiabetic">Antidiabetic</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Brand / Marketer
              </label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. Micro Labs, GSK"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Manufacturer
              </label>
              <input
                type="text"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="e.g. Micro Labs Ltd, GlaxoSmithKline"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Batch, Supplier & Expiry */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center justify-between">
            <span>2. Batch & Supplier Association</span>
            <span className="text-[10px] text-blue-600 font-normal">Supports Multiple Batches</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Batch Number *
              </label>
              <input
                type="text"
                required
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                placeholder="e.g. DL-8841"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Supplier
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500"
              >
                <option value="">-- No Supplier Linked --</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Manufacturing Date
              </label>
              <input
                type="date"
                value={mfgDate}
                onChange={(e) => setMfgDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Expiry Date *
              </label>
              <input
                type="date"
                required
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono font-bold text-rose-600"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Quantity & Sizing */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100">
            3. Quantity, Strip Sizing & Pricing
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Pieces Per Strip *
              </label>
              <input
                type="number"
                min="1"
                required
                value={piecesPerStrip}
                onChange={(e) => setPiecesPerStrip(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono font-semibold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Quantity (Full Strips) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={quantityStrips}
                onChange={(e) => setQuantityStrips(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Price Per Strip (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={pricePerStrip}
                onChange={(e) => setPricePerStrip(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono font-semibold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Min Stock Alert (Pieces)
              </label>
              <input
                type="number"
                min="0"
                value={minStockPieces}
                onChange={(e) => setMinStockPieces(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          {/* Computed Summary Box */}
          <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-slate-500 block">Total Pieces Added (Source of Truth):</span>
              <span className="text-base font-extrabold text-blue-900 font-mono">
                {totalPieces} pieces
              </span>
            </div>

            <div className="border-l border-blue-200 pl-4">
              <span className="text-slate-500 block">Calculated Piece Price:</span>
              <span className="text-base font-bold text-slate-800 font-mono">
                ₹{calculatedPricePerPiece.toFixed(2)} / piece
              </span>
            </div>

            <div className="border-l border-blue-200 pl-4">
              <span className="text-slate-500 block">Total Batch Inward Value:</span>
              <span className="text-base font-bold text-slate-800 font-mono">
                ₹{((parseFloat(pricePerStrip) || 0) * (parseInt(quantityStrips, 10) || 0)).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition-all shadow-md shadow-blue-500/20"
          >
            <span>{loading ? 'Adding Stock...' : 'Save Stock to Inventory'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
