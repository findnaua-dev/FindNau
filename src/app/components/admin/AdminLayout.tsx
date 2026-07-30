import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router';
import {
  LayoutDashboard, Briefcase, Map, QrCode, BarChart3, Users,
  Menu, Bell, LogOut, Shield, Megaphone, MessageCircleQuestion,
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../../../firebase';
import { useApp } from '../../context/AppContext';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
  { icon: Briefcase, label: 'Offices & Services', path: '/admin/offices' },
  { icon: Megaphone, label: 'Announcements', path: '/admin/announcements' },
  { icon: MessageCircleQuestion, label: 'FAQs', path: '/admin/faqs' },
  { icon: Map, label: 'Map & Virtual Tour', path: '/admin/map' },
  { icon: QrCode, label: 'QR Code Manager', path: '/admin/qr' },
  { icon: BarChart3, label: 'Reports', path: '/admin/reports' },
];

function SidebarContent({
  user,
  location,
  onNavigate,
  onLogout,
  onClose,
}: {
  user: any;
  location: any;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col h-full bg-white">
      {/* Brand with real logo */}
      <div className="px-5 py-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
            <img
              src="/logo.jpg"
              alt="FindNau Logo"
              className="w-full h-full object-cover rounded-xl"
            />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800">FindNau Admin</p>
            <p className="text-[10px] text-gray-400">Municipal Building of Naujan</p>
          </div>
        </div>
      </div>

      {/* Admin info */}
      <div className="px-4 py-3 mx-3 mt-3 bg-orange-50 rounded-xl border border-orange-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center">
            <Shield size={13} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-700 truncate">{user?.name}</p>
            <p className="text-[10px] text-orange-600">System Administrator</p>
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest px-3 mb-2">Management</p>
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          return (
            <button
              key={item.path}
              onClick={() => {
                onNavigate(item.path);
                onClose();
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-orange-500 text-white shadow-sm shadow-orange-200'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              aria-label={item.label}
              title={item.label}
            >
              <Icon size={17} strokeWidth={isActive ? 2.5 : 2} />
              <span className="flex-1 text-left">{item.label}</span>
              {isActive && <div className="w-1.5 h-1.5 bg-white/60 rounded-full" />}
            </button>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="px-3 pb-4 space-y-1 border-t border-gray-100 pt-3">
        <button
          onClick={() => {
            onNavigate('/home');
            onClose();
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all"
          aria-label="User View"
          title="User View"
        >
          <Users size={17} />
          <span>User View</span>
        </button>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all"
          aria-label="Sign Out"
          title="Sign Out"
        >
          <LogOut size={17} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setUser } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      navigate('/');
    } catch (err) {
      console.error('Admin logout error:', err);
    }
  };

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-auto" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-100 flex-shrink-0 relative z-20">
        <SidebarContent
          user={user}
          location={location}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
          onClose={() => setSidebarOpen(false)}
        />
      </aside>
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-72 bg-white shadow-xl flex flex-col z-10">
            <SidebarContent
              user={user}
              location={location}
              onNavigate={handleNavigate}
              onLogout={handleLogout}
              onClose={() => setSidebarOpen(false)}
            />
          </aside>
        </div>
      )}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-100 px-4 lg:px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-600"
              aria-label="Open sidebar menu"
              title="Open sidebar menu"
            >
              <Menu size={18} />
            </button>
            <div className="hidden lg:block">
              {navItems.map(item =>
                location.pathname.startsWith(item.path) ? (
                  <div key={item.path}>
                    <h1 className="text-base font-semibold text-gray-800">{item.label}</h1>
                    <p className="text-xs text-gray-400">FindNau Admin Panel</p>
                  </div>
                ) : null
              )}
            </div>
            <div className="lg:hidden">
              <p className="text-sm font-bold text-gray-800">FindNau Admin</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleNavigate('/admin/notifications')}
              className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-600 relative hover:bg-gray-100"
              aria-label="Notifications"
              title="Notifications"
            >
              <Bell size={17} />
              <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full" />
            </button>
            <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center text-white text-sm font-bold">
              {user?.name?.charAt(0) || 'A'}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}