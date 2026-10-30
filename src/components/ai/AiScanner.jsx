import React, { useState, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
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
  FileCheck
} from 'lucide-react';

export const AiScanner = ({ onProceedToAddStock }) => {
  const { pharmacy, suppliers } = usePharmacy();
  const fileInputRef = useRef(null);

  const [imagePreview, setImagePreview] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
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

  // Run AI Analysis via Supabase Edge Function or realistic local simulation
  const handleRunAiScan = async () => {
    if (!imageBase64) {
      setErrorMessage('Please upload or take a photo of a medicine package first.');
      return;
    }

    setAnalyzing(true);
    setErrorMessage(null);

    try {
      if (isSupabaseConfigured) {
        // Upload image to Supabase Storage bucket 'medicine-scans'
        let storageUrl = null;
        try {
          const fileName = `scan_${Date.now()}.jpg`;
          // Convert base64 to blob
          const res = await fetch(imageBase64);
          const blob = await res.blob();
          const { data: uploadData } = await supabase.storage
            .from('medicine-scans')
            .upload(fileName, blob, { contentType: 'image/jpeg' });
          
          if (uploadData) {
            const { data: pUrl } = supabase.storage.from('medicine-scans').getPublicUrl(fileName);
            storageUrl = pUrl.publicUrl;
          }
        } catch (stErr) {
          console.warn('Storage upload notice (continuing with base64 payload):', stErr);
        }

        // Call Supabase Edge Function
        const scanResponse = await fetch(`${supabase.supabaseUrl}/functions/v1/scan-medicine`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabase.supabaseKey,
          },
          body: JSON.stringify({
            image_url: storageUrl,
            image_base64: imageBase64,
            pharmacy_id: pharmacy?.id,
          }),
        });

        const data = await scanResponse.json();
        processScanOutput(data);
      } else {
        // Realistic client-side simulation of Gemma 4 OCR analysis
        await new Promise(r => setTimeout(r, 1400));
        
        // Simulates high-confidence extraction with proper verification flags
        const mockExtraction = {
          success: true,
          confidence: 88,
          needs_manual_verification: false,
          extracted_data: {
            medicine_name: 'Augmentin 625 Duo',
            generic_name: 'Amoxicillin and Potassium Clavulanate Tablets IP',
            brand: 'Augmentin',
            strength: '625mg',
            manufacturer: 'GlaxoSmithKline Pharmaceuticals Ltd',
            batch_number: 'AUG-8821B',
            manufacturing_date: '2025-06-01',
            expiry_date: '2027-05-31',
            pieces_per_strip: 10,
            unit_of_measure: 'tablet',
          },
          issues: ['Please confirm batch number from physical foil embossing.'],
        };
        processScanOutput(mockExtraction);
      }
    } catch (err) {
      console.error('Scan error:', err);
      // Fallback gracefully so pharmacist can continue manually
      setErrorMessage(`AI Scan service unavailable: ${err.message}. Pharmacist manual entry enabled.`);
      processScanOutput({
        success: false,
        confidence: 25,
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
        },
        issues: ['AI timeout or network failure. Manual verification required.'],
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
      price_per_strip: 120,
    });
  };

  const handleProceed = () => {
    if (onProceedToAddStock) {
      onProceedToAddStock(verifiedData);
    }
  };

  // Sample quick test images (simulated presets for review)
  const handleLoadDemoImage = (preset) => {
    setImagePreview(preset.url);
    setImageBase64(preset.url);
    setScanResult({
      success: true,
      confidence: preset.confidence,
      needs_manual_verification: preset.needsVerification,
      extracted_data: preset.data,
      issues: preset.issues,
    });
    setVerifiedData(preset.data);
  };

  const DEMO_SCANS = [
    {
      title: 'Dolo 650 Strip (Clear)',
      url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80',
      confidence: 94,
      needsVerification: false,
      issues: ['No packaging anomalies detected.'],
      data: {
        medicine_name: 'Dolo 650',
        generic_name: 'Paracetamol Tablets IP',
        brand: 'Micro Labs',
        strength: '650mg',
        manufacturer: 'Micro Labs Limited',
        batch_number: 'DL-9941X',
        manufacturing_date: '2025-02-15',
        expiry_date: '2027-01-31',
        pieces_per_strip: 15,
        price_per_strip: 34.00,
      }
    },
    {
      title: 'Blurry Box (Needs Verification)',
      url: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=600&auto=format&fit=crop&q=80',
      confidence: 48,
      needsVerification: true,
      issues: ['Blurry packaging detected', 'Batch number text faint or partially obscured'],
      data: {
        medicine_name: 'Cetriz 10',
        generic_name: 'Cetirizine Hydrochloride',
        brand: 'Dr. Reddy',
        strength: '10mg',
        manufacturer: 'Dr. Reddy\'s Laboratories',
        batch_number: 'CTZ-???',
        manufacturing_date: '',
        expiry_date: '',
        pieces_per_strip: 10,
        price_per_strip: 45.00,
      }
    }
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 font-bold">
            <Camera className="w-4 h-4" />
          </span>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            AI Medicine Packaging Scanner
          </h1>
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            Gemma 4 Vision
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Upload medicine strips or packaging. Gemma 4 automatically extracts name, generic salt, batch number, and expiry date.
        </p>
      </div>

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Grid: Upload & Preview on Left, Extracted Fields on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Image Capture Area (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
              <span>Packaging Capture</span>
              <span className="text-[10px] text-slate-400 font-normal">Foil, Box, or Bottle</span>
            </h2>

            {/* Dropzone / Preview Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                imagePreview 
                  ? 'border-blue-400 bg-blue-50/20' 
                  : 'border-slate-300 hover:border-blue-500 bg-slate-50/60 hover:bg-slate-50'
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
                    className="max-h-56 mx-auto rounded-lg object-contain shadow-xs"
                  />
                  <div className="mt-2 text-[11px] text-blue-600 font-semibold flex items-center justify-center gap-1">
                    <RefreshCw className="w-3 h-3" />
                    <span>Click to change or recapture</span>
                  </div>
                </div>
              ) : (
                <div className="py-8 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-700">Click to upload or take a photo</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Supports camera capture on mobile & desktop</p>
                  </div>
                </div>
              )}
            </div>

            {/* Action Button */}
            <button
              onClick={handleRunAiScan}
              disabled={!imagePreview || analyzing}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-500/20"
            >
              <Sparkles className={`w-4 h-4 ${analyzing ? 'animate-spin' : ''}`} />
              <span>{analyzing ? 'Gemma 4 is analyzing packaging...' : 'Analyze with Gemma 4 Vision'}</span>
            </button>

            {/* Quick Demo Pre-sets */}
            <div className="pt-3 border-t border-slate-100">
              <span className="text-[10px] text-slate-400 font-semibold block mb-2">Or load a demo scan:</span>
              <div className="flex flex-col gap-1.5">
                {DEMO_SCANS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleLoadDemoImage(preset)}
                    className="text-left text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg text-slate-700 flex items-center justify-between transition-colors"
                  >
                    <span>{preset.title}</span>
                    <span className="text-[10px] font-mono text-blue-600">{preset.confidence}% conf</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: AI Extraction & Pharmacist Verification Form (7 cols) */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-800">
                  Pharmacist Verification & Editing Form
                </h2>
                <p className="text-xs text-slate-400">
                  AI output is never automatically trusted without pharmacist confirmation.
                </p>
              </div>

              {scanResult && (
                <div className="flex items-center gap-2">
                  <div className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
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
                </div>
              )}
            </div>

            {/* Diagnostic Alert Box */}
            {scanResult?.issues && scanResult.issues.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span>Quality & Safety Diagnostic:</span>
                </div>
                <ul className="list-disc list-inside text-[11px] text-amber-800 space-y-0.5">
                  {scanResult.issues.map((issue, idx) => (
                    <li key={idx}>{issue}</li>
                  ))}
                </ul>
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
                  placeholder="e.g. Dolo 650"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Generic Name / Composition</label>
                <input
                  type="text"
                  value={verifiedData.generic_name}
                  onChange={(e) => setVerifiedData({ ...verifiedData, generic_name: e.target.value })}
                  placeholder="e.g. Paracetamol Tablets IP"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Strength</label>
                <input
                  type="text"
                  value={verifiedData.strength}
                  onChange={(e) => setVerifiedData({ ...verifiedData, strength: e.target.value })}
                  placeholder="e.g. 650mg"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Manufacturer</label>
                <input
                  type="text"
                  value={verifiedData.manufacturer}
                  onChange={(e) => setVerifiedData({ ...verifiedData, manufacturer: e.target.value })}
                  placeholder="e.g. Micro Labs"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Batch Number *</label>
                <input
                  type="text"
                  value={verifiedData.batch_number}
                  onChange={(e) => setVerifiedData({ ...verifiedData, batch_number: e.target.value })}
                  placeholder="e.g. DL-8841"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Expiry Date *</label>
                <input
                  type="date"
                  value={verifiedData.expiry_date}
                  onChange={(e) => setVerifiedData({ ...verifiedData, expiry_date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Pieces Per Strip *</label>
                <input
                  type="number"
                  min="1"
                  value={verifiedData.pieces_per_strip}
                  onChange={(e) => setVerifiedData({ ...verifiedData, pieces_per_strip: parseInt(e.target.value, 10) || 10 })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>

            {/* Transfer / Save CTA */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Verified data transfers directly into inventory with audit movement.
              </span>

              <button
                onClick={handleProceed}
                disabled={!verifiedData.medicine_name || !verifiedData.batch_number}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-1.5 transition-colors shadow-md shadow-emerald-600/20"
              >
                <FileCheck className="w-4 h-4" />
                <span>Confirm & Transfer to Add Stock</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
