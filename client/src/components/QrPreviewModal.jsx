import { useState, useRef } from 'react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { X, Download, Copy, Check, Radio, Printer, CreditCard, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

export default function QrPreviewModal({ isOpen, onClose, link }) {
  const [activeTab, setActiveTab] = useState('qr'); // 'qr' | 'nfc_card'
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef(null);

  if (!isOpen || !link) return null;

  const targetUrl = link.fullUrl || `${window.location.origin}/r/${link.code}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    toast.success('Link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Download High-Res 1000px PNG
  const downloadPng = () => {
    const canvas = document.getElementById('qr-canvas-download');
    if (!canvas) {
      toast.error('Canvas not ready');
      return;
    }

    const pngUrl = canvas.toDataURL('image/png');
    const downloadLink = document.createElement('a');
    downloadLink.href = pngUrl;
    downloadLink.download = `CustomCliq_${link.code}_1000px.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    toast.success('Downloaded High-Res PNG (1000px)');
  };

  // Download Vector SVG
  const downloadSvg = () => {
    const svgElement = document.getElementById('qr-svg-download');
    if (!svgElement) {
      toast.error('SVG not found');
      return;
    }

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = `CustomCliq_${link.code}.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(svgUrl);
    toast.success('Downloaded Vector SVG for printing');
  };

  const handlePrintCard = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in print:p-0 print:bg-white">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden print:shadow-none print:border-none">
        {/* Header (hidden during print) */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-black">QR & NFC Card Preview</h2>
            <span className="font-mono text-xs font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              {link.code}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-black rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Tabs (hidden during print) */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 print:hidden">
          <button
            onClick={() => setActiveTab('qr')}
            className={`pb-2.5 text-xs font-bold transition-all border-b-2 mr-6 ${
              activeTab === 'qr'
                ? 'border-black text-black'
                : 'border-transparent text-slate-400 hover:text-black'
            }`}
          >
            QR Code High-Res
          </button>
          <button
            onClick={() => setActiveTab('nfc_card')}
            className={`pb-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'nfc_card'
                ? 'border-black text-black'
                : 'border-transparent text-slate-400 hover:text-black'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>NFC Card Mockup (85.6mm × 54mm)</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {activeTab === 'qr' ? (
            <div className="flex flex-col items-center">
              {/* Visible SVG QR */}
              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm mb-4">
                <QRCodeSVG
                  id="qr-svg-download"
                  value={targetUrl}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>

              {/* Hidden 1000px canvas for export */}
              <div className="hidden">
                <QRCodeCanvas
                  id="qr-canvas-download"
                  value={targetUrl}
                  size={1000}
                  level="H"
                  includeMargin={true}
                />
              </div>

              {/* URL Display & Copy */}
              <div className="w-full mb-4">
                <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-xs font-mono text-slate-700 truncate flex-1">
                    {targetUrl}
                  </span>
                  <button
                    onClick={handleCopyLink}
                    className="px-2.5 py-1 bg-black text-white hover:bg-zinc-800 rounded text-xs font-bold flex items-center gap-1 transition-colors"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Download Buttons */}
              <div className="w-full grid grid-cols-2 gap-2">
                <button
                  onClick={downloadPng}
                  className="py-2.5 px-3 bg-black text-white hover:bg-zinc-800 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PNG (1000px)</span>
                </button>
                <button
                  onClick={downloadSvg}
                  className="py-2.5 px-3 bg-white text-black border border-slate-300 hover:border-black rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download SVG (Vector)</span>
                </button>
              </div>
            </div>
          ) : (
            /* NFC Card Print Preview (85.6mm x 54mm aspect) */
            <div className="flex flex-col items-center">
              <div className="w-full max-w-[340px] nfc-card-aspect rounded-2xl bg-gradient-to-br from-zinc-950 via-zinc-900 to-black text-white p-5 flex flex-col justify-between shadow-xl border border-zinc-700 relative overflow-hidden">
                {/* Background Luxury Accents */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />

                {/* Top Card Row */}
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-2">
                    <Radio className="w-5 h-5 text-white" />
                    <span className="font-extrabold text-sm tracking-wider uppercase">
                      CustomCliq
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400 bg-white/10 px-2 py-0.5 rounded">
                    {link.code}
                  </span>
                </div>

                {/* Card Middle: Business Name & QR Code */}
                <div className="flex items-center justify-between my-auto relative z-10 gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black tracking-tight text-white truncate">
                      {link.businessName || 'Your Business Name'}
                    </p>
                    <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                      {link.customerName || 'Smart NFC Profile'}
                    </p>
                    <p className="text-[9px] text-zinc-500 uppercase tracking-widest mt-2">
                      Tap or Scan to Connect
                    </p>
                  </div>

                  {/* Card Mini QR */}
                  <div className="p-1.5 bg-white rounded-lg shadow-md shrink-0">
                    <QRCodeSVG
                      value={targetUrl}
                      size={54}
                      level="M"
                      includeMargin={false}
                    />
                  </div>
                </div>

                {/* Card Bottom Row */}
                <div className="flex items-center justify-between text-[9px] text-zinc-500 font-mono relative z-10">
                  <span>Standard NFC 85.6 × 54mm</span>
                  <span>Batch: {link.batchCode}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="w-full flex items-center justify-center gap-3 mt-5 print:hidden">
                <button
                  onClick={handlePrintCard}
                  className="py-2.5 px-4 bg-black text-white hover:bg-zinc-800 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Card Template</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
