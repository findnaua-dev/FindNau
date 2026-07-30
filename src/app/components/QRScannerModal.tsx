import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerModalProps {
  open: boolean;
  onClose: () => void;
  onScan: (decodedText: string) => void;
}

export default function QRScannerModal({ open, onClose, onScan }: QRScannerModalProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (!open) return;
    const scanner = new Html5Qrcode('qr-reader');
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: 'environment' }, // back camera
        { fps: 10, qrbox: 250 },
        (decodedText) => {
          // Stop scanning after successful read
          scanner.stop().then(() => {
            onScan(decodedText);
          }).catch(console.error);
        },
        (errorMessage) => {
          // ignore scan errors
        }
      )
      .catch(err => console.error('Failed to start scanner:', err));

    return () => {
      scanner.stop().catch(() => {});
    };
  }, [open, onScan]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400">
          ✕
        </button>
        <h3 className="text-lg font-semibold mb-2">Scan QR Code</h3>
        <p className="text-sm text-gray-500 mb-4">Point camera at the office QR code</p>
        <div id="qr-reader" style={{ width: '100%' }} />
        <button
          onClick={onClose}
          className="mt-4 w-full border border-gray-200 text-gray-600 py-3 rounded-xl text-sm font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}