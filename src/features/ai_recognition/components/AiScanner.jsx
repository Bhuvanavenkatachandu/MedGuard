import React, { useState, useRef, useEffect } from 'react';
import { aiApi } from '../services/aiApi';
import { usePharmacy } from '../../../shared/context/PharmacyContext';
import { 
  Camera, 
  Upload, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  ShieldAlert,
  FileCheck,
  Zap,
  Cpu,
  Layers,
  ChevronDown,
  ChevronUp,
  Crosshair
} from 'lucide-react';
import { Button } from '../../../shared/components/ui/Button';
import { formatMedicineDate } from '../../../shared/utils/dateFormatter';

export const AiScanner = ({ onProceedToAddStock }) => {
  const { pharmacy } = usePharmacy();
  const fileInputRef = useRef(null);

  const [imagePreview, setImagePreview] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzingStatus, setAnalyzingStatus] = useState('Step 1/3: Running Tesseract OCR & detecting text regions...');
  const [scanResult, setScanResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(false);

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
    pieces_per_strip: '',
    price_per_strip: '',
  });

  // Cycle animated scanning steps matching the hybrid pipeline
  useEffect(() => {
    let timer1, timer2;
    if (analyzing) {
      setAnalyzingStatus('Step 1/3: Running Tesseract OCR & detecting text regions...');
      timer1 = setTimeout(() => {
        setAnalyzingStatus('Step 2/3: Validating field confidences, dates & batch syntax...');
      }, 1300);
      timer2 = setTimeout(() => {
        setAnalyzingStatus('Step 3/3: Evaluating trusted gate / recovering with Gemma Vision...');
      }, 2700);
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

  // Run Hybrid Analysis
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
      console.warn('Hybrid scanner notice:', err);
      processScanOutput({
        success: false,
        confidence: 30,
        source: 'manual_fallback',
        validation_status: 'uncertain',
        processing: {
          ocr_used: true,
          ocr_confidence: 0,
          validation: 'uncertain',
          ai_fallback_used: false,
          reason: [err.response?.data?.detail || err.message || 'Image clarity requires manual pharmacist entry.'],
        },
        needs_manual_verification: true,
        extracted_data: {
          medicine_name: '',
          generic_name: '',
          strength: '',
          manufacturer: '',
          batch_number: '',
          manufacturing_date: '',
          expiry_date: '',
          pieces_per_strip: '',
          price_per_strip: '',
        },
        issues: [err.response?.data?.detail || err.message || 'Image clarity requires manual pharmacist entry.'],
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const processScanOutput = (data) => {
    setScanResult(data);
    const ext = data.extracted_data || data || {};
    setVerifiedData({
      medicine_name: ext.medicine_name || data.medicine_name || '',
      generic_name: ext.generic_name || '',
      brand: ext.brand || '',
      strength: ext.strength || data.strength || '',
      manufacturer: ext.manufacturer || '',
      batch_number: ext.batch_number || data.batch_number || '',
      manufacturing_date: ext.manufacturing_date || data.manufacturing_date || '',
      expiry_date: ext.expiry_date || data.expiry_date || '',
      pieces_per_strip: ext.pieces_per_strip ?? data.quantity ?? '',
      price_per_strip: ext.price_per_strip ?? '',
    });
  };

  const handleProceed = () => {
    if (onProceedToAddStock) {
      onProceedToAddStock(verifiedData);
    }
  };

  const isTrustedPath = scanResult?.validation_status === 'trusted' || scanResult?.source === 'tesseract';
  const isAiFallback = scanResult?.processing?.ai_fallback_used || scanResult?.source === 'gemma';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="p-1.5 rounded-lg bg-blue-100 text-primary font-bold">
            <Camera className="w-5 h-5" />
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Hybrid Medicine Packaging Scanner
          </h1>
          <span className="bg-gradient-to-r from-emerald-600 to-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
            <Zap className="w-3 h-3" />
            Tesseract OCR + Gemma 4 Vision
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          High-efficiency hybrid pipeline: executes fast local OCR first, validates field confidence & dates, and routes to Gemma 4 Vision only when needed.
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
              <span className="text-[10px] text-slate-400 font-normal">Foil Strip, Box, or Vial</span>
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

            {/* Pipeline Scanning Status or Button */}
            {analyzing ? (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 text-center space-y-2">
                <div className="flex items-center justify-center gap-2 text-xs font-bold text-primary">
                  <Sparkles className="w-4 h-4 animate-spin text-ai" />
                  <span>{analyzingStatus}</span>
                </div>
                <div className="w-full bg-blue-200/60 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-gradient-to-r from-emerald-500 via-primary to-ai h-full animate-pulse rounded-full w-4/5" />
                </div>
              </div>
            ) : (
              <Button
                variant="ai"
                size="md"
                className="w-full"
                disabled={!imagePreview || analyzing}
                onClick={handleRunAiScan}
                leftIcon={<Zap className="w-4 h-4 text-amber-300" />}
              >
                Run Hybrid Scan (OCR First)
              </Button>
            )}

            {/* Bounding Boxes Toggle (if detected) */}
            {scanResult?.bounding_boxes && scanResult.bounding_boxes.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBoundingBoxes(!showBoundingBoxes)}
                  className="w-full text-xs font-semibold text-slate-600 hover:text-primary flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-blue-50/50 transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Crosshair className="w-3.5 h-3.5 text-primary" />
                    <span>Detected Text Regions ({scanResult.bounding_boxes.length})</span>
                  </span>
                  {showBoundingBoxes ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showBoundingBoxes && (
                  <div className="mt-2 p-2.5 max-h-48 overflow-y-auto space-y-1.5 bg-slate-900 rounded-xl text-[11px] font-mono text-slate-200">
                    {scanResult.bounding_boxes.map((box, idx) => (
                      <div key={idx} className="flex items-center justify-between border-b border-slate-800 pb-1">
                        <span className="truncate max-w-[140px] text-amber-400 font-bold">"{box.text}"</span>
                        <div className="flex items-center gap-2 text-slate-400 text-[10px]">
                          <span className={box.confidence >= 80 ? 'text-emerald-400' : 'text-amber-400'}>
                            {box.confidence}%
                          </span>
                          <span>[{box.box?.x},{box.box?.y},{box.box?.width}x{box.box?.height}]</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Extraction & Pharmacist Verification Form (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-card space-y-5">
            <div className="flex flex-wrap items-start sm:items-center justify-between pb-3.5 border-b border-slate-100 gap-3">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  Pharmacist Verification & Editing Form
                </h2>
                <p className="text-xs text-slate-500">
                  AI & OCR output is verified by the pharmacist before stock commitment.
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
                  <span>{scanResult.confidence}% Confidence</span>
                </div>
              )}
            </div>

            {/* Hybrid Pipeline Explainability Decision Card */}
            {scanResult && (
              <div className={`rounded-xl p-3.5 border text-xs space-y-2 ${
                isTrustedPath
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : 'bg-blue-50/70 border-blue-200 text-slate-900'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="font-bold flex items-center gap-1.5">
                    {isTrustedPath ? (
                      <>
                        <Zap className="w-4 h-4 text-emerald-600" />
                        <span>Path: Trusted Tesseract OCR (0 AI Calls Used)</span>
                      </>
                    ) : (
                      <>
                        <Cpu className="w-4 h-4 text-primary" />
                        <span>Path: Gemma 4 Vision Fallback (AI Validated)</span>
                      </>
                    )}
                  </div>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold bg-white/80 border border-slate-200">
                    Status: {scanResult.validation_status}
                  </span>
                </div>

                <p className="text-[11px] leading-relaxed text-slate-600">
                  {isTrustedPath
                    ? 'All critical fields (Name, Strength, Batch, Expiry) passed confidence thresholds and structural domain validation. Processed immediately with zero AI API overhead.'
                    : 'OCR encountered ambiguous text or low field confidence. Gemma 4 Vision inspected the packaging photo to visually recover and corroborate medicine attributes.'}
                </p>

                {/* Explain decision reasons */}
                {scanResult.processing?.reason && scanResult.processing.reason.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-200/60 space-y-1">
                    <span className="font-bold text-[10px] text-slate-700 uppercase tracking-wider">
                      Decision Triggers & Diagnostics:
                    </span>
                    <ul className="list-disc list-inside text-[11px] text-slate-700 space-y-0.5">
                      {scanResult.processing.reason.map((reason, idx) => (
                        <li key={idx}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Editable Fields */}
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
                  type="text"
                  value={verifiedData.expiry_date}
                  onChange={(e) => setVerifiedData({ ...verifiedData, expiry_date: e.target.value })}
                  placeholder="MM/YYYY or YYYY-MM-DD"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-primary font-mono font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Pieces Per Strip *</label>
                <input
                  type="number"
                  min="1"
                  value={verifiedData.pieces_per_strip}
                  onChange={(e) => setVerifiedData({ ...verifiedData, pieces_per_strip: e.target.value === '' ? '' : parseInt(e.target.value, 10) })}
                  placeholder="e.g. 10"
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
                  onChange={(e) => setVerifiedData({ ...verifiedData, price_per_strip: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                  placeholder="e.g. 45.00"
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
