import { useState, useRef } from 'react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { X, Download, Copy, Check, QrCode } from 'lucide-react';
import toast from 'react-hot-toast';

export default function QrPreviewModal({ isOpen, onClose, link }) {
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

  // Download Vector SVG with centered code below for print
  const downloadSvg = () => {
    const svgElement = document.getElementById('qr-svg-download');
    if (!svgElement) {
      toast.error('SVG not found');
      return;
    }

    let innerSvg = svgElement.innerHTML;
    // Ensure clean inner content without duplicate outer <svg> or </svg>
    const startIdx = innerSvg.indexOf('>');
    const endIdx = innerSvg.lastIndexOf('</svg>');
    if (innerSvg.startsWith('<svg') && startIdx !== -1 && endIdx !== -1) {
      innerSvg = innerSvg.substring(startIdx + 1, endIdx).trim();
    } else {
      innerSvg = innerSvg.replace(/<\/svg>[\s\r\n]*$/i, '').trim();
    }

    const viewBox = svgElement.getAttribute('viewBox') || '0 0 33 33';

    const width = 600;
    const height = 610;
    const qrSize = 500;
    const qrX = 50;
    const qrY = 35;
    const textY = 565;

    const printableSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <svg x="${qrX}" y="${qrY}" width="${qrSize}" height="${qrSize}" viewBox="${viewBox}" shape-rendering="crispEdges">
    ${innerSvg}
  </svg>
  <!-- Centered Short Code below QR -->
  <text x="${width / 2}" y="${textY}" text-anchor="middle" dominant-baseline="central" font-family="'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, monospace, sans-serif" font-size="34" font-weight="900" fill="#000000" letter-spacing="4">${link.code}</text>
</svg>`;

    const svgBlob = new Blob([printableSvg], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = `CustomCliq_${link.code}.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(svgUrl);
    toast.success('Downloaded Print-Ready Vector SVG');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in print:p-0 print:bg-white">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-black">QR Code Preview</h2>
                <span className="font-mono text-xs font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  {link.code}
                </span>
              </div>
              {link.businessName && (
                <p className="text-xs text-slate-500 font-medium truncate max-w-[200px]">
                  {link.businessName}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-black rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="flex flex-col items-center">
            {/* Visible SVG QR */}
            <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm mb-4">
              <QRCodeSVG
                id="qr-svg-download"
                value={targetUrl}
                size={210}
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

            {/* QR Details Info Pill */}
            <div className="w-full flex items-center justify-between text-[11px] text-slate-500 font-mono mb-3 px-1">
              <span>Batch: <strong className="text-slate-800">{link.batchCode || 'N/A'}</strong></span>
              <span>Scans: <strong className="text-slate-800">{link.scanCount || 0}</strong></span>
              <span className={link.status === 'configured' ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                {link.status === 'configured' ? '● Active' : '○ Ready'}
              </span>
            </div>

            {/* URL Display & Copy */}
            <div className="w-full mb-4">
              <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-xs font-mono text-slate-700 truncate flex-1 pl-1">
                  {targetUrl}
                </span>
                <button
                  onClick={handleCopyLink}
                  className="px-2.5 py-1 bg-black text-white hover:bg-zinc-800 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Download Buttons */}
            <div className="w-full grid grid-cols-2 gap-2.5">
              <button
                onClick={downloadPng}
                className="py-2.5 px-3 bg-black text-white hover:bg-zinc-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PNG (1000px)</span>
              </button>
              <button
                onClick={downloadSvg}
                className="py-2.5 px-3 bg-white text-black border border-slate-300 hover:border-black rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download SVG (Vector)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
