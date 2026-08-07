import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Bell, Search, QrCode, Map, Video, Megaphone, HelpCircle,
  ChevronRight, Briefcase, AlertCircle, Info, Sparkles, X,
} from 'lucide-react';
import UserScreenLayout from './UserScreenLayout';
import QRScannerModal from './QRScannerModal';   // ← gamitin natin ang component
import { useApp } from '../context/AppContext';
import { useOffices } from '../../hooks/useOffices';
import { useAnnouncements } from '../../hooks/useAnnouncements';

export default function HomeScreen() {
  const navigate = useNavigate();
  const { user, t, lang, unreadCount } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any>(null);
  const [aiMessages, setAiMessages] = useState<{ role: 'user' | 'bot'; text: string }[]>([
    {
      role: 'bot',
      text: t(
        "Hello! I'm FindNau Assistant. Ask me about any municipal service or office.",
        'Kumusta! Ako si FindNau Assistant. Magtanong tungkol sa anumang serbisyong munisipal o opisina.'
      ),
    },
  ]);

  const { offices } = useOffices();
  const { announcements } = useAnnouncements();

  // ── mga quick actions ───────────────────
  const quickActions = [
    { icon: QrCode, label: t('QR Scanner', 'QR Scanner'), color: 'bg-orange-50 text-orange-500 border-orange-100', action: () => setShowQR(true) },
    { icon: Briefcase, label: t('E-Services', 'E-Serbisyo'), color: 'bg-blue-50 text-blue-600 border-blue-100', action: () => navigate('/services') },
    { icon: Map, label: t('2D Map', '2D Mapa'), color: 'bg-green-50 text-green-600 border-green-100', action: () => navigate('/map') },
    { icon: Video, label: t('360° Tour', '360° Tour'), color: 'bg-purple-50 text-purple-600 border-purple-100', action: () => navigate('/map?tab=vr') },
    { icon: Megaphone, label: t('Announcements', 'Anunsyo'), color: 'bg-yellow-50 text-yellow-600 border-yellow-100', action: () => navigate('/announcements') },
    { icon: HelpCircle, label: t('Help Center', 'Tulong'), color: 'bg-red-50 text-red-500 border-red-100', action: () => navigate('/help') },
  ];

  // ── search filter ──────────────────────
  const filteredOffices = searchQuery
    ? offices.filter(o =>
        o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.nameFilipino.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.shortName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.services.some(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  // ── AI Assistant Logic (unchanged) ──────
  const findBestServiceMatch = (input: string): { service: any; office: any; score: number } | null => {
    const tokens = input
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 1);
    let bestMatch = null;
    let bestScore = 0;

    for (const office of offices) {
      for (const svc of office.services) {
        const searchStr = [
          svc.name?.toLowerCase(),
          svc.nameFilipino?.toLowerCase(),
          svc.info?.toLowerCase(),
          svc.infoFilipino?.toLowerCase(),
          office.name?.toLowerCase(),
          office.nameFilipino?.toLowerCase(),
        ].join(' ');

        let score = 0;
        for (const token of tokens) {
          if (searchStr.includes(token)) score++;
        }
        if (score > bestScore) {
          bestScore = score;
          bestMatch = { service: svc, office };
        }
      }
    }
    return bestScore > 0 ? { ...bestMatch, score: bestScore } : null;
  };

  const handleAIMessage = () => {
    if (!aiInput.trim()) return;
    const userMsg = aiInput.trim();
    setAiMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setAiInput('');

    setTimeout(() => {
      const lower = userMsg.toLowerCase();
      let response = '';

      const match = findBestServiceMatch(userMsg);
      if (match) {
        const { service: svc, office } = match;
        response = lang === 'en'
          ? `**${svc.name}** at **${office.name}** (${office.floor}).\n${svc.info}\nProcessing Time: ${svc.processingTime}\nFee: ${svc.fee}`
          : `**${svc.nameFilipino}** sa **${office.nameFilipino}** (${office.floor}).\n${svc.infoFilipino}\nOras ng Pagproseso: ${svc.processingTime}\nBayad: ${svc.fee}`;
      } else {
        for (const office of offices) {
          const nameEn = office.name.toLowerCase();
          const nameFil = office.nameFilipino.toLowerCase();
          if (lower.includes(nameEn) || lower.includes(nameFil)) {
            response = lang === 'en'
              ? `**${office.name}** is located at ${office.floor}.\n${office.description}`
              : `**${office.nameFilipino}** ay matatagpuan sa ${office.floor}.\n${office.descriptionFilipino}`;
            break;
          }
        }
      }

      if (!response) {
        response = t(
          "I couldn't find an exact match. Try a specific service like 'Marriage License' or an office name. You can also visit the E-Services or Help Center.",
          "Walang nakitang eksaktong tugma. Subukan ang isang partikular na serbisyo tulad ng 'Marriage License' o pangalan ng opisina. Maaari ring bisitahin ang E-Serbisyo o Sentro ng Tulong."
        );
      }

      setAiMessages(prev => [...prev, { role: 'bot', text: response }]);
    }, 600);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('Good morning', 'Magandang umaga');
    if (hour < 17) return t('Good afternoon', 'Magandang hapon');
    return t('Good evening', 'Magandang gabi');
  };

  const urgentAnnouncements = announcements.filter(a => a.urgent);
  const normalAnnouncements = announcements.filter(a => !a.urgent);

  const catColors: Record<string, string> = {
    Notice: 'bg-blue-50 text-blue-600',
    Health: 'bg-green-50 text-green-600',
    Announcement: 'bg-orange-50 text-orange-500',
    Business: 'bg-purple-50 text-purple-600',
    Tax: 'bg-red-50 text-red-500',
  };

  return (
    <UserScreenLayout>
      {/* Top Bar */}
      <div className="bg-white px-4 pt-5 pb-4 border-b border-gray-100 sticky top-0 z-40">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/profile')} className="w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
              {user?.name?.charAt(0).toUpperCase() || 'G'}
            </button>
            <div>
              <p className="text-xs text-gray-400 leading-none">{getGreeting()},</p>
              <p className="text-sm font-semibold text-gray-800 leading-tight">{user?.name || 'Guest'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAI(true)} className="w-9 h-9 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 border border-orange-100">
              <Sparkles size={16} />
            </button>
            <button onClick={() => navigate('/notifications')} className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 border border-gray-100 relative">
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-orange-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={t('Search offices, services...', 'Maghanap ng opisina, serbisyo...')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
          />
        </div>
      </div>

      {/* Search Results */}
      {searchQuery && (
        <div className="bg-white mx-4 mt-2 rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {filteredOffices.length > 0 ? (
            filteredOffices.slice(0, 5).map(office => (
              <button
                key={office.id}
                onClick={() => { setSearchQuery(''); navigate(`/office/${office.id}`); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 text-left"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: office.iconBg }}>
                  {office.shortName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{lang === 'en' ? office.name : office.nameFilipino}</p>
                  <p className="text-xs text-gray-400">{office.floor}</p>
                </div>
                <ChevronRight size={16} className="text-gray-300" />
              </button>
            ))
          ) : (
            <div className="px-4 py-6 text-center text-sm text-gray-400">
              {t('No results found.', 'Walang nahanap na resulta.')}
            </div>
          )}
        </div>
      )}

      <div className="px-4 space-y-5 mt-4">
        {/* Quick Actions */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            {t('Quick Access', 'Mabilis na Access')}
          </h3>
          <div className="grid grid-cols-3 gap-2.5">
            {quickActions.map((action, i) => {
              const Icon = action.icon;
              return (
                <button
                  key={i}
                  onClick={action.action}
                  className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border ${action.color} hover:scale-[0.97] active:scale-95 transition-all aspect-square`}
                >
                  <Icon size={22} strokeWidth={1.8} />
                  <span className="text-[11px] font-medium mt-2 leading-tight text-center">{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Urgent Announcement Banner (clickable) */}
        {urgentAnnouncements.map(ann => (
          <div
            key={ann.id}
            onClick={() => setSelectedAnnouncement(ann)}
            className="bg-orange-500 rounded-2xl p-4 flex items-start gap-3 cursor-pointer"
          >
            <AlertCircle size={18} className="text-white flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm">{lang === 'en' ? ann.title : ann.titleFilipino}</p>
              <p className="text-orange-100 text-xs mt-0.5 line-clamp-2">{lang === 'en' ? ann.content : ann.contentFilipino}</p>
            </div>
          </div>
        ))}

        {/* Announcements (clickable) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {t('Announcements', 'Mga Anunsyo')}
            </h3>
            <button
              onClick={() => navigate('/announcements')}
              className="text-xs text-orange-500 font-medium"
            >
              {t('View all', 'Tingnan lahat')}
            </button>
          </div>
          <div className="space-y-2.5">
            {normalAnnouncements.slice(0, 3).map(ann => (
              <div
                key={ann.id}
                onClick={() => setSelectedAnnouncement(ann)}
                className="bg-white rounded-xl border border-gray-100 p-4 cursor-pointer hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${catColors[ann.category] || 'bg-gray-100 text-gray-500'}`}>
                    {ann.category}
                  </span>
                  <span className="text-[11px] text-gray-400 flex-shrink-0">{ann.date}</span>
                </div>
                <p className="text-sm font-medium text-gray-800 mb-1">{lang === 'en' ? ann.title : ann.titleFilipino}</p>
                <p className="text-xs text-gray-500 line-clamp-2">{lang === 'en' ? ann.content : ann.contentFilipino}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Featured Offices */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {t('Municipal Offices', 'Mga Tanggapan')}
            </h3>
            <button onClick={() => navigate('/services')} className="text-xs text-orange-500 font-medium">{t('View all', 'Tingnan lahat')}</button>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {offices.slice(0, 4).map(office => (
              <button
                key={office.id}
                onClick={() => navigate(`/office/${office.id}`)}
                className="bg-white rounded-xl border border-gray-100 p-3.5 text-left hover:border-orange-200 hover:shadow-sm transition-all active:scale-[0.98]"
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold mb-2.5" style={{ backgroundColor: office.iconBg }}>
                  {office.shortName.charAt(0)}
                </div>
                <p className="text-xs font-semibold text-gray-800 leading-tight mb-1 line-clamp-2">
                  {lang === 'en' ? office.name : office.nameFilipino}
                </p>
                <p className="text-[11px] text-gray-400">{office.floor}</p>
                <p className="text-[11px] text-orange-500 mt-1.5 font-medium">
                  {office.services.length} {t('service(s)', 'serbisyo')}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <Info size={16} className="text-orange-500" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-700">{t('Municipal Building Hours', 'Oras ng Municipal Building')}</p>
            <p className="text-xs text-gray-400">{t('Mon–Fri  •  8:00 AM – 5:00 PM', 'Lun–Biy  •  8:00 AM – 5:00 PM')}</p>
          </div>
        </div>
      </div>

      {/* Announcement Detail Modal */}
      {selectedAnnouncement && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setSelectedAnnouncement(null)}>
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[80vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedAnnouncement(null)} className="float-right text-gray-400">
              <X size={20} />
            </button>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${selectedAnnouncement.urgent ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-orange-500'}`}>
              {selectedAnnouncement.category}
            </span>
            <h2 className="text-lg font-bold mt-2">{lang === 'en' ? selectedAnnouncement.title : selectedAnnouncement.titleFilipino}</h2>
            <p className="text-xs text-gray-400 mt-1">{selectedAnnouncement.date}</p>
            <p className="text-sm text-gray-600 mt-4 whitespace-pre-line">{lang === 'en' ? selectedAnnouncement.content : selectedAnnouncement.contentFilipino}</p>
            <button onClick={() => setSelectedAnnouncement(null)} className="mt-6 w-full bg-gray-100 text-gray-700 py-2.5 rounded-xl text-sm font-medium">Close</button>
          </div>
        </div>
      )}

      {/* ───── QR Scanner Modal (gamitin ang safe component) ───── */}
      <QRScannerModal
        open={showQR}
        onClose={() => setShowQR(false)}
        // optional: kung may extra logic ka pagkatapos ma-scan, ilagay dito
      />

      {/* AI Assistant Modal */}
      {showAI && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl flex flex-col" style={{ maxHeight: '80vh' }}>
            <div className="px-5 pt-4 pb-3 border-b border-gray-100 flex-shrink-0">
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                    <Sparkles size={15} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">FindNau Assistant</p>
                    <p className="text-xs text-green-500 font-medium">● {t('Online', 'Online')}</p>
                  </div>
                </div>
                <button onClick={() => setShowAI(false)} className="text-gray-400 hover:text-gray-600 text-sm">{t('Close', 'Isara')}</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {aiMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-orange-500 text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-700 rounded-bl-sm'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 py-4 border-t border-gray-100 flex-shrink-0">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiInput}
                  onChange={e => setAiInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAIMessage()}
                  placeholder={t('Ask about any service...', 'Magtanong tungkol sa serbisyo...')}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <button
                  onClick={handleAIMessage}
                  className="bg-orange-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors"
                >
                  {t('Send', 'Ipadala')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </UserScreenLayout>
  );
}