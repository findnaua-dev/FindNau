import { useNavigate } from 'react-router';
import { ArrowLeft, User, Mail, MapPin, Bell, Globe, ChevronRight, LogOut, Shield, History } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import UserScreenLayout from './UserScreenLayout';
import { useApp } from '../context/AppContext';
import { useOffices } from '../../hooks/useOffices';

export default function UserProfileScreen() {
  const navigate = useNavigate();
  const { user, setUser, t, lang, setLang, visitedOffices } = useApp();
  const { offices } = useOffices();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      navigate('/');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // ✅ Dynamic recently visited – from Firestore
  const recentOffices = visitedOffices
    .map(id => offices.find(o => o.id === id))
    .filter(Boolean) as typeof offices;

  const menuItems = [
    {
      icon: Bell,
      label: t('Notifications', 'Mga Abiso'),
      action: () => navigate('/notifications'),
      value: '',
    },
    {
      icon: Globe,
      label: t('Language', 'Wika'),
      action: () => setLang(lang === 'en' ? 'fil' : 'en'),
      value: lang === 'en' ? 'English' : 'Filipino',
    },
    {
      icon: MapPin,
      label: t('Map Navigation', 'Map Navigation'),
      action: () => navigate('/map'),
      value: '',
    },
    {
      icon: Shield,
      label: t('Privacy & Security', 'Seguridad'),
      action: () => {},
      value: '',
    },
  ];

  return (
    <UserScreenLayout>
      <div className="bg-white px-4 pt-5 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-600">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-base font-semibold text-gray-800">{t('My Profile', 'Aking Profile')}</h1>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Profile card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-orange-500 flex items-center justify-center text-white text-2xl font-bold shadow-md shadow-orange-100 mb-4">
              {user?.name?.charAt(0).toUpperCase() || 'G'}
            </div>
            <h2 className="text-lg font-semibold text-gray-800">{user?.name || 'Guest'}</h2>
            {user?.email && (
              <p className="text-sm text-gray-400 mt-0.5">{user.email}</p>
            )}
            <div className="flex items-center gap-1.5 mt-2">
              <div className={`w-2 h-2 rounded-full ${user?.role === 'guest' ? 'bg-gray-400' : 'bg-green-400'}`} />
              <span className="text-xs text-gray-500 capitalize">
                {user?.role === 'guest'
                  ? t('Guest User', 'Bisita')
                  : user?.role === 'admin'
                  ? 'Administrator'
                  : t('Registered User', 'Rehistradong User')}
              </span>
            </div>
          </div>

          {user?.role === 'guest' && (
            <button
              onClick={() => navigate('/')}
              className="mt-4 w-full bg-orange-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors"
            >
              {t('Create Account / Sign In', 'Gumawa ng Account / Mag-Sign In')}
            </button>
          )}
        </div>

        {/* Profile info */}
        {user?.role !== 'guest' && (
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
            <div className="flex items-center gap-3 p-4">
              <User size={16} className="text-gray-400" />
              <div>
                <p className="text-xs text-gray-400">{t('Full Name', 'Buong Pangalan')}</p>
                <p className="text-sm font-medium text-gray-800">{user?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4">
              <Mail size={16} className="text-gray-400" />
              <div>
                <p className="text-xs text-gray-400">{t('Email Address', 'Email Address')}</p>
                <p className="text-sm font-medium text-gray-800">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4">
              <MapPin size={16} className="text-gray-400" />
              <div>
                <p className="text-xs text-gray-400">{t('Location', 'Lokasyon')}</p>
                <p className="text-sm font-medium text-gray-800">Naujan, Oriental Mindoro</p>
              </div>
            </div>
          </div>
        )}

        {/* Recently visited */}
        {recentOffices.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <History size={14} className="text-gray-400" />
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('Recently Visited', 'Kamakailan Binisita')}</p>
            </div>
            <div className="space-y-2">
              {recentOffices.slice(0, 3).map(office => (
                <button
                  key={office.id}
                  onClick={() => navigate(`/office/${office.id}`)}
                  className="w-full flex items-center gap-3 bg-white rounded-xl border border-gray-100 p-3 text-left hover:border-orange-200 transition-all"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: office.iconBg }}>
                    {office.shortName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{lang === 'en' ? office.name : office.nameFilipino}</p>
                    <p className="text-[11px] text-gray-400">{office.floor}</p>
                  </div>
                  <ChevronRight size={14} className="text-gray-300" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Settings */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{t('Settings', 'Mga Setting')}</p>
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
            {menuItems.map((item, i) => {
              const Icon = item.icon;
              return (
                <button
                  key={i}
                  onClick={item.action}
                  className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon size={15} className="text-gray-500" />
                  </div>
                  <p className="flex-1 text-sm text-gray-700">{item.label}</p>
                  {item.value && <span className="text-xs text-gray-400">{item.value}</span>}
                  <ChevronRight size={14} className="text-gray-300" />
                </button>
              );
            })}
          </div>
        </div>

        {/* App info */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center mx-auto mb-2">
            <MapPin size={18} className="text-white" />
          </div>
          <p className="text-sm font-semibold text-gray-800">FindNau</p>
          <p className="text-xs text-gray-400">Version 1.0.0 · Naujan, Oriental Mindoro</p>
          <p className="text-xs text-gray-300 mt-1">© 2026 Municipality of Naujan</p>
        </div>

        {/* ✅ Sign Out button – visible on both mobile and desktop */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3.5 border border-red-200 text-red-500 rounded-xl text-sm font-semibold hover:bg-red-50 transition-colors"
        >
          <LogOut size={16} />
          {t('Sign Out', 'Mag-Sign Out')}
        </button>
      </div>
    </UserScreenLayout>
  );
}