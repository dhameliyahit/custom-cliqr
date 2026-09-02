import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Radio, ArrowRight, Lock, Mail, User, Phone, Building2, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [password, setPassword] = useState('');
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
    <div className="min-h-screen bg-white flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Header */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-black text-white flex items-center justify-center shadow-md">
            <Radio className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-black">CustomCliq</h1>
            <p className="text-[11px] font-bold tracking-widest text-slate-400 uppercase">
              Reseller Admin Registration
            </p>
          </div>
        </div>

        <h2 className="text-center text-xl font-bold text-black tracking-tight">
          Create an Admin Account
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500">
          Sell & manage smart NFC and QR cards for your clients
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 border border-slate-200 rounded-2xl shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Full Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full h-10 pl-9 pr-3 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-semibold text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full h-10 pl-9 pr-3 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-semibold text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Phone Number *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1-555-0199"
                  className="w-full h-10 pl-9 pr-3 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-semibold text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all"
                />
              </div>
            </div>

            {/* Company / Agency Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Agency / Business Name (Optional)
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Apex Smart Media"
                  className="w-full h-10 pl-9 pr-3 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-semibold text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-10 pl-9 pr-3 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm font-semibold text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-black text-white hover:bg-zinc-800 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50 mt-3"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <span>Create Admin Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 text-center">
            <p className="text-xs text-slate-500">
              Already have an account?{' '}
              <Link to="/login" className="font-bold text-black hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
