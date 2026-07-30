import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router';
import { ArrowLeft, MapPin, Clock, Phone, Volume2, ChevronRight, QrCode, CheckCircle } from 'lucide-react';
import UserScreenLayout from './UserScreenLayout';
import { useApp } from '../context/AppContext';
import { useOffices } from '../../hooks/useOffices';

export default function OfficeDetailScreen() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const { t, lang, addVisitedOffice } = useApp();
  const [activeTab, setActiveTab] = useState<'info' | 'services'>('info');
  const [speaking, setSpeaking] = useState<string | null>(null);
  const { offices, loading } = useOffices();

  const office = offices.find(o => o.id === id);

  useEffect(() => {
    if (id) addVisitedOffice(id);
    // any other tab navigation logic can be removed if no longer needed
  }, [id, offices]);

  if (loading) {
    return (
      <UserScreenLayout hideNav>
        <div className="p-8 text-center text-gray-400">Loading...</div>
      </UserScreenLayout>
    );
  }

  if (!office) {
    return (
      <UserScreenLayout hideNav>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center px-6">
            <p className="text-gray-500 text-sm mb-4">{t('Office not found.', 'Hindi nahanap ang opisina.')}</p>
            <button onClick={() => navigate('/services')} className="text-orange-500 text-sm font-medium">
              {t('Back to Services', 'Bumalik sa Mga Serbisyo')}
            </button>
          </div>
        </div>
      </UserScreenLayout>
    );
  }

  const speak = (text: string, serviceId: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      if (speaking === serviceId) { setSpeaking(null); return; }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'fil' ? 'fil-PH' : 'en-US';
      utterance.rate = 0.9;
      utterance.onend = () => setSpeaking(null);
      window.speechSynthesis.speak(utterance);
      setSpeaking(serviceId);
    }
  };

  const tabs = [
    { key: 'info', label: t('Info', 'Impormasyon') },
    { key: 'services', label: t('E-Services', 'E-Serbisyo') },
  ] as const;

  return (
    <UserScreenLayout hideNav>
      <div className="sticky top-0 z-40">
        <div className="px-4 pt-5 pb-4" style={{ backgroundColor: office.iconBg }}>
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white mb-4">
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 pr-4">
              <div className="inline-block bg-white/20 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full mb-2">
                {office.shortName}
              </div>
              <h1 className="text-lg font-bold text-white leading-tight">
                {lang === 'en' ? office.name : office.nameFilipino}
              </h1>
              <div className="flex items-center gap-1 mt-1.5">
                <MapPin size={12} className="text-white/70" />
                <p className="text-white/80 text-xs">{office.floor}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border-b border-gray-100 flex">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-3 text-xs font-semibold transition-colors relative ${
                activeTab === tab.key ? 'text-orange-500' : 'text-gray-400'
              }`}
            >
              {tab.label}
              {activeTab === tab.key && <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-orange-500 rounded-full" />}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 mt-4">
        {activeTab === 'info' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className="text-sm text-gray-600 leading-relaxed">
                {lang === 'en' ? office.description : office.descriptionFilipino}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
              <div className="flex items-start gap-3 p-4">
                <Clock size={16} className="text-orange-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-0.5">{t('Operating Hours', 'Oras ng Operasyon')}</p>
                  <p className="text-xs text-gray-500">{t('Monday – Friday', 'Lunes – Biyernes')}</p>
                  <p className="text-xs text-gray-500">8:00 AM – 5:00 PM</p>
                  <p className="text-xs text-gray-400 mt-0.5">{t('Lunch break: 12:00 PM – 1:00 PM', 'Lunch break: 12:00 PM – 1:00 PM')}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4">
                <MapPin size={16} className="text-orange-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-0.5">{t('Location', 'Lokasyon')}</p>
                  <p className="text-xs text-gray-500">{office.floor}</p>
                  <p className="text-xs text-gray-400">{t('Municipal Building of Naujan', 'Municipal Building ng Naujan')}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4">
                <Phone size={16} className="text-orange-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-0.5">{t('Contact', 'Makipag-ugnayan')}</p>
                  <p className="text-xs text-gray-500">{t('(043) 284-0000 local ext.', '(043) 284-0000 local ext.')}</p>
                  <p className="text-xs text-gray-400">naujan.gov.ph</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
              <div className="w-14 h-14 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center">
                <QrCode size={28} className="text-gray-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800">{t('Office QR Code', 'QR Code ng Opisina')}</p>
                <p className="text-xs text-gray-400 mt-0.5">{t('Scan to get quick access to this office\'s services.', 'I-scan para sa mabilis na access sa mga serbisyo ng opisinang ito.')}</p>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('services')}
              className="w-full py-3.5 bg-orange-500 text-white rounded-xl font-semibold text-sm hover:bg-orange-600 transition-colors"
            >
              {t(`View ${office.services.length} Service(s)`, `Tingnan ang ${office.services.length} Serbisyo`)}
            </button>
          </div>
        )}

        {activeTab === 'services' && (
          <div className="space-y-3">
            <p className="text-xs text-gray-400 mb-1">
              {office.services.length} {t('service(s) available', 'serbisyong available')}
            </p>
            {office.services.map(service => (
              <div key={service.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800">
                      {lang === 'en' ? service.name : service.nameFilipino}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                      {lang === 'en' ? service.info : service.infoFilipino}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const reqs = service.requirements || [];
                      const reqsFil = service.requirementsFilipino || [];
                      speak(
                        lang === 'en'
                          ? `${service.name}. ${service.info}. Requirements: ${reqs.map(r => r.requirement).join(', ')}`
                          : `${service.nameFilipino}. ${service.infoFilipino}. Mga kinakailangan: ${reqsFil.map(r => r.requirement).join(', ')}`,
                        service.id || ''
                      );
                    }}
                    className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                      speaking === service.id
                        ? 'bg-orange-500 text-white'
                        : 'bg-orange-50 text-orange-500 border border-orange-100'
                    }`}
                  >
                    <Volume2 size={15} className={speaking === service.id ? 'animate-pulse' : ''} />
                  </button>
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center gap-1">
                    <Clock size={11} className="text-gray-400" />
                    <span className="text-[11px] text-gray-500">{service.processingTime}</span>
                  </div>
                  <div className="w-px h-3 bg-gray-200" />
                  <span className="text-[11px] text-orange-500 font-medium">{service.fee}</span>
                </div>

                <button
                  onClick={() => navigate(`/office/${office.id}/service/${service.id}`)}
                  className="w-full flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-sm text-gray-600 hover:bg-orange-50 hover:border-orange-100 hover:text-orange-600 transition-all"
                >
                  <span className="text-xs font-medium">{t('View Requirements', 'Tingnan ang Mga Kinakailangan')}</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </UserScreenLayout>
  );
}