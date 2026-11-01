import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { usePharmacy } from '../../context/PharmacyContext';
import { 
  Mail, 
  Phone, 
  Lock, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

export const PharmacistRegister = () => {
  const navigate = useNavigate();
  const { registerPharmacist, resendVerificationEmail } = usePharmacy();

  // Basic account info fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Registration success popup/modal
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendNotice, setResendNotice] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setResendNotice(null);

    // Validations
    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify both password fields.');
      return;
    }
    const cleanPhone = mobileNumber.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);

    try {
      await registerPharmacist({
        fullName: fullName.trim(),
        name: fullName.trim(),
        email: email.trim(),
        password,
        phone: cleanPhone,
        mobileNumber: cleanPhone,
      });

      setRegisteredEmail(email.trim());
      setShowVerifyModal(true);
    } catch (err) {
      setErrorMessage(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleModalOk = () => {
    setShowVerifyModal(false);
    navigate('/pharmacist/setup');
  };

  const handleResend = async () => {
    const target = registeredEmail || email.trim();
    if (!target) return;
    setResending(true);
    setResendNotice(null);
    try {
      const res = await resendVerificationEmail(target);
      if (res?.resendNotice) {
        setResendNotice({ type: 'success', text: res.resendNotice });
      } else {
        setResendNotice({ type: 'success', text: 'Verification email sent. Please check your inbox.' });
      }
    } catch (err) {
      setResendNotice({ type: 'error', text: err.message || 'Failed to resend verification email.' });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex w-14 h-14 rounded-2xl bg-blue-600 text-white items-center justify-center font-bold text-2xl shadow-xl shadow-blue-500/20 mb-3">
          🛡️
        </div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">
          Create Pharmacist Account
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Account Registration • Step 1 of 4
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-800 border border-slate-700/60 py-8 px-6 shadow-2xl rounded-2xl sm:px-10 text-white">
          
          {errorMessage && (
            <div className="mb-5 bg-rose-500/20 border border-rose-500/30 text-rose-200 text-xs p-3.5 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Full Name */}
            <div>
              <label className="block font-medium text-slate-300 mb-1">
                Full Name / Pharmacist Name *
              </label>
              <div className="relative">
                <UserCheck className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Dr. Rajesh Sharma"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block font-medium text-slate-300 mb-1">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="pharmacist@example.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block font-medium text-slate-300 mb-1">
                Mobile Number (10 digits) *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="tel"
                  required
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="9876543210"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block font-medium text-slate-300 mb-1">
                Password * (min. 6 characters)
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

            {/* Confirm Password */}
            <div>
              <label className="block font-medium text-slate-300 mb-1">
                Confirm Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Registration button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold py-3 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Creating Account & Sending Email...' : 'Create Pharmacist Account'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Links */}
          <div className="mt-6 pt-5 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
            <span className="text-slate-400">
              Already have an account?{' '}
              <Link to="/pharmacist/login" className="text-blue-400 hover:text-blue-300 font-semibold underline ml-1">
                Sign In
              </Link>
            </span>

            <Link to="/" className="hover:text-slate-200">
              ← Customer Radar
            </Link>
          </div>
        </div>
      </div>

      {/* Account Created Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 text-white space-y-4 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto">
              <Mail className="w-6 h-6" />
            </div>

            <h2 className="text-lg font-extrabold text-white">
              Account Created Successfully
            </h2>

            <p className="text-xs text-slate-300 leading-relaxed">
              Your pharmacist account has been created{registeredEmail ? ` for ${registeredEmail}` : ''}. You can now proceed to set up your pharmacy store details.
            </p>

            {resendNotice && (
              <div className={`p-3 rounded-xl text-xs flex items-center justify-center gap-2 ${
                resendNotice.type === 'success' 
                  ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300' 
                  : 'bg-rose-500/20 border border-rose-500/30 text-rose-300'
              }`}>
                {resendNotice.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                )}
                <span>{resendNotice.text}</span>
              </div>
            )}

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleModalOk}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-3 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
              >
                <span>Continue to Pharmacy Setup</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowVerifyModal(false);
                  navigate('/pharmacist/login');
                }}
                className="w-full bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <span>Sign In Instead</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
