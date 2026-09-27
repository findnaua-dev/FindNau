import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft,
  Bell,
  Megaphone,
  Sparkles,
  MapPin,
  CheckCheck,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import UserScreenLayout from './UserScreenLayout';
import { useApp } from '../context/AppContext';
import { useNotifications } from '../../hooks/useNotifications';
import {
  updateNotification,
  deleteNotification,
  Notification,
} from '../../services/notificationService';

/** 1 linggo = 7 araw */
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Mga type na lang na ipapakita: announcement, service, location */
const VISIBLE_TYPES: Notification['type'][] = ['announcement', 'service', 'location'];

/** Kunin ang timestamp (ms) kahit anong format ang createdAt */
const toMillis = (notif: Notification): number => {
  const c: any = notif.createdAt;
  if (!c) return 0;
  if (typeof c?.toMillis === 'function') return c.toMillis();
  if (typeof c?.seconds === 'number') return c.seconds * 1000;
  if (c instanceof Date) return c.getTime();
  if (typeof c === 'number') return c;
  const parsed = Date.parse(String(c));
  return Number.isNaN(parsed) ? 0 : parsed;
};

export default function NotificationsScreen() {
  const navigate = useNavigate();
  const { t, setUnreadCount } = useApp();
  const { notifications, loading } = useNotifications();

  const [showAll, setShowAll] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  /* ---------- Filter: announcements, new offices, services lang ---------- */
  const visibleNotifications = useMemo(
    () => notifications.filter((n) => VISIBLE_TYPES.includes(n.type)),
    [notifications]
  );

  /* ---------- Hatiin: recent (1 week) vs older ---------- */
  const { recent, older } = useMemo(() => {
    const now = Date.now();
    const recentList: Notification[] = [];
    const olderList: Notification[] = [];

    for (const n of visibleNotifications) {
      const ms = toMillis(n);
      if (ms === 0 || now - ms <= WEEK_MS) recentList.push(n);
      else olderList.push(n);
    }

    return { recent: recentList, older: olderList };
  }, [visibleNotifications]);

  const unread = visibleNotifications.filter((n) => !n.read).length;

  /* ---------- Sync unread badge sa context ---------- */
  useEffect(() => {
    setUnreadCount(unread);
  }, [unread, setUnreadCount]);

  /* ---------- Mark as read ---------- */
  const markRead = async (id: string) => {
    try {
      await updateNotification(id, { read: true });
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const markAllRead = async () => {
    const list = visibleNotifications.filter((n) => !n.read && n.id);
    await Promise.all(
      list.map((n) =>
        updateNotification(n.id as string, { read: true }).catch((err) => {
          console.error('Failed to mark all read:', err);
          return null;
        })
      )
    );
  };

  /* ---------- Delete (isa-isa) ---------- */
  const handleDelete = async (id?: string) => {
    if (!id) return;
    setBusyId(id);
    try {
      await deleteNotification(id);
    } catch (err) {
      console.error('Failed to delete notification:', err);
    } finally {
      setBusyId(null);
      setConfirmId(null);
    }
  };

  /* ---------- Click: mark read + puntahan ang update ---------- */
  const handleNotificationClick = (notif: Notification) => {
    if (confirmId === notif.id) return;

    if (notif.id && !notif.read) markRead(notif.id);

    if (notif.type === 'location') navigate('/map');
    else if (notif.type === 'service') navigate('/services');
    else if (notif.type === 'announcement') navigate('/announcements');
  };

  /* ---------- Icons / colors ---------- */
  const getIcon = (type: string) => {
    if (type === 'announcement') return <Megaphone size={16} className="text-orange-500" />;
    if (type === 'service') return <Sparkles size={16} className="text-green-500" />;
    if (type === 'location') return <MapPin size={16} className="text-purple-500" />;
    return <Bell size={16} className="text-blue-500" />;
  };

  const getIconBg = (type: string) => {
    if (type === 'announcement') return 'bg-orange-50';
    if (type === 'service') return 'bg-green-50';
    if (type === 'location') return 'bg-purple-50';
    return 'bg-blue-50';
  };

  const getLabel = (type: string) => {
    if (type === 'announcement') return t('Announcement', 'Anunsyo');
    if (type === 'service') return t('New Service', 'Bagong Serbisyo');
    if (type === 'location') return t('New Office', 'Bagong Opisina');
    return t('Notification', 'Abiso');
  };

  /* ---------- Card renderer ---------- */
  const renderCard = (notif: Notification) => {
    const isConfirming = confirmId === notif.id;

    return (
      <div
        key={notif.id}
        onClick={() => handleNotificationClick(notif)}
        className={`w-full rounded-2xl border p-4 text-left transition-all cursor-pointer ${
          !notif.read
            ? 'bg-white border-orange-100 shadow-sm'
            : 'bg-gray-50 border-gray-100 hover:border-orange-200 hover:shadow-sm'
        }`}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${getIconBg(
              notif.type
            )}`}
          >
            {getIcon(notif.type)}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span
                  className={`inline-block text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md mb-1 ${getIconBg(
                    notif.type
                  )}`}
                >
                  {getLabel(notif.type)}
                </span>
                <p
                  className={`text-sm font-semibold leading-tight ${
                    !notif.read ? 'text-gray-800' : 'text-gray-600'
                  }`}
                >
                  {notif.title}
                </p>
              </div>
              {!notif.read && (
                <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0 mt-1" />
              )}
            </div>

            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{notif.message}</p>
            <p className="text-[11px] text-gray-400 mt-1.5">{notif.time}</p>

            {/* Inline delete confirm */}
            {isConfirming && (
              <div className="mt-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <span className="text-[11px] text-gray-500">
                  {t('Delete this?', 'Burahin ito?')}
                </span>
                <button
                  onClick={() => handleDelete(notif.id)}
                  disabled={busyId === notif.id}
                  className="text-[11px] font-semibold text-red-500 px-2 py-1 rounded-lg bg-red-50 disabled:opacity-50"
                >
                  {busyId === notif.id ? '...' : t('Delete', 'Burahin')}
                </button>
                <button
                  onClick={() => setConfirmId(null)}
                  className="text-[11px] font-semibold text-gray-500 px-2 py-1 rounded-lg bg-gray-100"
                >
                  {t('Cancel', 'Kansel')}
                </button>
              </div>
            )}
          </div>

          {/* Right actions */}
          <div className="flex flex-col items-center gap-2 flex-shrink-0 self-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setConfirmId(isConfirming ? null : notif.id ?? null);
              }}
              aria-label="Delete notification"
              className="w-7 h-7 rounded-full flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={14} />
            </button>
            <ChevronRight size={14} className="text-gray-300" />
          </div>
        </div>
      </div>
    );
  };

  /* ---------- Loading ---------- */
  if (loading) {
    return (
      <UserScreenLayout>
        <div className="p-8 text-center text-gray-400">Loading...</div>
      </UserScreenLayout>
    );
  }

  return (
    <UserScreenLayout>
      {/* Header */}
      <div className="bg-white px-4 pt-5 pb-4 border-b border-gray-100 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/home')}
              className="w-9 h-9 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-600"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-base font-semibold text-gray-800">
                {t('Notifications', 'Mga Abiso')}
              </h1>
              {unread > 0 ? (
                <p className="text-xs text-orange-500">
                  {unread} {t('unread', 'hindi pa nabasa')}
                </p>
              ) : (
                <p className="text-xs text-gray-400">
                  {t('You are all caught up', 'Wala kang bagong abiso')}
                </p>
              )}
            </div>
          </div>

          {unread > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 text-xs text-orange-500 font-medium hover:text-orange-600"
            >
              <CheckCheck size={14} />
              {t('Mark all read', 'Markahang lahat')}
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="px-4 mt-4 pb-8 space-y-2.5">
        {visibleNotifications.length === 0 ? (
          /* ---------- Empty state (new user) ---------- */
          <div className="text-center py-20">
            <Bell size={48} className="text-gray-200 mx-auto mb-4" />
            <p className="text-sm text-gray-400">
              {t('No notifications yet.', 'Wala pang mga abiso.')}
            </p>
            <p className="text-xs text-gray-300 mt-1 max-w-[260px] mx-auto">
              {t(
                'You will be notified about new announcements, services, and new offices.',
                'Aabisuhan ka tungkol sa mga bagong anunsyo, serbisyo, at bagong opisina.'
              )}
            </p>
          </div>
        ) : (
          <>
            {/* Walang bago ngayong linggo pero may lumang notifs */}
            {!showAll && recent.length === 0 && (
              <div className="text-center py-14">
                <Bell size={40} className="text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400">
                  {t('No new notifications this week.', 'Walang bagong abiso ngayong linggo.')}
                </p>
              </div>
            )}

            {/* Preview: recent lang (1 week) */}
            {!showAll && recent.map(renderCard)}

            {/* View all: recent + older */}
            {showAll && (
              <>
                {recent.length > 0 && (
                  <>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 px-1 pt-1">
                      {t('This week', 'Ngayong linggo')}
                    </p>
                    {recent.map(renderCard)}
                  </>
                )}

                {older.length > 0 && (
                  <>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 px-1 pt-3">
                      {t('Older', 'Mas luma')}
                    </p>
                    {older.map(renderCard)}
                  </>
                )}
              </>
            )}

            {/* Button: view other notifications */}
            {!showAll && older.length > 0 && (
              <button
                onClick={() => setShowAll(true)}
                className="w-full flex items-center justify-center gap-1.5 rounded-2xl border border-gray-100 bg-gray-50 py-3 text-xs font-semibold text-gray-600 hover:border-orange-200 hover:text-orange-500 active:scale-[0.99] transition-all"
              >
                {t('View other notifications', 'Tingnan ang iba pang abiso')} ({older.length})
                <ChevronRight size={14} />
              </button>
            )}

            {/* Button: show less */}
            {showAll && older.length > 0 && (
              <button
                onClick={() => setShowAll(false)}
                className="w-full flex items-center justify-center gap-1.5 rounded-2xl border border-gray-100 bg-gray-50 py-3 text-xs font-semibold text-gray-600 hover:border-orange-200 hover:text-orange-500 active:scale-[0.99] transition-all"
              >
                {t('Show less', 'Ipakita ang kaunti')}
              </button>
            )}
          </>
        )}
      </div>
    </UserScreenLayout>
  );
}