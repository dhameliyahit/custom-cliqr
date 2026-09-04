import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Camera,
  UploadCloud,
  Flashlight,
  RefreshCw,
  Search,
  Check,
  AlertCircle,
  ExternalLink,
  Sliders,
  Copy,
  Sparkles,
  Zap,
  Image as ImageIcon,
} from 'lucide-react';
import {
  decodeQrFromImage,
  decodeFrameFromVideo,
  playScanSuccessTone,
  extractCustomCliqCode,
} from '../utils/qrScanner';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function QrScanModal({
  isOpen,
  onClose,
  onApplySearch,
  onConfigureLink,
  onQuickActivate,
}) {
  // Mobile check: Default to Camera on mobile, Upload on desktop
  const isMobileInitial = typeof window !== 'undefined' && (
    window.innerWidth < 768 || 'ontouchstart' in window
  );

  const [activeTab, setActiveTab] = useState(isMobileInitial ? 'camera' : 'upload');
  const [hasCameraSupport, setHasCameraSupport] = useState(true);
  const [cameraError, setCameraError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' | 'user'
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);

  // Scanning State
  const [scanning, setScanning] = useState(false);
  const [scannedResult, setScannedResult] = useState(null); // { code, rawText }
  const [lookupLoading, setLookupLoading] = useState(false);
  const [matchedLink, setMatchedLink] = useState(null);
  const [copied, setCopied] = useState(false);

  // Upload State
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameIdRef = useRef(null);
  const fileInputRef = useRef(null);

  // Stop camera stream cleanly
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
    setScanning(false);
  }, []);

  // Lookup Tag Info via CustomCliq API
  const lookupTagInfo = useCallback(async (code) => {
    if (!code) return;
    setLookupLoading(true);
    setMatchedLink(null);

    try {
      // 1. Search in /api/qr across all periods and statuses
      const { data } = await api.get('/qr', {
        params: { search: code, period: 'all', adminId: 'all', status: 'all', limit: 5 },
      });
      if (data.success && data.links && data.links.length > 0) {
        // Find exact code match first
        const exact = data.links.find(
          (l) => l.code.toUpperCase() === code.toUpperCase()
        );
        setMatchedLink(exact || data.links[0]);
        return;
      }

      // 2. Fallback to public tag lookup (/api/qr/info/:code)
      const infoRes = await api.get(`/qr/info/${encodeURIComponent(code)}`);
      if (infoRes.data.success && infoRes.data.link) {
        setMatchedLink(infoRes.data.link);
      }
    } catch (err) {
      // Tag might not be configured or exists outside admin scope
      console.log('Tag lookup note:', err?.response?.data?.message || err.message);
    } finally {
      setLookupLoading(false);
    }
  }, []);

  // Handle successful QR detection
  const handleQrDetected = useCallback(
    async (decoded) => {
      if (!decoded || !decoded.code) return;
      playScanSuccessTone();
      stopCameraStream();

      setScannedResult(decoded);
      lookupTagInfo(decoded.code);
    },
    [stopCameraStream, lookupTagInfo]
  );

  // Continuous Camera Decoding Loop
  const startScanningLoop = useCallback(() => {
    const scanTick = async () => {
      if (!videoRef.current || !canvasRef.current) return;

      const result = await decodeFrameFromVideo(videoRef.current, canvasRef.current);
      if (result && result.code) {
        handleQrDetected(result);
        return; // Stop loop on detection
      }

      animFrameIdRef.current = requestAnimationFrame(scanTick);
    };

    animFrameIdRef.current = requestAnimationFrame(scanTick);
  }, [handleQrDetected]);

  // Start Camera Stream
  const startCamera = useCallback(async () => {
    stopCameraStream();
    setCameraError(null);
    setScanning(true);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setHasCameraSupport(false);
      setCameraError('Camera access is not supported by this browser.');
      setScanning(false);
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
        videoRef.current.setAttribute('playsinline', 'true'); // Required for iOS Safari
        await videoRef.current.play();

        // Check torch / flashlight capability
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
        msg = 'Camera permission was denied. Please allow camera permissions or upload an image instead.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No camera found on this device. Please use image upload.';
      } else if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        msg = 'Camera requires a secure HTTPS connection. Please use image upload.';
      }
      setCameraError(msg);
      setScanning(false);
    }
  }, [facingMode, stopCameraStream, startScanningLoop]);

  // Toggle Torch / Flashlight
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const nextTorch = !isTorchOn;
      await track.applyConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setIsTorchOn(nextTorch);
    } catch (err) {
      toast.error('Flashlight not supported on this device');
    }
  };

  // Flip Camera Front / Back
  const handleFlipCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Switch tabs & trigger camera if active
  useEffect(() => {
    if (isOpen && activeTab === 'camera' && !scannedResult) {
      startCamera();
    } else {
      stopCameraStream();
    }

    return () => {
      stopCameraStream();
    };
  }, [isOpen, activeTab, scannedResult, facingMode, startCamera, stopCameraStream]);

  // Reset modal state when opening
  useEffect(() => {
    if (isOpen) {
      const isMobile = window.innerWidth < 768 || 'ontouchstart' in window;
      setActiveTab(isMobile ? 'camera' : 'upload');
      setScannedResult(null);
      setMatchedLink(null);
      setUploadError(null);
      setCameraError(null);
      setCopied(false);
    } else {
      stopCameraStream();
    }
  }, [isOpen, stopCameraStream]);

  // Process uploaded image file
  const processImageFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, WEBP, etc.)');
      return;
    }

    setUploadLoading(true);
    setUploadError(null);

    try {
      const decoded = await decodeQrFromImage(file);
      if (decoded && decoded.code) {
        handleQrDetected(decoded);
      } else {
        setUploadError('No QR code detected in this image. Please ensure the QR code is clear, well-lit, and unobstructed.');
      }
    } catch (err) {
      console.error('Image decode error:', err);
      setUploadError('Failed to read image. Please try another photo.');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  // Reset scan to try again
  const handleResetScan = () => {
    setScannedResult(null);
    setMatchedLink(null);
    setUploadError(null);
    if (activeTab === 'camera') {
      startCamera();
    }
  };

  // Apply to Search and close
  const handleApplySearch = () => {
    if (!scannedResult) return;
    onApplySearch(scannedResult.code, matchedLink);
    onClose();
  };

  const handleCopyCode = () => {
    if (!scannedResult?.code) return;
    navigator.clipboard.writeText(scannedResult.code);
    setCopied(true);
    toast.success('QR code copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      {/* Hidden Offscreen Canvas for Video Frame Capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 text-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-zinc-800/80 bg-zinc-900/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white">
              <Search className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                <span>Scan-Based Search</span>
                <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Live
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400">
                Scan NFC tag or QR code to find cards instantly
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs (Camera vs Upload) */}
        {!scannedResult && (
          <div className="flex border-b border-zinc-800/80 bg-zinc-900/40 p-1.5 gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('camera')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'camera'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Camera Scanner</span>
              <span className="text-[10px] hidden sm:inline opacity-70">(Mobile)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Image</span>
              <span className="text-[10px] hidden sm:inline opacity-70">(Desktop & Gallery)</span>
            </button>
          </div>
        )}

        {/* Modal Main Body */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-center min-h-[320px]">
          {/* ============================================================ */}
          {/* STATE 1: SCAN RESULT FOUND CARD                              */}
          {/* ============================================================ */}
          {scannedResult ? (
            <div className="space-y-4 animate-scale-in">
              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                      QR Code Detected!
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white px-2 py-1 rounded bg-zinc-800 transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                {/* Scanned Code Display */}
                <div className="p-3 bg-black/80 rounded-lg border border-zinc-700/80 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-zinc-400">Extracted Code</div>
                    <div className="text-lg sm:text-xl font-mono font-black text-amber-400 tracking-wide">
                      {scannedResult.code}
                    </div>
                  </div>
                  {matchedLink?.status && (
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        matchedLink.status === 'configured'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : matchedLink.status === 'assigned'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : matchedLink.status === 'inactive'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-zinc-700 text-zinc-300'
                      }`}
                    >
                      {matchedLink.status}
                    </span>
                  )}
                </div>

                {/* Tag Database Details */}
                {lookupLoading ? (
                  <div className="py-3 flex items-center justify-center gap-2 text-xs text-zinc-400">
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                    <span>Fetching live card info from server...</span>
                  </div>
                ) : matchedLink ? (
                  <div className="space-y-2 pt-1 text-xs text-zinc-300 divide-y divide-zinc-800/80">
                    {matchedLink.businessName && (
                      <div className="flex justify-between py-1.5">
                        <span className="text-zinc-400">Business Name:</span>
                        <span className="font-semibold text-white">{matchedLink.businessName}</span>
                      </div>
                    )}
                    {matchedLink.customerName && (
                      <div className="flex justify-between py-1.5">
                        <span className="text-zinc-400">Customer:</span>
                        <span className="font-semibold text-white">{matchedLink.customerName}</span>
                      </div>
                    )}
                    {matchedLink.batchCode && (
                      <div className="flex justify-between py-1.5">
                        <span className="text-zinc-400">Batch Code:</span>
                        <span className="font-mono text-zinc-300">{matchedLink.batchCode}</span>
                      </div>
                    )}
                    {matchedLink.redirectUrl && (
                      <div className="flex flex-col py-1.5 gap-1">
                        <span className="text-zinc-400">Redirect Target:</span>
                        <a
                          href={matchedLink.redirectUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amber-400 hover:underline truncate flex items-center gap-1 font-mono text-[11px]"
                        >
                          <span className="truncate">{matchedLink.redirectUrl}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-2.5 rounded bg-zinc-800/50 text-[11px] text-zinc-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Tag found in QR code. Click search below to query database.</span>
                  </div>
                )}
              </div>

                {/* Actions */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleApplySearch}
                    className="w-full h-11 bg-white hover:bg-zinc-200 text-black rounded-xl font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                  >
                    <Search className="w-4 h-4" />
                    <span>Search in Dashboard</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {/* Fast Quick Activate / Configure Shortcut */}
                    {matchedLink && onQuickActivate && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onQuickActivate(matchedLink);
                        }}
                        className="flex-1 h-10 bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-zinc-700 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Zap className="w-3.5 h-3.5 fill-amber-400" />
                        <span>Quick Activate</span>
                      </button>
                    )}

                    {matchedLink && onConfigureLink && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onConfigureLink(matchedLink);
                        }}
                        className="flex-1 h-10 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>Configure</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleResetScan}
                      className="h-10 px-4 bg-transparent hover:bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-800 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Scan Another</span>
                    </button>
                  </div>
                </div>
            </div>
          ) : activeTab === 'camera' ? (
            /* ============================================================ */
            /* STATE 2: LIVE CAMERA SCANNER (GOOGLE PAY / PHONEPE STYLE)   */
            /* ============================================================ */
            <div className="flex flex-col items-center">
              {cameraError ? (
                <div className="text-center py-6 px-4 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Camera Unavailable</h3>
                  <p className="text-xs text-zinc-400 max-w-xs mx-auto">{cameraError}</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('upload')}
                    className="mt-2 px-4 py-2 bg-white text-black rounded-lg text-xs font-bold hover:bg-zinc-200 transition-all cursor-pointer"
                  >
                    Switch to Image Upload
                  </button>
                </div>
              ) : (
                <div className="relative w-full aspect-square max-w-[320px] rounded-2xl overflow-hidden bg-black border border-zinc-800 flex items-center justify-center shadow-inner">
                  {/* Live Video Element */}
                  <video
                    ref={videoRef}
                    className="absolute inset-0 w-full h-full object-cover"
                    muted
                    autoPlay
                    playsInline
                  />

                  {/* Darkened Frame Mask */}
                  <div className="absolute inset-0 bg-black/40 pointer-events-none" />

                  {/* Viewfinder Target Reticle (Google Pay / PhonePe square) */}
                  <div className="relative w-48 h-48 sm:w-56 sm:h-56 z-10 pointer-events-none">
                    {/* 4 Corner High-Contrast Brackets */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-lg shadow-[0_0_10px_rgba(52,211,153,0.5)]" />

                    {/* Laser Scanner Beam */}
                    <div className="absolute left-1 right-1 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-scan-laser" />
                  </div>

                  {/* Top Right Floating Camera Controls (Torch & Flip) */}
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
                        title="Toggle Flashlight"
                      >
                        <Flashlight className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleFlipCamera}
                      className="p-2 rounded-full bg-black/60 text-white hover:bg-black/80 backdrop-blur-md transition-colors cursor-pointer"
                      title="Flip Camera (Rear / Front)"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Bottom Viewfinder Hint */}
                  <div className="absolute bottom-3 inset-x-0 z-20 text-center pointer-events-none">
                    <span className="px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-[11px] font-semibold text-zinc-300">
                      Align CustomCliq QR code in frame
                    </span>
                  </div>
                </div>
              )}

              {/* Google Pay / PhonePe Bottom Action: "Upload from Gallery" */}
              <div className="mt-4 w-full flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-700/80 text-xs font-bold flex items-center gap-2 transition-all shadow-sm cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4 text-amber-400" />
                  <span>Upload from Gallery / Files</span>
                </button>
                <p className="text-[10px] text-zinc-500">
                  Having trouble scanning? Pick photo from camera roll
                </p>
              </div>
            </div>
          ) : (
            /* ============================================================ */
            /* STATE 3: DESKTOP & IMAGE UPLOAD MODE                         */
            /* ============================================================ */
            <div className="space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[220px] ${
                  isDragging
                    ? 'border-amber-400 bg-amber-400/5'
                    : 'border-zinc-700 hover:border-zinc-500 bg-zinc-900/50'
                }`}
              >
                {uploadLoading ? (
                  <div className="space-y-3">
                    <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
                    <p className="text-xs font-bold text-white">Analyzing QR code image...</p>
                    <p className="text-[11px] text-zinc-400">Decoding and extracting code...</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mx-auto text-amber-400">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-white">
                        Drop QR image here, or{' '}
                        <span className="text-amber-400 underline underline-offset-2">browse</span>
                      </p>
                      <p className="text-[11px] text-zinc-400 mt-1">
                        Supports PNG, JPG, JPEG, WEBP, or SVG screenshot
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {uploadError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-start gap-2 animate-fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold">Detection Notice</p>
                    <p className="text-[11px] text-rose-400 mt-0.5">{uploadError}</p>
                  </div>
                </div>
              )}

              <div className="text-center">
                <span className="text-[11px] text-zinc-500">
                  Tip: You can take a photo of any smart card, standee, or batch QR and upload it here.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
