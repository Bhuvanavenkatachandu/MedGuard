import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../layout/Navbar';
import { Footer } from '../layout/Footer';
import { Hero3D } from './Hero3D';
import { HeroAiScannerEffect } from './HeroAiScannerEffect';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { 
  Sparkles, 
  Search, 
  Camera, 
  Clock, 
  Package, 
  ShoppingCart, 
  BarChart3, 
  ShieldCheck, 
  MapPin, 
  CheckCircle2, 
  ArrowRight, 
  Layers, 
  Eye, 
  FileCheck,
  ChevronRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { publicApi } from '../../../features/pharmacy/services/publicApi';

export const LandingPage = () => {
  const navigate = useNavigate();

  // Embedded Live Discovery Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeAiTab, setActiveAiTab] = useState('dolo');

  // Load preview medicines for the landing page discovery section
  useEffect(() => {
    let active = true;
    setIsSearching(true);
    publicApi.searchMedicines({
      query: searchQuery.trim(),
      lat: 12.9719,
      lng: 77.6412,
      maxDistanceKm: 50,
    }).then((data) => {
      if (!active) return;
      setIsSearching(false);
      if (Array.isArray(data)) {
        setSearchResults(data.slice(0, 4));
      }
    }).catch(() => {
      if (active) setIsSearching(false);
    });
    return () => { active = false; };
  }, [searchQuery]);

  const features = [
    {
      icon: Camera,
      title: 'AI Medicine Recognition',
      desc: 'Upload a medicine image and automatically extract name, generic salt, batch number, and expiry date.',
      tag: 'Gemma 4 Vision',
      color: 'from-blue-500 to-indigo-600',
    },
    {
      icon: Layers,
      title: 'Smart Strip & Piece Inventory',
      desc: 'Track medicine quantities in whole strips and individual loose tablets with automatic conversion.',
      tag: 'Exact Counts',
      color: 'from-teal-500 to-emerald-600',
    },
    {
      icon: Clock,
      title: 'FEFO Expiry Monitoring',
      desc: 'First-Expired, First-Out intelligence prioritizes dispensing older stock before newer batches.',
      tag: 'Zero Wastage',
      color: 'from-amber-500 to-orange-600',
    },
    {
      icon: MapPin,
      title: 'Live Medicine Discovery',
      desc: 'Help patients and customers find in-stock medicines nearby without needing to make phone calls.',
      tag: 'Real-time Radar',
      color: 'from-cyan-500 to-blue-600',
    },
    {
      icon: ShoppingCart,
      title: 'Atomic POS & Billing',
      desc: 'Seamless counter billing with instant invoice PDF creation and automatic stock deduction.',
      tag: 'Audit Logged',
      color: 'from-violet-500 to-purple-600',
    },
    {
      icon: BarChart3,
      title: 'Pharmacy Intelligence',
      desc: 'Gain instant visibility into daily sales revenue, stock valuation, and fast-vs-slow moving items.',
      tag: 'Executive View',
      color: 'from-blue-600 to-teal-600',
    },
  ];

  const steps = [
    {
      num: '01',
      title: 'Upload Packaging',
      desc: 'Pharmacist takes a photo or uploads packaging foil, box, or vial.',
    },
    {
      num: '02',
      title: 'AI Vision Analysis',
      desc: 'Gemma 4 Vision identifies brand name, generic formulation, strength, and dates.',
    },
    {
      num: '03',
      title: 'Review & Verify',
      desc: 'Pharmacist reviews the extracted fields and retains complete editing authority.',
    },
    {
      num: '04',
      title: 'Live Inventory & Radar',
      desc: 'Stock becomes immediately dispensable in POS and discoverable to nearby patients.',
    },
  ];

  const sampleAiData = {
    dolo: {
      name: 'Dolo 650 Tablet',
      generic: 'Paracetamol / Acetaminophen',
      strength: '650 mg',
      mfg: 'Micro Labs Limited',
      batch: 'DL-8841-B',
      mfgDate: 'January 2025',
      expDate: 'June 2027',
      mrp: '₹34.00 per strip',
      pack: '15 tablets / strip',
      pieces: '195 tablets (13 strips)',
    },
    augmentin: {
      name: 'Augmentin 625 Duo',
      generic: 'Amoxicillin + Potassium Clavulanate',
      strength: '500mg + 125mg',
      mfg: 'GlaxoSmithKline Pharma',
      batch: 'AUG-7729',
      mfgDate: 'March 2025',
      expDate: 'October 2026',
      mrp: '₹210.00 per strip',
      pack: '10 tablets / strip',
      pieces: '80 tablets (8 strips)',
    },
    azithral: {
      name: 'Azithral 500',
      generic: 'Azithromycin IP',
      strength: '500 mg',
      mfg: 'Alembic Pharmaceuticals',
      batch: 'AZ-1049',
      mfgDate: 'November 2024',
      expDate: 'April 2027',
      mrp: '₹125.00 per strip',
      pack: '5 tablets / strip',
      pieces: '45 tablets (9 strips)',
    },
  };

  const currentSample = sampleAiData[activeAiTab];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-blue-100 selection:text-primary">
      <Navbar />

      {/* HERO SECTION (80-90vh) */}
      <section className="relative pt-28 pb-16 sm:pt-36 sm:pb-24 overflow-hidden border-b border-slate-200/80 bg-gradient-to-b from-white via-slate-50 to-slate-100/60">
        {/* Subtle AI background blobs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-primary/10 via-ai/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -top-10 -left-10 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center min-h-[75vh]">
            {/* Hero Left Content */}
            <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-primary text-xs font-semibold shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-ai" />
                <span>Next-Gen Pharmacy SaaS & Inventory Intelligence</span>
              </div>

              <div className="space-y-3">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.12]">
                  Smarter medicine{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-ai">
                    inventory management
                  </span>
                </h1>
                <p className="text-base sm:text-lg text-slate-600 max-w-xl mx-auto lg:mx-0 font-normal leading-relaxed">
                  Recognize medicines with AI, manage pharmacy inventory intelligently, monitor expiry dates, and help customers find medicines nearby.
                </p>
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => navigate('/find-medicine')}
                  leftIcon={<Search className="w-4 h-4" />}
                >
                  Find a Medicine
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => navigate('/pharmacist/register')}
                  rightIcon={<ChevronRight className="w-4 h-4" />}
                >
                  For Pharmacies
                </Button>
              </div>

              <div className="pt-2">
                <a
                  href="#how-it-works"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-primary transition-colors"
                >
                  <span>Explore how it works</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Quick Proof Badges */}
              <div className="pt-4 grid grid-cols-3 gap-3 border-t border-slate-200/80 max-w-md mx-auto lg:mx-0 text-left">
                <div>
                  <div className="text-base font-bold text-slate-900">100%</div>
                  <div className="text-[11px] text-slate-500">Atomic POS Sync</div>
                </div>
                <div>
                  <div className="text-base font-bold text-slate-900">FEFO</div>
                  <div className="text-[11px] text-slate-500">Expiry Priority</div>
                </div>
                <div>
                  <div className="text-base font-bold text-slate-900">Zero Login</div>
                  <div className="text-[11px] text-slate-500">Public Medicine Radar</div>
                </div>
              </div>
            </div>

            {/* Hero Right Visual: 3D Visualization + AI Scan Card Preview */}
            <div className="lg:col-span-6 relative flex items-center justify-center">
              <Hero3D />
            </div>
          </div>
        </div>
      </section>

      {/* TRUST SECTION (Section 13) */}
      <section className="py-12 bg-white border-b border-slate-200/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <h2 className="text-xs font-bold uppercase tracking-wider text-primary">
              Architecture Built For Accuracy
            </h2>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
              Built for smarter pharmacy operations
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200/80 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-primary flex items-center justify-center flex-shrink-0">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">AI-Powered Recognition</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Instant OCR on packaging strips & boxes.</p>
              </div>
            </div>

            <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200/80 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-ai flex items-center justify-center flex-shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">Real-Time Inventory</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Synchronized strips and loose tablets.</p>
              </div>
            </div>

            <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200/80 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">Expiry Monitoring</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">FEFO dispatch prevents medicine wastage.</p>
              </div>
            </div>

            <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200/80 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">Nearby Discovery</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Direct patient routing with Google Maps.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION (Section 14) */}
      <section id="features" className="py-20 bg-slate-50 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-ai bg-ai-light/50 px-3 py-1 rounded-full border border-ai/20">
              Enterprise Feature Suite
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Everything you need to manage medicines smarter
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              A single unified ecosystem that merges computer vision, regulatory FEFO batch controls, and neighborhood medicine discovery.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover hover:border-slate-300 group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${item.color} text-white flex items-center justify-center shadow-md shadow-slate-200 group-hover:scale-105 transition-transform`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        {item.tag}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 group-hover:text-primary transition-colors">
                      {item.title}
                    </h3>

                    <p className="text-xs text-slate-500 leading-relaxed mt-2">
                      {item.desc}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center text-xs font-semibold text-primary">
                    <span>Learn details</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS (Section 15) */}
      <section id="how-it-works" className="py-20 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Simple 4-Step Workflow
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              From packaging photo to pharmacy inventory
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm">
              Eliminate manual data entry errors. The AI accelerates the input while the licensed pharmacist retains full verification control.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            {steps.map((step, idx) => (
              <div key={idx} className="relative bg-slate-50 rounded-2xl p-6 border border-slate-200/80 flex flex-col justify-between">
                <div>
                  <div className="text-2xl font-black text-primary/30 mb-2 font-mono">
                    {step.num}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">
                    {step.title}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {step.desc}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-200/60 flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Step {idx + 1} of 4</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI FEATURE SHOWCASE (Section 16) */}
      <section id="ai-showcase" className="py-20 bg-slate-50 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left AI Visual */}
            <div className="lg:col-span-6">
              <HeroAiScannerEffect />
            </div>

            {/* Right Information Extracted Showcase */}
            <div className="lg:col-span-6 space-y-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-ai bg-ai-light/60 px-3 py-1 rounded-full border border-ai/20">
                  Precision Data Extraction
                </span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-3">
                  Medicine information, understood by AI.
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                  Gemma 4 Vision scans pharmaceutical packaging directly from standard camera photos, accurately distinguishing salt formulations, dosages, and expiry formats.
                </p>
              </div>

              {/* Sample Tab Selectors */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveAiTab('dolo')}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${
                    activeAiTab === 'dolo'
                      ? 'bg-primary text-white border-primary shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Dolo 650
                </button>
                <button
                  onClick={() => setActiveAiTab('augmentin')}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${
                    activeAiTab === 'augmentin'
                      ? 'bg-primary text-white border-primary shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Augmentin 625 Duo
                </button>
                <button
                  onClick={() => setActiveAiTab('azithral')}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${
                    activeAiTab === 'azithral'
                      ? 'bg-primary text-white border-primary shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Azithral 500
                </button>
              </div>

              {/* Extracted Attributes Detail Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-5 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-medium uppercase">Medicine Name</span>
                    <span className="font-bold text-slate-900">{currentSample.name}</span>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-medium uppercase">Generic / Salt</span>
                    <span className="font-bold text-slate-900">{currentSample.generic}</span>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-medium uppercase">Strength</span>
                    <span className="font-bold text-slate-900 font-mono">{currentSample.strength}</span>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-medium uppercase">Manufacturer</span>
                    <span className="font-bold text-slate-900">{currentSample.mfg}</span>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-medium uppercase">Batch Number</span>
                    <span className="font-bold text-slate-900 font-mono">{currentSample.batch}</span>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-medium uppercase">Expiry Date</span>
                    <span className="font-bold text-emerald-700 font-mono">{currentSample.expDate}</span>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-medium uppercase">Strip Config</span>
                    <span className="font-bold text-slate-900">{currentSample.pack}</span>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-medium uppercase">Inventory Total</span>
                    <span className="font-bold text-primary font-mono">{currentSample.pieces}</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Always editable before saving into inventory</span>
                  </span>
                  <button
                    onClick={() => navigate('/pharmacist/ai-scanner')}
                    className="text-primary hover:text-primary-dark font-bold underline"
                  >
                    Open Live Scanner →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CUSTOMER EXPERIENCE: LIVE MEDICINE RADAR PREVIEW (Section 18) */}
      <section className="py-20 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-primary bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
              Customer Stock Discovery Experience
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Find medicines near you with live verified stock
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm">
              Search by brand name, active salt, or dosage strength. View verified strip and loose piece quantities at licensed local pharmacies.
            </p>
          </div>

          {/* Interactive Search Box */}
          <div className="max-w-2xl mx-auto mb-10">
            <div className="bg-white rounded-2xl border border-slate-300 p-2 shadow-lg flex items-center gap-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
              <Search className="w-5 h-5 text-slate-400 ml-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Dolo 650, Paracetamol, Augmentin, 500mg..."
                className="w-full text-xs sm:text-sm text-slate-800 placeholder-slate-400 py-2.5 focus:outline-none font-medium bg-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-xs text-slate-400 hover:text-slate-600 px-2"
                >
                  Clear
                </button>
              )}
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate(`/find-medicine?q=${encodeURIComponent(searchQuery)}`)}
              >
                Search Radar
              </Button>
            </div>
          </div>

          {/* Results Grid Preview */}
          {searchResults.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {searchResults.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50/70 rounded-2xl border border-slate-200/90 p-5 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-base">{item.medicine_name}</h4>
                          {item.strength && (
                            <span className="bg-blue-50 text-primary text-[10px] font-bold px-2 py-0.5 rounded border border-blue-200">
                              {item.strength}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Generic: <span className="font-medium text-slate-700">{item.generic_name || 'N/A'}</span>
                        </p>
                      </div>

                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-xs">
                        <MapPin className="w-3 h-3 text-emerald-600" />
                        <span>{item.distance_km} km away</span>
                      </span>
                    </div>

                    {/* Stock quantities */}
                    <div className="grid grid-cols-2 gap-2 my-3 bg-white rounded-xl p-3 border border-slate-200/70">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Available Strips</span>
                        <div className="text-sm font-extrabold text-slate-900">{item.available_strips} strips</div>
                        <div className="text-xs font-bold text-primary">₹{Number(item.price_per_strip).toFixed(2)} / strip</div>
                      </div>
                      <div className="border-l border-slate-100 pl-3">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Loose Pieces</span>
                        <div className="text-sm font-extrabold text-slate-900">{item.loose_pieces} pieces</div>
                        <div className="text-xs font-bold text-primary">₹{Number(item.price_per_piece).toFixed(2)} / piece</div>
                      </div>
                    </div>

                    <div className="text-xs text-slate-700 font-semibold truncate">
                      {item.pharmacy_name}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {item.pharmacy_address}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center gap-2">
                    <a
                      href={item.directions_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-primary hover:bg-primary-dark text-white text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Directions</span>
                    </a>
                    <a
                      href={`tel:${item.pharmacy_phone}`}
                      className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold py-2 px-3 rounded-xl transition-colors"
                    >
                      Call
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-xs text-slate-400">
              Loading nearby verified stock...
            </div>
          )}

          <div className="text-center mt-8">
            <Button
              variant="outline"
              size="md"
              onClick={() => navigate('/find-medicine')}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Open Full Screen Medicine Discovery Radar
            </Button>
          </div>
        </div>
      </section>

      {/* PHARMACY CTA SECTION (Section 17) */}
      <section id="for-pharmacies" className="py-20 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-900 text-white relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-ai/20 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-cyan-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-ai" />
            <span>Licensed Indian Pharmacies & Chemists</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Turn your pharmacy inventory into an intelligent system.
          </h2>

          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Spend less time managing stock manually and more time serving your customers. Experience automated packaging recognition, FEFO expiry safety, and live customer referrals.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Button
              variant="ai"
              size="lg"
              onClick={() => navigate('/pharmacist/register')}
              rightIcon={<ChevronRight className="w-4 h-4" />}
            >
              Get Started for Free
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="bg-slate-800/60 border-slate-700 text-white hover:bg-slate-800 hover:text-white"
              onClick={() => navigate('/pharmacist/login')}
            >
              Pharmacist Login
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};
