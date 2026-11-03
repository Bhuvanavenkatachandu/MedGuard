import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Logo } from '../ui/Logo';
import { Button } from '../ui/Button';
import { Menu, X, ArrowRight, ShieldCheck, ChevronRight } from 'lucide-react';

export const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    if (location.pathname !== '/') {
      navigate(`/#${id}`);
      return;
    }
    const elem = document.getElementById(id);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'glass-nav border-b border-slate-200/80 shadow-xs py-3'
          : 'bg-white/80 backdrop-blur-md border-b border-slate-100 py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Logo */}
        <div
          onClick={() => {
            navigate('/');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="cursor-pointer"
        >
          <Logo size="md" showTagline={false} />
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1.5 lg:gap-2">
          <button
            onClick={() => {
              navigate('/');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="text-xs font-semibold text-slate-600 hover:text-primary px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Home
          </button>
          <button
            onClick={() => scrollToSection('features')}
            className="text-xs font-semibold text-slate-600 hover:text-primary px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Features
          </button>
          <button
            onClick={() => scrollToSection('how-it-works')}
            className="text-xs font-semibold text-slate-600 hover:text-primary px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
          >
            How It Works
          </button>
          <button
            onClick={() => scrollToSection('ai-showcase')}
            className="text-xs font-semibold text-slate-600 hover:text-primary px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
          >
            AI Intelligence
          </button>
          <button
            onClick={() => navigate('/find-medicine')}
            className="text-xs font-semibold text-slate-600 hover:text-primary px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-1"
          >
            <span>Find Medicine</span>
            <span className="w-1.5 h-1.5 rounded-full bg-ai animate-pulse" />
          </button>
          <button
            onClick={() => scrollToSection('for-pharmacies')}
            className="text-xs font-semibold text-slate-600 hover:text-primary px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
          >
            For Pharmacies
          </button>
        </nav>

        {/* Right CTA / Auth Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/pharmacist/login')}
          >
            Login
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/pharmacist/register')}
            rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
          >
            Get Started
          </Button>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6 text-slate-700" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden glass-nav border-b border-slate-200 px-4 pt-3 pb-6 space-y-3 animate-in fade-in slide-in-from-top-2">
          <div className="space-y-1">
            <button
              onClick={() => {
                navigate('/');
                setMobileMenuOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="w-full text-left py-2 px-3 text-xs font-semibold text-slate-800 rounded-lg hover:bg-slate-100"
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection('features')}
              className="w-full text-left py-2 px-3 text-xs font-semibold text-slate-800 rounded-lg hover:bg-slate-100"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="w-full text-left py-2 px-3 text-xs font-semibold text-slate-800 rounded-lg hover:bg-slate-100"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection('ai-showcase')}
              className="w-full text-left py-2 px-3 text-xs font-semibold text-slate-800 rounded-lg hover:bg-slate-100"
            >
              AI Intelligence
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('/find-medicine');
              }}
              className="w-full text-left py-2 px-3 text-xs font-semibold text-primary rounded-lg bg-blue-50/60"
            >
              Find Medicine Nearby
            </button>
            <button
              onClick={() => scrollToSection('for-pharmacies')}
              className="w-full text-left py-2 px-3 text-xs font-semibold text-slate-800 rounded-lg hover:bg-slate-100"
            >
              For Pharmacies
            </button>
          </div>

          <div className="pt-3 border-t border-slate-200 flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('/pharmacist/login');
              }}
            >
              Pharmacist Login
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="w-full"
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('/pharmacist/register');
              }}
            >
              Get Started
            </Button>
          </div>
        </div>
      )}
    </header>
  );
};
