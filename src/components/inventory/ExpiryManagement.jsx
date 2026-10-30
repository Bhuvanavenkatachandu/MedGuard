import React, { useState } from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Trash2, 
  Sliders, 
  ShieldCheck, 
  Calendar,
  Layers
} from 'lucide-react';

export const ExpiryManagement = ({ setActiveTab }) => {
  const { metrics, markBatchExpired, pharmacy, setPharmacy } = usePharmacy();
  const [activeTab, setActiveExpiryTab] = useState('expiring'); // 'expiring', 'expired', 'safe'
  const [thresholdDays, setThresholdDays] = useState(pharmacy?.near_expiry_threshold_days || 30);
  const [showSettings, setShowSettings] = useState(false);

  const handleUpdateThreshold = (e) => {
    e.preventDefault();
    if (setPharmacy && pharmacy) {
      setPharmacy({
        ...pharmacy,
        near_expiry_threshold_days: parseInt(thresholdDays, 10) || 30,
      });
    }
    setShowSettings(false);
  };

  const handleWriteOff = (batch) => {
    if (confirm(`Are you sure you want to write off ${batch.total_pieces} pieces of expired batch ${batch.batch_number}? This will log an auditable 'expired_stock' stock movement.`)) {
      markBatchExpired(batch.id);
    }
  };

  const currentList = 
    activeTab === 'expiring' 
      ? metrics.expiringSoonBatches 
      : activeTab === 'expired' 
      ? metrics.expiredBatches 
      : metrics.safeBatches;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-100 text-amber-700 font-bold">
              <Clock className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              FEFO & Expiry Management
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            First-Expired, First-Out (FEFO) radar guarantees earlier expiring batches are dispensed before newer stock.
          </p>
        </div>

        {/* Threshold Config Button */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold py-2 px-3.5 rounded-xl flex items-center gap-2 transition-colors shadow-xs"
        >
          <Sliders className="w-3.5 h-3.5 text-slate-500" />
          <span>Near-Expiry Threshold: {thresholdDays} Days</span>
        </button>
      </div>

      {/* Threshold Modal / Inline Configuration */}
      {showSettings && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div>
            <h3 className="font-bold text-amber-900">Configure Near-Expiry Alert Window</h3>
            <p className="text-amber-800 text-[11px] mt-0.5">
              Medicines expiring within this number of days will be flagged for priority clearance under FEFO.
            </p>
          </div>

          <form onSubmit={handleUpdateThreshold} className="flex items-center gap-2">
            <input
              type="number"
              min="7"
              max="365"
              value={thresholdDays}
              onChange={(e) => setThresholdDays(e.target.value)}
              className="w-20 px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-bold text-slate-800 font-mono text-center"
            />
            <span className="text-amber-900 font-semibold">days</span>
            <button
              type="submit"
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs"
            >
              Save
            </button>
          </form>
        </div>
      )}

      {/* Tabs for Expiring Soon, Expired, Safe */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveExpiryTab('expiring')}
          className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'expiring'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Expiring Soon ({metrics.expiringSoonCount})</span>
        </button>

        <button
          onClick={() => setActiveExpiryTab('expired')}
          className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'expired'
              ? 'border-rose-500 text-rose-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Expired Stock ({metrics.expiredCount})</span>
        </button>

        <button
          onClick={() => setActiveExpiryTab('safe')}
          className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'safe'
              ? 'border-emerald-500 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Safe Batches ({metrics.safeBatches.length})</span>
        </button>
      </div>

      {/* Batches Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {currentList.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No batches found in this category.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4 font-semibold">Medicine</th>
                  <th className="py-3 px-4 font-semibold">Batch Number</th>
                  <th className="py-3 px-4 font-semibold">Expiry Date</th>
                  <th className="py-3 px-4 font-semibold text-center">Remaining Stock</th>
                  <th className="py-3 px-4 font-semibold text-right">Strip Price</th>
                  <th className="py-3 px-4 font-semibold text-center">FEFO Status</th>
                  {activeTab === 'expired' && (
                    <th className="py-3 px-4 font-semibold text-center">Write Off</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentList.map((batch) => (
                  <tr key={batch.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{batch.medicine_name}</div>
                      <div className="text-[11px] text-slate-400">{batch.generic_name || batch.strength}</div>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                      {batch.batch_number}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                      {batch.expiry_date}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="font-extrabold text-slate-900">{batch.total_pieces}</span>
                      <span className="text-slate-400 text-[10px]"> pieces ({batch.available_strips} strips, {batch.loose_pieces} loose)</span>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-900 text-right">
                      ₹{Number(batch.price_per_strip).toFixed(2)}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {activeTab === 'expired' ? (
                        <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-rose-200">
                          DO NOT DISPENSE
                        </span>
                      ) : activeTab === 'expiring' ? (
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-amber-200">
                          FEFO PRIORITY #1
                        </span>
                      ) : (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
                          SAFE STOCK
                        </span>
                      )}
                    </td>

                    {activeTab === 'expired' && (
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleWriteOff(batch)}
                          disabled={batch.total_pieces === 0}
                          className="bg-rose-50 hover:bg-rose-100 disabled:opacity-30 text-rose-700 font-bold px-2.5 py-1 rounded-lg text-[11px] flex items-center justify-center gap-1 mx-auto transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Write Off</span>
                        </button>
                      </td>
                    )}
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
