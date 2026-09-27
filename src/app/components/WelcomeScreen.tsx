import { useNavigate } from 'react-router';
import { ArrowRight, Play, MapPin, Sparkles, QrCode } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function WelcomeScreen() {
  const navigate = useNavigate();
  const { t } = useApp();

  const handleGetStarted = () => {
    try {
      localStorage.setItem('findnau_welcomed', 'true');
    } catch {}
    navigate('/login', { replace: true });
  };

  const handleWatchTutorial = () => {
    try {
      localStorage.setItem('findnau_welcomed', 'true');
    } catch {}
    navigate('/tutorial', { replace: true });
  };

  return (
    <div
      className="min-h-screen bg-white flex flex-col"
      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
    >
      <div className="relative flex-1 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/background_logo.jpg"
            alt=""
            className="w-full h-full object-cover"
            aria-hidden="true"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-orange-900/70 via-orange-800/70 to-orange-900/85" />

        <div className="absolute top-[-60px] right-[-60px] w-72 h-72 bg-orange-400 rounded-full opacity-20 blur-2xl" />
        <div className="absolute bottom-[-40px] left-[-40px] w-64 h-64 bg-orange-500 rounded-full opacity-15 blur-2xl" />

        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-12 text-white text-center">
          <div className="w-24 h-24 p-1 mb-6 shadow-2xl rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
            <img
              src="/logo.jpg"
              alt="Naujan Municipality Logo"
              className="w-full h-full object-contain rounded-xl"
            />
          </div>

          <h1 className="text-4xl font-bold text-white tracking-tight drop-shadow-lg mb-2">
            FindNau
          </h1>

          <div className="flex items-center gap-2 mt-2 mb-4">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-white/20 border border-white/40 flex-shrink-0 shadow-md">
              <img
                src="/MunicipalLogo.jpg"
                alt="Naujan Municipal Seal"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="text-left">
              <p className="text-orange-50 text-sm font-semibold drop-shadow-md leading-tight">
                Municipal Building Navigation
              </p>
              <p className="text-orange-100 text-xs drop-shadow-md leading-tight">
                & E-Services Platform
              </p>
            </div>
          </div>

          <p className="text-orange-100 text-sm max-w-xs leading-relaxed mb-8">
            {t(
              'Your guide to municipal services, office locations, and building navigation all in one app.',
              'Ang iyong gabay sa mga serbisyong munisipal, lokasyon ng opisina, at navigation ng gusali — lahat sa isang app.'
            )}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
            <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1.5">
              <MapPin size={12} className="text-orange-200" />
              <span className="text-[11px] font-medium">
                {t('Building Map', 'Mapa ng Gusali')}
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1.5">
              <Sparkles size={12} className="text-orange-200" />
              <span className="text-[11px] font-medium">
                {t('E-Services', 'E-Serbisyo')}
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1.5">
              <QrCode size={12} className="text-orange-200" />
              <span className="text-[11px] font-medium">
                {t('QR Scanner', 'QR Scanner')}
              </span>
            </div>
          </div>

          <div className="w-full max-w-sm space-y-3">
            <button
              onClick={handleGetStarted}
              className="w-full bg-white text-orange-600 py-4 rounded-2xl font-bold text-sm hover:bg-orange-50 active:scale-[0.98] transition-all shadow-xl flex items-center justify-center gap-2"
            >
              {t('Get Started', 'Magsimula')}
              <ArrowRight size={18} />
            </button>

            <button
              onClick={handleWatchTutorial}
              className="w-full flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm border border-white/25 text-white py-3.5 rounded-2xl font-medium text-sm hover:bg-white/20 active:scale-[0.98] transition-all"
            >
              <Play size={16} className="fill-white" />
              {t('Watch Tutorial First', 'Manood ng Tutorial Muna')}
            </button>
          </div>

          <p className="text-[11px] text-orange-200/80 mt-10 leading-relaxed">
            Municipality of Naujan, Oriental Mindoro
            <br />© 2026 All rights reserved
          </p>
        </div>
      </div>
    </div>
  );
}