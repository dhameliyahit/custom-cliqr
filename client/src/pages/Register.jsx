import { ArrowRight, Building2, Eye, EyeOff, Loader2, Lock, Mail, Phone, ShieldCheck, User } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await register({
        name,
        email,
        phone,
        company,
        password,
      });

      if (data.success) {
        toast.success(`Welcome to CustomCliq, ${data.user.name}! Your Admin panel is ready.`);
        navigate('/');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden grid grid-cols-1 lg:grid-cols-12 bg-brand-navy">
      {/* Left: Smart QR Technology Showcase (Desktop) */}
      <div className="hidden lg:flex lg:col-span-6 xl:col-span-7 relative flex-col justify-between p-8 xl:p-12 overflow-hidden bg-brand-navy border-r border-slate-800">
        {/* Background Image & Ambient Mesh */}
        <div className="absolute inset-0 z-0">
          <img
            src="/images/auth-bg.jpg"
            alt="CustomCliq Smart QR Platform"
            className="w-full h-full object-cover object-center opacity-45 scale-105 transition-transform duration-700 hover:scale-100"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#00222B] via-[#00222B]/60 to-[#00222B]/85" />
          <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-brand-teal/20 rounded-full blur-[120px] pointer-events-none" />
        </div>

        {/* Top: Brand Header with high-contrast white vector logo */}
        <div className="relative z-10 flex items-center justify-between shrink-0 mb-6">
          <Link to="/" className="inline-block group cursor-pointer">
            <img
              src="/logos/logo-white.svg"
              alt="CustomCliq"
              className="h-8 w-auto object-contain group-hover:opacity-90 transition-opacity"
            />
          </Link>
          <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
            Smart QR Platform
          </span>
        </div>

        {/* Center: Inspiring Universal Vision (Clean, finalized, no quote section) */}
        <div className="relative z-10 max-w-lg my-auto py-8">
          <h1 className="text-3xl sm:text-4xl xl:text-5xl font-black text-white tracking-tight leading-tight mb-5">
            Empowering seamless connections everywhere.
          </h1>

          <p className="text-slate-300 text-sm xl:text-base leading-relaxed">
            From physical merchandise and business cards to packaging and events — CustomCliq turns every physical touchpoint into a dynamic digital doorway.
          </p>
        </div>

        {/* Bottom Status */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 border-t border-white/10 pt-4 shrink-0 mt-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Fast • Reliable • Encrypted</span>
          </div>
          <span>CustomCliq Experience</span>
        </div>
      </div>

      {/* Right: Registration Form Panel */}
      <div className="lg:col-span-6 xl:col-span-5 flex flex-col items-center p-3 sm:p-6 lg:p-8 relative bg-slate-50 min-h-screen overflow-y-auto">
        {/* Mobile ambient background */}
        <div className="lg:hidden absolute inset-0 z-0 bg-brand-navy">
          <img
            src="/images/auth-bg.jpg"
            alt=""
            className="w-full h-full object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#00222B] via-[#00222B]/85 to-[#00222B]" />
        </div>

        <div className="relative z-10 w-full max-w-md my-auto py-2 sm:py-4">
          <div className="bg-white py-5 sm:py-6 px-4 sm:px-8 border border-slate-200 rounded-2xl shadow-xl">
            {/* Brand Header */}
            <div className="flex flex-col items-center justify-center mb-2.5 text-center">
              <Link to="/" className="inline-block group mb-0.5">
                <img
                  src="/logos/2.svg"
                  alt="CustomCliq"
                  className="h-10 sm:h-12 w-auto object-contain mx-auto group-hover:scale-105 transition-transform"
                />
              </Link>
              <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                Reseller Admin Registration
              </p>
            </div>

            <h2 className="text-center text-base sm:text-lg font-bold text-black tracking-tight">
              Create an Admin Account
            </h2>
            <p className="mt-0.5 text-center text-xs text-slate-500 mb-3.5">
              Sell &amp; manage smart QR codes for your clients
            </p>

            <form onSubmit={handleSubmit} className="space-y-2">
              {/* Full Name */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-0.5">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full h-9 pl-8 pr-3 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-semibold text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-0.5">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="w-full h-9 pl-8 pr-3 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-semibold text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all"
                  />
                </div>
              </div>

              {/* Phone & Company Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-0.5">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full h-9 pl-8 pr-3 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-semibold text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-0.5">
                    Company / Org
                  </label>
                  <div className="relative">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="Acme Agency"
                      className="w-full h-9 pl-8 pr-3 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-semibold text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Password */}
              {/* Password */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-0.5">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-9 pl-8 pr-9 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-semibold text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer p-0.5"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-9 sm:h-10 bg-brand-navy hover:bg-[#00171d] text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50 mt-2.5 group cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Registering...</span>
                  </>
                ) : (
                  <>
                    <span>Create Admin Account</span>
                    <ArrowRight className="w-4 h-4 text-brand-teal group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-3.5 pt-2.5 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-500">
                Already have an account?{' '}
                <Link to="/login" className="font-bold text-brand-navy hover:text-brand-teal transition-colors">
                  Sign In
                </Link>
              </p>
            </div>
          </div>

          <div className="mt-3 text-center">
            <span className="text-[11px] text-slate-400 font-medium">
              Powered by <strong className="text-slate-600 font-bold">CustomCliq</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
