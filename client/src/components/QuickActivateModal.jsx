import { useState, useEffect } from 'react';
import {
  X,
  Zap,
  Globe,
  Building2,
  CheckCircle2,
  User,
  Phone,
  Mail,
  QrCode,
  Loader2,
  Copy,
  Check,
  Share2,
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function QuickActivateModal({
  isOpen,
  onClose,
  initialLink = null,
  availableLinks = [],
  onSuccess,
  onPreviewQr,
}) {
  const [selectedLinkId, setSelectedLinkId] = useState('');
  const [selectedLink, setSelectedLink] = useState(null);
  const [businessName, setBusinessName] = useState('');
  const [redirectUrl, setRedirectUrl] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [activatedLink, setActivatedLink] = useState(null); // Success state
  const [copied, setCopied] = useState(false);

  // Filter unconfigured links
  const unconfiguredLinks = availableLinks.filter((l) => l.status !== 'configured');

  const extract10Digits = (phone) => {
    if (!phone) return '';
    const digits = phone.toString().replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
    return digits.slice(-10);
  };

  useEffect(() => {
    if (isOpen) {
      setActivatedLink(null);
      if (initialLink) {
        setSelectedLinkId(initialLink._id);
        setSelectedLink(initialLink);
        setBusinessName(initialLink.businessName || '');
        setRedirectUrl(initialLink.redirectUrl || '');
        setCustomerName(initialLink.customerName || '');
        setCustomerPhone(extract10Digits(initialLink.customerPhone));
        setCustomerEmail(initialLink.customerEmail || '');
      } else if (unconfiguredLinks.length > 0) {
        // Auto-select the first available fresh QR
        const first = unconfiguredLinks[0];
        setSelectedLinkId(first._id);
        setSelectedLink(first);
        setBusinessName('');
        setRedirectUrl('');
        setCustomerName('');
        setCustomerPhone('');
        setCustomerEmail('');
      } else {
        setSelectedLinkId('');
        setSelectedLink(null);
      }
    }
  }, [isOpen, initialLink, availableLinks]);

  if (!isOpen) return null;

  const handleSelectLink = (linkId) => {
    setSelectedLinkId(linkId);
    const found = availableLinks.find((l) => l._id === linkId);
    setSelectedLink(found || null);
    if (found) {
      setBusinessName(found.businessName || '');
      setRedirectUrl(found.redirectUrl || '');
      setCustomerName(found.customerName || '');
      setCustomerPhone(extract10Digits(found.customerPhone));
      setCustomerEmail(found.customerEmail || '');
    }
  };

  const handleCopyLink = (url) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
    setCopied(true);
    toast.success('Link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async (url, title) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title || 'CustomCliq Smart QR',
          text: `Here is your CustomCliq smart link for ${title || 'your QR'}:`,
          url: url,
        });
      } catch (err) {
        // User dismissed share dialog
      }
    } else {
      handleCopyLink(url);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedLinkId) {
      toast.error('Please select a QR code to activate');
      return;
    }

    if (!businessName.trim()) {
      toast.error('Please enter the customer business name');
      return;
    }

    if (!redirectUrl.trim()) {
      toast.error('Please enter the customer destination URL');
      return;
    }

    if (!customerName.trim()) {
      toast.error('Please enter the customer contact person name');
      return;
    }

    const phoneDigits = customerPhone.replace(/\D/g, '');
    if (!phoneDigits) {
      toast.error('Please enter the customer mobile number');
      return;
    }

    if (phoneDigits.length !== 10) {
      toast.error('Mobile number must be exactly 10 digits');
      return;
    }

    const formattedPhone = `+91 ${phoneDigits}`;

    if (!customerEmail.trim()) {
      toast.error('Please enter the customer email address');
      return;
    }

    setLoading(true);
    try {
      let formattedUrl = redirectUrl.trim();
      if (!formattedUrl.match(/^https?:\/\//i)) {
        formattedUrl = `https://${formattedUrl}`;
      }

      const payload = {
        businessName: businessName.trim(),
        redirectUrl: formattedUrl,
        customerName: customerName.trim(),
        customerPhone: formattedPhone,
        customerEmail: customerEmail.trim(),
        status: 'configured',
      };

      const { data } = await api.put(`/qr/${selectedLinkId}/configure`, payload);

      if (data.success) {
        const fullLink = data.link || { ...selectedLink, ...payload };
        const shareUrl = fullLink.fullUrl || `${window.location.origin}/r/${fullLink.code}`;

        // Auto-copy to clipboard so if admin forgets, it's already copied!
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(shareUrl).catch(() => {});
        }

        toast.success(`QR ${fullLink.code} activated & link copied to clipboard!`, {
          icon: '📋',
        });
        setActivatedLink(fullLink);
        onSuccess();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to activate QR');
    } finally {
      setLoading(false);
    }
  };

  const handleActivateAnother = () => {
    setActivatedLink(null);
    setBusinessName('');
    setRedirectUrl('');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');

    // Pick next unconfigured link
    const remaining = availableLinks.filter(
      (l) => l._id !== selectedLinkId && l.status !== 'configured'
    );
    if (remaining.length > 0) {
      setSelectedLinkId(remaining[0]._id);
      setSelectedLink(remaining[0]);
    } else {
      setSelectedLinkId('');
      setSelectedLink(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col animate-slide-up">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center shadow-xs">
              <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-black tracking-tight">
                {activatedLink ? 'QR is Live!' : 'On-The-Spot QR Activator'}
              </h2>
              <p className="text-xs text-slate-500">
                {activatedLink
                  ? 'QR is configured and ready for customer handoff'
                  : 'Fast client setup in under 10 seconds'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-black rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success State */}
        {activatedLink ? (
          <div className="p-6 overflow-y-auto space-y-6 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <span className="font-mono text-xs font-black bg-black text-white px-3 py-1 rounded-full uppercase tracking-widest">
                {activatedLink.code}
              </span>
              <h3 className="text-xl font-black text-black mt-3">
                {activatedLink.businessName || 'QR Code'} is Activated!
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto truncate font-mono">
                {activatedLink.redirectUrl}
              </p>
            </div>

            {/* QR Activation Preview Badge */}
            <div className="bg-gradient-to-br from-zinc-900 via-black to-zinc-950 text-white p-5 rounded-2xl border border-zinc-800 shadow-xl max-w-sm mx-auto text-left relative overflow-hidden">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <QrCode className="w-4 h-4 text-white" />
                  <span className="text-[10px] font-bold tracking-widest uppercase text-white">
                    CustomCliq QR
                  </span>
                </div>
                <span className="font-mono text-[10px] bg-white/10 px-2 py-0.5 rounded text-white font-bold">
                  {activatedLink.code}
                </span>
              </div>

              <div className="mb-2">
                <p className="text-sm font-black text-white truncate">
                  {activatedLink.businessName || 'Your Business'}
                </p>
                <p className="text-[10px] text-zinc-400 truncate mt-0.5 font-mono">
                  Scan to open: {activatedLink.redirectUrl}
                </p>
              </div>

              <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[9px] text-zinc-400">
                <span>Scan QR code to review destination</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  ● ACTIVE
                </span>
              </div>
            </div>

            {/* Direct Link Box with 1-Tap Copy & Share */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-left space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  QR Code Direct Link
                </span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Check className="w-3 h-3" /> Auto-Copied to Clipboard
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={activatedLink.fullUrl || `${window.location.origin}/r/${activatedLink.code}`}
                  className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-black select-all"
                />
                <button
                  type="button"
                  onClick={() =>
                    handleCopyLink(
                      activatedLink.fullUrl || `${window.location.origin}/r/${activatedLink.code}`
                    )
                  }
                  className="h-10 px-3.5 bg-black hover:bg-zinc-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer shadow-xs"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                {typeof navigator !== 'undefined' && navigator.share && (
                  <button
                    type="button"
                    onClick={() =>
                      handleNativeShare(
                        activatedLink.fullUrl || `${window.location.origin}/r/${activatedLink.code}`,
                        activatedLink.businessName
                      )
                    }
                    className="h-10 px-3 bg-white hover:bg-slate-100 text-black border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer shadow-2xs"
                    title="Share link with customer"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Share</span>
                  </button>
                )}
              </div>
            </div>

            {/* Action Buttons for Live Demonstration */}
            <div className="space-y-2.5 pt-2">
              {onPreviewQr && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onPreviewQr(activatedLink);
                  }}
                  className="w-full h-12 bg-black hover:bg-zinc-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Show QR Code for Customer Scan</span>
                </button>
              )}

              <div className="flex gap-2 pt-2">
                {unconfiguredLinks.length > 1 && (
                  <button
                    type="button"
                    onClick={handleActivateAnother}
                    className="flex-1 h-11 bg-slate-100 hover:bg-slate-200 text-black rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Activate Another QR
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Close & Done
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Form Body: Compact, fully visible, non-scrolling layout */
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3 overflow-y-auto">
            {/* Step 1: Select QR Code */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-black" />
                  <span>Select QR Code <span className="text-red-500">*</span></span>
                </label>
                <span className="text-[10px] text-slate-500 font-medium">
                  {unconfiguredLinks.length} ready
                </span>
              </div>

              {availableLinks.length === 0 ? (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                  No QRs available. Ask SuperAdmin to assign QRs.
                </div>
              ) : (
                <select
                  required
                  value={selectedLinkId}
                  onChange={(e) => handleSelectLink(e.target.value)}
                  className="w-full h-9.5 px-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black cursor-pointer shadow-2xs"
                >
                  {availableLinks.map((l) => (
                    <option key={l._id} value={l._id}>
                      {l.code} {l.status === 'configured' ? '✓ (Configured)' : '● [FRESH / READY]'} {l.businessName ? `- ${l.businessName}` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Step 2: Destination Redirection Link (Full Width Hero Input) */}
            <div>
              <label className="block text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <Globe className="w-3.5 h-3.5 text-black" />
                <span>Destination Redirection Link <span className="text-red-500">*</span></span>
              </label>
              <input
                type="text"
                required
                value={redirectUrl}
                onChange={(e) => setRedirectUrl(e.target.value)}
                placeholder="https://... (Google Review link, Instagram, WhatsApp, website)"
                className="w-full h-9.5 px-3 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all shadow-2xs"
              />
            </div>

            {/* Step 3: Business & Contact Info (Grouped together, Always Displayed & Required) */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5">
              <div className="flex items-center gap-1.5 text-slate-800">
                <Building2 className="w-3.5 h-3.5 text-black" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-black">
                  Business & Contact Details <span className="text-red-500">*</span>
                </span>
              </div>

              {/* Row 1: Business Name (50%) & Business Contact Person (50%) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-slate-400" />
                    <span>Business Name <span className="text-red-500">*</span></span>
                  </label>
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Bella Cafe, Apex Dental"
                    className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-black focus:outline-none focus:ring-1 focus:ring-black shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-400" />
                    <span>Business Contact Person <span className="text-red-500">*</span></span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Elena Rostova"
                    className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-black focus:outline-none focus:ring-1 focus:ring-black shadow-2xs"
                  />
                </div>
              </div>

              {/* Row 2: Phone Number (50%) & Email Address (50%) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>Mobile Number <span className="text-red-500">*</span></span>
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono font-normal">
                      {customerPhone.length}/10
                    </span>
                  </label>
                  <div className="flex items-center">
                    <span className="inline-flex items-center px-2.5 h-9 rounded-l-lg border border-r-0 border-slate-300 bg-slate-100 text-slate-700 text-xs font-bold select-none shrink-0 font-mono">
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
                      className="w-full h-9 px-2.5 bg-white border border-slate-300 rounded-r-lg text-xs font-semibold text-black focus:outline-none focus:ring-1 focus:ring-black shadow-2xs font-mono tracking-wide"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Mail className="w-3 h-3 text-slate-400" />
                    <span>Business Email Address <span className="text-red-500">*</span></span>
                  </label>
                  <input
                    type="email"
                    required
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="e.g. elena@brand.com"
                    className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-black focus:outline-none focus:ring-1 focus:ring-black shadow-2xs"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="h-10 px-4 text-xs font-bold text-slate-600 hover:text-black bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || availableLinks.length === 0}
                className="h-10 px-6 bg-black hover:bg-zinc-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-md disabled:opacity-50 cursor-pointer flex-1 sm:flex-initial justify-center"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Activating...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span>Save & Activate QR</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
