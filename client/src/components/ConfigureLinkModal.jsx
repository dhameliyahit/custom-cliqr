import { useState, useEffect } from 'react';
import { X, Globe, Save, Building2, User, Phone, Mail, FileText, CheckCircle2, Power } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function ConfigureLinkModal({ isOpen, onClose, link, onSuccess }) {
  const [businessName, setBusinessName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [redirectUrl, setRedirectUrl] = useState('');
  const [status, setStatus] = useState('configured');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const extract10Digits = (phone) => {
    if (!phone) return '';
    const digits = phone.toString().replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
    return digits.slice(-10);
  };

  useEffect(() => {
    if (link) {
      setBusinessName(link.businessName || '');
      setCustomerName(link.customerName || '');
      setCustomerPhone(extract10Digits(link.customerPhone));
      setCustomerEmail(link.customerEmail || '');
      setRedirectUrl(link.redirectUrl || '');
      setStatus(link.status === 'inactive' ? 'inactive' : 'configured');
      setNotes(link.notes || '');
    }
  }, [link]);

  if (!isOpen || !link) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!redirectUrl.trim()) {
      toast.error('Please enter the customer Redirection URL');
      return;
    }

    if (!businessName.trim()) {
      toast.error('Please enter the Business Name');
      return;
    }

    if (!customerName.trim()) {
      toast.error('Please enter the Customer Name');
      return;
    }

    const phoneDigits = customerPhone.replace(/\D/g, '');
    if (!phoneDigits || phoneDigits.length !== 10) {
      toast.error('Customer mobile number must be exactly 10 digits');
      return;
    }
    const formattedPhone = `+91 ${phoneDigits}`;

    setLoading(true);
    try {
      const { data } = await api.put(`/qr/${link._id}/configure`, {
        businessName: businessName.trim(),
        customerName: customerName.trim(),
        customerPhone: formattedPhone,
        customerEmail: customerEmail.trim(),
        redirectUrl: redirectUrl.trim(),
        status,
        notes,
      });

      if (data.success) {
        const linkUrl = link.fullUrl || `${window.location.origin}/r/${link.code}`;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(linkUrl).catch(() => {});
        }
        toast.success(`QR ${link.code} configured & link copied to clipboard!`, {
          icon: '📋',
        });
        onSuccess();
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to configure link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col animate-slide-up">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-black">Configure Redirection</h2>
              <span className="font-mono text-xs font-bold bg-black text-white px-2 py-0.5 rounded">
                {link.code}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Permanent QR: <span className="font-mono">{link.fullUrl || `/r/${link.code}`}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-black rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {/* Target Redirection URL (Hero input) */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
              <Globe className="w-4 h-4 text-black" />
              <span>Destination Redirection Link *</span>
            </label>
            <input
              type="text"
              required
              value={redirectUrl}
              onChange={(e) => setRedirectUrl(e.target.value)}
              placeholder="https://... (paste target destination link directly)"
              className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all"
            />
            <p className="text-[11px] text-slate-500 mt-1.5">
              When anyone scans this QR code, they will instantly be redirected to this link.
            </p>
          </div>

          {/* Business & Customer Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Business Name *</span>
              </label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Starbucks Coffee"
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-xs font-medium text-black focus:outline-none focus:ring-1 focus:ring-black"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Customer Name *</span>
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Elena Rostova"
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-xs font-medium text-black focus:outline-none focus:ring-1 focus:ring-black"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>Customer Mobile *</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono font-normal">
                  {customerPhone.length}/10
                </span>
              </label>
              <div className="flex items-center">
                <span className="inline-flex items-center px-2.5 h-10 rounded-l-lg border border-r-0 border-slate-300 bg-slate-100 text-slate-700 text-xs font-bold select-none shrink-0 font-mono">
                  +91
                </span>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={customerPhone}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setCustomerPhone(digits);
                  }}
                  placeholder="9876543210"
                  className="w-full h-10 px-3 bg-white border border-slate-300 rounded-r-lg text-xs font-semibold text-black focus:outline-none focus:ring-1 focus:ring-black font-mono tracking-wide"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>Customer Email (Optional)</span>
              </label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="e.g. elena@brand.com"
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-xs font-medium text-black focus:outline-none focus:ring-1 focus:ring-black"
              />
            </div>
          </div>

          {/* Status Switch */}
          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center gap-2.5">
              <Power className={`w-4 h-4 ${status === 'configured' ? 'text-emerald-600' : 'text-slate-400'}`} />
              <div>
                <p className="text-xs font-bold text-black">QR Status</p>
                <p className="text-[11px] text-slate-500">
                  {status === 'configured' ? 'Active & Redirecting' : 'Paused / Inactive'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStatus(status === 'configured' ? 'inactive' : 'configured')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                status === 'configured'
                  ? 'bg-black text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {status === 'configured' ? 'ACTIVE' : 'INACTIVE'}
            </button>
          </div>

          {/* Internal Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Notes / Order Ref</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Sold on March 2nd, QR Standee #12, Order #104"
              className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-xs font-medium text-black focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          {/* Footer Action */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-black bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold text-white bg-black hover:bg-zinc-800 rounded-lg flex items-center gap-2 transition-all shadow-md disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Saving...' : 'Save & Activate'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
