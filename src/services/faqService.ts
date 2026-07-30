import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";

export interface Faq {
  id?: string;
  question: string;
  questionFilipino: string;
  answer: string;
  answerFilipino: string;
  officeId?: string;        // optional: link to an office
  createdAt?: Timestamp;
}

const coll = collection(db, "faqs");

/** Real‑time listener – returns latest FAQs first */
export function useFaqsRealtime(callback: (items: Faq[]) => void) {
  return onSnapshot(query(coll, orderBy("createdAt", "asc")), (snap) => {
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as Faq));
    callback(items);
  });
}

export async function addFaq(item: Faq) {
  const docRef = await addDoc(coll, { ...item, createdAt: Timestamp.now() });
  return docRef.id;
}

export async function updateFaq(id: string, data: Partial<Faq>) {
  await updateDoc(doc(db, "faqs", id), data);
}

export async function deleteFaq(id: string) {
  await deleteDoc(doc(db, "faqs", id));
}