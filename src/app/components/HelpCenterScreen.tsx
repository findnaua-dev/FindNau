import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, ChevronDown, ChevronUp, Phone, Mail, MapPin, MessageCircle, Volume2 } from 'lucide-react';
import UserScreenLayout from './UserScreenLayout';
import { useApp } from '../context/AppContext';
import { useFaqs } from '../../hooks/useFaqs';
import { useOffices } from '../../hooks/useOffices';

export default function HelpCenterScreen() {
  const navigate = useNavigate();
  const { t, lang } = useApp();
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'faq' | 'contact' | 'chat'>('faq');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'bot'; text: string }[]>([
    {
      role: 'bot',
      text: t(
        "Hello! I'm the FindNau Help Assistant. How can I help you today?",
        'Kumusta! Ako si FindNau Help Assistant. Paano kita matutulungan ngayon?'
      ),
    },
  ]);

  const { faqs: manualFaqs, loading: faqsLoading } = useFaqs();
  const { offices, loading: officesLoading } = useOffices();

  // Auto-generate FAQ items (para sa FAQ tab) – hindi binago
  const autoFaqs = useMemo(() => {
    const items: Array<{
      id: string;
      question: string;
      questionFilipino: string;
      answer: string;
      answerFilipino: string;
      isAuto: boolean;
    }> = [];

    offices.forEach(office => {
      office.services.forEach(service => {
        const id = `auto-${office.id}-${service.id}`;
        const qEn = `How to apply for ${service.name}?`;
        const qFil = `Paano mag-apply ng ${service.nameFilipino}?`;

        let ansEn = `${service.info}\n\n`;
        if (service.requirements?.length) {
          ansEn += `Requirements:\n${service.requirements.map(r => `• ${r.requirement} (${r.source})`).join('\n')}\n\n`;
        }
        if (service.steps?.length) {
          ansEn += `Process:\n${service.steps.map(s => `Step ${s.step}: ${s.action}${s.fee ? ` (Fee: ${s.fee})` : ''}${s.processingTime ? ` - ${s.processingTime}` : ''}`).join('\n')}\n\n`;
        }
        ansEn += `Processing Time: ${service.processingTime}\nFee: ${service.fee}\nOffice: ${office.name} (${office.floor})`;

        let ansFil = `${service.infoFilipino}\n\n`;
        if (service.requirementsFilipino?.length) {
          ansFil += `Mga Kinakailangan:\n${service.requirementsFilipino.map(r => `• ${r.requirement} (${r.source})`).join('\n')}\n\n`;
        }
        if (service.stepsFilipino?.length) {
          ansFil += `Proseso:\n${service.stepsFilipino.map(s => `Hakbang ${s.step}: ${s.action}${s.fee ? ` (Bayad: ${s.fee})` : ''}${s.processingTime ? ` - ${s.processingTime}` : ''}`).join('\n')}\n\n`;
        }
        ansFil += `Oras ng Pagproseso: ${service.processingTime}\nBayad: ${service.fee}\nOpisina: ${office.nameFilipino} (${office.floor})`;

        items.push({
          id,
          question: qEn,
          questionFilipino: qFil,
          answer: ansEn,
          answerFilipino: ansFil,
          isAuto: true,
        });
      });
    });
    return items;
  }, [offices]);

  const allFaqs = useMemo(() => {
    return [...manualFaqs.map(f => ({ ...f, isAuto: false })), ...autoFaqs];
  }, [manualFaqs, autoFaqs]);

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'fil' ? 'fil-PH' : 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  // --- SMART AI (parehong function mula sa HomeScreen) ---
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

  const handleChat = () => {
    if (!chatInput.trim()) return;
    const msg = chatInput.trim();
    setChatMessages(prev => [...prev, { role: 'user', text: msg }]);
    setChatInput('');

    setTimeout(() => {
      const lower = msg.toLowerCase();
      let response = '';

      // 1. Smart service match
      const match = findBestServiceMatch(msg);
      if (match) {
        const { service: svc, office } = match;
        response = lang === 'en'
          ? `**${svc.name}** at **${office.name}** (${office.floor}).\n${svc.info}\nProcessing Time: ${svc.processingTime}\nFee: ${svc.fee}`
          : `**${svc.nameFilipino}** sa **${office.nameFilipino}** (${office.floor}).\n${svc.infoFilipino}\nOras ng Pagproseso: ${svc.processingTime}\nBayad: ${svc.fee}`;
      } else {
        // 2. Office match
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

      // 3. Fallback
      if (!response) {
        response = t(
          "I can help with office hours, service requirements, and navigation. Try asking about: Birth Certificate, Business Permit, Real Property Tax, Senior Citizen ID, or any other service!",
          "Maaari akong tumulong sa oras ng opisina, mga kinakailangan ng serbisyo, at navigation. Subukang magtanong tungkol sa: Sertipiko ng Kapanganakan, Business Permit, Buwis sa Ari-arian, Senior Citizen ID, o anumang iba pang serbisyo!"
        );
      }

      setChatMessages(prev => [...prev, { role: 'bot', text: response }]);
    }, 600);
  };

  const tabs = [
    { key: 'faq', label: t('FAQ', 'FAQ') },
    { key: 'contact', label: t('Contact', 'Makipag-ugnayan') },
    { key: 'chat', label: t('AI Chat', 'AI Chat') },
  ] as const;

  const loading = faqsLoading || officesLoading;

  return (
    <UserScreenLayout>
      {/* Header */}
      <div className="bg-white px-4 pt-5 pb-0 border-b border-gray-100 sticky top-0 z-40">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate('/home')} className="w-9 h-9 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-600">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-base font-semibold text-gray-800">{t('Help Center', 'Sentro ng Tulong')}</h1>
            <p className="text-xs text-gray-400">{t('Frequently asked questions & support', 'Mga madalas na tanong at suporta')}</p>
          </div>
        </div>
        <div className="flex border-b border-gray-100">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2.5 text-xs font-semibold transition-colors relative ${activeTab === tab.key ? 'text-orange-500' : 'text-gray-400'}`}
            >
              {tab.label}
              {activeTab === tab.key && <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-orange-500 rounded-full" />}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 mt-4">
        {/* FAQ TAB (walang pinagbago) */}
        {activeTab === 'faq' && (
          <div className="space-y-2.5">
            {/* ... same FAQ content as before ... */}
            <p className="text-xs text-gray-400 mb-3">
              {t('Tap any question to expand the answer. Includes all municipal services automatically.',
                 'I-tap ang anumang tanong upang palawakin ang sagot. Kasama ang lahat ng serbisyong munisipal.')}
            </p>
            {loading ? (
              <div className="text-center py-10 text-gray-400">Loading FAQs…</div>
            ) : allFaqs.length === 0 ? (
              <div className="text-center py-10 text-gray-400">{t('No FAQs yet.', 'Wala pang mga FAQ.')}</div>
            ) : (
              allFaqs.map(item => (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl border transition-all overflow-hidden ${
                    openFaq === item.id ? 'border-orange-200 shadow-sm' : 'border-gray-100'
                  }`}
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === item.id ? null : item.id)}
                    className="w-full flex items-start justify-between gap-3 p-4 text-left"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800 leading-snug">
                        {lang === 'en' ? item.question : item.questionFilipino}
                      </p>
                      {item.isAuto && (
                        <span className="text-[10px] text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded-full ml-1 inline-block">
                          {t('Auto', 'Awtomatiko')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          speak(lang === 'en' ? item.answer : item.answerFilipino);
                        }}
                        className="w-7 h-7 rounded-full bg-orange-50 flex items-center justify-center text-orange-500"
                      >
                        <Volume2 size={12} />
                      </button>
                      {openFaq === item.id ? <ChevronUp size={16} className="text-orange-500" /> : <ChevronDown size={16} className="text-gray-400" />}
                    </div>
                  </button>
                  {openFaq === item.id && (
                    <div className="px-4 pb-4 pt-0 border-t border-gray-50">
                      <p className="text-sm text-gray-600 leading-relaxed mt-3 whitespace-pre-line">
                        {lang === 'en' ? item.answer : item.answerFilipino}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* CONTACT TAB (walang pinagbago) */}
        {activeTab === 'contact' && (
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4">
              <p className="text-sm font-semibold text-orange-700 mb-1">{t('Municipal Building of Naujan', 'Municipal Building ng Naujan')}</p>
              <p className="text-xs text-orange-600">Oriental Mindoro, Philippines</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
              <div className="flex items-center gap-3 p-4"><Phone size={16} className="text-orange-500" /><div><p className="text-xs text-gray-400">{t('Phone', 'Telepono')}</p><p className="text-sm font-medium text-gray-800">(043) 284-0000</p></div></div>
              <div className="flex items-center gap-3 p-4"><Mail size={16} className="text-orange-500" /><div><p className="text-xs text-gray-400">{t('Email', 'Email')}</p><p className="text-sm font-medium text-gray-800">info@naujan.gov.ph</p></div></div>
              <div className="flex items-start gap-3 p-4"><MapPin size={16} className="text-orange-500 mt-0.5" /><div><p className="text-xs text-gray-400">{t('Address', 'Tirahan')}</p><p className="text-sm font-medium text-gray-800">Municipal Compound</p><p className="text-xs text-gray-500">Naujan, Oriental Mindoro 5207</p></div></div>
            </div>
            <button onClick={() => navigate('/map')} className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white py-3.5 rounded-xl text-sm font-semibold hover:bg-orange-600"><MapPin size={16} />{t('View Building Map', 'Tingnan ang Mapa ng Gusali')}</button>
          </div>
        )}

        {/* CHAT TAB (na-update ang AI) */}
        {activeTab === 'chat' && (
          <div className="flex flex-col" style={{ height: 'calc(100vh - 280px)' }}>
            <div className="flex-1 overflow-y-auto space-y-3 pb-4">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                  {msg.role === 'bot' && <div className="w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center"><MessageCircle size={13} className="text-white" /></div>}
                  <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-orange-500 text-white rounded-br-sm' : 'bg-white border border-gray-100 text-gray-700 rounded-bl-sm'}`}>
                    {msg.text}
                    {msg.role === 'bot' && <button onClick={() => speak(msg.text)} className="ml-2 inline-flex items-center text-gray-400 hover:text-orange-500"><Volume2 size={12} /></button>}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {[t('Office hours?', 'Oras ng opisina?'), t('Birth certificate?', 'Sertipiko ng kapanganakan?'), t('Business permit?', 'Business permit?'), t('Tax payment?', 'Pagbabayad ng buwis?')].map((q, i) => (
                <button key={i} onClick={() => { setChatInput(q); setTimeout(() => handleChat(), 100); }} className="flex-shrink-0 bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-full text-xs font-medium">{q}</button>
              ))}
            </div>
            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleChat()} placeholder={t('Ask anything about municipal services...', 'Magtanong tungkol sa mga serbisyong munisipal...')} className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm" />
              <button onClick={handleChat} className="bg-orange-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold">{t('Send', 'Ipadala')}</button>
            </div>
          </div>
        )}
      </div>
    </UserScreenLayout>
  );
}