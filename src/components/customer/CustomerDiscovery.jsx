import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  Info,
  SlidersHorizontal,
  X,
  Compass,
  ArrowUpDown,
  Clock,
  Bot,
  MessageSquare
} from 'lucide-react';
import { CustomerChatModal } from '../chat/CustomerChatModal';
import { calculateDistanceKm, getGoogleMapsDirectionsUrl } from '../../utils/geoUtils';
import { usePharmacy } from '../../context/PharmacyContext';
import { publicApi } from '../../api/publicApi';
import { Logo } from '../ui/Logo';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';
import { Modal } from '../ui/Modal';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';

export const CustomerDiscovery = ({ onSwitchToPharmacist }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated, isEmailVerified, isSetupComplete } = usePharmacy();
  
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [distanceFilter, setDistanceFilter] = useState('all'); // 'all', '5', '10', '25'
  const [sortBy, setSortBy] = useState('distance'); // 'distance', 'stock', 'price'
  
  // Default customer location (Indiranagar Metro, Bangalore)
  const [userLocation, setUserLocation] = useState({
    name: 'Indiranagar, Bengaluru (Default Location)',
    lat: 12.9784,
    lng: 77.6408,
  });

  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [selectedPharmacyModal, setSelectedPharmacyModal] = useState(null);
  const [chatPharmacy, setChatPharmacy] = useState(null);
  
  // Temporary secure Search Session ID
  const [searchSessionId, setSearchSessionId] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(true);

  // Quick search suggestion chips
  const suggestions = ['Dolo 650', 'Paracetamol', 'Augmentin', 'Azithromycin', 'Metformin', 'Cetirizine'];

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
      () => {
        setLocationError('Could not retrieve GPS location. Using Indiranagar hub.');
        setLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  useEffect(() => {
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

  // Client-side filtering & sorting
  const processedResults = useMemo(() => {
    let list = [...searchResults];

    if (distanceFilter !== 'all') {
      const maxDist = parseFloat(distanceFilter);
      list = list.filter(item => item.distanceKm <= maxDist);
    }

    if (sortBy === 'distance') {
      list.sort((a, b) => a.distanceKm - b.distanceKm);
    } else if (sortBy === 'stock') {
      list.sort((a, b) => b.availablePieces - a.availablePieces);
    } else if (sortBy === 'price') {
      list.sort((a, b) => a.pricePerStrip - b.pricePerStrip);
    }

    return list;
  }, [searchResults, distanceFilter, sortBy]);

  const handlePortalNavigation = () => {
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
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-blue-100 selection:text-primary">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200/90 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <Logo size="md" showTagline={false} />
            <span className="hidden sm:inline-flex items-center gap-1 bg-blue-50 text-primary text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-blue-200">
              <span className="w-1.5 h-1.5 rounded-full bg-ai animate-pulse" />
              Live Stock Radar
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/')}
            >
              Back to Home
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={handlePortalNavigation}
              rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
            >
              Pharmacist Portal
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Search Section */}
      <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 text-white py-10 sm:py-14 px-4 sm:px-6 lg:px-8 relative overflow-hidden border-b border-slate-800">
        {/* Glow */}
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-ai/20 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 bg-slate-800/90 border border-slate-700 text-cyan-300 text-xs px-3.5 py-1.5 rounded-full font-medium shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-ai" />
            <span>Search live verified pharmacy stock in real-time</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Find medicines near you
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
            Search by brand name, salt composition, or strength. See exact strip and loose piece quantities at licensed local pharmacies.
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mt-6 bg-white rounded-2xl p-2 shadow-2xl flex flex-col sm:flex-row gap-2 border border-slate-200">
            <div className="relative flex-1 flex items-center">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search medicine, salt or strength..."
                className="w-full pl-11 pr-4 py-2.5 text-slate-900 text-xs sm:text-sm placeholder-slate-400 focus:outline-none font-medium bg-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="mr-3 text-xs text-slate-400 hover:text-slate-600 font-medium"
                >
                  Clear
                </button>
              )}
            </div>

            <Button
              variant="primary"
              size="sm"
              disabled={locating}
              onClick={handleGetCurrentLocation}
              leftIcon={<Navigation className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} />}
            >
              {locating ? 'Locating...' : 'Use Current GPS'}
            </Button>
          </div>

          {/* Quick Suggestions Chips */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2">
            <span className="text-[11px] text-slate-400 mr-1">Popular:</span>
            {suggestions.map((sug) => (
              <button
                key={sug}
                onClick={() => setSearchQuery(sug)}
                className="text-[11px] bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 py-1 rounded-full border border-slate-700 transition-colors cursor-pointer"
              >
                {sug}
              </button>
            ))}
          </div>

          {/* Location Status */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-300 pt-2">
            <span className="flex items-center gap-1 font-medium text-slate-200">
              <MapPin className="w-3.5 h-3.5 text-rose-400" />
              Radar Center:
            </span>
            <span className="bg-slate-800 text-cyan-300 border border-slate-700 px-2.5 py-0.5 rounded-md font-mono text-[11px]">
              {userLocation.name}
            </span>
          </div>

          {locationError && (
            <div className="max-w-md mx-auto bg-amber-500/20 border border-amber-400/30 text-amber-200 text-xs p-2.5 rounded-xl text-center">
              {locationError}
            </div>
          )}
        </div>
      </div>

      {/* Discovery Mode Regulatory Disclaimer */}
      <div className="bg-slate-100 border-b border-slate-200 py-2.5 px-4 text-center">
        <p className="text-[11px] text-slate-600 max-w-4xl mx-auto flex items-center justify-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-primary flex-shrink-0" />
          <span>
            <strong>Discovery Mode:</strong> Searches do not create transactions or bills. Live availability reflects real-time verified stock at licensed pharmacy locations.
          </span>
        </p>
      </div>

      {/* Main Content & Results */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        {/* Controls Bar: Filter & Sort */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {searchQuery ? `Pharmacies with "${searchQuery}"` : 'All Verified In-Stock Medicines Nearby'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing pharmacies with stock &gt; 0 pieces, prioritized nearest to farthest.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {/* Distance Filter */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <span>Distance:</span>
              <select
                value={distanceFilter}
                onChange={(e) => setDistanceFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:border-primary"
              >
                <option value="all">All Distances</option>
                <option value="5">Within 5 km</option>
                <option value="10">Within 10 km</option>
                <option value="25">Within 25 km</option>
              </select>
            </div>

            {/* Sort by */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <span>Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:border-primary"
              >
                <option value="distance">Nearest First</option>
                <option value="stock">Highest Stock</option>
                <option value="price">Lowest Price</option>
              </select>
            </div>

            <div className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 px-3 py-1 rounded-lg">
              <strong className="text-primary">{processedResults.length}</strong> Match(es)
            </div>
          </div>
        </div>

        {/* Results Grid / Loading / Empty States */}
        {isSearching ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
                <div className="flex justify-between">
                  <Skeleton className="w-48 h-5" />
                  <Skeleton className="w-24 h-6 rounded-full" />
                </div>
                <Skeleton className="w-36 h-4" />
                <Skeleton className="w-full h-16 rounded-xl" />
                <div className="flex gap-2">
                  <Skeleton className="flex-1 h-9 rounded-xl" />
                  <Skeleton className="w-20 h-9 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : processedResults.length === 0 ? (
          <EmptyState
            icon={Pill}
            title="No In-Stock Pharmacies Found"
            description={
              searchQuery
                ? `Zero-stock pharmacies are hidden. No licensed pharmacy within radar currently has "${searchQuery}" in pieces > 0.`
                : 'No pharmacies currently have available medicines recorded in this radius. Try widening your distance filter or searching another formulation.'
            }
            actionLabel="Show all available medicines"
            onAction={() => {
              setSearchQuery('');
              setDistanceFilter('all');
            }}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {processedResults.map((item, idx) => {
              const mapsUrl = getGoogleMapsDirectionsUrl(
                item.pharmacy.latitude,
                item.pharmacy.longitude,
                item.pharmacy.name
              );

              return (
                <div
                  key={`${item.medicine.id}-${item.pharmacy.id}-${idx}`}
                  className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Medicine Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-slate-900 text-lg">{item.medicine.name}</h3>
                          {item.medicine.strength && (
                            <span className="bg-blue-50 text-primary text-xs font-bold px-2.5 py-0.5 rounded-md border border-blue-100">
                              {item.medicine.strength}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Generic: <span className="text-slate-700 font-semibold">{item.medicine.generic_name || 'N/A'}</span>
                          {item.medicine.brand && ` • Brand: ${item.medicine.brand}`}
                        </p>
                      </div>

                      {/* Distance Badge */}
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xs flex-shrink-0">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{item.distanceKm} km away</span>
                      </span>
                    </div>

                    {/* Stock & Pricing Breakdown Grid */}
                    <div className="grid grid-cols-2 gap-3 my-4 bg-slate-50/80 rounded-xl p-3.5 border border-slate-100">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Full Strips Stock
                        </span>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                          <span className="text-lg font-extrabold text-slate-900">
                            {item.availableStrips}
                          </span>
                          <span className="text-xs text-slate-500">strips</span>
                        </div>
                        <p className="text-xs font-bold text-primary mt-0.5">
                          ₹{Number(item.pricePerStrip).toFixed(2)} <span className="text-[10px] text-slate-400 font-normal">/ strip</span>
                        </p>
                      </div>

                      <div className="border-l border-slate-200 pl-3.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Loose Pieces Stock
                        </span>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                          <span className="text-lg font-extrabold text-slate-900">
                            {item.loosePieces}
                          </span>
                          <span className="text-xs text-slate-500">pieces</span>
                        </div>
                        <p className="text-xs font-bold text-primary mt-0.5">
                          ₹{Number(item.pricePerPiece).toFixed(2)} <span className="text-[10px] text-slate-400 font-normal">/ piece</span>
                        </p>
                      </div>
                    </div>

                    {/* Stock Summary Note */}
                    <div className="text-[11px] text-slate-500 mb-4 flex items-center justify-between">
                      <span>Total pieces available: <strong>{item.availablePieces}</strong></span>
                      <span className="text-[10px] text-slate-400">({item.piecesPerStrip} pcs / strip)</span>
                    </div>

                    {/* Pharmacy Information */}
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
                      <p className="text-xs text-slate-500 pl-5 flex items-center gap-1 pt-0.5 font-mono">
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
                      className="flex-1 bg-primary hover:bg-primary-dark text-white text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-xs"
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

                    <button
                      onClick={() => setChatPharmacy(item.pharmacy)}
                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-emerald-200/60"
                      title="Chat with Pharmacy AI Assistant"
                    >
                      <Bot className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="hidden sm:inline">Ask AI</span>
                    </button>

                    <button
                      onClick={() => setSelectedPharmacyModal(item)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-2.5 px-3 rounded-xl transition-colors"
                      title="View Details"
                    >
                      Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Details Modal */}
      {selectedPharmacyModal && (
        <Modal
          isOpen={Boolean(selectedPharmacyModal)}
          onClose={() => setSelectedPharmacyModal(null)}
          title={selectedPharmacyModal.pharmacy.name}
          subtitle={`Distance: ${selectedPharmacyModal.distanceKm} km away`}
        >
          <div className="space-y-4 text-xs">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
              <span className="font-semibold text-slate-700">Physical Address:</span>
              <p className="text-slate-600">{selectedPharmacyModal.pharmacy.address}</p>
              <p className="text-slate-600 pt-1 font-mono">Contact: {selectedPharmacyModal.pharmacy.phone}</p>
            </div>

            <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-100 space-y-1">
              <span className="font-bold text-primary">Medicine Stock Availability:</span>
              <p className="text-slate-700 font-semibold">{selectedPharmacyModal.medicine.name} ({selectedPharmacyModal.medicine.strength})</p>
              <div className="flex items-center gap-4 text-slate-600 pt-1">
                <span>Strips: <strong>{selectedPharmacyModal.availableStrips}</strong> (₹{selectedPharmacyModal.pricePerStrip}/strip)</span>
                <span>Loose: <strong>{selectedPharmacyModal.loosePieces}</strong> (₹{selectedPharmacyModal.pricePerPiece}/piece)</span>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => {
                  setChatPharmacy(selectedPharmacyModal.pharmacy);
                  setSelectedPharmacyModal(null);
                }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition"
              >
                <Bot className="w-4 h-4" />
                <span>Chat with AI Assistant</span>
              </button>

              <a
                href={selectedPharmacyModal.directionsUrl || getGoogleMapsDirectionsUrl(
                  selectedPharmacyModal.pharmacy.latitude,
                  selectedPharmacyModal.pharmacy.longitude,
                  selectedPharmacyModal.pharmacy.name
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-primary hover:bg-primary-dark text-white text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Navigate Maps</span>
              </a>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedPharmacyModal(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Customer Pharmacy Chat Modal */}
      <CustomerChatModal
        pharmacy={chatPharmacy}
        isOpen={Boolean(chatPharmacy)}
        onClose={() => setChatPharmacy(null)}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 px-4 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-4xl mx-auto space-y-2">
          <p className="font-semibold text-slate-700">MedGuard AI • Public Medicine Discovery Radar</p>
          <p className="text-[11px] text-slate-400">
            Stock availability is synchronized directly with licensed pharmacy point-of-sale inventory. No customer purchase or reservation is created on discovery.
          </p>
        </div>
      </footer>
    </div>
  );
};
