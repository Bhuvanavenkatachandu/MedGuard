import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { usePharmacy } from '../../context/PharmacyContext';
import { 
  Lock, 
  Mail, 
  Building2, 
  User, 
  Phone, 
  MapPin, 
  FileText, 
  ArrowRight, 
  AlertCircle,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

export const PharmacistAuth = ({ onBackToDiscovery }) => {
  const { setPharmacy } = usePharmacy();
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  
  // Pharmacy Details (For Registration)
  const [pharmacyName, setPharmacyName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [pharmacyPhone, setPharmacyPhone] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('12.9719');
  const [longitude, setLongitude] = useState('77.6412');
  const [licenseNumber, setLicenseNumber] = useState('');

  // Handle Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSupabaseConfigured) {
        const { data, error: authErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authErr) throw authErr;
        window.location.reload();
      } else {
        // Demo login simulation
        setSuccessMsg('Logged into demo pharmacist account!');
        setTimeout(() => {
          window.location.reload();
        }, 600);
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Registration
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!pharmacyName || !ownerName || !address) {
      setError('Please provide Pharmacy Name, Owner Name, and Address.');
      setLoading(false);
      return;
    }

    try {
      if (isSupabaseConfigured) {
        // 1. Sign up user
        const { data: authData, error: authErr } = await supabase.auth.signUp({
          email,
          password,
        });

        if (authErr) throw authErr;

        if (authData.user) {
          // 2. Create Pharmacy
          const { data: pharmData, error: pharmErr } = await supabase
            .from('pharmacies')
            .insert({
              name: pharmacyName,
              owner_name: ownerName,
              phone: pharmacyPhone || 'N/A',
              email: email,
              address: address,
              latitude: parseFloat(latitude) || 12.9719,
              longitude: parseFloat(longitude) || 77.6412,
              license_number: licenseNumber || null,
            })
            .select()
            .single();

          if (pharmErr) throw pharmErr;

          // 3. Create Profile linked to Pharmacy
          const { error: profErr } = await supabase.from('profiles').insert({
            id: authData.user.id,
            pharmacy_id: pharmData.id,
            full_name: fullName || ownerName,
            role: 'pharmacist',
          });

          if (profErr) throw profErr;

          setSuccessMsg('Registration successful! Please check your email to verify or log in.');
          setIsRegister(false);
        }
      } else {
        // Local demo registration
        const newPh = {
          id: `ph-${Date.now()}`,
          name: pharmacyName,
          owner_name: ownerName,
          phone: pharmacyPhone,
          email,
          address,
          latitude: parseFloat(latitude) || 12.9719,
          longitude: parseFloat(longitude) || 77.6412,
          license_number: licenseNumber,
          near_expiry_threshold_days: 30,
        };
        setPharmacy(newPh);
        setSuccessMsg('Pharmacy registered successfully in demo mode!');
        setTimeout(() => {
          window.location.reload();
        }, 700);
      }
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  // Quick 1-click demo login
  const handleDemoLogin = () => {
    setLoading(true);
    setTimeout(() => {
      window.location.reload();
    }, 400);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 px-4">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex w-14 h-14 rounded-2xl bg-blue-600 text-white items-center justify-center font-bold text-2xl shadow-xl shadow-blue-500/20 mb-3">
          🛡️
        </div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">
          {isRegister ? 'Register New Pharmacy' : 'Pharmacist Portal Login'}
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          MedGuard AI • Secure Pharmacy Operating System & FEFO Radar
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-slate-800 border border-slate-700/60 py-8 px-6 shadow-2xl rounded-2xl sm:px-10 text-white">
          {error && (
            <div className="mb-5 bg-rose-500/20 border border-rose-500/30 text-rose-200 text-xs p-3 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 text-xs p-3 rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={isRegister ? handleRegister : handleLogin} className="space-y-4">
            {isRegister && (
              <>
                <div className="border-b border-slate-700 pb-2 mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400">
                    Pharmacist Credentials
                  </h3>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Pharmacist Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Dr. Rajesh Sharma"
                      className="w-full pl-9 pr-3 py-2 bg-slate-900/60 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="pharmacist@apollo.io"
                  className="w-full pl-9 pr-3 py-2 bg-slate-900/60 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-slate-900/60 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Registration Additional Fields */}
            {isRegister && (
              <div className="pt-3 border-t border-slate-700 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400">
                  Pharmacy Registration Details
                </h3>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Pharmacy Trade Name</label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={pharmacyName}
                      onChange={(e) => setPharmacyName(e.target.value)}
                      placeholder="Apollo Care Pharmacy"
                      className="w-full pl-9 pr-3 py-2 bg-slate-900/60 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Owner Name</label>
                    <input
                      type="text"
                      required
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="Rajesh Sharma"
                      className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Pharmacy Phone</label>
                    <input
                      type="text"
                      required
                      value={pharmacyPhone}
                      onChange={(e) => setPharmacyPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Pharmacy Physical Address</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="100 Feet Rd, Indiranagar, Bengaluru"
                      className="w-full pl-9 pr-3 py-2 bg-slate-900/60 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Latitude (GPS)</label>
                    <input
                      type="text"
                      required
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      placeholder="12.9719"
                      className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Longitude (GPS)</label>
                    <input
                      type="text"
                      required
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      placeholder="77.6412"
                      className="w-full px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Drug License Number</label>
                  <div className="relative">
                    <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      placeholder="DL-KA-2023-88741"
                      className="w-full pl-9 pr-3 py-2 bg-slate-900/60 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Processing...' : isRegister ? 'Complete Registration' : 'Sign In as Pharmacist'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Switcher */}
          <div className="mt-6 pt-5 border-t border-slate-700/60 space-y-3">
            <button
              onClick={handleDemoLogin}
              type="button"
              className="w-full bg-slate-700/80 hover:bg-slate-700 text-blue-300 text-xs font-semibold py-2 px-3 rounded-xl border border-blue-500/20 flex items-center justify-center gap-2 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Instant Demo Pharmacist Session</span>
            </button>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsRegister(!isRegister);
                  setError(null);
                }}
                className="hover:text-blue-400 underline"
              >
                {isRegister ? 'Already registered? Sign in' : "New Pharmacy? Register here"}
              </button>

              <button
                type="button"
                onClick={onBackToDiscovery}
                className="hover:text-slate-200"
              >
                ← Back to Customer Radar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
