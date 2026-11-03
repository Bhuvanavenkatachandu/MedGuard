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
  Layers,
  AlertOctagon
} from 'lucide-react';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';
import { formatMedicineDate } from '../../utils/dateFormatter';
import { EmptyState } from '../ui/EmptyState';

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

  const handleWriteOff = async (batch) => {
    if (confirm(`Are you sure you want to write off ${batch.total_pieces} pieces of expired batch ${batch.batch_number}? This will log an auditable 'expired_stock' stock movement.`)) {
      try {
        await markBatchExpired(batch.id);
      } catch (err) {
        alert(err.message || 'Failed to write off batch');
      }
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
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              FEFO & Expiry Management
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            First-Expired, First-Out (FEFO) radar guarantees earlier expiring batches are dispensed before newer stock.
          </p>
        </div>

        {/* Threshold Config Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSettings(!showSettings)}
          leftIcon={<Sliders className="w-3.5 h-3.5" />}
        >
          Near-Expiry Threshold: {thresholdDays} Days
        </Button>
      </div>

      {/* Threshold Modal / Inline Configuration */}
      {showSettings && (
        <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div>
            <h3 className="font-bold text-amber-900 text-sm">Configure Near-Expiry Alert Window</h3>
            <p className="text-amber-800 text-xs mt-0.5">
              Medicines expiring within this number of days will be flagged for priority clearance under FEFO rules.
            </p>
          </div>

          <form onSubmit={handleUpdateThreshold} className="flex items-center gap-2">
            <input
              type="number"
              min="7"
              max="365"
              value={thresholdDays}
              onChange={(e) => setThresholdDays(e.target.value)}
              className="w-20 px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-bold text-slate-800 font-mono text-center focus:outline-none focus:border-amber-500"
            />
            <span className="text-amber-900 font-semibold">days</span>
            <Button
              variant="primary"
              size="xs"
              type="submit"
              className="bg-amber-600 hover:bg-amber-700"
            >
              Save Threshold
            </Button>
          </form>
        </div>
      )}

      {/* Summary KPI Badges (Section 31) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => setActiveExpiryTab('expiring')}
          className={`bg-white rounded-2xl border p-5 shadow-card transition-all cursor-pointer ${
            activeTab === 'expiring' ? 'border-amber-400 ring-2 ring-amber-400/20' : 'border-slate-200/90 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Expiring Soon</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-extrabold text-amber-600 font-mono">
            {metrics.expiringSoonCount} <span className="text-xs font-normal text-slate-500">batches</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Expiring within {thresholdDays} days</p>
        </div>

        <div
          onClick={() => setActiveExpiryTab('expired')}
          className={`bg-white rounded-2xl border p-5 shadow-card transition-all cursor-pointer ${
            activeTab === 'expired' ? 'border-rose-400 ring-2 ring-rose-400/20' : 'border-slate-200/90 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Expired Batches</span>
            <AlertOctagon className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-extrabold text-rose-600 font-mono">
            {metrics.expiredCount} <span className="text-xs font-normal text-slate-500">batches</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Requires quarantine & write-off</p>
        </div>

        <div
          onClick={() => setActiveExpiryTab('safe')}
          className={`bg-white rounded-2xl border p-5 shadow-card transition-all cursor-pointer ${
            activeTab === 'safe' ? 'border-emerald-400 ring-2 ring-emerald-400/20' : 'border-slate-200/90 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Safe Shelf Life</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 font-mono">
            {metrics.safeBatches?.length || 0} <span className="text-xs font-normal text-slate-500">batches</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Sufficient shelf life remaining</p>
        </div>
      </div>

      {/* Batches Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 capitalize">
              {activeTab === 'expiring' ? `Batches Expiring Within ${thresholdDays} Days` : activeTab === 'expired' ? 'Expired Batches (Do Not Dispense)' : 'Safe Batches'}
            </h2>
            <p className="text-xs text-slate-500">Dispensing priority strictly follows First-Expired, First-Out (FEFO)</p>
          </div>
          <span className="text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1 rounded-lg">
            {currentList.length} Batch(es)
          </span>
        </div>

        {currentList.length === 0 ? (
          <EmptyState
            icon={Clock}
            title={activeTab === 'expired' ? 'No Expired Medicines' : activeTab === 'expiring' ? 'No Near-Expiry Batches' : 'No Safe Batches'}
            description={
              activeTab === 'expired'
                ? 'Your inventory is 100% compliant with zero expired medicine batches.'
                : activeTab === 'expiring'
                ? `No medicine batches are approaching expiry within your ${thresholdDays}-day alert window.`
                : 'No registered safe batches currently recorded.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4 font-semibold">Medicine Name</th>
                  <th className="py-3 px-4 font-semibold">Batch Number</th>
                  <th className="py-3 px-4 font-semibold">Expiry Date</th>
                  <th className="py-3 px-4 font-semibold">Remaining Stock</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentList.map((batch) => (
                  <tr key={batch.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-slate-900 text-sm">{batch.medicine_name}</div>
                      <div className="text-[11px] text-slate-500">{batch.medicine?.generic_name || 'N/A'}</div>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                      {batch.batch_number}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{formatMedicineDate(batch.expiry_date)}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{batch.expiry_date}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 font-mono text-sm">{batch.total_pieces} pcs</div>
                      <div className="text-[10px] text-slate-500 font-mono">₹{Number(batch.price_per_piece || 0).toFixed(2)}/pc</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge 
                        status={activeTab === 'expired' ? 'expired' : activeTab === 'expiring' ? 'expiring_soon' : 'safe'}
                        size="xs"
                      />
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {activeTab === 'expired' ? (
                        <Button
                          variant="dangerOutline"
                          size="xs"
                          onClick={() => handleWriteOff(batch)}
                          leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                        >
                          Write Off Expired
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => setActiveTab('pos')}
                        >
                          Dispense in POS
                        </Button>
                      )}
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
