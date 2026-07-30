import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Bell, AlertCircle, Info, Heart, Briefcase, CheckCheck, ChevronRight } from 'lucide-react';
import UserScreenLayout from './UserScreenLayout';
import { useApp } from '../context/AppContext';
import { useNotifications } from '../../hooks/useNotifications';
import { updateNotification, Notification } from '../../services/notificationService';

export default function NotificationsScreen() {
  const navigate = useNavigate();
  const { t, setUnreadCount } = useApp();
  const { notifications, loading } = useNotifications();

  const markAllRead = async () => {
    for (const n of notifications) { if (!n.read && n.id) await updateNotification(n.id, { read: true }); }
  };

  const markRead = async (id: string) => { await updateNotification(id, { read: true }); };

  const getIcon = (type: string) => {
    if (type === 'alert') return <AlertCircle size={16} className="text-red-500" />;
    if (type === 'health') return <Heart size={16} className="text-green-500" />;
    if (type === 'business') return <Briefcase size={16} className="text-blue-500" />;
    return <Info size={16} className="text-orange-500" />;
  };

  const getIconBg = (type: string) => {
    if (type === 'alert') return 'bg-red-50';
    if (type === 'health') return 'bg-green-50';
    if (type === 'business') return 'bg-blue-50';
    return 'bg-orange-50';
  };

  useEffect(() => { setUnreadCount(notifications.filter((n: Notification) => !n.read).length); }, [notifications, setUnreadCount]);

  const unread = notifications.filter((n: Notification) => !n.read).length;

  // ✅ Click handler – navigates to map for map-related notifications
  const handleNotificationClick = (notif: Notification) => {
    if (notif.id) markRead(notif.id);
    if (notif.title.toLowerCase().includes('map') || notif.message.toLowerCase().includes('map') || notif.message.toLowerCase().includes('location')) {
      navigate('/map');
    } else {
      navigate('/home');
    }
  };

  if (loading) return <UserScreenLayout><div className="p-8 text-center text-gray-400">Loading...</div></UserScreenLayout>;

  return (
    <UserScreenLayout>
      <div className="bg-white px-4 pt-5 pb-4 border-b border-gray-100 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-600"><ArrowLeft size={18} /></button>
            <div>
              <h1 className="text-base font-semibold text-gray-800">{t('Notifications', 'Mga Abiso')}</h1>
              {unread > 0 && <p className="text-xs text-orange-500">{unread} {t('unread', 'hindi pa nabasa')}</p>}
            </div>
          </div>
          {unread > 0 && <button onClick={markAllRead} className="flex items-center gap-1.5 text-xs text-orange-500 font-medium"><CheckCheck size={14} />{t('Mark all read', 'Markahang lahat')}</button>}
        </div>
      </div>
      <div className="px-4 mt-4 space-y-2.5">
        {notifications.length === 0 ? (
          <div className="text-center py-20"><Bell size={48} className="text-gray-200 mx-auto mb-4" /><p className="text-sm text-gray-400">{t('No notifications yet.', 'Wala pang mga abiso.')}</p></div>
        ) : (
          notifications.map((notif: Notification) => (
            <button key={notif.id} onClick={() => handleNotificationClick(notif)} className={`w-full flex items-start gap-3 rounded-2xl border p-4 text-left transition-all ${!notif.read ? 'bg-white border-orange-100 shadow-sm' : 'bg-gray-50 border-gray-100'}`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${getIconBg(notif.type)}`}>{getIcon(notif.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-semibold leading-tight ${!notif.read ? 'text-gray-800' : 'text-gray-600'}`}>{notif.title}</p>
                  {!notif.read && <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0 mt-1" />}
                </div>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{notif.message}</p>
                <p className="text-[11px] text-gray-400 mt-1.5">{notif.time}</p>
              </div>
              <ChevronRight size={14} className="text-gray-300 flex-shrink-0 self-center" />
            </button>
          ))
        )}
      </div>
    </UserScreenLayout>
  );
}