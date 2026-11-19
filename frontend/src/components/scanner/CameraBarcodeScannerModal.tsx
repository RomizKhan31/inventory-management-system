'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, AlertCircle } from 'lucide-react';

interface CameraBarcodeScannerModalProps {
  isOpen: boolean;
  title?: string;
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

export const CameraBarcodeScannerModal: React.FC<CameraBarcodeScannerModalProps> = ({
  isOpen,
  title = 'Scan Industrial Barcode',
  onScanSuccess,
  onClose,
}) => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const elementId = 'walton-interactive-scanner';

  useEffect(() => {
    if (!isOpen) return;

    let html5QrCode: Html5Qrcode;

    const startScanner = async () => {
      try {
        setErrorMsg(null);
        html5QrCode = new Html5Qrcode(elementId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.DATA_MATRIX,
          ],
          verbose: false,
        });
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 15,
            qrbox: { width: 260, height: 160 },
          },
          (decodedText) => {
            // High-pitched audio feedback beep using Web Audio API
            playAudioBeep(880, 150);
            onScanSuccess(decodedText.trim().toUpperCase());
            onClose();
          },
          () => {
            // Frame scan failure (ignore continuous frame scans)
          }
        );
        setIsScanning(true);
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : 'Unable to access video camera. Please verify webcam permissions or enter barcode manually.';
        setErrorMsg(message);
        setIsScanning(false);
      }
    };

    // Small delay to ensure DOM element is mounted
    const timer = setTimeout(() => {
      startScanner();
    }, 150);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop().catch(() => {}).finally(() => {
            scannerRef.current?.clear();
          });
        }
      }
    };
  }, [isOpen, onScanSuccess, onClose]);

  const handleManualClose = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {
        // Ignore stop error
      }
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          </div>
          <button
            onClick={handleManualClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Video Scanner Area */}
        <div className="p-4 bg-slate-900 flex flex-col items-center justify-center min-h-[300px] relative">
          <div
            id={elementId}
            className="w-full max-w-sm rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center"
          ></div>

          {errorMsg ? (
            <div className="p-4 m-4 bg-rose-900/80 border border-rose-700 text-rose-200 rounded-xl text-xs text-center space-y-2">
              <p className="font-bold flex items-center justify-center space-x-1.5">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span>Camera Access Error</span>
              </p>
              <p className="text-[11px] leading-relaxed">{errorMsg}</p>
              <p className="text-[10px] text-slate-300">
                You can close this window and enter the barcode numbers directly using the manual input field.
              </p>
            </div>
          ) : (
            <div className="mt-3 text-center space-y-1">
              <p className="text-xs font-semibold text-white">
                Align 1D Barcode (Code 128) or 2D QR Code within the crosshair
              </p>
              <p className="text-[10px] text-slate-400">
                Camera feed active • Automatic detection & sound chime enabled
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-4 py-3 flex items-center justify-between border-t border-slate-100 text-xs">
          <span className="text-slate-400 text-[11px]">
            {isScanning ? 'Scanner Ready' : 'Initializing camera...'}
          </span>
          <button
            onClick={handleManualClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg text-xs cursor-pointer"
          >
            Close Scanner
          </button>
        </div>
      </div>
    </div>
  );
};

// Web Audio API Synthesized Beep
export const playAudioBeep = (freq = 880, durationMs = 150) => {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);
  } catch {
    // Ignore audio context error
  }
};
