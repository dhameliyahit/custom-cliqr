import { useState, useEffect } from 'react';
import {
  X,
  Zap,
  Globe,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  User,
  Phone,
  Mail,
  QrCode,
  Loader2,
  Radio,
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
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [activatedLink, setActivatedLink] = useState(null); // Success state
  const [copied, setCopied] = useState(false);

  // Filter unconfigured links
  const unconfiguredLinks = availableLinks.filter((l) => l.status !== 'configured');

  useEffect(() => {
    if (isOpen) {
      setActivatedLink(null);
      if (initialLink) {
        setSelectedLinkId(initialLink._id);
        setSelectedLink(initialLink);
        setBusinessName(initialLink.businessName || '');
        setRedirectUrl(initialLink.redirectUrl || '');
        setCustomerName(initialLink.customerName || '');
        setCustomerPhone(initialLink.customerPhone || '');
        setCustomerEmail(initialLink.customerEmail || '');
      } else if (unconfiguredLinks.length > 0) {
        // Auto-select the first available fresh card
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
      setCustomerPhone(found.customerPhone || '');
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
          title: title || 'CustomCliq Smart Card',
          text: `Here is your CustomCliq smart link for ${title || 'your card'}:`,
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
      toast.error('Please select a card to activate');
      return;
    }

    if (!redirectUrl.trim()) {
      toast.error('Please enter the customer destination URL');
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
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim(),
        status: 'configured',
      };

      const { data } = await api.put(`/qr/${selectedLinkId}/configure`, payload);

      if (data.success) {
        const fullCard = data.link || { ...selectedLink, ...payload };
        const shareUrl = fullCard.fullUrl || `${window.location.origin}/r/${fullCard.code}`;

        // Auto-copy to clipboard so if admin forgets, it's already copied!
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(shareUrl).catch(() => {});
        }

        toast.success(`Card ${fullCard.code} activated & link copied to clipboard!`, {
          icon: '📋',
        });
        setActivatedLink(fullCard);
        onSuccess();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to activate card');
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
    setShowCustomerDetails(false);

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
      <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center shadow-xs">
              <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-black tracking-tight">
                {activatedLink ? 'Card is Live!' : 'On-The-Spot Card Activator'}
              </h2>
              <p className="text-xs text-slate-500">
                {activatedLink
                  ? 'Card is configured and ready for customer handoff'
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
                {activatedLink.businessName || 'Business Card'} is Activated!
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto truncate font-mono">
                {activatedLink.redirectUrl}
              </p>
            </div>

            {/* CR80 Mock Preview Card */}
            <div className="bg-gradient-to-br from-zinc-900 via-black to-zinc-950 text-white p-5 rounded-2xl border border-zinc-800 shadow-xl max-w-sm mx-auto text-left relative overflow-hidden">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <Radio className="w-4 h-4 text-white" />
                  <span className="text-[10px] font-bold tracking-widest uppercase text-white">
                    CustomCliq NFC
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
                <p className="text-[10px] text-zinc-400 truncate mt-0.5">
                  Tap to open: {activatedLink.redirectUrl}
                </p>
              </div>

              <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[9px] text-zinc-400">
                <span>Touch phone here to review</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  ● ACTIVE
                </span>
              </div>
            </div>

            {/* Direct Tap Link Box with 1-Tap Copy & Share */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-left space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  NFC Tap / QR Code Link
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
                    Activate Another Card
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
          /* Form Body */
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto">
            {/* Step 1: Select Card */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Select Card to Activate *
                </label>
                <span className="text-[11px] text-slate-500 font-medium">
                  {unconfiguredLinks.length} unconfigured available
                </span>
              </div>

              {availableLinks.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                  No cards allocated yet. Please ask the SuperAdmin to assign QR cards to your account.
                </div>
              ) : (
                <select
                  required
                  value={selectedLinkId}
                  onChange={(e) => handleSelectLink(e.target.value)}
                  className="w-full h-11 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-mono font-bold text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black cursor-pointer shadow-2xs"
                >
                  {availableLinks.map((l) => (
                    <option key={l._id} value={l._id}>
                      {l.code} {l.status === 'configured' ? '✓ (Configured)' : '● [FRESH / READY]'} {l.businessName ? `- ${l.businessName}` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Step 2: Target Redirection URL (Hero Input) */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <label className="block text-xs font-extrabold text-black uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-black" />
                <span>Destination Redirection Link *</span>
              </label>

              <input
                type="text"
                required
                value={redirectUrl}
                onChange={(e) => setRedirectUrl(e.target.value)}
                placeholder="https://... (paste target destination link directly)"
                className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all shadow-2xs"
              />
              <p className="text-[10px] text-slate-500">
                Paste the customer's live link directly (e.g. Google Review link, Instagram, WhatsApp, or website).
              </p>
            </div>

            {/* Step 3: Business Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Customer Business Name</span>
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Bella Cafe, Apex Dental, The Artisan Barbers"
                className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all shadow-2xs"
              />
            </div>

            {/* Collapsible Customer Contact Info */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowCustomerDetails(!showCustomerDetails)}
                className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-bold text-slate-700 transition-colors cursor-pointer"
              >
                <span>Add Customer Contact Info (Optional)</span>
                {showCustomerDetails ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {showCustomerDetails && (
                <div className="p-4 space-y-3 bg-white border-t border-slate-200 animate-fade-in">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" />
                      <span>Contact Person</span>
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Elena Rostova"
                      className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs font-medium text-black focus:outline-none focus:ring-1 focus:ring-black"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>Phone</span>
                      </label>
                      <input
                        type="text"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="e.g. +1 555-0199"
                        className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs font-medium text-black focus:outline-none focus:ring-1 focus:ring-black"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span>Email</span>
                      </label>
                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="e.g. elena@brand.com"
                        className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs font-medium text-black focus:outline-none focus:ring-1 focus:ring-black"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="h-11 px-4 text-xs font-bold text-slate-600 hover:text-black bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || availableLinks.length === 0}
                className="h-11 px-6 bg-black hover:bg-zinc-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-md disabled:opacity-50 cursor-pointer flex-1 sm:flex-initial justify-center"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Activating...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span>Save & Activate Card</span>
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
