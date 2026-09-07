import { useState, useEffect } from 'react';
import {
  Settings,
  Globe,
  Save,
  Building2,
  CheckCircle2,
  Loader2,
  Sparkles,
  FileSpreadsheet,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  AlertCircle,
  Send,
} from 'lucide-react';
import api, { testGoogleSheet, syncAllToGoogleSheet } from '../services/api';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const [qrBaseDomain, setQrBaseDomain] = useState('');
  const [companyName, setCompanyName] = useState('CustomCliq');
  const [activeDetectedDomain, setActiveDetectedDomain] = useState('');
  const [googleSheetWebhookUrl, setGoogleSheetWebhookUrl] = useState('');
  const [googleSheetSyncEnabled, setGoogleSheetSyncEnabled] = useState(false);
  const [appsScriptTemplate, setAppsScriptTemplate] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingSheet, setTestingSheet] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [showScriptGuide, setShowScriptGuide] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/qr/settings');
      if (data.success) {
        setQrBaseDomain(data.settings?.qr_base_domain || '');
        setCompanyName(data.settings?.company_name || 'CustomCliq');
        setGoogleSheetWebhookUrl(data.settings?.google_sheet_webhook_url || '');
        setGoogleSheetSyncEnabled(
          data.settings?.google_sheet_sync_enabled === 'true' ||
          data.settings?.google_sheet_sync_enabled === true
        );
        setActiveDetectedDomain(data.activeDomain || window.location.origin);
        if (data.googleAppsScriptTemplate) {
          setAppsScriptTemplate(data.googleAppsScriptTemplate);
        }
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
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put('/qr/settings', {
        qr_base_domain: qrBaseDomain.trim(),
        company_name: companyName.trim(),
        google_sheet_webhook_url: googleSheetWebhookUrl.trim(),
        google_sheet_sync_enabled: googleSheetSyncEnabled,
      });
      if (data.success) {
        toast.success(data.message || 'Settings saved successfully!');
        if (data.activeDomain) setActiveDetectedDomain(data.activeDomain);
      }
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!googleSheetWebhookUrl.trim()) {
      toast.error('Please enter a Google Apps Script Webhook URL first');
      return;
    }
    setTestingSheet(true);
    try {
      const res = await testGoogleSheet(googleSheetWebhookUrl.trim());
      if (res.success) {
        toast.success(res.message || 'Connection verified successfully! Sheet responded.');
      } else {
        toast.error(res.message || 'Failed to verify connection');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Connection test failed');
    } finally {
      setTestingSheet(false);
    }
  };

  const handleSyncAll = async () => {
    if (!googleSheetWebhookUrl.trim()) {
      toast.error('Please enter and save a Google Apps Script Webhook URL first');
      return;
    }
    setSyncingAll(true);
    try {
      const res = await syncAllToGoogleSheet(googleSheetWebhookUrl.trim());
      if (res.success) {
        toast.success(res.message || `Successfully synced leads to Google Sheet!`);
      } else {
        toast.error(res.message || 'Sync failed');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to sync data to Google Sheet');
    } finally {
      setSyncingAll(false);
    }
  };

  const handleCopyScript = () => {
    if (!appsScriptTemplate) return;
    navigator.clipboard.writeText(appsScriptTemplate);
    setCopiedScript(true);
    toast.success('Apps Script code copied to clipboard!');
    setTimeout(() => setCopiedScript(false), 2500);
  };

  const setDomainExample = (domain) => {
    setQrBaseDomain(domain);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1000px] mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-black tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-black" />
          <span>System Settings & Integrations</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure the public QR redirection domain, platform branding, and real-time Google Sheets lead synchronization.
        </p>
      </div>

      {/* Card 1: Domain & Platform Settings */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 sm:p-8">
        <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-100">
          <Globe className="w-5 h-5 text-black" />
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Dynamic Domain & System Branding
            </h2>
            <p className="text-xs text-slate-500">
              Customize the base domain for dynamic QR links and generated exports.
            </p>
          </div>
        </div>

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
              All generated QR codes, CSV/SVG exports, and copy links format with this base domain (e.g.{' '}
              <code className="font-bold text-black">{qrBaseDomain || activeDetectedDomain}/r/CC-9X7K2P</code>). Leave empty to use auto-detected host.
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

          {/* Save Button */}
          <div className="pt-2 flex items-center justify-end">
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
                  <span>Save Domain Settings</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Card 2: Google Sheet Live Lead Sync */}
      <div className="bg-white rounded-2xl border border-emerald-200/80 shadow-2xs p-6 sm:p-8 relative overflow-hidden">
        {/* Subtle Top Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />

        {/* Card Header with Status Pill */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900 tracking-tight">
                  Google Sheets Live Lead Sync
                </h2>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider rounded-md">
                  SuperAdmin Feature
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatically push business name, contact person, phone, email, and redirect link to your Google Sheet whenever an admin configures or updates a QR.
              </p>
            </div>
          </div>

          <div>
            {googleSheetSyncEnabled && googleSheetWebhookUrl ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-300 text-emerald-700 text-xs font-bold rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync Active
              </span>
            ) : googleSheetWebhookUrl ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-300 text-amber-700 text-xs font-bold rounded-full">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Configured (Disabled)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-200 text-slate-500 text-xs font-bold rounded-full">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                Not Configured
              </span>
            )}
          </div>
        </div>

        {/* Sync Controls Form */}
        <div className="space-y-6">
          {/* Toggle Switch */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
            <div>
              <label
                htmlFor="google-sheet-toggle"
                className="text-xs font-bold text-slate-900 uppercase tracking-wider block cursor-pointer"
              >
                Automatic Real-time Sync
              </label>
              <p className="text-[11px] text-slate-500 mt-0.5">
                When turned on, each on-the-spot QR configuration or edit immediately upserts into your Google Sheet.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                id="google-sheet-toggle"
                type="checkbox"
                checked={googleSheetSyncEnabled}
                onChange={(e) => setGoogleSheetSyncEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Webhook URL Input */}
          <div>
            <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <span>Google Apps Script Webhook URL</span>
              <span className="text-slate-400 text-[11px] font-normal lowercase">(web app endpoint)</span>
            </label>
            <div className="relative">
              <input
                type="url"
                value={googleSheetWebhookUrl}
                onChange={(e) => setGoogleSheetWebhookUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                className="w-full h-11 px-3.5 pr-10 font-mono bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-black focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 transition-all"
              />
              {googleSheetWebhookUrl && (
                <a
                  href={googleSheetWebhookUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-black"
                  title="Open Webhook URL in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Paste the published Google Apps Script web app URL (Deploy &gt; Web app &gt; Anyone). No Google Cloud IAM or billing setup is needed!
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Test Connection Button */}
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testingSheet || !googleSheetWebhookUrl.trim()}
                className="h-10 px-4 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all disabled:opacity-40 disabled:pointer-events-none"
              >
                {testingSheet ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
                    <span>Testing Connection...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Test Webhook Ping</span>
                  </>
                )}
              </button>

              {/* Sync All Button */}
              <button
                type="button"
                onClick={handleSyncAll}
                disabled={syncingAll || !googleSheetWebhookUrl.trim()}
                className="h-10 px-4 bg-slate-100 border border-slate-300 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all disabled:opacity-40 disabled:pointer-events-none"
                title="Send all existing active QR leads to Google Sheet"
              >
                {syncingAll ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-700" />
                    <span>Syncing All Leads...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 text-slate-700" />
                    <span>Sync All Leads Now</span>
                  </>
                )}
              </button>
            </div>

            {/* Save Integration Button */}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-sm disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Google Sheet Config</span>
                </>
              )}
            </button>
          </div>

          {/* Expandable Setup Instructions Accordion */}
          <div className="mt-6 pt-5 border-t border-slate-200/80">
            <button
              type="button"
              onClick={() => setShowScriptGuide(!showScriptGuide)}
              className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-left transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  How to setup your Google Sheet in 60 seconds (Free Apps Script)
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold">
                <span>{showScriptGuide ? 'Hide Guide' : 'View Instructions & Code'}</span>
                {showScriptGuide ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </div>
            </button>

            {showScriptGuide && (
              <div className="mt-4 p-5 bg-slate-900 text-slate-100 rounded-xl border border-slate-800 space-y-4 animate-in fade-in duration-200">
                {/* Step-by-Step Instructions */}
                <div>
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
                    Step-by-Step Setup:
                  </h4>
                  <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed font-sans">
                    <li>
                      Create a new blank Google Sheet at{' '}
                      <a
                        href="https://sheets.new"
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-300 underline font-semibold inline-flex items-center gap-1"
                      >
                        sheets.new <ExternalLink className="w-3 h-3" />
                      </a>{' '}
                      and name it <span className="text-white font-bold">CustomCliq Leads</span>.
                    </li>
                    <li>
                      In the top menu, click <span className="text-white font-bold">Extensions</span> &gt;{' '}
                      <span className="text-white font-bold">Apps Script</span>.
                    </li>
                    <li>
                      Delete any existing placeholder code in <span className="font-mono text-emerald-300">Code.gs</span>, and paste the complete script below.
                    </li>
                    <li>
                      Click the blue <span className="text-white font-bold">Deploy</span> button (top-right) &gt;{' '}
                      <span className="text-white font-bold">New deployment</span>.
                    </li>
                    <li>
                      Click the gear icon <span className="text-slate-400">(Select type)</span> &gt; Choose{' '}
                      <span className="text-white font-bold">Web app</span>.
                    </li>
                    <li>
                      Set <span className="text-white font-bold">Execute as</span>: <code className="text-emerald-300">Me</code>, and set{' '}
                      <span className="text-white font-bold">Who has access</span>: <code className="text-emerald-300">Anyone</code> (⚠️ <span className="text-amber-300 font-semibold">Crucial: Do NOT leave as "Only myself" or Google will return error 403 Forbidden</span>).
                    </li>
                    <li>
                      Click <span className="text-white font-bold">Deploy</span>, authorize permissions (click Advanced &gt; Go to CustomCliq &gt; Allow), copy the{' '}
                      <span className="text-emerald-300 font-bold">Web app URL</span> ending with <code className="text-emerald-300">/exec</code>, and paste it into the Webhook URL field above!
                    </li>
                  </ol>

                  {/* 403 Troubleshooting Callout */}
                  <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-200 text-xs flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white">Getting error "Google Sheet returned status 403"?</strong>
                      <p className="mt-0.5 text-amber-300/90 text-[11px] leading-relaxed">
                        This happens when Google blocks unauthorized access. To resolve: In Google Apps Script, click <strong>Deploy &gt; Manage deployments</strong>, click the <strong>Pencil icon (Edit)</strong>, set <strong>Who has access: Anyone</strong>, click <strong>Deploy</strong>, and make sure your URL ends with <strong>/exec</strong> (not /dev).
                      </p>
                    </div>
                  </div>
                </div>

                {/* Code Snippet Box */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                      Google Apps Script Code (Code.gs)
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyScript}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-md flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      {copiedScript ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copied to Clipboard!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Script</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="relative">
                    <pre className="p-4 bg-black/70 rounded-lg text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-72 border border-slate-800 leading-relaxed">
                      {appsScriptTemplate || '// Loading Apps Script template...'}
                    </pre>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>
                      Smart upsert feature: The script auto-creates styled headers on row 1 and updates existing rows by QR Code without creating duplicates.
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

