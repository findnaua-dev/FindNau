import { useNavigate, useLocation } from 'react-router';
import { Home, Briefcase, Map, HelpCircle, LogOut } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { useApp } from '../context/AppContext';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { lang, setLang, t, setUser } = useApp();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const tabs = [
    { label: t('Home', 'Tahanan'), labelShort: t('Home', 'Tahanan'), icon: Home, path: '/home' },
    { label: t('Services', 'Serbisyo'), labelShort: t('Services', 'Serbisyo'), icon: Briefcase, path: '/services' },
    { label: t('Map', 'Mapa'), labelShort: t('Map', 'Mapa'), icon: Map, path: '/map' },
    { label: t('Help', 'Tulong'), labelShort: t('Help', 'Tulong'), icon: HelpCircle, path: '/help' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 max-w-[480px] mx-auto">
      <div className="flex items-stretch">
        {/* Language toggle */}
        <button
          onClick={() => setLang(lang === 'en' ? 'fil' : 'en')}
          className="flex flex-col items-center justify-center px-2 py-2 min-w-[44px] text-gray-400 hover:text-orange-500 transition-colors"
        >
          <span className="text-[10px] font-semibold tracking-wide">
            {lang === 'en' ? 'EN' : 'FIL'}
          </span>
          <span className="text-[8px] mt-0.5 text-gray-400">{lang === 'en' ? 'FIL' : 'EN'}</span>
        </button>

        <div className="w-px bg-gray-100 my-2" />

        {/* Nav tabs */}
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = location.pathname === tab.path || location.pathname.startsWith(tab.path + '/');
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 px-1 transition-colors relative ${
                isActive ? 'text-orange-500' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-orange-500 rounded-full" />
              )}
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className="text-[10px] mt-1 font-medium">{tab.labelShort}</span>
            </button>
          );
        })}

        <div className="w-px bg-gray-100 my-2" />

        {/* ✅ Sign Out */}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center justify-center px-2 py-2 min-w-[44px] text-gray-400 hover:text-red-500 transition-colors"
          aria-label="Sign Out"
        >
          <LogOut size={18} />
          <span className="text-[8px] mt-1 font-medium text-gray-400">
            {t('Exit', 'Lumabas')}
          </span>
        </button>
      </div>
      {/* iOS safe area */}
      <div className="h-safe-area-inset-bottom bg-white" style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
    </nav>
  );
}