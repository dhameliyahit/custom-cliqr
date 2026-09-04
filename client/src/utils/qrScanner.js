import jsQR from 'jsqr';

/**
 * Extract clean CustomCliq Code or Slug from raw QR text
 * Supports:
 * - Direct codes: "CC-9X7K2P"
 * - Batch codes: "BATCH-20260904-ABCD"
 * - Full URLs: "https://qr.customcliq.com/r/CC-9X7K2P", "http://localhost:5173/r/CC-9X7K2P", "https://.../CC-9X7K2P"
 * - Query strings: "?code=CC-9X7K2P"
 */
export function extractCustomCliqCode(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';
  const text = rawText.trim();

  // 1. Direct Regex for CC-XXXXXX
  const ccMatch = text.match(/CC-[A-Za-z0-9_-]+/i);
  if (ccMatch) {
    return ccMatch[0].toUpperCase();
  }

  // 2. Direct Regex for BATCH-XXXX
  const batchMatch = text.match(/BATCH-[A-Za-z0-9_-]+/i);
  if (batchMatch) {
    return batchMatch[0].toUpperCase();
  }

  // 3. If it looks like a URL
  try {
    const url = new URL(text.startsWith('http') ? text : `https://${text}`);
    
    // Check search query parameters ?code=... or ?c=...
    const codeParam = url.searchParams.get('code') || url.searchParams.get('c');
    if (codeParam) {
      return codeParam.toUpperCase().trim();
    }

    // Check pathname: e.g. /r/CC-9X7K2P or /CC-9X7K2P
    const segments = url.pathname.split('/').filter(Boolean);
    if (segments.length > 0) {
      const lastSegment = segments[segments.length - 1];
      if (lastSegment) {
        return lastSegment.toUpperCase().trim();
      }
    }
  } catch (e) {
    // Not a valid URL, ignore
  }

  return text;
}

/**
 * Synthesizes a PhonePe / Google Pay styled pleasant success chime
 * using the Web Audio API without needing external audio asset files.
 */
export function playScanSuccessTone() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const now = ctx.currentTime;

    // First tone (pleasant mid-high)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now); // A5
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.12);

    // Second tone (higher chime)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1318.51, now + 0.08); // E6
    gain2.gain.setValueAtTime(0.25, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.25);

    // Optional haptic vibration on mobile devices
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([40, 30, 40]);
    }
  } catch (err) {
    // AudioContext blocked or not supported, ignore silently
  }
}

/**
 * Decode QR Code from a static Image file or Blob
 * Uses hardware-accelerated BarcodeDetector where available,
 * with pure JavaScript jsQR fallback.
 */
export async function decodeQrFromImage(imageFileOrBlob) {
  return new Promise((resolve, reject) => {
    if (!imageFileOrBlob) {
      return reject(new Error('No image file provided'));
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = async () => {
        try {
          // 1. Try Native BarcodeDetector (Chrome, Edge, Android Chrome, Safari 17+)
          if ('BarcodeDetector' in window) {
            try {
              const barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code'] });
              const barcodes = await barcodeDetector.detect(img);
              if (barcodes && barcodes.length > 0) {
                const rawText = barcodes[0].rawValue;
                return resolve({
                  rawText,
                  code: extractCustomCliqCode(rawText),
                });
              }
            } catch (detectorErr) {
              console.warn('Native BarcodeDetector skipped, falling back to jsQR:', detectorErr);
            }
          }

          // 2. jsQR Fallback via Canvas
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) {
            return reject(new Error('Could not initialize canvas context'));
          }

          // Scale down very large camera photos for rapid decoding and reliability
          const maxDimension = 1400;
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          const imageData = ctx.getImageData(0, 0, width, height);
          const qrCode = jsQR(imageData.data, width, height, {
            inversionAttempts: 'attemptBoth',
          });

          if (qrCode && qrCode.data) {
            return resolve({
              rawText: qrCode.data,
              code: extractCustomCliqCode(qrCode.data),
            });
          }

          return resolve(null); // No QR code found
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = () => reject(new Error('Failed to load image file'));
      img.src = reader.result;
    };

    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(imageFileOrBlob);
  });
}

/**
 * Decode a video frame from an active <video> camera stream
 */
export async function decodeFrameFromVideo(video, canvas) {
  if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
    return null;
  }

  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) return null;

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(video, 0, 0, width, height);

  // 1. Try Native BarcodeDetector
  if ('BarcodeDetector' in window) {
    try {
      const barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code'] });
      const barcodes = await barcodeDetector.detect(video);
      if (barcodes && barcodes.length > 0) {
        const rawText = barcodes[0].rawValue;
        return {
          rawText,
          code: extractCustomCliqCode(rawText),
        };
      }
    } catch (e) {
      // Fall through to jsQR
    }
  }

  // 2. jsQR
  const imageData = ctx.getImageData(0, 0, width, height);
  const qrCode = jsQR(imageData.data, width, height, {
    inversionAttempts: 'dontInvert',
  });

  if (qrCode && qrCode.data) {
    return {
      rawText: qrCode.data,
      code: extractCustomCliqCode(qrCode.data),
    };
  }

  return null;
}
