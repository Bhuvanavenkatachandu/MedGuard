import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle2, ShieldCheck, FileText, ArrowRight } from 'lucide-react';

export const HeroAiScannerEffect = () => {
  const [scanStep, setScanStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setScanStep((prev) => (prev + 1) % 5);
    }, 2200);
    return () => clearInterval(timer);
  }, []);

  const fields = [
    { label: 'Medicine', value: 'Augmentin 625 Duo', activeAt: 1 },
    { label: 'Strength', value: 'Amoxicillin 500mg + Clavulanic 125mg', activeAt: 2 },
    { label: 'Batch #', value: 'BT-90281-GLX', activeAt: 3 },
    { label: 'Expiry Date', value: 'June 2027', activeAt: 4 },
  ];

  return (
    <div className="relative bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-2xl max-w-md mx-auto overflow-hidden">
      {/* Decorative AI Glow */}
      <div className="absolute -top-12 -right-12 w-36 h-36 bg-gradient-to-br from-primary/20 to-ai/20 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-ai text-white flex items-center justify-center font-bold text-xs shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">AI Vision Packaging Analysis</h4>
            <p className="text-[10px] text-slate-400">Live OCR & Attribute Extraction</p>
          </div>
        </div>

        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${
          scanStep === 4 
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
            : 'bg-blue-50 text-primary border border-blue-200'
        }`}>
          {scanStep === 4 ? 'Analysis Complete (98%)' : 'Scanning packaging...'}
        </span>
      </div>

      {/* Medicine Mock Preview with Animated Laser Line */}
      <div className="relative h-36 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl overflow-hidden p-4 text-white flex flex-col justify-between shadow-inner">
        {/* Animated Laser Scanning Line */}
        <div
          className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#38bdf8] transition-all duration-700 pointer-events-none"
          style={{
            top: `${(scanStep % 5) * 22}%`,
          }}
        />

        {/* Faint Grid Texture */}
        <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:14px_14px] opacity-20 pointer-events-none" />

        <div className="relative z-10 flex items-start justify-between">
          <div>
            <span className="text-[9px] font-mono tracking-widest uppercase text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
              MED PACKAGING SAMPLE
            </span>
            <div className="text-sm font-extrabold tracking-tight mt-1">Augmentin 625 Duo</div>
            <div className="text-[10px] text-slate-300">GlaxoSmithKline Pharmaceuticals</div>
          </div>
          <div className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center font-mono text-[10px] text-cyan-200">
            Rx
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-[10px] text-slate-300 font-mono">
          <span>BATCH: BT-90281-GLX</span>
          <span>EXP: 06/2027</span>
        </div>
      </div>

      {/* Extracted Attributes Badges */}
      <div className="mt-4 space-y-2">
        {fields.map((field, idx) => {
          const isDetected = scanStep >= field.activeAt;
          return (
            <div
              key={idx}
              className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all duration-300 ${
                isDetected
                  ? 'bg-slate-50 border-slate-200 text-slate-800'
                  : 'bg-slate-50/40 border-slate-100 text-slate-400 opacity-60'
              }`}
            >
              <span className="text-[11px] font-medium text-slate-500">{field.label}:</span>
              <div className="flex items-center gap-1.5 font-semibold">
                <span>{isDetected ? field.value : 'Analyzing...'}</span>
                {isDetected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          <span>Pharmacist retains 100% edit control</span>
        </span>
        <span className="font-semibold text-primary">Zero guess-work</span>
      </div>
    </div>
  );
};
