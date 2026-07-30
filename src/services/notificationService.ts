import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";

export interface Notification {
  id?: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'alert' | 'info' | 'health' | 'business';
  createdAt?: Timestamp;
}

const coll = collection(db, "notifications");

export function useNotificationsRealtime(callback: (items: Notification[]) => void) {
  return onSnapshot(query(coll, orderBy("createdAt", "desc")), (snap) => {
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification));
    callback(items);
  });
}

export async function addNotification(item: Notification) {
  const docRef = await addDoc(coll, { ...item, createdAt: Timestamp.now() });
  return docRef.id;
}

export async function updateNotification(id: string, data: Partial<Notification>) {
  await updateDoc(doc(db, "notifications", id), data);
}

export async function deleteNotification(id: string) {
  await deleteDoc(doc(db, "notifications", id));
}