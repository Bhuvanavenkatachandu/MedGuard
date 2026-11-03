import React, { useState, useEffect } from 'react';
import { usePharmacy } from '../../../shared/context/PharmacyContext';
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
import { Button } from '../../../shared/components/ui/Button';
import { formatMedicineDate } from '../../../shared/utils/dateFormatter';

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

      setSuccessMsg(`Successfully added ${quantityStrips} strip(s) of ${medicineName} (${totalPieces} pieces).`);
      setTimeout(() => {
        if (onDone) onDone();
      }, 1200);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to add stock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-100 text-primary font-bold">
              <PackagePlus className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Inward Stock Addition
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Register new medicine batches or replenish existing stock with FEFO date tracking.
          </p>
        </div>

        {onGoToScanner && (
          <Button
            variant="ai"
            size="sm"
            onClick={onGoToScanner}
            leftIcon={<Camera className="w-4 h-4" />}
          >
            Auto-fill with AI Scanner
          </Button>
        )}
      </div>

      {initialData && (
        <div className="bg-blue-50 border border-blue-200/90 text-primary p-3.5 rounded-2xl flex items-center gap-2.5 text-xs">
          <Sparkles className="w-4 h-4 text-ai flex-shrink-0" />
          <span>Fields prefilled from Gemma 4 Vision AI scan. Please enter inward quantity and verify supplier.</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-2xl flex items-center gap-2 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-2xl flex items-center gap-2 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Form (Section 25) */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-card space-y-6">
        {/* Step 1: Medicine Information */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">1</span>
            <span>Medicine Specification & Formulation</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Medicine Trade / Brand Name *</label>
              <input
                type="text"
                required
                value={medicineName}
                onChange={(e) => handleMedicineSelect(e.target.value)}
                placeholder="e.g. Dolo 650, Augmentin 625 Duo, Azithral"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 font-bold focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Generic Name / Salt</label>
              <input
                type="text"
                value={genericName}
                onChange={(e) => setGenericName(e.target.value)}
                placeholder="e.g. Paracetamol IP"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Strength / Dosage</label>
              <input
                type="text"
                value={strength}
                onChange={(e) => setStrength(e.target.value)}
                placeholder="e.g. 650mg, 500mg/125mg"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-primary font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Manufacturer</label>
              <input
                type="text"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="e.g. Micro Labs, GSK, Cipla"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-primary"
              >
                <option value="General">General Medicine</option>
                <option value="Antibiotic">Antibiotic</option>
                <option value="Antipyretic / Analgesic">Antipyretic / Pain Relief</option>
                <option value="Cardiology">Cardiology</option>
                <option value="Diabetology">Diabetology</option>
                <option value="Respiratory">Respiratory</option>
                <option value="Vitamins & Supplements">Vitamins & Supplements</option>
              </select>
            </div>
          </div>
        </div>

        {/* Step 2: Batch & Regulatory Dates */}
        <div className="space-y-4 pt-2">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">2</span>
            <span>Batch & Expiry Controls (FEFO)</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Batch Number *</label>
              <input
                type="text"
                required
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                placeholder="e.g. DL-8841-B"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Manufacturing Date</label>
              <input
                type="date"
                value={mfgDate}
                onChange={(e) => setMfgDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Expiry Date * {expiryDate && <span className="text-emerald-700 font-normal">({formatMedicineDate(expiryDate)})</span>}
              </label>
              <input
                type="date"
                required
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-primary"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block font-semibold text-slate-700 mb-1">Procurement Supplier</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-primary"
              >
                <option value="">Direct Distributor / Cash Purchase</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.contact_person || 'Distributor'} • {s.phone})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Step 3: Strip & Piece Configuration (Section 29) */}
        <div className="space-y-4 pt-2">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">3</span>
            <span>Strip & Piece Inventory Configuration</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Pieces Per Strip *</label>
              <input
                type="number"
                min="1"
                required
                value={piecesPerStrip}
                onChange={(e) => setPiecesPerStrip(parseInt(e.target.value, 10) || 10)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-primary"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Tablets or capsules per blister strip</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Quantity (Full Strips) *</label>
              <input
                type="number"
                min="1"
                required
                value={quantityStrips}
                onChange={(e) => setQuantityStrips(e.target.value)}
                placeholder="e.g. 20 strips"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-primary"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Number of sealed whole strips</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Retail Price Per Strip (₹) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={pricePerStrip}
                onChange={(e) => setPricePerStrip(e.target.value)}
                placeholder="e.g. 45.00"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-primary"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Customer retail MRP per strip</span>
            </div>
          </div>

          {/* Automatic Strip-to-Piece Conversion Live Box */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/90 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Pieces Added</span>
              <div className="text-base font-black text-primary font-mono mt-0.5">{totalPieces} pcs</div>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Price Per Piece</span>
              <div className="text-base font-bold text-slate-900 font-mono mt-0.5">₹{calculatedPricePerPiece.toFixed(2)}</div>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Full Strips</span>
              <div className="text-base font-bold text-slate-900 font-mono mt-0.5">{quantityStrips || 0} strips</div>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Batch Value</span>
              <div className="text-base font-bold text-emerald-700 font-mono mt-0.5">
                ₹{((parseInt(quantityStrips, 10) || 0) * (parseFloat(pricePerStrip) || 0)).toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <Button
            variant="outline"
            size="md"
            type="button"
            onClick={onDone}
          >
            Cancel
          </Button>

          <Button
            variant="primary"
            size="md"
            type="submit"
            isLoading={loading}
            leftIcon={<PackagePlus className="w-4 h-4" />}
          >
            Confirm & Save to Pharmacy Inventory
          </Button>
        </div>
      </form>
    </div>
  );
};
