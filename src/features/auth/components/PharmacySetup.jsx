import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { usePharmacy } from '../../../shared/context/PharmacyContext';
import { LocationPicker } from './LocationPicker';
import { 
  Building2, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2,
  ShieldCheck,
  Building
} from 'lucide-react';
import { Logo } from '../../../shared/components/ui/Logo';
import { Button } from '../../../shared/components/ui/Button';

export const PharmacySetup = () => {
  const navigate = useNavigate();
  const { user, profile, pharmacy, setupPharmacy, isSetupComplete, isEmailVerified } = usePharmacy();

  if (isSetupComplete) {
    return <Navigate to="/pharmacist/dashboard" replace />;
  }

  if (!user && !profile) {
    return <Navigate to="/pharmacist/login" replace />;
  }

  if (!isEmailVerified) {
    return <Navigate to="/pharmacist/login?unverified=true" replace />;
  }

  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [fullAddress, setFullAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');

  const [latitude, setLatitude] = useState(12.9719);
  const [longitude, setLongitude] = useState(77.6412);
  const [isLocationConfirmed, setIsLocationConfirmed] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    if (profile?.full_name && !ownerName) setOwnerName(profile.full_name);
    if (profile?.phone && !phone) setPhone(profile.phone);
    if (user?.email && !email) setEmail(user.email);
  }, [profile, user]);

  const handleLocationConfirmed = (coords) => {
    setLatitude(coords.latitude);
    setLongitude(coords.longitude);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!shopName.trim()) {
      setErrorMessage('Please provide the Pharmacy / Shop Trade Name.');
      return;
    }
    if (!ownerName.trim()) {
      setErrorMessage('Please provide the Owner / Pharmacist Name.');
      return;
    }
    if (!phone.trim()) {
      setErrorMessage('Please provide the Pharmacy contact phone number.');
      return;
    }
    if (!fullAddress.trim() || !city.trim() || !state.trim() || !pincode.trim()) {
      setErrorMessage('Please provide full address details including City, State, and Pincode.');
      return;
    }
    if (!licenseNumber.trim()) {
      setErrorMessage('Please provide the Drug License Number (e.g. DL-KA-2026-XXXX).');
      return;
    }
    if (!isLocationConfirmed) {
      setErrorMessage('Please confirm your physical shop location on the map before saving.');
      return;
    }

    setLoading(true);

    try {
      await setupPharmacy({
        name: shopName.trim(),
        ownerName: ownerName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: fullAddress.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        latitude,
        longitude,
        licenseNumber: licenseNumber.trim(),
      });

      navigate('/pharmacist/dashboard');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to setup pharmacy');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-8">
      <div className="max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl p-6 sm:p-10 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-primary text-xs font-semibold mb-2">
                <span>Step 2 & 3: Store & Radar Location</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Pharmacy Trade Profile & Store Location
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                This official trade information will be displayed to nearby patients and printed on invoice headers.
              </p>
            </div>
            <Logo size="md" />
          </div>

          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3.5 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Pharmacy Trade Information */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <Building2 className="w-4 h-4 text-primary" />
                <span>Pharmacy Trade Details</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Pharmacy Trade Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="e.g. Apollo Care Pharmacy - Indiranagar"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 font-bold focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Licensed Pharmacist / Owner *
                  </label>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="e.g. Bhuvana Venkata Chandu"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 font-semibold focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Store Contact Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Official Drug License Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    placeholder="e.g. DL-KA-2026-98765"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Full Physical Address *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullAddress}
                    onChange={(e) => setFullAddress(e.target.value)}
                    placeholder="e.g. 100 Feet Road, HAL 2nd Stage, Indiranagar"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Bengaluru"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">State *</label>
                    <input
                      type="text"
                      required
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="e.g. Karnataka"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Pincode *</label>
                    <input
                      type="text"
                      required
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      placeholder="e.g. 560038"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* GPS Store Location Section */}
            <div className="space-y-4 pt-2">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <MapPin className="w-4 h-4 text-rose-500" />
                <span>Physical Store Coordinates (Live Stock Radar Anchor)</span>
              </h2>

              <LocationPicker
                initialLat={latitude}
                initialLng={longitude}
                onLocationConfirmed={handleLocationConfirmed}
                isConfirmed={isLocationConfirmed}
                setIsConfirmed={setIsLocationConfirmed}
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <Button
                variant="primary"
                size="lg"
                type="submit"
                isLoading={loading}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Complete Setup & Open Dashboard
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
