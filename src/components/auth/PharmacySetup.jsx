import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { usePharmacy } from '../../context/PharmacyContext';
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

export const PharmacySetup = () => {
  const navigate = useNavigate();
  const { user, profile, pharmacy, setupPharmacy, isSetupComplete } = usePharmacy();

  // If already completed setup, redirect to dashboard
  if (isSetupComplete) {
    return <Navigate to="/pharmacist/dashboard" replace />;
  }

  // If not logged in at all, redirect to register
  if (!user && !profile) {
    return <Navigate to="/pharmacist/register" replace />;
  }

  // Pharmacy Details State
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [fullAddress, setFullAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');

  // Location State
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

    // Form validations
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
      setErrorMessage('Please confirm your physical shop location on the map in Step 3 before saving.');
      return;
    }

    setLoading(true);

    try {
      // Step 4: Create Pharmacy & Associate with Logged-in Pharmacist
      await setupPharmacy({
        name: shopName.trim(),
        ownerName: ownerName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: `${fullAddress.trim()}, ${city.trim()}, ${state.trim()} - ${pincode.trim()}`,
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        licenseNumber: licenseNumber.trim(),
        latitude,
        longitude,
      });

      // On completion, open the dashboard
      navigate('/pharmacist/dashboard');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to complete pharmacy setup.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Step Progress Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-blue-600 text-white items-center justify-center font-bold text-2xl shadow-xl shadow-blue-500/20 mb-1">
            🏥
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Pharmacy Setup & Physical Location
          </h1>
          <p className="text-xs text-slate-400">
            Account created for <strong>{profile?.full_name || user?.email}</strong>. Please complete shop details to activate your dashboard.
          </p>

          <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] font-semibold text-slate-400">
            <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>1. Account</span>
            </span>
            <span>→</span>
            <span className="bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold">2. Pharmacy Details</span>
            <span>→</span>
            <span className="bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold">3. Confirm Location</span>
            <span>→</span>
            <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">4. Dashboard</span>
          </div>
        </div>

        {errorMessage && (
          <div className="bg-rose-500/20 border border-rose-500/30 text-rose-200 text-xs p-3.5 rounded-2xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 2: Shop Details Card */}
          <div className="bg-slate-800 border border-slate-700/60 rounded-2xl p-6 shadow-2xl text-white space-y-4">
            <div className="border-b border-slate-700 pb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                <Building2 className="w-4 h-4" />
                <span>Step 2 — Shop & License Details</span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                These details will appear on your customer tax invoices and public medicine discovery cards.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-medium text-slate-300 mb-1">
                  Shop / Pharmacy Trade Name *
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="e.g. Apollo Care Pharmacy - Indiranagar"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-xs text-white font-semibold placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  Owner / Licensee Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Dr. Rajesh Sharma"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  Shop Contact Phone Number *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  Official Pharmacy Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="pharmacy@medguard.io"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  Pharmacy Drug License Number *
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    placeholder="DL-KA-2026-88741"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-medium text-slate-300 mb-1">
                  Full Street / Building Address *
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={fullAddress}
                    onChange={(e) => setFullAddress(e.target.value)}
                    placeholder="100 Feet Rd, HAL 2nd Stage, Indiranagar"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  City *
                </label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Bengaluru"
                  className="w-full px-3 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  State *
                </label>
                <input
                  type="text"
                  required
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="Karnataka"
                  className="w-full px-3 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-medium text-slate-300 mb-1">
                  Pincode / Postal Code *
                </label>
                <input
                  type="text"
                  required
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="560038"
                  className="w-full px-3 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Step 3: Interactive Location Confirmation Component */}
          <div className="bg-slate-800 border border-slate-700/60 rounded-2xl p-6 shadow-2xl text-white">
            <LocationPicker
              initialLat={latitude}
              initialLng={longitude}
              isConfirmed={isLocationConfirmed}
              setIsConfirmed={setIsLocationConfirmed}
              onLocationConfirmed={handleLocationConfirmed}
            />
          </div>

          {/* Step 4: Submission */}
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-slate-400">
              Only you will have administrative access to this pharmacy's private records.
            </p>

            <button
              type="submit"
              disabled={loading || !isLocationConfirmed}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2"
            >
              <span>{loading ? 'Creating Pharmacy...' : 'Complete Setup & Open Dashboard'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
