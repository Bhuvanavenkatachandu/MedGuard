import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  MapPin, 
  Navigation, 
  Phone, 
  ShieldCheck, 
  Pill, 
  Layers, 
  ExternalLink, 
  AlertCircle,
  Building2,
  Sparkles,
  ChevronRight,
  Info
} from 'lucide-react';
import { calculateDistanceKm, getGoogleMapsDirectionsUrl } from '../../utils/geoUtils';
import { usePharmacy } from '../../context/PharmacyContext';
import { publicApi } from '../../api/publicApi';

export const CustomerDiscovery = ({ onSwitchToPharmacist }) => {
  const navigate = useNavigate();
  const { user, medicines, inventory, batches, isAuthenticated, isEmailVerified, isSetupComplete } = usePharmacy();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Default customer location (Indiranagar Metro, Bangalore)
  const [userLocation, setUserLocation] = useState({
    name: 'Indiranagar, Bengaluru (Default Location)',
    lat: 12.9784,
    lng: 77.6408,
  });

  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [selectedPharmacy, setSelectedPharmacy] = useState(null);
  
  // Temporary secure Search Session ID (NOT a transaction ID)
  const [searchSessionId, setSearchSessionId] = useState('');

  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation({
          name: `Current GPS (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
          lat: latitude,
          lng: longitude,
        });
        setLocating(false);
      },
      (err) => {
        setLocationError('Could not retrieve GPS location. Using default location.');
        setLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  useEffect(() => {
    // Generate a temporary anonymous search session token
    const token = `SS-${Math.floor(100000 + Math.random() * 900000)}`;
    setSearchSessionId(token);

    publicApi.recordSearchSession({
      sessionToken: token,
      query: searchQuery || 'initial_discovery',
      lat: userLocation.lat,
      lng: userLocation.lng,
    });
  }, []);

  // Fetch verified medicines directly via backend REST endpoint
  useEffect(() => {
    let active = true;
    setIsSearching(true);

    publicApi.searchMedicines({
      query: searchQuery.trim(),
      lat: userLocation.lat,
      lng: userLocation.lng,
      maxDistanceKm: 100,
      sessionToken: searchSessionId,
    }).then((data) => {
      if (!active) return;
      setIsSearching(false);
      if (Array.isArray(data)) {
        const mapped = data.map((row) => ({
          medicine: {
            id: row.medicine_id,
            name: row.medicine_name,
            strength: row.strength || '',
            generic_name: row.generic_name || '',
            brand: row.brand || '',
            manufacturer: 'Authorized Pharma',
          },
          pharmacy: {
            id: row.pharmacy_id,
            name: row.pharmacy_name,
            address: row.pharmacy_address || '',
            phone: row.pharmacy_phone || '+91 98765 43210',
            latitude: parseFloat(row.pharmacy_lat),
            longitude: parseFloat(row.pharmacy_lng),
          },
          distanceKm: parseFloat(row.distance_km || 0),
          availablePieces: Number(row.available_pieces || 0),
          piecesPerStrip: Number(row.pieces_per_strip || 10),
          availableStrips: Number(row.available_strips || 0),
          loosePieces: Number(row.loose_pieces || 0),
          pricePerStrip: Number(row.price_per_strip || 0),
          pricePerPiece: Number(row.price_per_piece || 0),
          directionsUrl: row.directions_url,
        }));
        setSearchResults(mapped);
      } else {
        setSearchResults([]);
      }
    }).catch((err) => {
      if (!active) return;
      console.warn('Medicine search error:', err);
      setIsSearching(false);
      setSearchResults([]);
    });

    return () => {
      active = false;
    };
  }, [searchQuery, userLocation, searchSessionId]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Banner / Public Customer Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-blue-500/20">
              🛡️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 tracking-tight text-lg">MedGuard AI</span>
                <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Live Stock Radar
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">Public Medicine Discovery • Zero Login Required</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (onSwitchToPharmacist) {
                  onSwitchToPharmacist();
                } else if (!isAuthenticated || !user) {
                  navigate('/pharmacist/login');
                } else if (!isEmailVerified) {
                  navigate('/pharmacist/login?unverified=true');
                } else if (!isSetupComplete) {
                  navigate('/pharmacist/setup');
                } else {
                  navigate('/pharmacist/dashboard');
                }
              }}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium px-3.5 py-2 rounded-lg transition-all shadow-sm flex items-center gap-1.5"
            >
              <span>Pharmacist Portal</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Search Section */}
      <div className="bg-gradient-to-b from-blue-700 via-blue-800 to-indigo-900 text-white py-10 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-blue-600/60 backdrop-blur-sm border border-blue-400/30 text-blue-100 text-xs px-3.5 py-1.5 rounded-full font-medium">
            <Sparkles className="w-3.5 h-3.5 text-blue-200" />
            <span>Search live verified pharmacy stock in real-time</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Find Available Medicines at Nearby Pharmacies
          </h1>
          <p className="text-blue-100 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Search by medicine brand, generic name, salt composition, or strength. See accurate strip and loose piece quantities with instant Google Maps directions.
          </p>

          {/* Search Box */}
          <div className="max-w-2xl mx-auto mt-6 bg-white rounded-2xl p-2 shadow-2xl flex flex-col sm:flex-row gap-2 border border-slate-100">
            <div className="relative flex-1 flex items-center">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Dolo 650, Paracetamol, Augmentin, 500mg..."
                className="w-full pl-11 pr-4 py-3 text-slate-800 text-sm placeholder-slate-400 focus:outline-none font-medium bg-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="mr-3 text-xs text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              )}
            </div>

            <button
              onClick={handleGetCurrentLocation}
              disabled={locating}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-75 text-white text-xs font-semibold px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-colors whitespace-nowrap shadow-sm"
              title="Use current GPS location"
            >
              <Navigation className={`w-4 h-4 ${locating ? 'animate-spin' : ''}`} />
              <span>{locating ? 'Locating...' : 'Use Current GPS'}</span>
            </button>
          </div>

          {/* Location Status */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-blue-200 pt-2">
            <span className="flex items-center gap-1 font-medium text-white">
              <MapPin className="w-3.5 h-3.5 text-rose-400" />
              Location:
            </span>
            <span className="bg-blue-900/60 text-blue-100 border border-blue-400/20 px-2.5 py-1 rounded-md font-semibold">
              {userLocation.name}
            </span>
          </div>

          {locationError && (
            <div className="max-w-md mx-auto bg-amber-500/20 border border-amber-400/30 text-amber-100 text-xs p-2 rounded-lg text-center">
              {locationError}
            </div>
          )}
        </div>
      </div>

      {/* Strict Compliance Banner: Discovery Only Disclaimer */}
      <div className="bg-slate-100 border-b border-slate-200 py-2 px-4 text-center">
        <p className="text-[11px] text-slate-500 max-w-4xl mx-auto flex items-center justify-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
          <span>
            <strong>Discovery Mode:</strong> Searches do not create transactions or bills. Live availability reflects real-time verified stock at licensed pharmacy locations.
          </span>
        </p>
      </div>

      {/* Main Results Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {searchQuery ? `Pharmacies with "${searchQuery}"` : 'All Verified In-Stock Medicines Nearby'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing pharmacies with available stock &gt; 0 pieces, sorted nearest to farthest.
            </p>
          </div>

          <div className="text-xs font-medium text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
            Found <strong className="text-blue-600">{searchResults.length}</strong> available result(s)
          </div>
        </div>

        {/* Results List */}
        {searchResults.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto shadow-sm my-8">
            <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
              <Pill className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">No In-Stock Pharmacies Found</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {searchQuery 
                ? `Zero-stock pharmacies are hidden. No pharmacy currently has "${searchQuery}" in pieces > 0. Try searching another medicine name or adjusting your location.`
                : 'No pharmacies currently have in-stock medicines. Once a pharmacist registers and adds stock, available inventory will appear here.'}
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-5 text-xs text-blue-600 hover:text-blue-800 font-semibold underline"
            >
              Show all available medicines
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {searchResults.map((item, idx) => {
              const mapsUrl = getGoogleMapsDirectionsUrl(
                item.pharmacy.latitude,
                item.pharmacy.longitude,
                item.pharmacy.name
              );

              return (
                <div
                  key={`${item.medicine.id}-${item.pharmacy.id}-${idx}`}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Medicine Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900 text-lg">{item.medicine.name}</h3>
                          {item.medicine.strength && (
                            <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-md border border-blue-100">
                              {item.medicine.strength}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Generic: <span className="text-slate-700 font-medium">{item.medicine.generic_name || 'N/A'}</span>
                          {item.medicine.brand && ` • Brand: ${item.medicine.brand}`}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Mfg: {item.medicine.manufacturer || 'Authorized Pharma'}
                        </p>
                      </div>

                      {/* Distance Badge */}
                      <div className="flex flex-col items-end flex-shrink-0">
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                          <MapPin className="w-3 h-3 text-emerald-600" />
                          <span>{item.distanceKm} km away</span>
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1">Nearest match</span>
                      </div>
                    </div>

                    {/* Stock & Pricing Breakdown Grid */}
                    <div className="grid grid-cols-2 gap-2 my-4 bg-slate-50 rounded-xl p-3 border border-slate-100">
                      {/* Full Strips */}
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                          Full Strips Stock
                        </span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-base font-extrabold text-slate-900">
                            {item.availableStrips}
                          </span>
                          <span className="text-xs text-slate-500">strips</span>
                        </div>
                        <p className="text-xs font-bold text-blue-600">
                          ₹{Number(item.pricePerStrip).toFixed(2)} <span className="text-[10px] text-slate-400 font-normal">/ strip</span>
                        </p>
                      </div>

                      {/* Loose Pieces */}
                      <div className="space-y-0.5 border-l border-slate-200 pl-3">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                          Loose Pieces Stock
                        </span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-base font-extrabold text-slate-900">
                            {item.loosePieces}
                          </span>
                          <span className="text-xs text-slate-500">loose pieces</span>
                        </div>
                        <p className="text-xs font-bold text-blue-600">
                          ₹{Number(item.pricePerPiece).toFixed(2)} <span className="text-[10px] text-slate-400 font-normal">/ piece</span>
                        </p>
                      </div>
                    </div>

                    {/* Stock Summary Note */}
                    <div className="text-[11px] text-slate-500 mb-4 flex items-center justify-between">
                      <span>Total pieces available: <strong>{item.availablePieces}</strong></span>
                      <span className="text-[10px] text-slate-400">({item.piecesPerStrip} pcs / strip)</span>
                    </div>

                    {/* Pharmacy Details */}
                    <div className="pt-3 border-t border-slate-100 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <h4 className="font-bold text-slate-800 text-xs truncate">
                          {item.pharmacy.name}
                        </h4>
                      </div>
                      <p className="text-xs text-slate-500 leading-snug pl-5 line-clamp-2">
                        {item.pharmacy.address}
                      </p>
                      <p className="text-xs text-slate-500 pl-5 flex items-center gap-1 pt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{item.pharmacy.phone}</span>
                      </p>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-2">
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Get Google Maps Directions</span>
                    </a>

                    <a
                      href={`tel:${item.pharmacy.phone}`}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-2.5 px-3.5 rounded-xl flex items-center justify-center gap-1 transition-colors"
                      title="Call Pharmacy"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Call</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 px-4 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-4xl mx-auto space-y-2">
          <p className="font-medium text-slate-700">MedGuard AI • Intelligent Medicine Discovery Platform</p>
          <p className="text-[11px] text-slate-400">
            Stock availability is synchronized directly with pharmacy point-of-sale inventory. No customer purchase or reservation is created on discovery.
          </p>
        </div>
      </footer>
    </div>
  );
};
