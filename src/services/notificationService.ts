import { db } from '../firebase';
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';

export type NotificationType = 'announcement' | 'service' | 'location' | 'info';

export interface Notification {
  id?: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  time: string;
  createdAt?: any;
  relatedId?: string;
}

export const createNotification = async (
  data: Omit<Notification, 'id' | 'createdAt' | 'read' | 'time'>
) => {
  try {
    const docRef = await addDoc(collection(db, 'notifications'), {
      ...data,
      read: false,
      time: formatNow(),
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

export const notifyNewAnnouncement = async (title: string, announcementId?: string) => {
  return createNotification({
    type: 'announcement',
    title: 'New Announcement',
    message: title,
    relatedId: announcementId,
  });
};

export const notifyNewService = async (serviceName: string, officeName: string, serviceId?: string) => {
  return createNotification({
    type: 'service',
    title: 'New Service Available',
    message: `${serviceName} is now available at ${officeName}.`,
    relatedId: serviceId,
  });
};

export const notifyOfficeLocationUpdated = async (officeName: string, newFloor: string, officeId?: string) => {
  return createNotification({
    type: 'location',
    title: 'Office Location Updated',
    message: `${officeName} is now located at ${newFloor}.`,
    relatedId: officeId,
  });
};

const formatNow = () => {
  const d = new Date();
  const diff = 0;
  return d.toLocaleString();
};

export const updateNotification = async (
  id: string,
  data: Partial<Notification>
) => {
  try {
    await updateDoc(doc(db, 'notifications', id), data);
  } catch (error) {
    console.error('Error updating notification:', error);
    throw error;
  }
};

export const deleteNotification = async (id: string) => {
  try {
    await deleteDoc(doc(db, 'notifications', id));
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
};

export const getAllNotifications = async (): Promise<Notification[]> => {
  try {
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Notification));
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
};

export const useNotificationsRealtime = (
  callback: (notifications: Notification[]) => void
) => {
  const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Notification));
      callback(list);
    },
    (err) => {
      console.error('Error subscribing to notifications:', err);
      callback([]);
    }
  );
};