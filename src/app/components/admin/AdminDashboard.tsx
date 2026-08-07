import { useNavigate } from 'react-router';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import {
  Users, Briefcase, Building2, QrCode, TrendingUp, ChevronRight, Activity,
} from 'lucide-react';
import { useOffices } from '../../../hooks/useOffices';
import { useNotifications } from '../../../hooks/useNotifications';
import { Notification } from '../../../services/notificationService';
import { useState, useEffect, useMemo, memo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase';

const deepEqual = (a: any, b: any): boolean => {
  if (a === b) return true;
  return JSON.stringify(a) === JSON.stringify(b);
};

const ServicesBarChart = memo(
  ({ data }: { data: any[] }) => (
    <div style={{ width: '100%', height: 250 }}>
      {data.length > 0 ? (
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }} />
            <Bar dataKey="count" fill="#F97316" radius={[6, 6, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-xs text-gray-400 py-8 text-center">No offices yet</p>
      )}
    </div>
  ),
  (prev, next) => deepEqual(prev.data, next.data)
);

const ServicePieChart = memo(
  ({ data }: { data: any[] }) => {
    const COLORS = ['#F97316', '#1D4ED8', '#059669', '#DC2626', '#7C3AED'];
    return (
      <div>
        <div style={{ width: '100%', height: 250 }}>
          {data.length > 0 ? (
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="count"
                  nameKey="name"
                  isAnimationActive={false}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-gray-400 py-8 text-center">No offices yet</p>
          )}
        </div>
        <div className="mt-3 max-h-32 overflow-y-auto">
          <div className="grid grid-cols-2 gap-1.5">
            {data.map((item, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.fill }} />
                <p className="text-[11px] text-gray-600 truncate">{item.name}</p>
                <p className="text-[11px] font-semibold text-gray-800 ml-auto">{item.count}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  },
  (prev, next) => deepEqual(prev.data, next.data)
);

const VisitsBarChart = memo(
  ({ data }: { data: any[] }) => (
    <div style={{ width: '100%', height: 250 }}>
      {data.length > 0 ? (
        <ResponsiveContainer>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
            <XAxis type="number" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#374151' }} axisLine={false} tickLine={false} width={80} />
            <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }} />
            <Bar dataKey="visits" fill="#1D4ED8" radius={[0, 6, 6, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-xs text-gray-400 py-8 text-center">No offices yet</p>
      )}
    </div>
  ),
  (prev, next) => deepEqual(prev.data, next.data)
);

const StatCard = memo(
  ({
    icon: Icon,
    label,
    value,
    change,
    color,
  }: {
    icon: React.ElementType;
    label: string;
    value: string | number;
    change: string;
    color: string;
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
  )
);

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { offices, loading: officesLoading } = useOffices();
  const { notifications } = useNotifications();

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

  const allOfficesData = useMemo(
    () =>
      offices.map((o) => ({
        name: o.shortName,
        count: o.services.length,
        fill: o.iconBg || '#F97316',
      })),
    [offices]
  );

  const allOfficesVisits = useMemo(
    () =>
      offices.map((o) => ({
        name: o.shortName,
        visits: 0,
      })),
    [offices]
  );

  if (officesLoading || statsLoading) {
    return (
      <div className="p-8 text-center text-gray-400">
        <Activity size={32} className="mx-auto mb-3 animate-pulse" />
        <p>Loading dashboard…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Registered Users" value={totalUsers} change="real‑time" color="bg-orange-500" />
        <StatCard icon={Briefcase} label="Services" value={totalServices} change="real‑time" color="bg-blue-600" />
        <StatCard icon={Building2} label="Offices" value={totalOffices} change="real‑time" color="bg-green-600" />
        <StatCard icon={QrCode} label="QR Scans" value={totalQRScans} change="real‑time" color="bg-purple-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
          <ServicesBarChart data={allOfficesData} />
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-800">Service Distribution</h3>
            <p className="text-xs text-gray-400">All offices</p>
          </div>
          <ServicePieChart data={allOfficesData} />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Office Visits (Simulated)</h3>
            <p className="text-xs text-gray-400">Placeholder data</p>
          </div>
        </div>
        <VisitsBarChart data={allOfficesVisits} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-800">Recent Notifications</h3>
          <button onClick={() => navigate('/admin/notifications')} className="text-xs text-orange-500 font-medium">
            View all
          </button>
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