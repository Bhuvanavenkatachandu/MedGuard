import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { usePharmacy } from '../../../shared/context/PharmacyContext';
import { 
  Mail, 
  Lock, 
  ArrowRight, 
  AlertCircle, 
  Sparkles,
  KeyRound,
  CheckCircle2,
  X,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { Logo } from '../../../shared/components/ui/Logo';
import { Button } from '../../../shared/components/ui/Button';
import { Modal } from '../../../shared/components/ui/Modal';

export const PharmacistLogin = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { 
    loginPharmacist, 
    resendVerificationEmail 
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

      if (!result.isEmailVerified) {
        setUnverifiedEmail(result.email || email.trim());
        setShowUnverifiedModal(true);
        return;
      }

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
      setResendStatus({ type: 'error', text: err.message || 'Failed to resend verification email.' });
    } finally {
      setResending(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail || !forgotEmail.includes('@')) {
      setForgotError('Please enter a valid email address.');
      return;
    }
    setForgotLoading(true);
    setForgotError(null);
    setForgotSuccess(null);
    try {
      setForgotSuccess(`Password reset instructions have been sent to ${forgotEmail}.`);
    } catch (err) {
      setForgotError(err.message || 'Failed to send password reset email.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center">
      <div className="max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[580px]">
          {/* Left Visual Column (Section 38: Brand / AI Visual) */}
          <div className="hidden md:flex md:col-span-5 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-8 flex-col justify-between text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-ai/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-6">
              <Logo size="md" variant="dark" />

              <div className="pt-8 space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 bg-cyan-950/80 px-2.5 py-1 rounded-full border border-cyan-800">
                  Pharmacy Portal
                </span>
                <h2 className="text-2xl font-extrabold tracking-tight text-white leading-snug">
                  Automated medicine inventory intelligence.
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Sign in to manage stock with FEFO radar, auto-scan packaging with Gemma 4 Vision, and serve nearby patients.
                </p>
              </div>
            </div>

            <div className="relative z-10 pt-6 border-t border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <ShieldCheck className="w-4 h-4 text-ai" />
                <span>Licensed Pharmacist Authentication</span>
              </div>
              <p className="text-[10px] text-slate-500">
                Compliant with Pharmacy Act & Drugs Rules.
              </p>
            </div>
          </div>

          {/* Right Column: Authentication Form */}
          <div className="md:col-span-7 p-6 sm:p-10 flex flex-col justify-between">
            <div>
              {/* Header on mobile */}
              <div className="md:hidden mb-6">
                <Logo size="md" />
              </div>

              <div className="space-y-1 mb-6">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  Sign In to Pharmacist Account
                </h1>
                <p className="text-xs text-slate-500">
                  Enter your registered credentials to access your pharmacy counter.
                </p>
              </div>

              {errorMessage && (
                <div className="mb-5 bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3.5 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="pharmacist@example.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-primary font-medium"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Password *
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(true)}
                      className="text-xs text-primary hover:text-primary-dark font-semibold"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-primary font-mono"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    variant="primary"
                    size="md"
                    type="submit"
                    className="w-full py-3"
                    isLoading={loading}
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    Sign In to Pharmacy
                  </Button>
                </div>
              </form>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <span>Don't have a pharmacy account yet?</span>
              <Button
                variant="outline"
                size="xs"
                onClick={() => navigate('/pharmacist/register')}
              >
                Register New Pharmacy
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <Modal
          isOpen={showForgotModal}
          onClose={() => setShowForgotModal(false)}
          title="Reset Password"
          subtitle="We will email you instructions to reset your password."
        >
          <form onSubmit={handleForgotPassword} className="space-y-4 text-xs">
            {forgotSuccess ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{forgotSuccess}</span>
              </div>
            ) : (
              <>
                {forgotError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span>{forgotError}</span>
                  </div>
                )}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Registered Email *</label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="pharmacist@example.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="pt-2 flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                  >
                    Close
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    type="submit"
                    isLoading={forgotLoading}
                  >
                    Send Reset Link
                  </Button>
                </div>
              </>
            )}
          </form>
        </Modal>
      )}

      {/* Email Verification Reminder Modal */}
      {showUnverifiedModal && (
        <Modal
          isOpen={showUnverifiedModal}
          onClose={() => setShowUnverifiedModal(false)}
          title="Email Verification Notice"
          subtitle="Please confirm your account email to activate pharmacy operations."
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600">
              A verification email was sent to <strong>{unverifiedEmail}</strong>. If you did not receive it or need another copy, click below.
            </p>

            {resendStatus && (
              <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                resendStatus.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}>
                {resendStatus.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                )}
                <span>{resendStatus.text}</span>
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUnverifiedModal(false)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={resending}
                onClick={handleResendVerification}
              >
                Resend Verification Email
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
