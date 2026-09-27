import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  ArrowLeft,
  ArrowRight,
  SkipForward,
  CheckCircle2,
  Play,
  X,
  MapPin,
  Sparkles,
  QrCode,
  HelpCircle,
  MessageSquare,
  Video,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';


const YOUTUBE_VIDEO_URL = 'https://youtu.be/p9Wjk0GtRd4';

function toEmbedUrl(url: string): string {
  if (!url) return '';
  const watchMatch = url.match(/youtube\.com\/watch\?v=([^&]+)/);
  if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;
  const shortMatch = url.match(/youtu\.be\/([^?]+)/);
  if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
  if (url.includes('/embed/')) return url;
  return url;
}

interface Slide {
  id: string;
  image: string;          
  fallbackIcon: any;      
  iconBg: string;
  iconColor: string;
  titleEn: string;
  titleFil: string;
  descEn: string;
  descFil: string;
  bullets?: { en: string; fil: string }[];
}

const SLIDES: Slide[] = [
  {
    id: 'login',
    image: '/login.png',
    fallbackIcon: Sparkles,
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
    titleEn: 'Welcome to FindNau!',
    titleFil: 'Maligayang Pagdating sa FindNau!',
    descEn:
      "Sign in or create your account to access all municipal services and building navigation.",
    descFil:
      'Mag-sign in o gumawa ng account para ma-access ang lahat ng serbisyong munisipal at navigation ng gusali.',
  },
  {
    id: 'home',
    image: '/home.png',
    fallbackIcon: Sparkles,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    titleEn: 'Your Home Dashboard',
    titleFil: 'Ang Iyong Home Dashboard',
    descEn:
      'Quick access to everything — QR Scanner, E-Services, Map, 360° Tour, Announcements, and Help Center.',
    descFil:
      'Mabilis na access sa lahat — QR Scanner, E-Services, Mapa, 360° Tour, Anunsyo, at Help Center.',
    bullets: [
      {
        en: 'Tap any quick-access card to open a feature',
        fil: 'I-tap ang anumang quick-access card para buksan ang feature',
      },
      {
        en: 'Check latest announcements right on home',
        fil: 'Tingnan ang pinakabagong anunsyo sa home screen',
      },
    ],
  },
  {
    id: 'services',
    image: '/services.png',
    fallbackIcon: Sparkles,
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    titleEn: 'Browse Municipal Services',
    titleFil: 'Tingnan ang Mga Serbisyong Munisipal',
    descEn:
      'Search offices, view all available services, requirements, fees, and processing time.',
    descFil:
      'Maghanap ng opisina, tingnan ang lahat ng serbisyo, requirements, bayad, at oras ng pagproseso.',
    bullets: [
      {
        en: 'Search by office name or service',
        fil: 'Maghanap sa pangalan ng opisina o serbisyo',
      },
      {
        en: 'Filter by floor — Ground Floor, 2nd Floor, etc.',
        fil: 'I-filter ayon sa palapag — Ground Floor, 2nd Floor, atbp.',
      },
    ],
  },
  {
    id: '2d',
    image: '/2d.png',
    fallbackIcon: MapPin,
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    titleEn: 'Find Any Office — 2D Map',
    titleFil: 'Hanapin ang Anumang Opisina — 2D Mapa',
    descEn:
      'Interactive floor plan of the municipal building. Tap a dot to see the office name and directions.',
    descFil:
      'Interactive floor plan ng munisipyo. I-tap ang dot para makita ang pangalan ng opisina at direksyon.',
    bullets: [
      {
        en: 'Tap a dot to reveal the office name',
        fil: 'I-tap ang dot para makita ang pangalan ng opisina',
      },
      {
        en: 'See the path from entrance to your destination',
        fil: 'Tingnan ang daan mula entrance papunta sa destinasyon',
      },
    ],
  },
  {
    id: '360',
    image: '/360.png',
    fallbackIcon: Video,
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    titleEn: '360° Virtual Tour',
    titleFil: '360° Virtual Tour',
    descEn:
      'Walk through the municipal building in 3D. Explore offices and hallways before you even arrive.',
    descFil:
      'Maglakad sa munisipyo sa 3D. I-explore ang mga opisina at hallway bago ka pa dumating.',
    bullets: [
      {
        en: 'Tap hotspots to navigate to nearby scenes',
        fil: 'I-tap ang hotspots para pumunta sa kalapit na eksena',
      },
      {
        en: 'Minimap shows where you are in the building',
        fil: 'Ipinapakita ng minimap kung saan ka sa gusali',
      },
    ],
  },
  {
    id: 'qr',
    image: '/qr.png',
    fallbackIcon: QrCode,
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    titleEn: 'Scan QR Codes to Navigate',
    titleFil: 'I-Scan ang QR Codes para Mag-Navigate',
    descEn:
      'Look for QR codes posted in hallways or entrances. Scan them to instantly find where you are.',
    descFil:
      'Hanapin ang mga QR codes na nakapaskil sa hallway o entrance. I-scan ang mga ito para malaman kung nasaan ka.',
    bullets: [
      {
        en: 'Point your camera at any QR code in the building',
        fil: 'I-point ang camera sa anumang QR code sa gusali',
      },
      {
        en: 'Get instant direction to the nearest office',
        fil: 'Makuha agad ang direksyon sa pinakamalapit na opisina',
      },
    ],
  },
  {
    id: 'feedback',
    image: '/feedback.png',
    fallbackIcon: MessageSquare,
    iconBg: 'bg-yellow-100',
    iconColor: 'text-yellow-600',
    titleEn: 'Share Your Feedback',
    titleFil: 'Ibahagi ang Iyong Feedback',
    descEn:
      'Rate your experience at any office. Help us improve municipal services for everyone.',
    descFil:
      'I-rate ang iyong karanasan sa anumang opisina. Tumulong sa pagpapabuti ng serbisyo para sa lahat.',
    bullets: [
      {
        en: 'Tap "Leave Feedback" at any office page',
        fil: 'I-tap ang "Mag-iwan ng Feedback" sa anumang office page',
      },
      {
        en: 'Give a star rating and optional comment',
        fil: 'Magbigay ng star rating at opsyonal na comment',
      },
    ],
  },
  {
    id: 'help',
    image: '/help.png',
    fallbackIcon: HelpCircle,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-500',
    titleEn: "Need Help? We're Here.",
    titleFil: 'Kailangan ng Tulong? Nandito Kami.',
    descEn:
      'Access FAQs, emergency hotlines, contact information, or chat with our AI assistant 24/7.',
    descFil:
      'I-access ang FAQs, emergency hotlines, contact information, o makipag-chat sa AI assistant namin 24/7.',
    bullets: [
      {
        en: 'FAQs with auto-generated answers for all services',
        fil: 'FAQs na may auto-generated na sagot para sa lahat ng serbisyo',
      },
      {
        en: 'Read-aloud option for accessibility',
        fil: 'Read-aloud option para sa accessibility',
      },
    ],
  },
  {
    id: 'ready',
    image: '',
    fallbackIcon: CheckCircle2,
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
    titleEn: "You're All Set!",
    titleFil: 'Handa Ka Na!',
    descEn:
      'Start exploring FindNau and discover how easy accessing municipal services can be.',
    descFil:
      'Simulan ang pag-explore sa FindNau at tuklasin kung gaano kadali ang pag-access sa mga serbisyong munisipal.',
  },
];

