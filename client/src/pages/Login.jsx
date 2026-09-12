import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await login(email, password);
      if (data.success) {
        toast.success(`Welcome back, ${data.user.name}!`);
        navigate('/');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden grid grid-cols-1 lg:grid-cols-12 bg-brand-navy">
      {/* Left: Smart QR Technology Showcase (Desktop) */}
      <div className="hidden lg:flex lg:col-span-6 xl:col-span-7 relative flex-col justify-between p-8 xl:p-12 overflow-hidden bg-brand-navy border-r border-slate-800/80">
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
            Connecting the physical and digital worlds.
          </h1>

          <p className="text-slate-300 text-sm xl:text-base leading-relaxed">
            Every product, card, and surface holds a story. CustomCliq brings that story to life with instant, secure, and dynamic links.
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

      {/* Right: Authentication Form Panel */}
      <div className="lg:col-span-6 xl:col-span-5 flex flex-col items-center p-4 sm:p-6 lg:p-8 relative bg-slate-50 min-h-screen overflow-y-auto">
        {/* Mobile ambient background */}
        <div className="lg:hidden absolute inset-0 z-0 bg-brand-navy">
          <img
            src="/images/auth-bg.jpg"
            alt=""
            className="w-full h-full object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#00222B] via-[#00222B]/85 to-[#00222B]" />
        </div>

        <div className="relative z-10 w-full max-w-md my-auto py-4">
          <div className="bg-white py-6 sm:py-7 px-5 sm:px-8 border border-slate-200 rounded-2xl shadow-xl">
            {/* Brand Emblem */}
            <div className="flex flex-col items-center justify-center mb-3 text-center">
              <Link to="/" className="inline-block group mb-1">
                <img
                  src="/logos/2.svg"
                  alt="CustomCliq"
                  className="h-12 sm:h-14 w-auto object-contain mx-auto group-hover:scale-105 transition-transform"
                />
              </Link>
              <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                Smart QR Platform
              </p>
            </div>

            <h2 className="text-center text-lg sm:text-xl font-bold text-black tracking-tight">
              Sign in to your account
            </h2>
            <p className="mt-0.5 text-center text-xs text-slate-500 mb-4">
              Super Admin &amp; Reseller Admin Portal
            </p>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full h-11 pl-9 pr-3 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-11 pl-9 pr-10 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer p-1"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-brand-navy hover:bg-[#00171d] text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50 mt-2 group cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4 text-brand-teal group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-500">
                Want to become an Admin / Reseller?{' '}
                <Link
                  to="/register"
                  className="font-bold text-brand-navy hover:text-brand-teal transition-colors"
                >
                  Register here
                </Link>
              </p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <span className="text-xs text-slate-400 font-medium">
              Powered by <strong className="text-slate-600 font-bold">CustomCliq</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
