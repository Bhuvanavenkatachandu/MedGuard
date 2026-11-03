import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Navigation, 
  Crosshair, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  Info
} from 'lucide-react';
import { Button } from '../ui/Button';

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
  const [locationStatus, setLocationStatus] = useState(null);
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
      () => {
        setLocating(false);
        setLocationStatus('denied');
        setErrorMessage('Location permission denied or unavailable. Defaulted to Bengaluru hub. Choose a city hub below or click the map.');
        setIsConfirmed(true);
        if (onLocationConfirmed) {
          onLocationConfirmed({ latitude: lat, longitude: lng });
        }
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const handleMapClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const xRatio = (x / rect.width) - 0.5;
    const yRatio = (y / rect.height) - 0.5;

    const newLat = Math.round((lat - yRatio * 0.04) * 1000000) / 1000000;
    const newLng = Math.round((lng + xRatio * 0.04) * 1000000) / 1000000;

    setLat(newLat);
    setLng(newLng);
    setIsConfirmed(true);
    if (onLocationConfirmed) {
      onLocationConfirmed({ latitude: newLat, longitude: newLng });
    }
  };

  const handleSelectCity = (city) => {
    setLat(city.lat);
    setLng(city.lng);
    setIsConfirmed(true);
    if (onLocationConfirmed) {
      onLocationConfirmed({ latitude: city.lat, longitude: city.lng });
    }
  };

  return (
    <div className="space-y-4">
      {errorMessage && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Interactive Map Visual Simulation */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-300 shadow-inner bg-slate-900 h-64 cursor-crosshair group select-none" onClick={handleMapClick}>
        {/* Map Grid Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none" />

        {/* Center Target & Pin */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative flex flex-col items-center">
            <div className="w-9 h-9 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/50 animate-bounce">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <span className="mt-1 px-2.5 py-0.5 rounded-md bg-slate-900/90 text-white font-mono text-[10px] font-bold border border-slate-700 shadow-md">
              {lat.toFixed(4)}, {lng.toFixed(4)}
            </span>
          </div>
        </div>

        {/* Top Floating Map Controls */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <span className="text-[10px] font-semibold text-cyan-300 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-700 backdrop-blur-sm">
            Click anywhere on map to reposition pin
          </span>

          <div className="pointer-events-auto">
            <Button
              variant="primary"
              size="xs"
              disabled={locating}
              onClick={(e) => {
                e.stopPropagation();
                handleUseCurrentLocation();
              }}
              leftIcon={<Navigation className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} />}
            >
              {locating ? 'Locating...' : 'Use GPS'}
            </Button>
          </div>
        </div>
      </div>

      {/* Popular City Presets */}
      <div>
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
          Or Quick-Select City Hub:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {POPULAR_CITY_CENTERS.map((city) => (
            <button
              key={city.name}
              type="button"
              onClick={() => handleSelectCity(city)}
              className="text-xs bg-slate-100 hover:bg-primary hover:text-white text-slate-700 px-3 py-1.5 rounded-xl transition-colors font-medium border border-slate-200 cursor-pointer"
            >
              {city.name}
            </button>
          ))}
        </div>
      </div>

      {/* Confirmation Status */}
      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
        <span className="flex items-center gap-1.5 font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Coordinates locked: {lat.toFixed(6)}, {lng.toFixed(6)}</span>
        </span>
        <span className="text-[10px] uppercase font-mono font-bold">Radar Linked</span>
      </div>
    </div>
  );
};
