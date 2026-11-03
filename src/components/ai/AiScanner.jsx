import React, { useState, useRef, useEffect } from 'react';
import { aiApi } from '../../api/aiApi';
import { usePharmacy } from '../../context/PharmacyContext';
import { 
  Camera, 
  Upload, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  ArrowRight, 
  ShieldAlert,
  Info,
  Eye,
  FileCheck,
  Calendar,
  Layers,
  HelpCircle
} from 'lucide-react';
import { Button } from '../ui/Button';
import { formatMedicineDate } from '../../utils/dateFormatter';

export const AiScanner = ({ onProceedToAddStock }) => {
  const { pharmacy } = usePharmacy();
  const fileInputRef = useRef(null);

  const [imagePreview, setImagePreview] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzingStatus, setAnalyzingStatus] = useState('Analyzing medicine packaging...');
  const [scanResult, setScanResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Editable fields verified by pharmacist
  const [verifiedData, setVerifiedData] = useState({
    medicine_name: '',
    generic_name: '',
    brand: '',
    strength: '',
    manufacturer: '',
    batch_number: '',
    manufacturing_date: '',
    expiry_date: '',
    pieces_per_strip: 10,
    price_per_strip: 50,
  });

  // Cycle animated scanning steps during AI analysis (Section 26)
  useEffect(() => {
    let timer1, timer2;
    if (analyzing) {
      setAnalyzingStatus('Analyzing medicine packaging...');
      timer1 = setTimeout(() => {
        setAnalyzingStatus('Reading medicine name, salt & batch...');
      }, 1400);
      timer2 = setTimeout(() => {
        setAnalyzingStatus('Preparing inventory & expiry details...');
      }, 2800);
    }
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [analyzing]);

  // Handle image selection
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please upload a valid image file (JPEG, PNG, WebP).');
      return;
    }

    setErrorMessage(null);
    setScanResult(null);

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result);
      setImageBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Run AI Analysis via backend Gemma 4 Vision API endpoint
  const handleRunAiScan = async () => {
    if (!imageBase64) {
      setErrorMessage('Please upload or capture a photo of a medicine strip/packaging first.');
      return;
    }

    setAnalyzing(true);
    setErrorMessage(null);

    try {
      const data = await aiApi.scanMedicine(imageBase64);
      processScanOutput(data);
    } catch (err) {
      console.warn('Backend AI scanner notice:', err);
      processScanOutput({
        success: false,
        confidence: 30,
        needs_manual_verification: true,
        extracted_data: {
          medicine_name: '',
          generic_name: '',
          strength: '',
          manufacturer: '',
          batch_number: '',
          manufacturing_date: '',
          expiry_date: '',
          pieces_per_strip: 10,
          price_per_strip: 50,
        },
        issues: [err.response?.data?.detail || err.message || 'Image clarity requires manual pharmacist entry.'],
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const processScanOutput = (data) => {
    setScanResult(data);
    const ext = data.extracted_data || {};
    setVerifiedData({
      medicine_name: ext.medicine_name || '',
      generic_name: ext.generic_name || '',
      brand: ext.brand || '',
      strength: ext.strength || '',
      manufacturer: ext.manufacturer || '',
      batch_number: ext.batch_number || '',
      manufacturing_date: ext.manufacturing_date || '',
      expiry_date: ext.expiry_date || '',
      pieces_per_strip: ext.pieces_per_strip || 10,
      price_per_strip: ext.price_per_strip || 50,
    });
  };

  const handleProceed = () => {
    if (onProceedToAddStock) {
      onProceedToAddStock(verifiedData);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-blue-100 text-primary font-bold">
            <Camera className="w-5 h-5" />
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            AI Medicine Packaging Scanner
          </h1>
          <span className="bg-gradient-to-r from-primary to-ai text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            Gemma 4 Vision
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Upload medicine strips or packaging. Google Gemma 4 Vision automatically extracts brand name, active salt, batch number, and expiry date.
        </p>
      </div>

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3.5 rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Grid: Upload & Preview on Left, Verification on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Image Capture Area (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-card space-y-4">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
              <span>Packaging Capture</span>
              <span className="text-[10px] text-slate-400 font-normal">Foil, Box, or Vial</span>
            </h2>

            {/* Dropzone / Preview Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
                imagePreview 
                  ? 'border-primary/50 bg-blue-50/20' 
                  : 'border-slate-300 hover:border-primary bg-slate-50 hover:bg-slate-50/80'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageChange}
                className="hidden"
              />

              {imagePreview ? (
                <div className="relative group">
                  <img
                    src={imagePreview}
                    alt="Packaging preview"
                    className="max-h-56 mx-auto rounded-xl object-contain shadow-xs"
                  />
                  <div className="mt-2.5 text-xs text-primary font-semibold flex items-center justify-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Click to change or retake photo</span>
                  </div>
                </div>
              ) : (
                <div className="py-8 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-primary flex items-center justify-center mx-auto shadow-xs">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-slate-800">Click to upload or take a photo</p>
                    <p className="text-[11px] text-slate-400 mt-1">Supports camera capture on mobile & desktop</p>
                  </div>
                </div>
              )}
            </div>

            {/* AI Scanning Status or Button */}
            {analyzing ? (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 text-center space-y-2">
                <div className="flex items-center justify-center gap-2 text-xs font-bold text-primary">
                  <Sparkles className="w-4 h-4 animate-spin text-ai" />
                  <span>{analyzingStatus}</span>
                </div>
                <div className="w-full bg-blue-200/60 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-gradient-to-r from-primary to-ai h-full animate-pulse rounded-full w-3/4" />
                </div>
              </div>
            ) : (
              <Button
                variant="ai"
                size="md"
                className="w-full"
                disabled={!imagePreview || analyzing}
                onClick={handleRunAiScan}
                leftIcon={<Sparkles className="w-4 h-4" />}
              >
                Analyze Packaging with Gemma 4
              </Button>
            )}
          </div>
        </div>

        {/* Right Column: AI Extraction & Pharmacist Verification Form (7 cols) */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-card space-y-5">
            <div className="flex items-start sm:items-center justify-between pb-3.5 border-b border-slate-100 gap-3">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  Pharmacist Verification & Editing Form
                </h2>
                <p className="text-xs text-slate-500">
                  AI output is never automatically saved without pharmacist confirmation.
                </p>
              </div>

              {scanResult && (
                <div className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 flex-shrink-0 ${
                  scanResult.confidence >= 75 && !scanResult.needs_manual_verification
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  {scanResult.confidence >= 75 && !scanResult.needs_manual_verification ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5" />
                  )}
                  <span>{scanResult.confidence}% AI Confidence</span>
                </div>
              )}
            </div>

            {/* Diagnostic Alert Box */}
            {scanResult?.issues && scanResult.issues.length > 0 && (
              <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span>Quality Diagnostic:</span>
                </div>
                <ul className="list-disc list-inside text-[11px] text-amber-800 space-y-0.5">
                  {scanResult.issues.map((issue, idx) => (
                    <li key={idx}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Editable Fields (Section 27) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Medicine Name *</label>
                <input
                  type="text"
                  value={verifiedData.medicine_name}
                  onChange={(e) => setVerifiedData({ ...verifiedData, medicine_name: e.target.value })}
                  placeholder="e.g. Augmentin 625 Duo"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 font-bold focus:outline-none focus:border-primary"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Generic Name / Composition</label>
                <input
                  type="text"
                  value={verifiedData.generic_name}
                  onChange={(e) => setVerifiedData({ ...verifiedData, generic_name: e.target.value })}
                  placeholder="e.g. Amoxicillin + Clavulanic Acid"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Strength</label>
                <input
                  type="text"
                  value={verifiedData.strength}
                  onChange={(e) => setVerifiedData({ ...verifiedData, strength: e.target.value })}
                  placeholder="e.g. 625 mg"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-primary font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Manufacturer</label>
                <input
                  type="text"
                  value={verifiedData.manufacturer}
                  onChange={(e) => setVerifiedData({ ...verifiedData, manufacturer: e.target.value })}
                  placeholder="e.g. GlaxoSmithKline"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Batch Number *</label>
                <input
                  type="text"
                  value={verifiedData.batch_number}
                  onChange={(e) => setVerifiedData({ ...verifiedData, batch_number: e.target.value })}
                  placeholder="e.g. BT-90281"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-primary font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Expiry Date * {verifiedData.expiry_date && <span className="text-primary font-normal">({formatMedicineDate(verifiedData.expiry_date)})</span>}
                </label>
                <input
                  type="date"
                  value={verifiedData.expiry_date}
                  onChange={(e) => setVerifiedData({ ...verifiedData, expiry_date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-primary font-mono font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Pieces Per Strip *</label>
                <input
                  type="number"
                  min="1"
                  value={verifiedData.pieces_per_strip}
                  onChange={(e) => setVerifiedData({ ...verifiedData, pieces_per_strip: parseInt(e.target.value, 10) || 10 })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-primary font-mono font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Price Per Strip (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={verifiedData.price_per_strip}
                  onChange={(e) => setVerifiedData({ ...verifiedData, price_per_strip: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-primary font-mono font-semibold"
                />
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Data transfers to Add Stock to select supplier and enter strip quantity.
              </span>

              <Button
                variant="success"
                size="sm"
                disabled={!verifiedData.medicine_name || !verifiedData.batch_number}
                onClick={handleProceed}
                leftIcon={<FileCheck className="w-4 h-4" />}
              >
                Confirm & Transfer to Add Stock
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
