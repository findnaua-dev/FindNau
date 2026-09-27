import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, Volume2, VolumeX, Clock, Info, FileText, ListChecks } from 'lucide-react';
import UserScreenLayout from './UserScreenLayout';
import { useApp } from '../context/AppContext';
import { useOffices, OfficeWithServices } from '../../hooks/useOffices';
import { ServiceRequirement, ServiceStep } from '../../services/officeService';

export default function ServiceDetailScreen() {
  const navigate = useNavigate();
  const { id, serviceId } = useParams();
  const { t, lang } = useApp();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const { offices, loading } = useOffices();

  const office: OfficeWithServices | undefined = offices.find(o => o.id === id);
  const service = office?.services.find(s => s.id === serviceId);

  useEffect(() => {
    return () => { window.speechSynthesis?.cancel(); };
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>;
  if (!office || !service) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
        <div className="text-center">
          <p className="text-gray-500 text-sm mb-4">{t('Service not found.', 'Hindi nahanap ang serbisyo.')}</p>
          <button onClick={() => navigate(-1)} className="text-orange-500 text-sm font-medium">{t('Go Back', 'Bumalik')}</button>
        </div>
      </div>
    );
  }

  const toggleSpeak = () => {
    if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const text = `${service.name}. ${service.info}. Processing time: ${service.processingTime}. Fee: ${service.fee}.`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'fil' ? 'fil-PH' : 'en-US';
    utterance.rate = 0.88;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const reqs = lang === 'en' ? service.requirements : service.requirementsFilipino;
  const steps = lang === 'en' ? service.steps : service.stepsFilipino;
  const who = lang === 'en' ? service.whoMayAvail : service.whoMayAvailFil;
  const type = lang === 'en' ? service.typeOfTransaction : service.typeOfTransactionFil;

  const totalFee = steps.reduce((sum, s) => sum + (parseFloat(s.fee.replace(/[^0-9.]/g, '')) || 0), 0);

  return (
    <UserScreenLayout hideNav>
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="px-4 pt-5 pb-3">
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-600">
              <ArrowLeft size={18} />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400 truncate">{lang === 'en' ? office.name : office.nameFilipino}</p>
              <h1 className="text-sm font-semibold text-gray-800 truncate">
                {lang === 'en' ? service.name : service.nameFilipino}
              </h1>
            </div>
            <button
              onClick={toggleSpeak}
              className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                isSpeaking ? 'bg-orange-500 text-white shadow-md shadow-orange-200' : 'bg-orange-50 text-orange-500 border border-orange-100'
              }`}
            >
              {isSpeaking ? <VolumeX size={17} /> : <Volume2 size={17} />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - Isang Tuloy-tuloy na Scroll */}
      <div className="px-4 mt-4 space-y-6 pb-10">
        
        {isSpeaking && (
          <div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 flex items-center gap-2">
            <Volume2 size={14} className="text-orange-500 animate-pulse" />
            <p className="text-xs text-orange-600 font-medium flex-1">{t('Reading service information...', 'Binabasa ang impormasyon ng serbisyo...')}</p>
            <button onClick={toggleSpeak} className="text-orange-500 text-xs font-semibold">{t('Stop', 'Itigil')}</button>
          </div>
        )}

        {/* 1. INFO SECTION */}
        <section className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Info size={15} className="text-orange-500" />
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{t('About this Service', 'Tungkol sa Serbisyong Ito')}</p>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              {lang === 'en' ? service.info : service.infoFilipino}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{t('Type', 'Uri')}</p>
              <p className="text-sm font-semibold text-gray-800 mt-1">{type || '—'}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{t('Who may avail', 'Sino ang maaaring kumuha')}</p>
              <p className="text-sm text-gray-800 mt-1">{who || '—'}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{t('Processing Time', 'Oras ng Pagproseso')}</p>
              <p className="text-sm font-semibold text-gray-800">{service.processingTime}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{t('Fee', 'Bayad')}</p>
              <p className="text-sm font-semibold text-orange-500">{service.fee}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">{t('Provided By', 'Ibinibigay Ng')}</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ backgroundColor: office.iconBg }}>
                {office.shortName.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">{lang === 'en' ? office.name : office.nameFilipino}</p>
                <p className="text-xs text-gray-400">{office.floor}</p>
              </div>
            </div>
          </div>
        </section>

        {/* 2. REQUIREMENTS SECTION */}
        <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 pt-4 pb-2 border-b border-gray-50 flex items-center gap-2">
            <FileText size={15} className="text-orange-500" />
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('Checklist of Requirements', 'Mga Kinakailangan')}</p>
          </div>
          {reqs.length === 0 ? (
            <p className="text-xs text-gray-400 p-4">{t('No specific requirements.', 'Walang tinukoy na mga kinakailangan.')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[400px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">#</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">{t('Requirement', 'Kinakailangan')}</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">{t('Where to secure', 'Saan kukunin')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {reqs.map((req: ServiceRequirement, i: number) => (
                    <tr key={i}>
                      <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                      <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">{req.requirement}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{req.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* 3. PROCESS / STEPS SECTION */}
        <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 pt-4 pb-2 border-b border-gray-50 flex items-center gap-2">
            <ListChecks size={15} className="text-orange-500" />
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('Client Steps', 'Mga Hakbang')}</p>
          </div>
          {steps.length === 0 ? (
            <p className="text-xs text-gray-400 p-4">{t('No steps defined.', 'Walang tinukoy na mga hakbang.')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">#</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">{t('Client Step', 'Hakbang')}</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">{t('Action', 'Aksyon')}</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">{t('Fee', 'Bayad')}</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">{t('Time', 'Oras')}</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">{t('Person Responsible', 'Responsableng Tao')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {steps.map((st: ServiceStep, i: number) => (
                    <tr key={i}>
                      <td className="px-4 py-3 text-xs text-gray-400">{st.step}</td>
                      <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">{st.clientStep || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">{st.action}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{st.fee}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{st.processingTime}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{st.personResponsible}</td>
                    </tr>
                  ))}
                  <tr className="bg-orange-50 font-semibold">
                    <td colSpan={3} className="px-4 py-2 text-xs text-gray-700 uppercase">{t('Total', 'Kabuuan')}</td>
                    <td className="px-4 py-2 text-xs text-orange-600">₱{totalFee.toFixed(2)}</td>
                    <td className="px-4 py-2 text-xs text-gray-600">{service.processingTime}</td>
                    <td className="px-4 py-2 text-xs text-gray-600"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </section>

      </div>
    </UserScreenLayout>
  );
}