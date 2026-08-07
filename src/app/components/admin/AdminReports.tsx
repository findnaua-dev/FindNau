import { useState, useEffect, useMemo, memo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import {
  Download, Printer, Users, Briefcase, Building2, TrendingUp, FileText, Calendar,
} from 'lucide-react';
import { useOffices } from '../../../hooks/useOffices';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase';

const cleanFee = (fee: string | undefined): string => {
  if (!fee) return 'Free';
  return fee.replace(/[₱竄ｱ]/g, 'PHP ').replace(/\s+/g, ' ').trim();
};

const ServicesBarChart = memo(({ data }: { data: any[] }) => (
  <div style={{ width: '100%', height: 200 }}>
    <ResponsiveContainer>
      <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }} />
        <Bar dataKey="count" fill="#F97316" radius={[6, 6, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  </div>
));

const UsersBarChart = memo(({ data }: { data: any[] }) => (
  <div style={{ width: '100%', height: 200 }}>
    <ResponsiveContainer>
      <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }} />
        <Bar dataKey="visits" fill="#1D4ED8" radius={[6, 6, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  </div>
));

export default function AdminReports() {
  const { offices, loading: officesLoading } = useOffices();
  const [activeReport, setActiveReport] = useState<'users' | 'services' | 'offices'>('services');
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalQRScans, setTotalQRScans] = useState(0);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        setTotalUsers(usersSnap.size);
        const scansSnap = await getDocs(collection(db, 'qrScans'));
        setTotalQRScans(scansSnap.size);
      } catch (err) {
        console.warn('Stats fetch failed:', err);
      } finally {
        setStatsLoading(false);
      }
    };
    fetchStats();
  }, []);

  const totalOffices = offices.length;
  const totalServices = offices.reduce((sum, o) => sum + o.services.length, 0);

  const servicesPerOffice = useMemo(() => {
    return offices.map(o => ({
      name: o.shortName,
      count: o.services.length,
      fill: o.iconBg || '#F97316',
    }));
  }, [offices]);

  const allServicesFlat = useMemo(() => {
    return offices.flatMap(o =>
      o.services.map(s => ({
        ...s,
        officeName: o.name,
        officeShort: o.shortName,
        officeColor: o.iconBg,
        feeCleaned: cleanFee(s.fee),
      }))
    );
  }, [offices]);

  const monthlyUserData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map(m => ({ name: m, visits: 0 }));
  }, []);

  const reportTabs = [
    { key: 'users', label: 'Users', icon: Users },
    { key: 'services', label: 'Services', icon: Briefcase },
    { key: 'offices', label: 'Offices', icon: Building2 },
  ] as const;

  const printReport = () => window.print();

  const exportToCSV = () => {
    const headers = ['Service Name', 'Office', 'Fee', 'Processing Time'];
    const rows = allServicesFlat.map(s => [s.name, s.officeShort, s.feeCleaned, s.processingTime || 'N/A']);
    const csv = '\uFEFF' + [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'services_report.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToWord = () => {
    const tableRows = allServicesFlat.map(s => `
      <tr>
        <td>${s.name}</td>
        <td>${s.officeShort}</td>
        <td>${s.feeCleaned}</td>
        <td>${s.processingTime || 'N/A'}</td>
      </tr>
    `).join('');
    const html = `
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
            th { background-color: #f3f4f6; font-weight: 600; }
            h1 { font-size: 18px; margin-bottom: 0; }
            .meta { font-size: 12px; color: #666; margin-top: 0; }
          </style>
        </head>
        <body>
          <h1>Services Report</h1>
          <p class="meta">Generated: ${new Date().toLocaleString()}</p>
          <table>
            <thead><tr><th>Service</th><th>Office</th><th>Fee</th><th>Time</th></tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body>
      </html>
    `;
    const blob = new Blob([html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'services_report.doc';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (officesLoading || statsLoading) {
    return (
      <div className="p-8 text-center text-gray-400">
        <p>Loading reports…</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-5xl" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Reports & Analytics</h2>
          <p className="text-sm text-gray-400">Detailed usage statistics and reports</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={printReport} className="flex items-center gap-2 border border-gray-200 text-gray-600 px-3.5 py-2 rounded-xl text-sm font-medium hover:bg-gray-50">
            <Printer size={15} /> Print
          </button>
          <button onClick={exportToCSV} className="flex items-center gap-2 border border-gray-200 text-gray-600 px-3.5 py-2 rounded-xl text-sm font-medium hover:bg-gray-50">
            <Download size={15} /> Excel
          </button>
          <button onClick={exportToWord} className="flex items-center gap-2 bg-orange-500 text-white px-3.5 py-2 rounded-xl text-sm font-semibold hover:bg-orange-600">
            <Download size={15} /> Word
          </button>
        </div>
      </div>

      <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <FileText size={18} className="text-orange-500 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-gray-800">FindNau Platform Report</p>
            <p className="text-xs text-gray-500 mt-0.5">Municipality of Naujan, Oriental Mindoro</p>
            <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
              <Calendar size={11} />
              Generated: {new Date().toLocaleDateString()} · {new Date().toLocaleTimeString()}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Registered Users', value: totalUsers, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'QR Code Scans', value: totalQRScans, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Active Offices', value: totalOffices, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Total Services', value: totalServices, color: 'text-orange-600', bg: 'bg-orange-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-2xl font-bold text-gray-800">{stat.value.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-0.5">{stat.label}</p>
            <div className={`inline-flex items-center gap-1 mt-2 text-xs font-semibold px-2 py-0.5 rounded-full ${stat.color} ${stat.bg}`}>
              <TrendingUp size={10} />
              real‑time
            </div>
          </div>
        ))}
      </div>

      <div className="flex bg-gray-100 rounded-xl p-1 print:hidden">
        {reportTabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveReport(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-lg transition-all ${
                activeReport === tab.key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeReport === 'services' && (
        <div className="space-y-4 print:space-y-2">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 print:shadow-none print:border-none">
            <h3 className="text-sm font-semibold text-gray-800 mb-1">Services per Office</h3>
            <p className="text-xs text-gray-400 mb-4">Total: {totalServices} services across {totalOffices} offices</p>
            <ServicesBarChart data={servicesPerOffice} />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden print:shadow-none print:border-none">
            <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between print:hidden">
              <h3 className="text-sm font-semibold text-gray-800">All Services Detail</h3>
              <div className="flex gap-2">
                <button onClick={exportToCSV} className="text-xs text-orange-500 font-medium flex items-center gap-1">
                  <Download size={12} /> Excel
                </button>
                <button onClick={exportToWord} className="text-xs text-orange-500 font-medium flex items-center gap-1">
                  <Download size={12} /> Word
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">#</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Service Name</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Office</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fee</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {allServicesFlat.map((service, i) => (
                    <tr key={service.id || i} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: service.officeColor }} />
                          <p className="text-sm font-medium text-gray-800">{service.name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">{service.officeShort}</td>
                      <td className="px-4 py-3 text-xs font-medium text-gray-700">{service.feeCleaned}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{service.processingTime || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeReport === 'users' && (
        <div className="space-y-4 print:space-y-2">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 print:shadow-none print:border-none">
            <h3 className="text-sm font-semibold text-gray-800 mb-1">Monthly User Growth (Placeholder)</h3>
            <p className="text-xs text-gray-400 mb-4">Real analytics integration needed</p>
            <UsersBarChart data={monthlyUserData} />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden print:shadow-none print:border-none">
            <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between print:hidden">
              <h3 className="text-sm font-semibold text-gray-800">User Statistics</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Month</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Visits</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">New Users</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Growth</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyUserData.map((item, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-700">{item.name} 2026</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-800">0</td>
                      <td className="px-4 py-3 text-sm text-gray-600">0</td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-green-500 font-medium bg-green-50 px-2 py-0.5 rounded-full">—</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeReport === 'offices' && (
        <div className="space-y-4 print:space-y-2">
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden print:shadow-none print:border-none">
            <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between print:hidden">
              <h3 className="text-sm font-semibold text-gray-800">Office Performance Report</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Office</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Services</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Visits</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">VR Tour</th>
                  </tr>
                </thead>
                <tbody>
                  {offices.map((office) => (
                    <tr key={office.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0" style={{ backgroundColor: office.iconBg }}>
                            {office.shortName?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-800">{office.name}</p>
                            <p className="text-[11px] text-gray-400">{office.floor || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-700">{office.services.length}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">0</td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          office.vrTour ? 'text-green-600 bg-green-50' : 'text-gray-400 bg-gray-50'
                        }`}>
                          {office.vrTour ? '✓ Available' : '— N/A'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}