import { useState, useEffect } from 'react';
import { Settings, Globe, Save, Building2, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const [qrBaseDomain, setQrBaseDomain] = useState('');
  const [companyName, setCompanyName] = useState('CustomCliq');
  const [activeDetectedDomain, setActiveDetectedDomain] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/qr/settings');
      if (data.success) {
        setQrBaseDomain(data.settings?.qr_base_domain || '');
        setCompanyName(data.settings?.company_name || 'CustomCliq');
        setActiveDetectedDomain(data.activeDomain || window.location.origin);
      }
    } catch (err) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put('/qr/settings', {
        qr_base_domain: qrBaseDomain.trim(),
        company_name: companyName.trim(),
      });
      if (data.success) {
        toast.success(data.message || 'Settings saved successfully!');
        setActiveDetectedDomain(data.activeDomain);
      }
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const setDomainExample = (domain) => {
    setQrBaseDomain(domain);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1000px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-black text-black tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-black" />
          <span>System & Dynamic Domain Settings</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure the public NFC / QR base domain that customer cards and generated QR codes point to.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 sm:p-8">
        <form onSubmit={handleSave} className="space-y-6">
          {/* Active Detected Domain Banner */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Currently Active QR Engine Domain:
              </span>
              <p className="text-base font-mono font-bold text-black mt-0.5">
                {activeDetectedDomain || window.location.origin}
              </p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Resolved Dynamically</span>
            </div>
          </div>

          {/* Custom QR Base Domain */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-black" />
                <span>Custom QR Base Domain</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDomainExample(window.location.origin)}
                  className="text-[11px] font-bold text-slate-500 hover:text-black transition-colors"
                >
                  Use Current Host
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => setDomainExample('https://qr.customcliq.com')}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Use qr.customcliq.com
                </button>
              </div>
            </div>
            <input
              type="text"
              value={qrBaseDomain}
              onChange={(e) => setQrBaseDomain(e.target.value)}
              placeholder="e.g. https://qr.customcliq.com or http://localhost:5173"
              className="w-full h-11 px-3.5 font-mono bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all"
            />
            <p className="text-[11px] text-slate-500 mt-1.5">
              All generated QR codes, CSV exports for NFC encoders, and copy links will format with this base domain (e.g. <code className="font-bold text-black">{qrBaseDomain || activeDetectedDomain}/r/CC-9X7K2P</code>). Leave empty to use auto-detected host.
            </p>
          </div>

          {/* Company / Brand Name */}
          <div>
            <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-black" />
              <span>Platform Brand Name</span>
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="CustomCliq"
              className="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all"
            />
          </div>

          {/* Submit */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-black text-white hover:bg-zinc-800 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-md disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Configuration</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
