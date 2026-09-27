import { useEffect, useState } from 'react';
import { useNotificationsRealtime, Notification } from '../services/notificationService';

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = useNotificationsRealtime((data) => {
      setNotifications(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { notifications, loading };
}