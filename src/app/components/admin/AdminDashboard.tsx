import { useNavigate } from 'react-router';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import {
  Users, Briefcase, Building2, QrCode, TrendingUp, ChevronRight, Activity,
} from 'lucide-react';
import { useOffices } from '../../../hooks/useOffices';
import { useNotifications } from '../../../hooks/useNotifications';
import { Notification } from '../../../services/notificationService';
import { useState, useRef, useEffect } from 'react';

// 📏 Safe width hook – prevents freeze
function useContainerWidth(ref: React.RefObject<HTMLDivElement | null>) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const update = () => { if (el) setWidth(el.getBoundingClientRect().width); };
    update();
    const observer = new ResizeObserver(() => update());
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

const StatCard = ({ icon: Icon, label, value, change, color }: {
  icon: React.ElementType; label: string; value: string | number; change: string; color: string;
}) => (
  <div className="bg-white rounded-2xl border border-gray-100 p-4">
    <div className="flex items-start justify-between mb-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={18} className="text-white" />
      </div>
      <span className="text-xs text-green-500 font-semibold bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-0.5">
        <TrendingUp size={10} />
        {change}
      </span>
    </div>
    <p className="text-2xl font-bold text-gray-800">{value.toLocaleString()}</p>
    <p className="text-xs text-gray-400 mt-0.5">{label}</p>
  </div>
);

const COLORS = ['#F97316', '#1D4ED8', '#059669', '#DC2626', '#7C3AED'];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { offices, loading: officesLoading } = useOffices();
  const { notifications } = useNotifications();

  // Refs for chart containers
  const barChartRef = useRef<HTMLDivElement | null>(null);
  const pieChartRef = useRef<HTMLDivElement | null>(null);
  const horizontalBarRef = useRef<HTMLDivElement | null>(null);

  const barWidth = useContainerWidth(barChartRef);
  const pieWidth = useContainerWidth(pieChartRef);
  const horizontalBarWidth = useContainerWidth(horizontalBarRef);
  const CHART_HEIGHT = 250;

  // Dynamic stats from Firestore
  const totalOffices = offices.length;
  const totalServices = offices.reduce((sum, o) => sum + o.services.length, 0);

  // Chart data from offices
  const serviceRequestsData = offices.map(o => ({
    name: o.shortName,
    count: o.services.length,
    fill: o.iconBg,
  }));
  const officeVisitsData = offices.map(o => ({
    name: o.shortName,
    visits: Math.floor(Math.random() * 300 + 100), // placeholder – you can replace with real visit data later
  }));

  // Show loading while offices are being fetched
  if (officesLoading) {
    return (
      <div className="p-8 text-center text-gray-400">
        <Activity size={32} className="mx-auto mb-3 animate-pulse" />
        <p>Loading dashboard…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-5 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold">Welcome back, Administrator</h2>
            <p className="text-orange-100 text-sm mt-0.5">FindNau Admin Dashboard · Municipality of Naujan</p>
            <p className="text-orange-100 text-xs mt-1">{new Date().toDateString()}</p>
          </div>
          <div className="bg-white/20 rounded-xl p-2.5">
            <Activity size={22} className="text-white" />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse" />
          <span className="text-orange-100 text-xs">All systems operational</span>
        </div>
      </div>

      {/* Stats Cards – fully dynamic */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Total Users" value={0} change="N/A" color="bg-orange-500" />
        <StatCard icon={Briefcase} label="Services" value={totalServices} change="real‑time" color="bg-blue-600" />
        <StatCard icon={Building2} label="Offices" value={totalOffices} change="real‑time" color="bg-green-600" />
        <StatCard icon={QrCode} label="QR Scans" value={0} change="N/A" color="bg-purple-600" />
      </div>

      {/* Charts Row – safe, no freeze */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bar Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Services per Office</h3>
              <p className="text-xs text-gray-400">Real‑time data</p>
            </div>
            <span className="text-xs text-green-500 font-semibold bg-green-50 px-2 py-0.5 rounded-full">
              {totalServices} total
            </span>
          </div>
          <div ref={barChartRef} style={{ minHeight: CHART_HEIGHT }}>
            {barWidth > 0 && (
              <BarChart width={barWidth} height={CHART_HEIGHT} data={serviceRequestsData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }} />
                <Bar dataKey="count" fill="#F97316" radius={[6, 6, 0, 0]} />
              </BarChart>
            )}
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-800">Service Distribution</h3>
            <p className="text-xs text-gray-400">By office</p>
          </div>
          <div ref={pieChartRef} style={{ minHeight: CHART_HEIGHT }}>
            {pieWidth > 0 && (
              <PieChart width={pieWidth} height={CHART_HEIGHT}>
                <Pie data={serviceRequestsData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="count" nameKey="name">
                  {serviceRequestsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }} />
              </PieChart>
            )}
          </div>
          <div className="grid grid-cols-2 gap-1.5 mt-2">
            {serviceRequestsData.map((item, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.fill }} />
                <p className="text-[11px] text-gray-500 truncate">{item.name}</p>
                <p className="text-[11px] font-semibold text-gray-700 ml-auto">{item.count}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Horizontal Bar Chart */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Office Visits (Simulated)</h3>
            <p className="text-xs text-gray-400">Placeholder data</p>
          </div>
        </div>
        <div ref={horizontalBarRef} style={{ minHeight: CHART_HEIGHT }}>
          {horizontalBarWidth > 0 && (
            <BarChart width={horizontalBarWidth} height={CHART_HEIGHT} data={officeVisitsData} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
              <XAxis type="number" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#374151' }} axisLine={false} tickLine={false} width={80} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }} />
              <Bar dataKey="visits" fill="#1D4ED8" radius={[0, 6, 6, 0]} />
            </BarChart>
          )}
        </div>
      </div>

      {/* Recent Notifications – dynamic */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-800">Recent Notifications</h3>
          <button onClick={() => navigate('/admin/notifications')} className="text-xs text-orange-500 font-medium">View all</button>
        </div>
        <div className="space-y-3">
          {notifications.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">No notifications yet</p>
          ) : (
            notifications.slice(0, 3).map((notif: Notification) => (
              <div key={notif.id} className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!notif.read ? 'bg-orange-500' : 'bg-gray-200'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800">{notif.title}</p>
                  <p className="text-[11px] text-gray-400 truncate">{notif.message}</p>
                  <p className="text-[10px] text-gray-300 mt-0.5">{notif.time}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Quick Actions</h3>
        <div className="space-y-2">
          {[
            { label: 'Manage Offices & Services', path: '/admin/offices', color: 'text-blue-600 bg-blue-50' },
            { label: 'Manage Announcements', path: '/admin/announcements', color: 'text-purple-600 bg-purple-50' },
            { label: 'View Reports', path: '/admin/reports', color: 'text-green-600 bg-green-50' },
            { label: 'Map & Tour Settings', path: '/admin/map', color: 'text-orange-600 bg-orange-50' },
          ].map((action, i) => (
            <button key={i} onClick={() => navigate(action.path)} className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-orange-200 hover:bg-orange-50 transition-all text-left group">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${action.color}`}>
                {i + 1}
              </div>
              <p className="flex-1 text-sm font-medium text-gray-700">{action.label}</p>
              <ChevronRight size={14} className="text-gray-300 group-hover:text-orange-400 transition-colors" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}