export default function TutorialScreen() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const isNewUser = params.get('new') === 'true';
  const { t, lang, user } = useApp();

  const [currentSlide, setCurrentSlide] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const [imgError, setImgError] = useState<Record<string, boolean>>({});

  const slide = SLIDES[currentSlide];
  const isLast = currentSlide === SLIDES.length - 1;
  const isFirst = currentSlide === 0;
  const embedUrl = toEmbedUrl(YOUTUBE_VIDEO_URL);
  const hasVideo = !!embedUrl;
  const showImage = slide.image && !imgError[slide.id];

  const handleNext = () => {
    if (isLast) handleFinish();
    else setCurrentSlide((s) => s + 1);
  };

  const handlePrev = () => {
    if (!isFirst) setCurrentSlide((s) => s - 1);
  };

  const handleSkip = () => handleFinish();

  const handleFinish = async () => {
    try {
      localStorage.setItem('findnau_tutorial_seen', 'true');
      sessionStorage.removeItem('findnau_just_signed_up');
    } catch {}

    if (isNewUser && user && (user as any).uid) {
      try {
        const userRef = doc(db, 'users', (user as any).uid);
        await updateDoc(userRef, { hasSeenTutorial: true });
      } catch (e) {
        console.error('Failed to set tutorial flag:', e);
      }
    }

    navigate('/home', { replace: true });
  };

  const FallbackIcon = slide.fallbackIcon;

  return (
    <div
      className="min-h-screen bg-white flex flex-col"
      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
    >
      {/* Header with back + dots + skip */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
        <button
          onClick={handlePrev}
          disabled={isFirst}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
            isFirst
              ? 'opacity-0 pointer-events-none'
              : 'bg-gray-50 border border-gray-100 text-gray-600 hover:bg-gray-100'
          }`}
          aria-label="Previous slide"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="flex items-center gap-1.5">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === currentSlide
                  ? 'w-6 bg-orange-500'
                  : i < currentSlide
                  ? 'w-1.5 bg-orange-300'
                  : 'w-1.5 bg-gray-200'
              }`}
            />
          ))}
        </div>

        <button
          onClick={handleSkip}
          className="flex items-center gap-1 text-xs text-gray-400 font-medium hover:text-gray-600 transition-colors"
          aria-label="Skip tutorial"
        >
          {t('Skip', 'Laktawan')}
          <SkipForward size={14} />
        </button>
      </div>

      {/* Slide content */}
      <div className="flex-1 flex flex-col px-6 pt-4 pb-4 overflow-y-auto">
        {/* Image area — phone frame style */}
        <div className="flex justify-center mb-5 flex-shrink-0">
          {showImage ? (
            <div className="relative w-full max-w-[260px] rounded-3xl overflow-hidden shadow-xl border-[6px] border-gray-900 bg-gray-900">
              {/* Notch */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 bg-gray-900 rounded-full z-10" />
              {/* Screenshot */}
              <div className="aspect-[9/19] bg-white overflow-hidden">
                <img
                  src={slide.image}
                  alt={lang === 'en' ? slide.titleEn : slide.titleFil}
                  className="w-full h-full object-cover object-top"
                  onError={() =>
                    setImgError((prev) => ({ ...prev, [slide.id]: true }))
                  }
                  loading="eager"
                />
              </div>
            </div>
          ) : (
            /* Fallback icon kung walang image o hindi nag-load */
            <div
              className={`w-24 h-24 rounded-3xl ${slide.iconBg} flex items-center justify-center shadow-lg`}
            >
              <FallbackIcon
                size={48}
                className={slide.iconColor}
                strokeWidth={1.8}
              />
            </div>
          )}
        </div>

        {/* Title */}
        <h1 className="text-xl font-bold text-gray-800 text-center leading-tight mb-2">
          {lang === 'en' ? slide.titleEn : slide.titleFil}
        </h1>

        {/* Description */}
        <p className="text-sm text-gray-500 text-center leading-relaxed max-w-md mx-auto mb-4">
          {lang === 'en' ? slide.descEn : slide.descFil}
        </p>

        {/* Bullets */}
        {slide.bullets && slide.bullets.length > 0 && (
          <div className="space-y-2 max-w-md mx-auto w-full mb-4">
            {slide.bullets.map((b, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 bg-gray-50 rounded-xl p-3"
              >
                <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 size={11} className="text-orange-600" />
                </div>
                <p className="text-xs text-gray-700 leading-relaxed">
                  {lang === 'en' ? b.en : b.fil}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Video button — unang slide lang */}
        {hasVideo && currentSlide === 0 && (
          <button
            onClick={() => setShowVideo(true)}
            className="max-w-md mx-auto w-full flex items-center justify-center gap-2 bg-orange-50 border border-orange-100 text-orange-600 py-3 rounded-xl font-semibold text-sm hover:bg-orange-100 active:scale-[0.98] transition-all mt-2"
          >
            <Play size={15} className="fill-orange-600" />
            {t('Watch Video Tutorial', 'Manood ng Video Tutorial')}
          </button>
        )}
      </div>

      {/* Bottom button */}
      <div className="px-6 pb-6 pt-2 flex-shrink-0">
        <button
          onClick={handleNext}
          className="w-full bg-orange-500 text-white py-4 rounded-2xl font-bold text-sm hover:bg-orange-600 active:scale-[0.98] transition-all shadow-lg shadow-orange-200 flex items-center justify-center gap-2"
        >
          {isLast ? (
            <>
              {t('Start Using FindNau', 'Simulan ang FindNau')}
              <CheckCircle2 size={18} />
            </>
          ) : (
            <>
              {t('Next', 'Susunod')}
              <ArrowRight size={18} />
            </>
          )}
        </button>

        {isNewUser && !isLast && (
          <p className="text-[11px] text-gray-400 text-center mt-3">
            {t(
              'Quick tour lang po — 30 seconds.',
              'Mabilisang tour lang po — 30 segundo.'
            )}
          </p>
        )}
      </div>

      {/* ============ VIDEO MODAL ============ */}
      {showVideo && hasVideo && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowVideo(false)}
        >
          <div
            className="w-full max-w-3xl bg-black rounded-2xl overflow-hidden shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowVideo(false)}
              className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/60 backdrop-blur text-white flex items-center justify-center hover:bg-black/80 transition-colors"
              aria-label="Close video"
            >
              <X size={18} />
            </button>

            <div style={{ paddingBottom: '56.25%', position: 'relative' }}>
              <iframe
                src={`${embedUrl}?autoplay=1&rel=0&modestbranding=1`}
                title="FindNau Tutorial"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  border: 'none',
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}