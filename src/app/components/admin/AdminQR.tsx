import { useState, useEffect, useCallback } from 'react';
import { QrCode, Download, Plus, Copy, Eye, Trash2, Check, RefreshCw } from 'lucide-react';
import { useOffices } from '../../../hooks/useOffices';
import QRCode from 'qrcode';

interface QREntry {
  officeId: string;
  officeName: string;
  shortName: string;
  qrDataUrl: string;        // base64 PNG ng QR
  scans: number;            // pwedeng i‑track sa Firestore later
  active: boolean;
}

export default function AdminQR() {
  const { offices, loading } = useOffices();
  const [qrCodes, setQrCodes] = useState<QREntry[]>([]);
  const [selectedOffice, setSelectedOffice] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState<string | null>(null);

  const baseUrl = 'https://findnau.naujan.gov.ph/office/';  // adjust kung iba

  // Generate QR data URI from office ID
  const generateQrDataUrl = useCallback(async (officeId: string) => {
    const url = `${baseUrl}${officeId}`;
    return await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' }
    });
  }, [baseUrl]);

  // I‑re‑build ang QR codes list tuwing mag‑bago ang offices
  useEffect(() => {
    if (loading || offices.length === 0) return;
    (async () => {
      const entries: QREntry[] = [];
      for (const office of offices) {
        if (!office.id) continue;
        try {
          const qrDataUrl = await generateQrDataUrl(office.id);
          entries.push({
            officeId: office.id,
            officeName: office.name,
            shortName: office.shortName,
            qrDataUrl,
            scans: Math.floor(Math.random() * 500 + 50), // placeholder
            active: true,
          });
        } catch (err) {
          console.error(err);
        }
      }
      setQrCodes(entries);
    })();
  }, [offices, loading, generateQrDataUrl]);

  const selectedQR = qrCodes.find(q => q.officeId === selectedOffice);
  const selectedOfficeData = offices.find(o => o.id === selectedOffice);
  const totalScans = qrCodes.reduce((s, q) => s + q.scans, 0);

  const handleCopy = (id: string) => {
    const url = `${baseUrl}${id}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleRegenerate = async (officeId: string) => {
    setRegenerating(officeId);
    const newQrDataUrl = await generateQrDataUrl(officeId);
    setQrCodes(prev => prev.map(q =>
      q.officeId === officeId ? { ...q, qrDataUrl: newQrDataUrl, scans: 0 } : q
    ));
    setRegenerating(null);
  };

  const handleToggleActive = (officeId: string) => {
    setQrCodes(prev => prev.map(q =>
      q.officeId === officeId ? { ...q, active: !q.active } : q
    ));
  };

  const handleGenerateAll = async () => {
    const newEntries = await Promise.all(
      offices.filter(o => o.id).map(async office => {
        const qrDataUrl = await generateQrDataUrl(office.id!);
        return {
          officeId: office.id!,
          officeName: office.name,
          shortName: office.shortName,
          qrDataUrl,
          scans: Math.floor(Math.random() * 500 + 50),
          active: true,
        };
      })
    );
    setQrCodes(newEntries);
  };

  const handleDownload = (qrDataUrl: string, shortName: string) => {
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QR_${shortName}.png`;
    a.click();
  };

  if (loading) return <div className="p-8 text-center text-gray-400">Loading offices…</div>;

  return (
    <div className="space-y-5 max-w-5xl" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-800">QR Code Manager</h2>
          <p className="text-sm text-gray-400">Generate and manage QR codes for each office</p>
        </div>
        <button
          onClick={handleGenerateAll}
          className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors"
        >
          <Plus size={15} />
          Generate All
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-gray-800">{qrCodes.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">Total QR Codes</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-orange-500">{totalScans.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-0.5">Total Scans</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-green-500">{qrCodes.filter(q => q.active).length}</p>
          <p className="text-xs text-gray-400 mt-0.5">Active Codes</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* QR Code list */}
        <div className="space-y-2.5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Office QR Codes</p>
          {qrCodes.map(qr => {
            const office = offices.find(o => o.id === qr.officeId);
            if (!office) return null;
            return (
              <div
                key={qr.officeId}
                onClick={() => setSelectedOffice(qr.officeId)}
                className={`bg-white rounded-2xl border p-4 cursor-pointer transition-all ${
                  selectedOffice === qr.officeId ? 'border-orange-300 shadow-sm' : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-gray-50 rounded-xl border border-gray-100">
                    <img src={qr.qrDataUrl} alt="QR" className="w-10 h-10 object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-800 truncate">{qr.officeName}</p>
                      <div
                        onClick={e => { e.stopPropagation(); handleToggleActive(qr.officeId); }}
                        className={`flex-shrink-0 w-9 h-5 rounded-full flex items-center px-0.5 cursor-pointer transition-all ${qr.active ? 'bg-green-500 justify-end' : 'bg-gray-300 justify-start'}`}
                      >
                        <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{qr.shortName} · {qr.scans} scans</p>
                  </div>
                </div>

                {selectedOffice === qr.officeId && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
                    <button
                      onClick={e => { e.stopPropagation(); handleCopy(qr.officeId); }}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 bg-gray-50 border border-gray-100 rounded-xl text-gray-600 hover:bg-blue-50 hover:border-blue-100 hover:text-blue-600 transition-all"
                    >
                      {copied === qr.officeId ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                      {copied === qr.officeId ? 'Copied!' : 'Copy Link'}
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); handleRegenerate(qr.officeId); }}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 bg-gray-50 border border-gray-100 rounded-xl text-gray-600 hover:bg-orange-50 hover:border-orange-100 hover:text-orange-600 transition-all"
                    >
                      <RefreshCw size={12} className={regenerating === qr.officeId ? 'animate-spin' : ''} />
                      Regenerate
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); handleDownload(qr.qrDataUrl, qr.shortName); }}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 bg-orange-50 border border-orange-100 rounded-xl text-orange-600 hover:bg-orange-100 transition-all"
                    >
                      <Download size={12} />
                      Download
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* QR Preview (katulad ng dati pero gumagamit ng tunay na image) */}
        <div className="space-y-4">
          {selectedOfficeData && selectedQR ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex flex-col items-center">
                <img src={selectedQR.qrDataUrl} alt="QR Preview" className="w-48 h-48 object-contain mb-4" />
                <div className="text-center mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm mx-auto mb-2" style={{ backgroundColor: selectedOfficeData.iconBg }}>
                    {selectedOfficeData.shortName.charAt(0)}
                  </div>
                  <p className="text-sm font-semibold text-gray-800">{selectedOfficeData.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{selectedOfficeData.floor}</p>
                </div>

                <div className="w-full space-y-2">
                  <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">QR Code URL</p>
                    <p className="text-xs text-gray-600 font-mono break-all">{baseUrl}{selectedOfficeData.id}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                      <p className="text-[10px] text-gray-400">Total Scans</p>
                      <p className="text-sm font-bold text-gray-800">{selectedQR.scans.toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                      <p className="text-[10px] text-gray-400">Status</p>
                      <p className={`text-sm font-bold ${selectedQR.active ? 'text-green-500' : 'text-red-400'}`}>
                        {selectedQR.active ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleDownload(selectedQR.qrDataUrl, selectedOfficeData.shortName)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-orange-500 text-white py-2.5 rounded-xl text-xs font-semibold hover:bg-orange-600 transition-colors"
                >
                  <Download size={13} />
                  Download PNG
                </button>
                <button className="flex-1 flex items-center justify-center gap-1.5 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-xs font-medium hover:bg-gray-50 transition-colors">
                  <Eye size={13} />
                  Preview
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 flex flex-col items-center justify-center py-20 text-center px-6">
              <QrCode size={48} className="text-gray-200 mb-4" />
              <p className="text-sm font-medium text-gray-400">Select an office</p>
              <p className="text-xs text-gray-300 mt-1">to preview and manage its QR code</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}