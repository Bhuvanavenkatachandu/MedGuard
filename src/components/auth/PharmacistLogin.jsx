import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { usePharmacy } from '../../context/PharmacyContext';
import { 
  Mail, 
  Lock, 
  ArrowRight, 
  AlertCircle, 
  Sparkles,
  Building2,
  ShieldCheck
} from 'lucide-react';

export const PharmacistLogin = () => {
  const navigate = useNavigate();
  const { loginPharmacist, loginWithDemoSession } = usePharmacy();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      // Step: Login -> Supabase Session -> Find Profile -> Find Pharmacy
      const result = await loginPharmacist(email.trim(), password);

      // Prompt requirement: "If pharmacy setup is incomplete, send the pharmacist to the Pharmacy Setup page instead of the dashboard."
      if (result.isSetupComplete) {
        navigate('/pharmacist/dashboard');
      } else {
        navigate('/pharmacist/setup');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Login failed. Please verify email and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = () => {
    setLoading(true);
    setTimeout(() => {
      loginWithDemoSession();
      navigate('/pharmacist/dashboard');
    }, 400);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex w-14 h-14 rounded-2xl bg-blue-600 text-white items-center justify-center font-bold text-2xl shadow-xl shadow-blue-500/20 mb-3">
          🛡️
        </div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">
          Pharmacist Sign In
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Supabase Authenticated Access • RLS Protected
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-800 border border-slate-700/60 py-8 px-6 shadow-2xl rounded-2xl sm:px-10 text-white">
          {errorMessage && (
            <div className="mb-5 bg-rose-500/20 border border-rose-500/30 text-rose-200 text-xs p-3 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            {/* Email */}
            <div>
              <label className="block font-medium text-slate-300 mb-1">
                Pharmacist Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="pharmacist@apollopharmacy.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block font-medium text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold py-3 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Pharmacy Portal'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Login & Registration Link */}
          <div className="mt-6 pt-5 border-t border-slate-700/60 space-y-3">
            <button
              type="button"
              onClick={handleQuickDemoLogin}
              className="w-full bg-slate-700/80 hover:bg-slate-700 text-blue-300 text-xs font-semibold py-2.5 px-3 rounded-xl border border-blue-500/20 flex items-center justify-center gap-2 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Instant Demo Pharmacist Session</span>
            </button>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
              <Link
                to="/pharmacist/register"
                className="text-blue-400 hover:text-blue-300 font-semibold underline"
              >
                New Pharmacist? Register Here →
              </Link>

              <Link
                to="/"
                className="hover:text-slate-200"
              >
                ← Customer Radar
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
