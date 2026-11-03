import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../ui/Logo';
import { ShieldCheck, Heart } from 'lucide-react';

export const Footer = () => {
  const navigate = useNavigate();

  return (
    <footer className="bg-slate-900 text-slate-400 text-xs border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="md:col-span-1 space-y-3">
            <Logo size="md" variant="dark" showTagline={true} />
            <p className="text-slate-400 text-xs leading-relaxed pt-2">
              AI-powered medicine packaging recognition, real-time strip & piece inventory intelligence, and public pharmacy discovery.
            </p>
            <div className="flex items-center gap-2 pt-2 text-[11px] text-slate-500">
              <ShieldCheck className="w-4 h-4 text-ai" />
              <span>Compliant with Indian Pharmacy Regulations</span>
            </div>
          </div>

          {/* Product */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Product</h4>
            <ul className="space-y-2">
              <li>
                <a href="#features" className="hover:text-white transition-colors">Features</a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
              </li>
              <li>
                <button
                  onClick={() => navigate('/find-medicine')}
                  className="hover:text-white transition-colors text-left"
                >
                  Find Medicine
                </button>
              </li>
              <li>
                <a href="#for-pharmacies" className="hover:text-white transition-colors">For Pharmacies</a>
              </li>
            </ul>
          </div>

          {/* Pharmacist Operations */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Pharmacist Portal</h4>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => navigate('/pharmacist/login')}
                  className="hover:text-white transition-colors text-left"
                >
                  Pharmacist Login
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/pharmacist/register')}
                  className="hover:text-white transition-colors text-left"
                >
                  Create Pharmacy Account
                </button>
              </li>
              <li>
                <a href="#ai-showcase" className="hover:text-white transition-colors">Gemma 4 Vision Scanner</a>
              </li>
              <li>
                <a href="#features" className="hover:text-white transition-colors">FEFO Expiry Rules</a>
              </li>
            </ul>
          </div>

          {/* Legal / Resources */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Resources & Legal</h4>
            <ul className="space-y-2">
              <li>
                <span className="text-slate-500">Privacy Policy (Internal Only)</span>
              </li>
              <li>
                <span className="text-slate-500">Terms of Service</span>
              </li>
              <li>
                <span className="text-slate-500">Security & Encryption</span>
              </li>
              <li>
                <span className="text-slate-500">Drug License Verification</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <p>© {new Date().getFullYear()} MedGuard AI. All rights reserved.</p>
          <p className="flex items-center gap-1">
            <span>Built with precision for healthcare providers</span>
          </p>
        </div>
      </div>
    </footer>
  );
};
