import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { usePharmacy } from '../../context/PharmacyContext';
import { 
  Mail, 
  Lock, 
  ArrowRight, 
  AlertCircle, 
  Sparkles,
  KeyRound,
  CheckCircle2,
  X
} from 'lucide-react';

export const PharmacistLogin = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { 
    loginPharmacist, 
    resendVerificationEmail,
    sendPasswordResetEmailViaResend 
  } = usePharmacy();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Email Not Verified modal state
  const [showUnverifiedModal, setShowUnverifiedModal] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState(null);

  // Check if routed with ?unverified=true
  useEffect(() => {
    if (searchParams.get('unverified') === 'true') {
      const emailParam = searchParams.get('email');
      if (emailParam) setUnverifiedEmail(emailParam);
      setShowUnverifiedModal(true);
    }
  }, [searchParams]);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(null);
  const [forgotError, setForgotError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setResendStatus(null);
    setLoading(true);

    try {
      const result = await loginPharmacist({ email: email.trim(), password });

      // If email is NOT verified:
      // DO NOT open Pharmacy Setup.
      // DO NOT open Dashboard.
      // DO NOT create a verification page.
      // Instead, remain on the existing Login page and show modal/message
      if (!result.isEmailVerified) {
        setUnverifiedEmail(result.email || email.trim());
        setShowUnverifiedModal(true);
        return;
      }

      // If verified:
      if (!result.isSetupComplete) {
        navigate('/pharmacist/setup');
      } else {
        navigate('/pharmacist/dashboard');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Login failed. Please verify email and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    const target = unverifiedEmail || email.trim();
    if (!target) return;
    setResending(true);
    setResendStatus(null);
    try {
      const res = await resendVerificationEmail(target);
      if (res?.resendNotice) {
        setResendStatus({ type: 'success', text: res.resendNotice });
      } else {
        setResendStatus({ type: 'success', text: 'Verification email sent. Please check your inbox.' });
      }
    } catch (err) {
      if (err.message?.toLowerCase().includes('rate limit')) {
        setResendStatus({ 
          type: 'error', 
          text: 'Supabase free mailer rate limit reached (3/hr). In Supabase Dashboard → Authentication → Providers → Email, turn off "Confirm email" or set Resend Custom SMTP.' 
        });
      } else {
        setResendStatus({ type: 'error', text: err.message || 'Failed to resend verification email.' });
      }
    } finally {
      setResending(false);
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setForgotError('Please enter your email address.');
      return;
    }

    setForgotLoading(true);
    setForgotError(null);
    setForgotSuccess(null);

    try {
      await sendPasswordResetEmailViaResend(forgotEmail.trim());
      setForgotSuccess(`Password reset email sent via Resend to ${forgotEmail}! Please check your inbox.`);
    } catch (err) {
      setForgotError(err.message || 'Failed to send reset email.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex w-14 h-14 rounded-2xl bg-blue-600 text-white items-center justify-center font-bold text-2xl shadow-xl shadow-blue-500/20 mb-3">
          🛡️
        </div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">
          Pharmacist Login
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          MedGuard AI • Secure Pharmacy Operating System
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

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            {/* Email Address */}
            <div>
              <label className="block font-medium text-slate-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="pharmacist@yourpharmacy.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Password with Forgot Password link */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-medium text-slate-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(email);
                    setShowForgotModal(true);
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300 hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
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

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold py-3 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{loading ? 'Signing in...' : 'Login'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Quick 1-Click Demo Login Shortcuts */}
            <div className="pt-3">
              <div className="text-[11px] text-slate-400 font-medium mb-1.5 text-center">Quick Demo Login:</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEmail('apollo.indiranagar@medguard.io');
                    setPassword('Password@123');
                    loginPharmacist({ email: 'apollo.indiranagar@medguard.io', password: 'Password@123' })
                      .then(() => navigate('/pharmacist/dashboard'))
                      .catch(err => setErrorMessage(err.message));
                  }}
                  className="bg-slate-900/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white p-2 rounded-lg text-[11px] font-medium text-center transition-all cursor-pointer"
                >
                  🏥 Apollo (Bengaluru)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('medplus.koramangala@medguard.io');
                    setPassword('Password@123');
                    loginPharmacist({ email: 'medplus.koramangala@medguard.io', password: 'Password@123' })
                      .then(() => navigate('/pharmacist/dashboard'))
                      .catch(err => setErrorMessage(err.message));
                  }}
                  className="bg-slate-900/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white p-2 rounded-lg text-[11px] font-medium text-center transition-all cursor-pointer"
                >
                  💊 MedPlus (Koramangala)
                </button>
              </div>
            </div>
          </form>

          {/* Registration link and Customer Radar link */}
          <div className="mt-6 pt-5 border-t border-slate-700/60">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="text-slate-400">
                Don't have an account?{' '}
                <Link
                  to="/pharmacist/register"
                  className="text-blue-400 hover:text-blue-300 font-semibold underline ml-1"
                >
                  Register
                </Link>
              </span>

              <Link to="/" className="hover:text-slate-200">
                ← Customer Radar
              </Link>
            </div>
          </div>

        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-sm w-full p-6 text-white space-y-4 shadow-2xl relative">
            <button
              type="button"
              onClick={() => {
                setShowForgotModal(false);
                setForgotSuccess(null);
                setForgotError(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
              <KeyRound className="w-4 h-4" />
              <span>Reset Password</span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Enter your registered pharmacist email address to receive a secure password reset link via Resend.
            </p>

            {forgotSuccess && (
              <div className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 text-xs p-3 rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{forgotSuccess}</span>
              </div>
            )}

            {forgotError && (
              <div className="bg-rose-500/20 border border-rose-500/30 text-rose-200 text-xs p-3 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{forgotError}</span>
              </div>
            )}

            {!forgotSuccess ? (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Pharmacist Email</label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="pharmacist@yourpharmacy.com"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition-all"
                >
                  {forgotLoading ? 'Sending link via Resend...' : 'Send Reset Link'}
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setShowForgotModal(false);
                  setForgotSuccess(null);
                }}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold py-2.5 rounded-xl transition-all"
              >
                Close
              </button>
            )}
          </div>
        </div>
      )}

      {/* Email Not Verified Modal */}
      {showUnverifiedModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-sm w-full p-6 text-white space-y-4 shadow-2xl text-center relative">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
              <Mail className="w-6 h-6" />
            </div>

            <h2 className="text-lg font-extrabold text-white">
              Email Not Verified
            </h2>

            <p className="text-xs text-slate-300 leading-relaxed">
              Please verify your email{unverifiedEmail ? ` (${unverifiedEmail})` : ''} before continuing.
            </p>

            {resendStatus && (
              <div className={`p-3 rounded-xl text-xs flex items-center justify-center gap-2 ${
                resendStatus.type === 'success' 
                  ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300' 
                  : 'bg-rose-500/20 border border-rose-500/30 text-rose-300'
              }`}>
                {resendStatus.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                )}
                <span>{resendStatus.text}</span>
              </div>
            )}

            <div className="space-y-2 pt-2">
              <button
                type="button"
                disabled={resending}
                onClick={handleResendVerification}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold py-3 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
              >
                <span>{resending ? 'Sending...' : 'Resend Verification Email'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowUnverifiedModal(false);
                  setResendStatus(null);
                }}
                className="w-full bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold py-2.5 px-4 rounded-xl transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
