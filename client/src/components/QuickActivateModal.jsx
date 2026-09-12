import { useState, useEffect, useRef, useCallback } from 'react';
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
  Camera,
  RefreshCw,
  Flashlight,
  AlertCircle,
  ArrowLeft,
  UploadCloud,
} from 'lucide-react';
import {
  decodeFrameFromVideo,
  decodeQrFromImage,
  playScanSuccessTone,
  extractCustomCliqCode,
} from '../utils/qrScanner';
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
  // Mode: 'scanner' (camera-first) | 'form' (filling details)
  const [viewMode, setViewMode] = useState(initialLink ? 'form' : 'scanner');

  // Link and Form State
  const [selectedLinkId, setSelectedLinkId] = useState('');
  const [selectedLink, setSelectedLink] = useState(null);
  const [businessName, setBusinessName] = useState('');
  const [redirectUrl, setRedirectUrl] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [activatedLink, setActivatedLink] = useState(null);
  const [copied, setCopied] = useState(false);

  // Camera & Scanner State
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' | 'user'
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [manualCodeInput, setManualCodeInput] = useState('');

  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameIdRef = useRef(null);
  const fileInputRef = useRef(null);

  // Filter unconfigured links for fallback dropdown
  const unconfiguredLinks = availableLinks.filter((l) => l.status !== 'configured');

  const extract10Digits = (phone) => {
    if (!phone) return '';
    const digits = phone.toString().replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
    return digits.slice(-10);
  };

  // Cleanly stop camera stream
  const stopCameraStream = useCallback(() => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          // ignore
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsTorchOn(false);
    setHasTorch(false);
  }, []);

  // Lookup tag / QR code in memory or via API
  const lookupScannedCode = useCallback(
    async (code) => {
      if (!code) return;
      setLookingUp(true);
      setCameraError(null);

      try {
        const cleanCode = extractCustomCliqCode(code).trim().toUpperCase();

        // 1. Search in availableLinks prop first
        let matched = availableLinks.find(
          (l) => l.code && l.code.toUpperCase() === cleanCode
        );

        // 2. If not found in current availableLinks, search via API
        if (!matched) {
          try {
            const { data } = await api.get('/qr', {
              params: { search: cleanCode, period: 'all', status: 'all', limit: 5 },
            });
            if (data.success && data.links && data.links.length > 0) {
              matched =
                data.links.find(
                  (l) => l.code && l.code.toUpperCase() === cleanCode
                ) || data.links[0];
            }
          } catch (apiErr) {
            console.warn('API search error:', apiErr);
          }
        }

        // 3. If still not matched, check public tag endpoint
        if (!matched) {
          try {
            const infoRes = await api.get(`/qr/info/${encodeURIComponent(cleanCode)}`);
            if (infoRes.data.success && infoRes.data.link) {
              matched = infoRes.data.link;
            }
          } catch (e) {
            // ignore
          }
        }

        if (!matched) {
          toast.error(`QR Code "${cleanCode}" not found in inventory.`);
          setCameraError(`QR "${cleanCode}" not found or not assigned to your account.`);
          return;
        }

        // Successfully matched!
        setSelectedLinkId(matched._id);
        setSelectedLink(matched);
        setBusinessName(matched.businessName || '');
        setRedirectUrl(matched.redirectUrl || '');
        setCustomerName(matched.customerName || '');
        setCustomerPhone(extract10Digits(matched.customerPhone));
        setCustomerEmail(matched.customerEmail || '');

        stopCameraStream();
        setViewMode('form');
        toast.success(`Sticker ${matched.code} detected!`, { icon: '🎯' });
      } catch (err) {
        toast.error('Failed to lookup scanned QR code');
      } finally {
        setLookingUp(false);
      }
    },
    [availableLinks, stopCameraStream]
  );

  // Handle successful QR detection from camera or file
  const handleQrDetected = useCallback(
    (decoded) => {
      if (!decoded || !decoded.code) return;
      playScanSuccessTone();
      stopCameraStream();
      lookupScannedCode(decoded.code);
    },
    [stopCameraStream, lookupScannedCode]
  );

  // Continuous Camera Loop
  const startScanningLoop = useCallback(() => {
    const scanTick = async () => {
      if (!videoRef.current || !canvasRef.current) return;

      const result = await decodeFrameFromVideo(videoRef.current, canvasRef.current);
      if (result && result.code) {
        handleQrDetected(result);
        return; // Stop animation loop once code is detected
      }

      animFrameIdRef.current = requestAnimationFrame(scanTick);
    };

    animFrameIdRef.current = requestAnimationFrame(scanTick);
  }, [handleQrDetected]);

  // Start Camera
  const startCamera = useCallback(async () => {
    stopCameraStream();
    setCameraError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera access is not supported by your browser.');
      return;
    }

    try {
      const constraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();

        const track = stream.getVideoTracks()[0];
        if (track && track.getCapabilities) {
          const capabilities = track.getCapabilities();
          if ('torch' in capabilities) {
            setHasTorch(true);
          }
        }

        startScanningLoop();
      }
    } catch (err) {
      console.error('Camera access error:', err);
      let msg = 'Could not access camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission was denied. Please allow camera permissions or enter code manually.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No camera found on this device. Please select QR manually.';
      }
      setCameraError(msg);
    }
  }, [facingMode, startScanningLoop, stopCameraStream]);

  // Flip Camera (Front / Back)
  const handleFlipCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Toggle Flashlight / Torch
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && track.applyConstraints) {
      try {
        const nextState = !isTorchOn;
        await track.applyConstraints({
          advanced: [{ torch: nextState }],
        });
        setIsTorchOn(nextState);
      } catch (err) {
        console.warn('Torch toggle failed:', err);
      }
    }
  };

  // Upload QR Image from gallery/disk
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      toast.loading('Analyzing image...', { id: 'file-scan' });
      const result = await decodeQrFromImage(file);
      toast.dismiss('file-scan');
      if (result && result.code) {
        handleQrDetected(result);
      } else {
        toast.error('No readable QR code found in this image');
      }
    } catch (err) {
      toast.dismiss('file-scan');
      toast.error('Failed to read image file');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Modal open / close lifecycle
  useEffect(() => {
    if (isOpen) {
      setActivatedLink(null);
      setCameraError(null);
      setManualCodeInput('');

      if (initialLink) {
        setViewMode('form');
        setSelectedLinkId(initialLink._id);
        setSelectedLink(initialLink);
        setBusinessName(initialLink.businessName || '');
        setRedirectUrl(initialLink.redirectUrl || '');
        setCustomerName(initialLink.customerName || '');
        setCustomerPhone(extract10Digits(initialLink.customerPhone));
        setCustomerEmail(initialLink.customerEmail || '');
      } else {
        // Camera-first flow: Default immediately to scanner
        setViewMode('scanner');
        setSelectedLinkId('');
        setSelectedLink(null);
        setBusinessName('');
        setRedirectUrl('');
        setCustomerName('');
        setCustomerPhone('');
        setCustomerEmail('');
      }
    } else {
      stopCameraStream();
    }

    return () => {
      stopCameraStream();
    };
  }, [isOpen, initialLink, stopCameraStream]);

  // Trigger camera start when switching to scanner mode
  useEffect(() => {
    if (isOpen && viewMode === 'scanner' && !activatedLink) {
      startCamera();
    } else {
      stopCameraStream();
    }
  }, [isOpen, viewMode, activatedLink, startCamera, stopCameraStream]);

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

  const handleManualCodeSubmit = (e) => {
    e.preventDefault();
    if (!manualCodeInput.trim()) {
      toast.error('Please enter a QR code');
      return;
    }
    lookupScannedCode(manualCodeInput.trim());
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
      toast.error('Please scan or select a QR code first');
      return;
    }

    if (!redirectUrl.trim()) {
      toast.error('Please enter the customer destination URL');
      return;
    }

    if (!businessName.trim()) {
      toast.error('Please enter the customer business name');
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

    // Note: customerEmail is strictly OPTIONAL as requested
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

        // Auto-copy to clipboard for quick customer handoff
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(shareUrl).catch(() => {});
        }

        toast.success(`QR ${fullLink.code} activated & link copied!`, {
          icon: '⚡',
        });
        setActivatedLink(fullLink);
        onSuccess?.();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to activate QR');
    } finally {
      setLoading(false);
    }
  };

  // Restart scanning flow for the next physical sticker
  const handleScanNextSticker = () => {
    setActivatedLink(null);
    setSelectedLinkId('');
    setSelectedLink(null);
    setBusinessName('');
    setRedirectUrl('');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setManualCodeInput('');
    setViewMode('scanner');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
      {/* Hidden Offscreen Canvas for Video Frame Capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Hidden File Input for Image Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[94vh] flex flex-col animate-slide-up">
        {/* Modal Top Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center shadow-xs">
              <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-black tracking-tight">
                  {activatedLink
                    ? 'QR Sticker is Live!'
                    : viewMode === 'scanner'
                    ? 'Active QR: Scan Physical Sticker'
                    : 'Active QR: Customer Details'}
                </h2>
                <span className="text-[10px] uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                  {viewMode === 'scanner' ? 'Camera Live' : 'Active QR'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {activatedLink
                  ? 'Configured and ready for customer handoff'
                  : viewMode === 'scanner'
                  ? 'Point camera at the QR sticker to activate'
                  : 'Enter client redirection and business details'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-black rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ============================================================ */}
        {/* SUCCESS STATE                                                */}
        {/* ============================================================ */}
        {activatedLink ? (
          <div className="p-6 overflow-y-auto space-y-5 text-center animate-fade-in">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="font-mono text-xs font-black bg-black text-white px-3 py-1 rounded-full uppercase tracking-widest">
                {activatedLink.code}
              </span>
              <h3 className="text-lg sm:text-xl font-black text-black mt-2.5">
                {activatedLink.businessName || 'QR Code'} is Live!
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto truncate font-mono">
                {activatedLink.redirectUrl}
              </p>
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
                  value={
                    activatedLink.fullUrl ||
                    `${window.location.origin}/r/${activatedLink.code}`
                  }
                  className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-black select-all"
                />
                <button
                  type="button"
                  onClick={() =>
                    handleCopyLink(
                      activatedLink.fullUrl ||
                        `${window.location.origin}/r/${activatedLink.code}`
                    )
                  }
                  className="h-10 px-3.5 bg-black hover:bg-zinc-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer shadow-xs"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                {typeof navigator !== 'undefined' && navigator.share && (
                  <button
                    type="button"
                    onClick={() =>
                      handleNativeShare(
                        activatedLink.fullUrl ||
                          `${window.location.origin}/r/${activatedLink.code}`,
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

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              {onPreviewQr && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onPreviewQr(activatedLink);
                  }}
                  className="w-full h-11 bg-black hover:bg-zinc-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Show QR Code for Customer Scan</span>
                </button>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleScanNextSticker}
                  className="flex-1 h-11 bg-amber-400 hover:bg-amber-500 text-black rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Scan Next Sticker</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Done & Close
                </button>
              </div>
            </div>
          </div>
        ) : viewMode === 'scanner' ? (
          /* ============================================================ */
          /* SCANNER VIEW: CAMERA-FIRST SCANNING FOR PHYSICAL STICKER    */
          /* ============================================================ */
          <div className="p-4 sm:p-5 flex-1 overflow-y-auto flex flex-col items-center justify-center space-y-4">
            {cameraError ? (
              <div className="text-center py-6 px-4 space-y-3 bg-rose-50 border border-rose-200 rounded-2xl w-full max-w-sm">
                <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-rose-900">Camera Notice</h3>
                <p className="text-xs text-rose-700 max-w-xs mx-auto">{cameraError}</p>
                <div className="flex gap-2 justify-center pt-2">
                  <button
                    type="button"
                    onClick={() => startCamera()}
                    className="px-3 py-1.5 bg-black text-white text-xs font-bold rounded-lg hover:bg-zinc-800 transition-all cursor-pointer"
                  >
                    Retry Camera
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('form')}
                    className="px-3 py-1.5 bg-white border border-slate-300 text-black text-xs font-bold rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
                  >
                    Enter Manually
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative w-full aspect-square max-w-[290px] rounded-2xl overflow-hidden bg-black border-2 border-slate-900 flex items-center justify-center shadow-xl">
                {/* Video Stream */}
                <video
                  ref={videoRef}
                  className="absolute inset-0 w-full h-full object-cover"
                  muted
                  autoPlay
                  playsInline
                />

                {/* Dark Mask */}
                <div className="absolute inset-0 bg-black/40 pointer-events-none" />

                {/* Viewfinder Target Reticle */}
                <div className="relative w-44 h-44 sm:w-48 sm:h-48 z-10 pointer-events-none">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-lg shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                  <div className="absolute left-1 right-1 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-scan-laser" />
                </div>

                {/* Top Controls (Torch & Flip) */}
                <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
                  {hasTorch && (
                    <button
                      type="button"
                      onClick={toggleTorch}
                      className={`p-2 rounded-full backdrop-blur-md transition-colors cursor-pointer ${
                        isTorchOn
                          ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/50'
                          : 'bg-black/60 text-white hover:bg-black/80'
                      }`}
                      title="Toggle Torch"
                    >
                      <Flashlight className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleFlipCamera}
                    className="p-2 rounded-full bg-black/60 text-white hover:bg-black/80 backdrop-blur-md transition-colors cursor-pointer"
                    title="Flip Camera"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                {/* Bottom Viewfinder Instruction */}
                <div className="absolute bottom-3 inset-x-0 z-20 text-center pointer-events-none">
                  <span className="px-3 py-1 rounded-full bg-black/75 backdrop-blur-md text-[10px] font-bold text-white tracking-wide">
                    Align sticker QR inside frame
                  </span>
                </div>

                {lookingUp && (
                  <div className="absolute inset-0 z-30 bg-black/70 flex flex-col items-center justify-center text-white gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
                    <span className="text-xs font-bold">Verifying Sticker Code...</span>
                  </div>
                )}
              </div>
            )}

            {/* Quick Upload from Gallery / Files */}
            <div className="w-full max-w-sm flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <UploadCloud className="w-4 h-4 text-slate-500" />
                <span>Upload Sticker Image</span>
              </button>
            </div>

            {/* Manual Code Input Fallback */}
            <div className="w-full max-w-sm pt-2 border-t border-slate-100">
              <form onSubmit={handleManualCodeSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={manualCodeInput}
                  onChange={(e) => setManualCodeInput(e.target.value)}
                  placeholder="Or enter code manually: CC-XXXXXX"
                  className="flex-1 h-9.5 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-black focus:outline-none focus:ring-1 focus:ring-black uppercase"
                />
                <button
                  type="submit"
                  disabled={lookingUp || !manualCodeInput.trim()}
                  className="h-9.5 px-3.5 bg-black hover:bg-zinc-800 text-white rounded-xl text-xs font-bold disabled:opacity-50 transition-all cursor-pointer shadow-xs"
                >
                  Find
                </button>
              </form>

              {/* Or Pick from Inventory button */}
              <div className="mt-2.5 text-center">
                <button
                  type="button"
                  onClick={() => setViewMode('form')}
                  className="text-xs font-bold text-slate-600 hover:text-black underline cursor-pointer"
                >
                  Select from Assigned Inventory List ({unconfiguredLinks.length} ready)
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ============================================================ */
          /* FORM VIEW: POPULATE DETAILS & ACTIVATE                       */
          /* ============================================================ */
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3 overflow-y-auto">
            {/* Selected Sticker Banner with "Scan Different" Button */}
            <div className="bg-black text-white p-3 rounded-xl flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <QrCode className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                    Selected Sticker
                  </div>
                  <div className="font-mono text-sm font-black text-white tracking-wider">
                    {selectedLink ? selectedLink.code : 'No Sticker Selected'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewMode('scanner')}
                className="h-8 px-2.5 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-amber-400" />
                <span>Scan Sticker</span>
              </button>
            </div>

            {/* If no selectedLink, allow picking from dropdown */}
            {!selectedLink && (
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Pick from Ready QRs <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={selectedLinkId}
                  onChange={(e) => handleSelectLink(e.target.value)}
                  className="w-full h-9.5 px-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-black focus:outline-none focus:ring-1 focus:ring-black cursor-pointer shadow-2xs"
                >
                  <option value="">-- Choose a fresh QR code --</option>
                  {availableLinks.map((l) => (
                    <option key={l._id} value={l._id}>
                      {l.code} {l.status === 'configured' ? '✓ (Configured)' : '● [FRESH / READY]'}{' '}
                      {l.businessName ? `- ${l.businessName}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Step 1: Destination Redirection Link (Required) */}
            <div>
              <label className="block text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <Globe className="w-3.5 h-3.5 text-black" />
                <span>
                  Destination Redirection Link <span className="text-red-500">*</span>
                </span>
              </label>
              <input
                type="text"
                required
                value={redirectUrl}
                onChange={(e) => setRedirectUrl(e.target.value)}
                placeholder="https://... (Google Review link, Instagram, WhatsApp, website)"
                className="w-full h-9.5 px-3 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-black focus:outline-none focus:ring-1 focus:ring-black transition-all shadow-2xs"
              />
            </div>

            {/* Step 2: Business & Contact Info (Business, Person, Phone Required; Email Optional) */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5">
              <div className="flex items-center gap-1.5 text-slate-800">
                <Building2 className="w-3.5 h-3.5 text-black" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-black">
                  Business & Customer Details <span className="text-red-500">*</span>
                </span>
              </div>

              {/* Row 1: Business Name (50%) & Contact Person (50%) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-slate-400" />
                    <span>
                      Business Name <span className="text-red-500">*</span>
                    </span>
                  </label>
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Bella Cafe, Apex Clinic"
                    className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-black focus:outline-none focus:ring-1 focus:ring-black shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-400" />
                    <span>
                      Contact Person <span className="text-red-500">*</span>
                    </span>
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

              {/* Row 2: Mobile Number (Required) & Email Address (Optional) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>
                        Mobile Number <span className="text-red-500">*</span>
                      </span>
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
                    <span>Business Email (Optional)</span>
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="e.g. contact@business.com"
                    className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-black focus:outline-none focus:ring-1 focus:ring-black shadow-2xs"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('scanner')}
                className="h-10 px-3 text-xs font-bold text-slate-600 hover:text-black bg-slate-100 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Scanner</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-10 px-3.5 text-xs font-bold text-slate-600 hover:text-black bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !selectedLinkId}
                  className="h-10 px-5 bg-black hover:bg-zinc-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-md disabled:opacity-50 cursor-pointer"
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
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
