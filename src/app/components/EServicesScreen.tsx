import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Search, ChevronRight, ArrowLeft, Video, CheckCircle } from 'lucide-react';
import UserScreenLayout from './UserScreenLayout';
import { useApp } from '../context/AppContext';
import { useOffices } from '../../hooks/useOffices';

export default function EServicesScreen() {
  const navigate = useNavigate();
  const { t, lang } = useApp();
  const [activeTab, setActiveTab] = useState<'services' | 'tour'>('services');
  const [searchQuery, setSearchQuery] = useState('');
  const { offices, loading } = useOffices();

  if (loading) {
    return (
      <UserScreenLayout>
        <div className="p-8 text-center text-gray-400">Loading...</div>
      </UserScreenLayout>
    );
  }

  const filtered = offices.filter(o => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      o.name.toLowerCase().includes(q) ||
      o.nameFilipino.toLowerCase().includes(q) ||
      o.shortName.toLowerCase().includes(q) ||
      o.services.some(s => s.name.toLowerCase().includes(q) || s.nameFilipino.toLowerCase().includes(q))
    );
  });

  const tourOffices = offices.filter(o => o.vrTour);
  const totalServices = offices.reduce((sum, o) => sum + o.services.length, 0);

  return (
    <UserScreenLayout>
      {/* Header */}
      <div className="bg-white px-4 pt-5 pb-0 border-b border-gray-100 sticky top-0 z-40">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate('/home')} className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 border border-gray-100">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-base font-semibold text-gray-800">{t('Municipal Offices & Services', 'Mga Tanggapan at Serbisyo')}</h1>
            <p className="text-xs text-gray-400">{offices.length} {t('offices', 'tanggapan')} · {totalServices} {t('services', 'serbisyo')}</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={t('Search offices or services...', 'Maghanap ng opisina o serbisyo...')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
          />
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {([['services', t('E-Services', 'E-Serbisyo')], ['tour', t('360° Virtual Tour', '360° Virtual Tour')]] as const).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors relative ${
                activeTab === tab ? 'text-orange-500' : 'text-gray-400'
              }`}
            >
              {label}
              {activeTab === tab && <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-orange-500 rounded-full" />}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 mt-4 space-y-3">
        {activeTab === 'services' ? (
          <>
            {searchQuery && (
              <p className="text-xs text-gray-400">
                {filtered.length} {t('result(s) for', 'resulta para sa')} "{searchQuery}"
              </p>
            )}
            {filtered.map(office => (
              <button
                key={office.id}
                onClick={() => navigate(`/office/${office.id}`)}
                className="w-full bg-white rounded-2xl border border-gray-100 p-4 text-left hover:border-orange-200 hover:shadow-sm transition-all active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ backgroundColor: office.iconBg }}>
                    {office.shortName.length <= 3 ? office.shortName : office.shortName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 leading-tight">
                          {lang === 'en' ? office.name : office.nameFilipino}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{office.floor}</p>
                      </div>
                      <ChevronRight size={16} className="text-gray-300 flex-shrink-0 mt-0.5" />
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[11px] text-orange-500 font-medium bg-orange-50 px-2 py-0.5 rounded-full">
                        {office.services.length} {t('service(s)', 'serbisyo')}
                      </span>
                      {office.vrTour && (
                        <span className="text-[11px] text-purple-600 font-medium bg-purple-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Video size={10} />
                          {t('360° Tour', '360° Tour')}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1.5 line-clamp-1">
                      {office.services.map(s => lang === 'en' ? s.name : s.nameFilipino).join(' · ')}
                    </p>
                  </div>
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-16">
                <Search size={40} className="text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400">{t('No offices found.', 'Walang nahanap na opisina.')}</p>
                <p className="text-xs text-gray-300 mt-1">{t('Try a different search term.', 'Subukan ang ibang salitang pang-search.')}</p>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex items-start gap-3">
              <Video size={18} className="text-orange-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-gray-800">{t('360° Virtual Office Tours', '360° Virtual Tour ng Opisina')}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t('Explore offices before your visit. Click on any office to start the virtual tour.', 'I-explore ang mga opisina bago bumisita. I-click ang anumang opisina upang simulan ang virtual tour.')}</p>
              </div>
            </div>

            {tourOffices.map(office => (
              <button
                key={office.id}
                onClick={() => navigate(`/office/${office.id}?tab=tour`)}
                className="w-full bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-purple-200 hover:shadow-sm transition-all active:scale-[0.99]"
              >
                <div className="h-32 flex items-center justify-center relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${office.iconBg}22 0%, ${office.iconBg}44 50%, ${office.iconBg}22 100%)` }}>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-20 h-20 rounded-full border-2 border-white/40 flex items-center justify-center" style={{ backgroundColor: office.iconBg + '88' }}>
                      <Video size={28} className="text-white" />
                    </div>
                  </div>
                  <div className="absolute top-3 right-3 bg-purple-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                    360°
                  </div>
                  <div className="absolute bottom-3 left-3 bg-black/30 text-white text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle size={10} />
                    {t('Available', 'Available')}
                  </div>
                </div>
                <div className="p-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{lang === 'en' ? office.name : office.nameFilipino}</p>
                    <p className="text-xs text-gray-400">{office.floor}</p>
                  </div>
                  <div className="text-purple-600 bg-purple-50 border border-purple-100 text-xs font-medium px-3 py-1.5 rounded-lg">
                    {t('View Tour', 'Tingnan')}
                  </div>
                </div>
              </button>
            ))}

            {tourOffices.length === 0 && (
              <div className="text-center py-16">
                <Video size={40} className="text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400">{t('No virtual tours available yet.', 'Walang virtual tour na available.')}</p>
              </div>
            )}
          </>
        )}
      </div>
    </UserScreenLayout>
  );
}