import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";

export interface Announcement {
  id?: string;
  title: string;
  titleFilipino: string;
  date: string;
  content: string;
  contentFilipino: string;
  category: string;
  urgent: boolean;
  createdAt?: Timestamp;
}

const coll = collection(db, "announcements");

export function useAnnouncementsRealtime(callback: (items: Announcement[]) => void) {
  return onSnapshot(query(coll, orderBy("createdAt", "desc")), (snap) => {
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as Announcement));
    callback(items);
  });
}

export async function addAnnouncement(item: Announcement) {
  const docRef = await addDoc(coll, { ...item, createdAt: Timestamp.now() });
  return docRef.id;
}

export async function updateAnnouncement(id: string, data: Partial<Announcement>) {
  await updateDoc(doc(db, "announcements", id), data);
}

export async function deleteAnnouncement(id: string) {
  await deleteDoc(doc(db, "announcements", id));
}