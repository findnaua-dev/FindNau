import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Download, Printer, Users, Briefcase, Building2, TrendingUp, FileText, Calendar } from 'lucide-react';
import { ADMIN_STATS, OFFICES } from '../../data/mockData';

export default function AdminReports() {
  const [activeReport, setActiveReport] = useState<'users' | 'services' | 'offices'>('services');

  const printReport = () => {
    window.print();
  };

  const reportTabs = [
    { key: 'users', label: 'Users', icon: Users },
    { key: 'services', label: 'Services', icon: Briefcase },
    { key: 'offices', label: 'Offices', icon: Building2 },
  ] as const;

  return (
    <div className="space-y-5 max-w-5xl" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Reports & Analytics</h2>
          <p className="text-sm text-gray-400">Detailed usage statistics and reports</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={printReport}
            className="flex items-center gap-2 border border-gray-200 text-gray-600 px-3.5 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Printer size={15} />
            Print
          </button>
          <button className="flex items-center gap-2 bg-orange-500 text-white px-3.5 py-2 rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors">
            <Download size={15} />
            Export
          </button>
        </div>
      </div>

      {/* Report header */}
      <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <FileText size={18} className="text-orange-500 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-gray-800">FindNau Platform Report</p>
            <p className="text-xs text-gray-500 mt-0.5">Municipality of Naujan, Oriental Mindoro</p>
            <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
              <Calendar size={11} />
              Generated: June 1, 2026 · 8:00 AM
            </p>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Registered Users', value: ADMIN_STATS.totalUsers, change: '+12%', color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'QR Code Scans', value: ADMIN_STATS.totalQRScans, change: '+28%', color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Active Offices', value: ADMIN_STATS.totalOffices, change: '+0', color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Total Services', value: ADMIN_STATS.totalServices, change: '+2', color: 'text-orange-600', bg: 'bg-orange-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-2xl font-bold text-gray-800">{stat.value.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-0.5">{stat.label}</p>
            <div className={`inline-flex items-center gap-1 mt-2 text-xs font-semibold px-2 py-0.5 rounded-full ${stat.color} ${stat.bg}`}>
              <TrendingUp size={10} />
              {stat.change}
            </div>
          </div>
        ))}
      </div>

      {/* Report tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1">
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

      {/* Services report */}
      {activeReport === 'services' && (
        <div className="space-y-4">
          {/* Chart */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-1">Service Requests by Type</h3>
            <p className="text-xs text-gray-400 mb-4">Total: {ADMIN_STATS.serviceRequests.reduce((s, i) => s + i.count, 0).toLocaleString()} requests this month</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={ADMIN_STATS.serviceRequests} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }} />
                <Bar dataKey="count" fill="#F97316" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">Service Request Details</h3>
              <button className="text-xs text-orange-500 font-medium flex items-center gap-1">
                <Printer size={12} />
                Print
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">#</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Service</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Requests</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Share</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {ADMIN_STATS.serviceRequests.map((item, i) => {
                    const total = ADMIN_STATS.serviceRequests.reduce((s, x) => s + x.count, 0);
                    const share = ((item.count / total) * 100).toFixed(1);
                    return (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                            <p className="text-sm font-medium text-gray-800">{item.name}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-700">{item.count.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full max-w-[60px]">
                              <div className="h-full rounded-full" style={{ width: `${share}%`, backgroundColor: item.fill }} />
                            </div>
                            <span className="text-xs text-gray-500">{share}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-green-500 font-medium bg-green-50 px-2 py-0.5 rounded-full">↑ +5%</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Users report */}
      {activeReport === 'users' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-1">Monthly User Growth</h3>
            <p className="text-xs text-gray-400 mb-4">Registered users over time</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={ADMIN_STATS.monthlyVisits} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }} />
                <Bar dataKey="visits" fill="#1D4ED8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">User Statistics</h3>
              <button className="text-xs text-orange-500 font-medium flex items-center gap-1"><Printer size={12} />Print</button>
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
                  {ADMIN_STATS.monthlyVisits.map((item, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-700">{item.month} 2026</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-800">{item.visits.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{Math.floor(item.visits * 0.18)}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-green-500 font-medium bg-green-50 px-2 py-0.5 rounded-full">
                          {i === 0 ? '—' : `↑ ${Math.round(((item.visits - ADMIN_STATS.monthlyVisits[i-1].visits) / ADMIN_STATS.monthlyVisits[i-1].visits) * 100)}%`}
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

      {/* Offices report */}
      {activeReport === 'offices' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">Office Performance Report</h3>
              <button className="text-xs text-orange-500 font-medium flex items-center gap-1"><Printer size={12} />Print</button>
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
                  {OFFICES.map((office, i) => {
                    const visits = ADMIN_STATS.officeVisits.find(v => v.name === office.shortName)?.visits || Math.floor(Math.random() * 200 + 100);
                    return (
                      <tr key={office.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0" style={{ backgroundColor: office.iconBg }}>
                              {office.shortName.charAt(0)}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-800">{office.name}</p>
                              <p className="text-[11px] text-gray-400">{office.floor}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-700">{office.services.length}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{visits.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            office.vrTour ? 'text-green-600 bg-green-50' : 'text-gray-400 bg-gray-50'
                          }`}>
                            {office.vrTour ? '✓ Available' : '— N/A'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
