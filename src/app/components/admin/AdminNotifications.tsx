import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Bell, AlertCircle, Info, Heart, Briefcase, CheckCheck, ArrowLeft, Shield } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useNotificationsRealtime, updateNotification, Notification } from '../../../services/notificationService';

export default function AdminNotifications() {
  const navigate = useNavigate();
  const { setUnreadCount } = useApp();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const unsub = useNotificationsRealtime((data) => {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read).length);
    });
    return () => unsub();
  }, [setUnreadCount]);

  const markAllRead = async () => {
    for (const n of notifications) {
      if (!n.read && n.id) await updateNotification(n.id, { read: true });
    }
  };

  const markRead = async (id: string) => {
    await updateNotification(id, { read: true });
  };

  const getIcon = (type: string) => {
    if (type === 'alert') return <AlertCircle size={16} className="text-red-500" />;
    if (type === 'health') return <Heart size={16} className="text-green-500" />;
    if (type === 'business') return <Briefcase size={16} className="text-blue-500" />;
    return <Info size={16} className="text-orange-500" />;
  };

  const getIconBg = (type: string) => ({ alert: 'bg-red-50', health: 'bg-green-50', business: 'bg-blue-50' }[type] || 'bg-orange-50');

  const unread = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6 max-w-4xl" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-50"><ArrowLeft size={18} /></button>
          <div>
            <h2 className="text-lg font-bold text-gray-800">Notifications</h2>
            <p className="text-sm text-gray-400">{unread > 0 ? `${unread} unread` : 'All caught up'}</p>
          </div>
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} className="flex items-center gap-1.5 text-sm text-orange-600 bg-orange-50 border border-orange-100 px-4 py-2 rounded-xl font-medium hover:bg-orange-100">
            <CheckCheck size={15} /> Mark all read
          </button>
        )}
      </div>

      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><Shield size={20} className="text-white" /></div>
          <div>
            <p className="text-sm font-semibold">Administrator Notifications</p>
            <p className="text-xs text-orange-100">System alerts and user activity</p>
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        {notifications.map(notif => (
          <button key={notif.id} onClick={() => notif.id && markRead(notif.id)} className={`w-full flex items-start gap-4 rounded-2xl border p-5 text-left transition-all ${!notif.read ? 'bg-white border-orange-100 shadow-sm' : 'bg-gray-50 border-gray-100'}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${getIconBg(notif.type)}`}>{getIcon(notif.type)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className={`text-sm font-semibold ${!notif.read ? 'text-gray-800' : 'text-gray-600'}`}>{notif.title}</p>
                {!notif.read && <div className="w-2.5 h-2.5 bg-orange-500 rounded-full flex-shrink-0 mt-1.5" />}
              </div>
              <p className="text-xs text-gray-500 mt-1">{notif.message}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[11px] text-gray-400">{notif.time}</span>
                <span className="text-[11px] text-gray-300">•</span>
                <span className="text-[11px] uppercase text-gray-400">{notif.type}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}