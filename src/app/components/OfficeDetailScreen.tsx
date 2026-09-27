import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Phone,
  Volume2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Video,
  Star,
  MessageSquare,
  Send,
  X,
  CheckCircle,
  Loader2,
  Pencil,
  Trash2,
  Plus,
} from 'lucide-react';
import UserScreenLayout from './UserScreenLayout';
import { useApp } from '../context/AppContext';
import { useOffices } from '../../hooks/useOffices';
import {
  addFeedback,
  updateFeedback,
  deleteFeedback,
  subscribeToOfficeFeedbacks,
  Feedback,
} from '../../services/feedbackService';

export default function OfficeDetailScreen() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { t, lang, addVisitedOffice, user } = useApp();
  const [speaking, setSpeaking] = useState<string | null>(null);
  const { offices, loading } = useOffices();

  const office = offices.find((o) => o.id === id);

  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [editingFeedback, setEditingFeedback] = useState<Feedback | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  /* ✅ Services preview toggle */
  const [showAllServices, setShowAllServices] = useState(false);
  const SERVICES_PREVIEW_COUNT = 2;

  const currentUserName =
    (user as any)?.name ||
    (user as any)?.displayName ||
    (user as any)?.email?.split('@')[0] ||
    'Anonymous';
  const currentUserEmail = (user as any)?.email || '';
  const currentUserId = (user as any)?.uid;

  useEffect(() => {
    if (id) addVisitedOffice(id);
  }, [id, offices]);

  useEffect(() => {
    if (!id) return;
    const unsub = subscribeToOfficeFeedbacks(
      id,
      (data) => setFeedbacks(data),
      (err) => console.error('feedback sub error', err)
    );
    return () => unsub();
  }, [id]);

  /* Reset services toggle kapag nagbago ang office */
  useEffect(() => {
    setShowAllServices(false);
  }, [id]);

  const myFeedbacks = user
    ? feedbacks.filter((fb) => fb.userId === currentUserId)
    : [];

  const averageRating =
    feedbacks.length > 0
      ? (feedbacks.reduce((sum, fb) => sum + fb.rating, 0) / feedbacks.length).toFixed(1)
      : '0.0';

  const openNewFeedbackModal = () => {
    setEditingFeedback(null);
    setRating(0);
    setComment('');
    setErrorMessage('');
    setShowFeedbackModal(true);
  };

  const openEditFeedbackModal = (fb: Feedback) => {
    setEditingFeedback(fb);
    setRating(fb.rating);
    setComment(fb.comment || '');
    setErrorMessage('');
    setShowFeedbackModal(true);
  };

  const handleSubmitFeedback = async () => {
    if (!user || !office?.id) {
      setErrorMessage(
        t('You must be logged in to leave feedback.', 'Kailangan mong mag-login para mag-iwan ng feedback.')
      );
      return;
    }
    if (rating === 0) {
      setErrorMessage(t('Please select a rating.', 'Pumili ng rating.'));
      return;
    }

    setSubmitting(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      if (editingFeedback?.id) {
        await updateFeedback(editingFeedback.id, {
          rating,
          comment: comment.trim(),
        });
        setSuccessMessage(
          t('Feedback updated successfully!', 'Matagumpay na na-update ang feedback!')
        );
      } else {
        await addFeedback({
          officeId: office.id,
          officeName: office.name,
          userId: currentUserId,
          userName: currentUserName,
          userEmail: currentUserEmail,
          rating,
          comment: comment.trim(),
        });
        setSuccessMessage(
          t(
            'Thank you! Your feedback has been submitted successfully.',
            'Salamat! Matagumpay na naipadala ang iyong feedback.'
          )
        );
      }

      setShowFeedbackModal(false);
      setEditingFeedback(null);
      setRating(0);
      setComment('');
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(
        err?.message ||
          t('Failed to submit feedback. Please try again.', 'Hindi naipadala ang feedback. Pakisubukan muli.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteFeedback = async (fb: Feedback) => {
    if (!fb?.id) return;
    if (!confirm(t('Delete your feedback?', 'Burahin ang feedback mo?'))) return;
    setDeletingId(fb.id);
    try {
      await deleteFeedback(fb.id);
      setSuccessMessage(t('Feedback deleted.', 'Nabura na ang feedback.'));
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      console.error(err);
      setErrorMessage(t('Failed to delete.', 'Hindi nabura.'));
    } finally {
      setDeletingId(null);
    }
  };

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
            <p className="text-gray-500 text-sm mb-4">
              {t('Office not found.', 'Hindi nahanap ang opisina.')}
            </p>
            <button
              onClick={() => navigate('/services')}
              className="text-orange-500 text-sm font-medium"
            >
              {t('Back to Services', 'Bumalik sa Mga Serbisyo')}
            </button>
          </div>
        </div>
      </UserScreenLayout>
    );
  }

  const speak = (text: string, serviceId: string) => {
    if ('speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined') {
      window.speechSynthesis.cancel();
      if (speaking === serviceId) {
        setSpeaking(null);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'fil' ? 'fil-PH' : 'en-US';
      utterance.rate = 0.9;
      utterance.onend = () => setSpeaking(null);
      utterance.onerror = () => setSpeaking(null);
      window.speechSynthesis.speak(utterance);
      setSpeaking(serviceId);
    }
  };

  const operatingDays = office.operatingDays || 'Monday – Friday';
  const operatingHours = office.operatingHours || '8:00 AM – 5:00 PM';
  const lunchBreak = office.lunchBreak || '12:00 PM – 1:00 PM';

  const handleViewMap = () => navigate(`/map?tab=2d&officeId=${office.id}`);
  const handleViewVR = () => navigate(`/map?tab=vr&officeId=${office.id}`);

  const hasDescription = office.description || office.descriptionFilipino;

  /* ✅ Services preview computation */
  const totalServices = office.services.length;
  const hasMoreServices = totalServices > SERVICES_PREVIEW_COUNT;
  const previewServices = showAllServices
    ? office.services
    : office.services.slice(0, SERVICES_PREVIEW_COUNT);
  const hiddenServicesCount = totalServices - SERVICES_PREVIEW_COUNT;

  const renderMyFeedbackCard = (fb: Feedback, index: number) => (
    <div
      key={fb.id || `fb-${index}`}
      className="rounded-xl p-3 border bg-orange-50 border-orange-100"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 bg-orange-500">
            {(fb.userName || 'A').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-800 truncate">
              {t('You', 'Ikaw')}
            </p>
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={10}
                  className={i < fb.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}
                />
              ))}
              <span className="text-[10px] text-gray-400 ml-0.5">({fb.rating}/5)</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => openEditFeedbackModal(fb)}
            className="w-7 h-7 rounded-lg bg-white border border-orange-200 flex items-center justify-center text-orange-600 hover:bg-orange-100"
            title={t('Edit', 'I-edit')}
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={() => handleDeleteFeedback(fb)}
            disabled={deletingId === fb.id}
            className="w-7 h-7 rounded-lg bg-white border border-red-200 flex items-center justify-center text-red-500 hover:bg-red-50 disabled:opacity-50"
            title={t('Delete', 'Burahin')}
          >
            {deletingId === fb.id ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Trash2 size={12} />
            )}
          </button>
        </div>
      </div>
      {fb.comment && (
        <p className="text-xs text-gray-600 italic mt-1.5">"{fb.comment}"</p>
      )}
    </div>
  );

  return (
    <UserScreenLayout hideNav>
      {successMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100]">
          <div className="flex items-center gap-2 bg-green-500 text-white px-4 py-3 rounded-xl shadow-lg shadow-green-500/30 max-w-[92vw]">
            <CheckCircle size={18} className="flex-shrink-0" />
            <p className="text-xs font-semibold leading-tight">{successMessage}</p>
          </div>
        </div>
      )}

      {/* ============ HEADER ============ */}
      <div className="sticky top-0 z-40">
        <div className="px-4 pt-5 pb-4" style={{ backgroundColor: office.iconBg }}>
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white mb-4"
          >
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
            <div className="flex flex-col gap-2 flex-shrink-0">
              <button
                onClick={handleViewMap}
                className="flex items-center gap-1 bg-white/20 text-white text-xs font-medium px-3 py-2 rounded-lg hover:bg-white/30 transition-colors"
              >
                <MapPin size={14} />
                {t('Map', 'Mapa')}
              </button>
              <button
                onClick={handleViewVR}
                className="flex items-center gap-1 bg-white/20 text-white text-xs font-medium px-3 py-2 rounded-lg hover:bg-white/30 transition-colors"
              >
                <Video size={14} />
                360° VR
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 mt-3 space-y-3 pb-6">
        {errorMessage && !showFeedbackModal && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-600 font-medium">
            {errorMessage}
          </div>
        )}

        <div className="space-y-3">
          {hasDescription && (
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className="text-sm text-gray-600 leading-relaxed">
                {lang === 'en' ? office.description : office.descriptionFilipino}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleViewMap}
              className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col items-center gap-2 hover:border-orange-200 hover:shadow-sm transition-all"
            >
              <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-500">
                <MapPin size={20} />
              </div>
              <span className="text-xs font-semibold text-gray-700">
                {t('View on Map', 'Tingnan sa Mapa')}
              </span>
              <span className="text-[11px] text-gray-400">{office.floor}</span>
            </button>
            <button
              onClick={handleViewVR}
              className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col items-center gap-2 hover:border-purple-200 hover:shadow-sm transition-all"
            >
              <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-500">
                <Video size={20} />
              </div>
              <span className="text-xs font-semibold text-gray-700">
                {t('360° Virtual Tour', '360° Virtual Tour')}
              </span>
              <span className="text-[11px] text-gray-400">
                {t('Explore office', 'I-explore ang opisina')}
              </span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
            <div className="flex items-start gap-3 p-4">
              <Clock size={16} className="text-orange-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-gray-700 mb-0.5">
                  {t('Operating Hours', 'Oras ng Operasyon')}
                </p>
                <p className="text-xs text-gray-500">{operatingDays}</p>
                <p className="text-xs text-gray-500">{operatingHours}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {t('Lunch break:', 'Lunch break:')} {lunchBreak}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4">
              <MapPin size={16} className="text-orange-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-gray-700 mb-0.5">
                  {t('Location', 'Lokasyon')}
                </p>
                <p className="text-xs text-gray-500">{office.floor}</p>
                <p className="text-xs text-gray-400">
                  {t('Municipal Building of Naujan', 'Municipal Building ng Naujan')}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4">
              <Phone size={16} className="text-orange-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-gray-700 mb-0.5">
                  {t('Contact', 'Makipag-ugnayan')}
                </p>
                <p className="text-xs text-gray-500">(043) 284-0000 local ext.</p>
                <p className="text-xs text-gray-400">naujan.gov.ph</p>
              </div>
            </div>
          </div>
        </div>

        {/* ============ AVAILABLE SERVICES ============ */}
        <div className="pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-800">
              {t('Available Services', 'Mga Available na Serbisyo')}
            </h2>
            {hasMoreServices && (
              <p className="text-[11px] text-gray-400">
                {showAllServices
                  ? `${totalServices} ${t('shown', 'ipinapakita')}`
                  : `${SERVICES_PREVIEW_COUNT} / ${totalServices}`}
              </p>
            )}
          </div>

          <div className="space-y-3">
            {totalServices === 0 ? (
              <p className="text-xs text-gray-400">
                {t('No services available.', 'Walang available na serbisyo.')}
              </p>
            ) : (
              <>
                {previewServices.map((service) => (
                  <div
                    key={service.id}
                    className="bg-white rounded-2xl border border-gray-100 p-4"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-800 leading-snug">
                          {lang === 'en' ? service.name : service.nameFilipino}
                        </p>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {lang === 'en' ? service.info : service.infoFilipino}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          const reqs = service.requirements || [];
                          const reqsFil = service.requirementsFilipino || [];
                          speak(
                            lang === 'en'
                              ? `${service.name}. ${service.info}. Requirements: ${reqs
                                  .map((r) => r.requirement)
                                  .join(', ')}`
                              : `${service.nameFilipino}. ${service.infoFilipino}. Mga kinakailangan: ${reqsFil
                                  .map((r) => r.requirement)
                                  .join(', ')}`,
                            service.id || ''
                          );
                        }}
                        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                          speaking === service.id
                            ? 'bg-orange-500 text-white'
                            : 'bg-orange-50 text-orange-500 border border-orange-100'
                        }`}
                        title={t('Read aloud', 'Basahin nang malakas')}
                      >
                        <Volume2
                          size={15}
                          className={speaking === service.id ? 'animate-pulse' : ''}
                        />
                      </button>
                    </div>

                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center gap-1">
                        <Clock size={12} className="text-gray-400" />
                        <span className="text-[11px] text-gray-500">
                          {service.processingTime}
                        </span>
                      </div>
                      <div className="w-px h-3 bg-gray-200" />
                      <span className="text-[11px] text-orange-500 font-semibold">
                        {service.fee}
                      </span>
                    </div>

                    <button
                      onClick={() => navigate(`/office/${office.id}/service/${service.id}`)}
                      className="w-full flex items-center justify-between bg-orange-50 border border-orange-100 rounded-xl px-3 py-2.5 text-orange-600 hover:bg-orange-100 hover:border-orange-200 transition-all"
                    >
                      <span className="text-xs font-semibold">
                        {t('View Requirements', 'Tingnan ang Mga Kinakailangan')}
                      </span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                ))}

                {/* ✅ View more services button */}
                {hasMoreServices && !showAllServices && (
                  <button
                    onClick={() => setShowAllServices(true)}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-3 text-xs font-semibold text-gray-600 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 active:scale-[0.99] transition-all"
                  >
                    <ChevronDown size={14} />
                    {t('View more services', 'Tingnan pa ang serbisyo')} ({hiddenServicesCount})
                  </button>
                )}

                {/* ✅ Show less button */}
                {hasMoreServices && showAllServices && (
                  <button
                    onClick={() => setShowAllServices(false)}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 py-3 text-xs font-semibold text-gray-600 hover:bg-gray-100 active:scale-[0.99] transition-all"
                  >
                    <ChevronUp size={14} />
                    {t('Show less', 'Ipakita ang kaunti')}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* ============ FEEDBACK & RATINGS ============ */}
        <div className="pt-3 border-t border-gray-100">
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-orange-500" />
                <p className="text-sm font-semibold text-gray-800">
                  {t('Your Feedback & Ratings', 'Iyong Feedback at Rating')}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Star size={14} className="text-yellow-400 fill-yellow-400" />
                <span className="text-sm font-bold text-gray-700">{averageRating}</span>
                <span className="text-[10px] text-gray-400">({feedbacks.length})</span>
              </div>
            </div>

            {myFeedbacks.length > 0 ? (
              <div className="space-y-2 mb-3">
                <p className="text-[11px] font-semibold text-orange-600 uppercase">
                  {t('Submitted', 'Naisumite')} ({myFeedbacks.length})
                </p>
                {myFeedbacks.map((fb, i) => renderMyFeedbackCard(fb, i))}
              </div>
            ) : (
              <div className="text-center py-6 mb-3">
                <Star size={28} className="text-gray-200 mx-auto mb-2" />
                <p className="text-xs text-gray-400">
                  {t(
                    'You have not submitted feedback yet.',
                    'Wala ka pang naisumiteng feedback.'
                  )}
                </p>
                <p className="text-[11px] text-gray-300 mt-1">
                  {t(
                    'Share your experience to help others!',
                    'Ibahagi ang iyong karanasan para makatulong sa iba!'
                  )}
                </p>
              </div>
            )}

            <button
              onClick={openNewFeedbackModal}
              className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white py-2.5 rounded-xl text-xs font-semibold hover:bg-orange-600 transition"
            >
              <Plus size={14} />
              {t('Leave Feedback', 'Mag-iwan ng Feedback')}
            </button>
          </div>
        </div>
      </div>

      {/* ============ FEEDBACK MODAL ============ */}
      {showFeedbackModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={() => !submitting && setShowFeedbackModal(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-800">
                {editingFeedback
                  ? t('Edit Feedback', 'I-edit ang Feedback')
                  : t('Leave Feedback', 'Mag-iwan ng Feedback')}
              </h3>
              <button
                onClick={() => !submitting && setShowFeedbackModal(false)}
                className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-3">
              {t('How was your experience at', 'Kumusta ang iyong karanasan sa')}{' '}
              <strong>{lang === 'en' ? office.name : office.nameFilipino}</strong>?
            </p>

            <div className="flex items-center justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    size={32}
                    className={
                      star <= rating
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-200'
                    }
                  />
                </button>
              ))}
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t('Share your experience...', 'Ibahagi ang iyong karanasan...')}
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400 mb-4"
            />

            {errorMessage && (
              <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-2">
                {errorMessage}
              </div>
            )}

            <button
              onClick={handleSubmitFeedback}
              disabled={submitting || rating === 0}
              className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white py-3 rounded-xl font-semibold text-sm hover:bg-orange-600 disabled:opacity-50 transition"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>
                    {editingFeedback
                      ? t('Updating...', 'Ina-update...')
                      : t('Submitting...', 'Isinusumite...')}
                  </span>
                </>
              ) : (
                <>
                  <Send size={14} />
                  {editingFeedback
                    ? t('Update Feedback', 'I-update ang Feedback')
                    : t('Submit Feedback', 'Isumite ang Feedback')}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </UserScreenLayout>
  );
}