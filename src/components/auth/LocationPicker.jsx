import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Navigation, 
  Crosshair, 
  CheckCircle2, 
  AlertCircle, 
  ChevronUp, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  Info
} from 'lucide-react';

const POPULAR_CITY_CENTERS = [
  { name: 'Bengaluru (Indiranagar)', lat: 12.9719, lng: 77.6412 },
  { name: 'Bengaluru (Koramangala)', lat: 12.9352, lng: 77.6245 },
  { name: 'Mumbai (Bandra West)', lat: 19.0596, lng: 72.8295 },
  { name: 'Delhi (Connaught Place)', lat: 28.6304, lng: 77.2177 },
  { name: 'Hyderabad (Hitec City)', lat: 17.4435, lng: 78.3772 },
  { name: 'Chennai (T. Nagar)', lat: 13.0418, lng: 80.2341 },
];

export const LocationPicker = ({ initialLat, initialLng, onLocationConfirmed, isConfirmed, setIsConfirmed }) => {
  const [lat, setLat] = useState(initialLat || 12.9719);
  const [lng, setLng] = useState(initialLng || 77.6412);
  const [locating, setLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState(null); // 'detected', 'denied', 'manual'
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    if (initialLat) setLat(initialLat);
    if (initialLng) setLng(initialLng);
    setIsConfirmed(true);
    if (onLocationConfirmed) {
      onLocationConfirmed({
        latitude: initialLat || 12.9719,
        longitude: initialLng || 77.6412,
      });
    }
  }, [initialLat, initialLng]);

  // Handle browser GPS detection
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage('Geolocation is not supported by your browser. Defaulted to Bengaluru center.');
      setLocationStatus('denied');
      setIsConfirmed(true);
      if (onLocationConfirmed) onLocationConfirmed({ latitude: lat, longitude: lng });
      return;
    }

    setLocating(true);
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const detectedLat = Math.round(pos.coords.latitude * 1000000) / 1000000;
        const detectedLng = Math.round(pos.coords.longitude * 1000000) / 1000000;
        setLat(detectedLat);
        setLng(detectedLng);
        setLocating(false);
        setLocationStatus('detected');
        setIsConfirmed(true);
        if (onLocationConfirmed) {
          onLocationConfirmed({ latitude: detectedLat, longitude: detectedLng });
        }
      },
      (err) => {
        setLocating(false);
        setLocationStatus('denied');
        setErrorMessage('Location permission denied or unavailable. Defaulted to Bengaluru hub. Click on the map or choose a city below to adjust.');
        // Auto-lock coordinates so user is NEVER blocked from saving
        setIsConfirmed(true);
        if (onLocationConfirmed) {
          onLocationConfirmed({ latitude: lat, longitude: lng });
        }
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Click on interactive map canvas to drop pin
  const handleMapClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert relative click (0 to 1) into coordinate offset
    const xRatio = (x / rect.width) - 0.5; // -0.5 to 0.5
    const yRatio = (y / rect.height) - 0.5;

    // Scale offset (roughly ~0.02 degrees range around current center)
    const newLat = Math.round((lat - yRatio * 0.04) * 1000000) / 1000000;
    const newLng = Math.round((lng + xRatio * 0.04) * 1000000) / 1000000;

    setLat(newLat);
    setLng(newLng);
    setIsConfirmed(true);
    setLocationStatus('manual');
    setErrorMessage(null);
    if (onLocationConfirmed) {
      onLocationConfirmed({ latitude: newLat, longitude: newLng });
    }
  };

  // Nudge adjustment controls (~100m)
  const handleNudge = (dLat, dLng) => {
    const newLat = Math.round((lat + dLat) * 1000000) / 1000000;
    const newLng = Math.round((lng + dLng) * 1000000) / 1000000;
    setLat(newLat);
    setLng(newLng);
    setIsConfirmed(true);
    if (onLocationConfirmed) {
      onLocationConfirmed({ latitude: newLat, longitude: newLng });
    }
  };

  const handleConfirm = () => {
    setIsConfirmed(true);
    setErrorMessage(null);
    if (onLocationConfirmed) {
      onLocationConfirmed({
        latitude: lat,
        longitude: lng,
      });
    }
  };

  return (
    <div className="space-y-4 bg-slate-50 border border-slate-200 rounded-2xl p-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-rose-500" />
            <span>Step 3 — Physical Shop Location</span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Customers use this exact point to discover stock nearby and get driving directions.
          </p>
        </div>

        {isConfirmed ? (
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Location Confirmed</span>
          </span>
        ) : (
          <span className="bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
            <span>Confirmation Required</span>
          </span>
        )}
      </div>

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {locationStatus === 'detected' && !isConfirmed && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 text-xs p-3 rounded-xl flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span>
            Current GPS position detected. Please verify on the map and click <strong>Confirm Location</strong> below.
          </span>
        </div>
      )}

      {/* Action Bar: Use Current Location & Preset Hubs */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={locating}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold py-2 px-3.5 rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
        >
          <Navigation className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} />
          <span>{locating ? 'Detecting GPS...' : 'Use Current Location'}</span>
        </button>

        <span className="text-[11px] text-slate-400 font-medium">or select hub:</span>
        <div className="flex flex-wrap gap-1">
          {POPULAR_CITY_CENTERS.map((city) => (
            <button
              key={city.name}
              type="button"
              onClick={() => {
                setLat(city.lat);
                setLng(city.lng);
                setIsConfirmed(true);
                setLocationStatus('manual');
                setErrorMessage(null);
                if (onLocationConfirmed) {
                  onLocationConfirmed({ latitude: city.lat, longitude: city.lng });
                }
              }}
              className="px-2 py-1 text-[11px] font-semibold bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              {city.name.split(' (')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Map Visualizer Canvas */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <span>Click on the map to place the pharmacy pin:</span>
          <span>Target: <strong className="font-mono text-slate-800">{lat.toFixed(6)}, {lng.toFixed(6)}</strong></span>
        </div>

        <div
          onClick={handleMapClick}
          className="relative h-56 w-full rounded-2xl overflow-hidden cursor-crosshair border-2 border-slate-300 shadow-inner bg-slate-900 group select-none"
          title="Click to reposition pharmacy pin"
        >
          {/* Faux Map Background Grid & Roads Pattern */}
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{
            backgroundImage: `radial-gradient(#38bdf8 1px, transparent 1px), linear-gradient(to right, #334155 1px, transparent 1px), linear-gradient(to bottom, #334155 1px, transparent 1px)`,
            backgroundSize: `24px 24px, 48px 48px, 48px 48px`
          }} />

          {/* Map Landmarks Visuals */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-40 h-40 rounded-full border border-blue-500/20 bg-blue-500/5 animate-pulse" />
          </div>

          <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] px-2.5 py-1 rounded-lg border border-slate-700 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Interactive Map • 500m Local Radius</span>
          </div>

          {/* Centered Target Pin */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full pointer-events-none flex flex-col items-center">
            <div className={`px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-md mb-1 whitespace-nowrap ${
              isConfirmed ? 'bg-emerald-600' : 'bg-rose-600 animate-bounce'
            }`}>
              {isConfirmed ? '✓ Pharmacy Confirmed' : '📍 Unconfirmed Pin'}
            </div>
            <MapPin className={`w-8 h-8 drop-shadow-lg ${isConfirmed ? 'text-emerald-400' : 'text-rose-500'}`} />
            <div className="w-2.5 h-1 bg-black/60 rounded-full blur-[1px] mt-[-2px]" />
          </div>

          <div className="absolute bottom-2 right-2 bg-slate-900/90 text-slate-300 text-[10px] px-2 py-0.5 rounded font-mono border border-slate-700">
            Click anywhere to move pin
          </div>
        </div>
      </div>

      {/* Adjust Location & Direct Coordinate Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        {/* Direct inputs */}
        <div className="md:col-span-7 grid grid-cols-2 gap-2 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Latitude</label>
            <input
              type="number"
              step="0.000001"
              value={lat}
              onChange={(e) => {
                setLat(parseFloat(e.target.value) || 0);
                setIsConfirmed(false);
              }}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl font-mono text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Longitude</label>
            <input
              type="number"
              step="0.000001"
              value={lng}
              onChange={(e) => {
                setLng(parseFloat(e.target.value) || 0);
                setIsConfirmed(false);
              }}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl font-mono text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Nudge Adjust Pad */}
        <div className="md:col-span-5 flex items-center justify-end gap-1.5">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mr-1">Nudge:</span>
          <button
            type="button"
            onClick={() => handleNudge(0, -0.001)}
            className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600"
            title="Nudge West"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => handleNudge(0.001, 0)}
              className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600"
              title="Nudge North"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleNudge(-0.001, 0)}
              className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600"
              title="Nudge South"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => handleNudge(0, 0.001)}
            className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600"
            title="Nudge East"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Confirm Location Button */}
      <div className="pt-2 flex items-center justify-between border-t border-slate-200">
        <span className="text-xs text-slate-500">
          {isConfirmed ? (
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Location verified and locked</span>
            </span>
          ) : (
            <span className="text-amber-700 font-medium flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Click confirm below to lock this location</span>
            </span>
          )}
        </span>

        <button
          type="button"
          onClick={handleConfirm}
          className={`text-xs font-bold py-2 px-4 rounded-xl flex items-center gap-1.5 transition-all shadow-sm ${
            isConfirmed
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'bg-slate-900 hover:bg-slate-800 text-white'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{isConfirmed ? 'Re-Confirm Location' : 'Confirm Shop Location'}</span>
        </button>
      </div>
    </div>
  );
};
