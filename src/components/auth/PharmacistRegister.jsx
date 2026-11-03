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
  UserCheck,
  User,
  Building2
} from 'lucide-react';
import { Logo } from '../ui/Logo';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

export const PharmacistRegister = () => {
  const navigate = useNavigate();
  const { registerPharmacist, resendVerificationEmail } = usePharmacy();

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
      setResendNotice({ type: 'error', text: err.message || 'Failed to resend email.' });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-8">
      <div className="max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[640px]">
          {/* Left Visual Column */}
          <div className="hidden md:flex md:col-span-5 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-8 flex-col justify-between text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-ai/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-6">
              <Logo size="md" variant="dark" />

              <div className="pt-8 space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 bg-cyan-950/80 px-2.5 py-1 rounded-full border border-cyan-800">
                  Step 1 of 3: Account Creation
                </span>
                <h2 className="text-2xl font-extrabold tracking-tight text-white leading-snug">
                  Join the MedGuard Pharmacy Network.
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Connect your pharmacy to neighborhood patients, automate batch entry with AI scanning, and protect your margins with FEFO expiry monitoring.
                </p>
              </div>
            </div>

            <div className="relative z-10 pt-6 border-t border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <ShieldCheck className="w-4 h-4 text-ai" />
                <span>Licensed Indian Pharmacies & Chemists</span>
              </div>
              <p className="text-[10px] text-slate-500">
                Quick onboarding in under 2 minutes.
              </p>
            </div>
          </div>

          {/* Right Column: Registration Form */}
          <div className="md:col-span-7 p-6 sm:p-10 flex flex-col justify-between">
            <div>
              <div className="md:hidden mb-6">
                <Logo size="md" />
              </div>

              <div className="space-y-1 mb-6">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  Create Pharmacist Account
                </h1>
                <p className="text-xs text-slate-500">
                  Register your administrator credentials. In the next step, you will link your pharmacy shop.
                </p>
              </div>

              {errorMessage && (
                <div className="mb-5 bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3.5 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name (Pharmacist / Chemist) *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Bhuvana Venkata Chandu"
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-primary font-medium"
                    />
                  </div>
                </div>

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
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-primary font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mobile Number (10 digits) *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="tel"
                      required
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-primary font-mono font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Password *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-primary font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Confirm Password *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-primary font-mono"
                      />
                    </div>
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
                    Proceed to Pharmacy Setup
                  </Button>
                </div>
              </form>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <span>Already registered?</span>
              <Button
                variant="outline"
                size="xs"
                onClick={() => navigate('/pharmacist/login')}
              >
                Sign In Instead
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Registration Success Modal */}
      {showVerifyModal && (
        <Modal
          isOpen={showVerifyModal}
          onClose={handleModalOk}
          title="Account Created Successfully"
          subtitle="Proceed to set up your pharmacy trade profile and location."
        >
          <div className="space-y-4 text-xs">
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-xl space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Registered: {registeredEmail}</span>
              </div>
              <p className="text-[11px] text-emerald-800">
                Your account is ready. Next, input your pharmacy trade name, drug license number, and GPS store location.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                variant="primary"
                size="sm"
                onClick={handleModalOk}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Continue to Pharmacy Setup
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
