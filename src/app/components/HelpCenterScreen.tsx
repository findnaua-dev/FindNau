import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  Volume2,
  VolumeX,
  Navigation,
  AlertCircle,
  ShieldAlert
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
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
  const [chatMessages, setChatMessages] = useState<
    { role: 'user' | 'bot'; text: string }[]
  >([
    {
      role: 'bot',
      text: t(
        "Hello! I'm the FindNau Help Assistant. How can I help you today?",
        'Kumusta! Ako si FindNau Help Assistant. Paano kita matutulungan ngayon?'
      ),
    },
  ]);

  const [speakingKey, setSpeakingKey] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  /* ✅ Available voices — para sa Filipino voice selection */
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  const [contactInfo, setContactInfo] = useState<any[]>([]);
  const [emergencyHotlines, setEmergencyHotlines] = useState<any[]>([]);
  const [helpDataLoading, setHelpDataLoading] = useState(true);

  /* ✅ I-load ang voices — kailangan ito dahil async ang getVoices() */
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        setAvailableVoices(voices);
      }
    };

    // Try agad (kung naka-cache na)
    loadVoices();

    // Listen sa voiceschanged event
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);

    // Fallback polling para sa browsers na hindi nag-fa-fire ng event
    const poll = setInterval(() => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        setAvailableVoices(voices);
        clearInterval(poll);
      }
    }, 200);

    const timeout = setTimeout(() => clearInterval(poll), 3000);

    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
      clearInterval(poll);
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    const fetchHelpData = async () => {
      try {
        const docRef = doc(db, 'settings', 'helpCenter');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setContactInfo(data.contactInfo || []);
          setEmergencyHotlines(data.emergencyHotlines || []);
        }
      } catch (err) {
        console.error("Error fetching help center data:", err);
      } finally {
        setHelpDataLoading(false);
      }
    };
    fetchHelpData();
  }, []);

  /* ✅ Cleanup speech kapag umalis ng screen */
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      utteranceRef.current = null;
    };
  }, []);

  const { faqs: manualFaqs, loading: faqsLoading } = useFaqs();
  const { offices, loading: officesLoading } = useOffices();

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
          ansEn += `Requirements:\n${service.requirements
            .map(r => `• ${r.requirement} (${r.source})`)
            .join('\n')}\n\n`;
        }
        if (service.steps?.length) {
          ansEn += `Process:\n${service.steps
            .map(
              s =>
                `Step ${s.step}: ${s.action}${s.fee ? ` (Fee: ${s.fee})` : ''}${
                  s.processingTime ? ` - ${s.processingTime}` : ''
                }`
            )
            .join('\n')}\n\n`;
        }
        ansEn += `Processing Time: ${service.processingTime}\nFee: ${service.fee}\nOffice: ${office.name} (${office.floor})`;

        let ansFil = `${service.infoFilipino}\n\n`;
        if (service.requirementsFilipino?.length) {
          ansFil += `Mga Kinakailangan:\n${service.requirementsFilipino
            .map(r => `• ${r.requirement} (${r.source})`)
            .join('\n')}\n\n`;
        }
        if (service.stepsFilipino?.length) {
          ansFil += `Proseso:\n${service.stepsFilipino
            .map(
              s =>
                `Hakbang ${s.step}: ${s.action}${
                  s.fee ? ` (Bayad: ${s.fee})` : ''
                }${s.processingTime ? ` - ${s.processingTime}` : ''}`
            )
            .join('\n')}\n\n`;
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

  /* ✅ Pumili ng pinakamagandang Filipino voice available */
  const getBestFilipinoVoice = (): SpeechSynthesisVoice | null => {
    if (availableVoices.length === 0) return null;

    // Priority order — pinaka-una ang pinakamaganda
    const priorities: Array<(v: SpeechSynthesisVoice) => boolean> = [
      // 1. Filipino voice mismo
      (v) => v.lang === 'fil-PH',
      (v) => v.lang === 'fil',
      (v) => v.lang.toLowerCase().startsWith('fil-'),
      // 2. Tagalog voice (kung may gumagamit ng tl)
      (v) => v.lang === 'tl-PH',
      (v) => v.lang === 'tl',
      (v) => v.lang.toLowerCase().startsWith('tl-'),
      // 3. Voice na may "Filipino" o "Tagalog" sa pangalan
      (v) => /filipino|tagalog/i.test(v.name),
      // 4. Philippine English (accent is close to Filipino)
      (v) => v.lang === 'en-PH',
      (v) => v.lang.toLowerCase().startsWith('en-ph'),
      (v) => /philippine/i.test(v.name),
    ];

    for (const matchFn of priorities) {
      const found = availableVoices.find(matchFn);
      if (found) return found;
    }
    return null;
  };

  /* ✅ Pumili ng best English voice */
  const getBestEnglishVoice = (): SpeechSynthesisVoice | null => {
    if (availableVoices.length === 0) return null;

    const priorities: Array<(v: SpeechSynthesisVoice) => boolean> = [
      (v) => v.lang === 'en-US' && v.default,
      (v) => v.lang === 'en-US',
      (v) => v.lang.startsWith('en-US'),
      (v) => v.lang === 'en-GB',
      (v) => v.lang.startsWith('en'),
    ];

    for (const matchFn of priorities) {
      const found = availableVoices.find(matchFn);
      if (found) return found;
    }
    return null;
  };

  /* ✅ FORCE STOP */
  const forceStopSpeech = () => {
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    utteranceRef.current = null;
    setSpeakingKey(null);
  };

  /* ✅ TOGGLE SPEAK — gumagamit ng pinakamagandang Filipino voice */
  const speak = (text: string, key: string) => {
    if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') return;

    // ✅ Same key → itigil
    if (speakingKey === key) {
      forceStopSpeech();
      return;
    }

    // ✅ Cancel muna ang iba
    forceStopSpeech();

    // ✅ Konting delay para malinis ang queue
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);

      if (lang === 'fil') {
        // ✅ Gamit ang pinakamagandang Filipino voice available
        const filipinoVoice = getBestFilipinoVoice();

        if (filipinoVoice) {
          utterance.voice = filipinoVoice;
          utterance.lang = filipinoVoice.lang;
        } else {
          // Fallback kung walang Filipino voice — still set ang lang
          utterance.lang = 'fil-PH';
        }

        // ✅ Filipino speech tuning — mas natural at malinaw
        utterance.rate = 0.92;   // bahagyang mabagal para malinaw
        utterance.pitch = 1.0;   // normal pitch
        utterance.volume = 1.0;  // full volume
      } else {
        // ✅ English voice
        const englishVoice = getBestEnglishVoice();

        if (englishVoice) {
          utterance.voice = englishVoice;
          utterance.lang = englishVoice.lang;
        } else {
          utterance.lang = 'en-US';
        }

        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
      }

      utterance.onstart = () => setSpeakingKey(key);
      utterance.onend = () => {
        setSpeakingKey(null);
        utteranceRef.current = null;
      };
      utterance.onerror = () => {
        setSpeakingKey(null);
        utteranceRef.current = null;
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
      setSpeakingKey(key);
    }, 60);
  };

  const findBestServiceMatch = (
    input: string
  ): { service: any; office: any; score: number } | null => {
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
    return bestScore > 0 && bestMatch
      ? { service: bestMatch.service, office: bestMatch.office, score: bestScore }
      : null;
  };

  const handleChat = () => {
    if (!chatInput.trim()) return;
    const msg = chatInput.trim();
    setChatMessages(prev => [...prev, { role: 'user', text: msg }]);
    setChatInput('');

    setTimeout(() => {
      const lower = msg.toLowerCase();
      let response = '';

      const match = findBestServiceMatch(msg);
      if (match) {
        const { service: svc, office } = match;
        response =
          lang === 'en'
            ? `**${svc.name}** at **${office.name}** (${office.floor}).\n${svc.info}\nProcessing Time: ${svc.processingTime}\nFee: ${svc.fee}`
            : `**${svc.nameFilipino}** sa **${office.nameFilipino}** (${office.floor}).\n${svc.infoFilipino}\nOras ng Pagproseso: ${svc.processingTime}\nBayad: ${svc.fee}`;
      } else {
        for (const office of offices) {
          const nameEn = office.name.toLowerCase();
          const nameFil = office.nameFilipino.toLowerCase();
          if (lower.includes(nameEn) || lower.includes(nameFil)) {
            response =
              lang === 'en'
                ? `**${office.name}** is located at ${office.floor}.\n${office.description}`
                : `**${office.nameFilipino}** ay matatagpuan sa ${office.floor}.\n${office.descriptionFilipino}`;
            break;
          }
        }
      }

      if (!response) {
        response = t(
          'I can help with office hours, service requirements, and navigation. Try asking about: Birth Certificate, Business Permit, Real Property Tax, Senior Citizen ID, or any other service!',
          'Maaari akong tumulong sa oras ng opisina, mga kinakailangan ng serbisyo, at navigation. Subukang magtanong tungkol sa: Sertipiko ng Kapanganakan, Business Permit, Buwis sa Ari-arian, Senior Citizen ID, o anumang iba pang serbisyo!'
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

  const loading = faqsLoading || officesLoading || helpDataLoading;

  return (
    <UserScreenLayout>
      {/* Header */}
      <div className="bg-white px-4 pt-5 pb-0 border-b border-gray-100 sticky top-0 z-40">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate('/home')}
            className="w-9 h-9 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-600"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-base font-semibold text-gray-800">
              {t('Help Center', 'Sentro ng Tulong')}
            </h1>
            <p className="text-xs text-gray-400">
              {t(
                'Frequently asked questions & support',
                'Mga madalas na tanong at suporta'
              )}
            </p>
          </div>
        </div>
        <div className="flex border-b border-gray-100">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2.5 text-xs font-semibold transition-colors relative ${
                activeTab === tab.key ? 'text-orange-500' : 'text-gray-400'
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-orange-500 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 mt-4 pb-10">
        {/* FAQ TAB */}
        {activeTab === 'faq' && (
          <div className="space-y-2.5">
            <p className="text-xs text-gray-400 mb-3">
              {t(
                'Tap any question to expand the answer. Includes all municipal services automatically.',
                'I-tap ang anumang tanong upang palawakin ang sagot. Kasama ang lahat ng serbisyong munisipal.'
              )}
            </p>
            {loading ? (
              <div className="text-center py-10 text-gray-400">
                Loading FAQs…
              </div>
            ) : allFaqs.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                {t('No FAQs yet.', 'Wala pang mga FAQ.')}
              </div>
            ) : (
              allFaqs.map(item => {
                const faqSpeakKey = `faq-${item.id}`;
                const isSpeaking = speakingKey === faqSpeakKey;

                return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-2xl border transition-all overflow-hidden ${
                      openFaq === item.id
                        ? 'border-orange-200 shadow-sm'
                        : 'border-gray-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 p-4">
                      <button
                        onClick={() =>
                          setOpenFaq(openFaq === item.id ? null : item.id ?? null)
                        }
                        className="flex-1 text-left min-w-0"
                      >
                        <p className="text-sm font-medium text-gray-800 leading-snug">
                          {lang === 'en' ? item.question : item.questionFilipino}
                        </p>
                      </button>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => speak(
                            lang === 'en' ? item.answer : item.answerFilipino,
                            faqSpeakKey
                          )}
                          className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                            isSpeaking
                              ? 'bg-orange-500 text-white shadow-md shadow-orange-200'
                              : 'bg-orange-50 text-orange-500 hover:bg-orange-100'
                          }`}
                          title={isSpeaking ? t('Stop', 'Itigil') : t('Read aloud', 'Basahin')}
                          aria-label={isSpeaking ? 'Stop reading' : 'Read aloud'}
                        >
                          {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
                          {isSpeaking && (
                            <span className="absolute inset-0 rounded-full bg-orange-400 opacity-75 animate-ping pointer-events-none" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setOpenFaq(openFaq === item.id ? null : item.id ?? null)
                          }
                          className="w-6 h-6 flex items-center justify-center flex-shrink-0"
                          aria-label={openFaq === item.id ? 'Collapse' : 'Expand'}
                        >
                          {openFaq === item.id ? (
                            <ChevronUp size={16} className="text-orange-500" />
                          ) : (
                            <ChevronDown size={16} className="text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>

                    {openFaq === item.id && (
                      <div className="px-4 pb-4 pt-0 border-t border-gray-50">
                        <p className="text-sm text-gray-600 leading-relaxed mt-3 whitespace-pre-line">
                          {lang === 'en' ? item.answer : item.answerFilipino}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* CONTACT TAB */}
        {activeTab === 'contact' && (
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4">
              <p className="text-sm font-semibold text-orange-700 mb-1">
                {t('Naujan Municipal Building', 'Munisipyo ng Naujan')}
              </p>
              <p className="text-xs text-orange-600">
                {t(
                  'Barangay Santiago, Oriental Mindoro',
                  'Barangay Santiago, Oriental Mindoro'
                )}
              </p>
            </div>

            {loading ? (
              <div className="text-center py-10 text-gray-400">Loading contact info…</div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
                {contactInfo.map((info) => (
                  <div key={info.id} className="flex items-center gap-3 p-4">
                    {info.icon === 'phone' && <Phone size={16} className="text-orange-500" />}
                    {info.icon === 'mail' && <Mail size={16} className="text-orange-500" />}
                    {info.icon === 'map' && <MapPin size={16} className="text-orange-500 mt-0.5" />}
                    <div>
                      <p className="text-xs text-gray-400">{t(info.label, info.label)}</p>
                      <p className="text-sm font-medium text-gray-800 whitespace-pre-line">{info.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && emergencyHotlines.length > 0 && (
              <div className="pt-2">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldAlert size={16} className="text-red-500" />
                  <h3 className="text-sm font-semibold text-gray-800">
                    {t('Emergency Hotlines', 'Mga Emergency Hotline')}
                  </h3>
                </div>

                <div className="bg-white rounded-2xl border border-red-100 divide-y divide-gray-50 overflow-hidden">
                  {emergencyHotlines.map((hotline) => (
                    <div key={hotline.id} className="flex items-start gap-3 p-4 hover:bg-red-50/30 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <AlertCircle size={16} className="text-red-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-800">{hotline.name}</p>
                        <p className="text-sm font-bold text-red-600 mt-1">{hotline.number}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => navigate('/directions')}
              className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white py-3.5 rounded-xl text-sm font-semibold hover:bg-orange-600 active:scale-[0.98] transition mt-2"
            >
              <Navigation size={16} />
              {t(
                'Get Directions to Municipal Building',
                'Direksyon papuntang Munisipyo'
              )}
            </button>
          </div>
        )}

        {/* CHAT TAB */}
        {activeTab === 'chat' && (
          <div
            className="flex flex-col"
            style={{ height: 'calc(100vh - 280px)' }}
          >
            <div className="flex-1 overflow-y-auto space-y-3 pb-4">
              {chatMessages.map((msg, i) => {
                const chatSpeakKey = `chat-${i}`;
                const isSpeaking = speakingKey === chatSpeakKey;

                return (
                  <div
                    key={i}
                    className={`flex ${
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    } items-end gap-2`}
                  >
                    {msg.role === 'bot' && (
                      <div className="w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center">
                        <MessageCircle size={13} className="text-white" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-orange-500 text-white rounded-br-sm'
                          : 'bg-white border border-gray-100 text-gray-700 rounded-bl-sm'
                      }`}
                    >
                      {msg.text}
                      {msg.role === 'bot' && (
                        <button
                          type="button"
                          onClick={() => speak(msg.text, chatSpeakKey)}
                          className={`relative ml-2 inline-flex items-center transition-colors ${
                            isSpeaking
                              ? 'text-orange-500 font-bold'
                              : 'text-gray-400 hover:text-orange-500'
                          }`}
                          title={isSpeaking ? t('Stop', 'Itigil') : t('Read aloud', 'Basahin')}
                        >
                          {isSpeaking ? <VolumeX size={12} /> : <Volume2 size={12} />}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {[
                t('Office hours?', 'Oras ng opisina?'),
                t('Birth certificate?', 'Sertipiko ng kapanganakan?'),
                t('Business permit?', 'Business permit?'),
                t('Tax payment?', 'Pagbabayad ng buwis?'),
              ].map((q, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setChatInput(q);
                    setTimeout(() => handleChat(), 100);
                  }}
                  className="flex-shrink-0 bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-full text-xs font-medium"
                >
                  {q}
                </button>
              ))}
            </div>
            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleChat()}
                placeholder={t(
                  'Ask anything about municipal services...',
                  'Magtanong tungkol sa mga serbisyong munisipal...'
                )}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm"
              />
              <button
                onClick={handleChat}
                className="bg-orange-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold"
              >
                {t('Send', 'Ipadala')}
              </button>
            </div>
          </div>
        )}
      </div>
    </UserScreenLayout>
  );
}