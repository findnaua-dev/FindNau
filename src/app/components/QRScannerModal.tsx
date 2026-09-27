import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useNavigate } from 'react-router';
import { useApp } from '../context/AppContext';
import { recordQRScan } from '../../services/qrScanServices';

interface QRScannerModalProps {
  open: boolean;
  onClose: () => void;
  onScan?: (decodedText: string) => void;
}

export default function QRScannerModal({ open, onClose, onScan }: QRScannerModalProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [scanning, setScanning] = useState(false);
  const scanHandledRef = useRef(false);          // ← panangga sa dobleng tawag
  const navigate = useNavigate();
  const { user, addVisitedOffice } = useApp();

  // ── maglinis kapag sarado ang modal ────────────────────
  useEffect(() => {
    if (!open) {
      if (scannerRef.current && scanning) {
        scannerRef.current.stop().catch(() => {});
        setScanning(false);
      }
      return;
    }

    // iwas double start
    if (scannerRef.current) return;

    const scanner = new Html5Qrcode('qr-reader');
    scannerRef.current = scanner;
    scanHandledRef.current = false;   // bagong simula, pwede uli mag‑process

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          // ───── HUWAG MAGPROSESO KUNG MAY NAUNA NANG NATAPOS ─────
          if (scanHandledRef.current) return;
          scanHandledRef.current = true;           // i-lock agad

          // Itigil ang scanner (kung tumatakbo pa)
          try { await scanner.stop(); } catch {}
          scannerRef.current = null;
          setScanning(false);

          // Extract officeId (pareho lang)
          let officeId = decodedText;
          if (decodedText.includes('/office/')) {
            officeId = decodedText.split('/office/').pop()?.split('?')[0] || decodedText;
          }

          // 🔥 I-record ang scan BAGO mag-navigate
          const userId = user?.uid || undefined;
          try {
            await recordQRScan(officeId, userId);
          } catch (err) {
            console.error('❌ Failed to record QR scan:', err);
          }

          if (user) addVisitedOffice(officeId);
          if (onScan) onScan(decodedText);

          onClose();
          navigate(`/office/${officeId}`);
        },
        () => {} // ignore non‑critical scan errors
      )
      .then(() => setScanning(true))
      .catch((err) => {
        console.error('Camera start error:', err);
        scannerRef.current = null;
        setScanning(false);
        onClose(); // isara kung hindi makapagsimula
      });

    // cleanup kapag nag‑unmount o nag‑close habang nag‑scan
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
        setScanning(false);
      }
    };
  }, [open]); // dumedepende lang sa open

  // ── manual close (X button, Cancel) ──────────────────
  const handleClose = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
      setScanning(false);
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm p-6 relative">
        <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400">
          ✕
        </button>
        <h3 className="text-lg font-semibold mb-2">Scan QR Code</h3>
        <p className="text-sm text-gray-500 mb-4">Point camera at the office QR code</p>
        <div id="qr-reader" style={{ width: '100%' }} />
        <button
          onClick={handleClose}
          className="mt-4 w-full border border-gray-200 text-gray-600 py-3 rounded-xl text-sm font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}