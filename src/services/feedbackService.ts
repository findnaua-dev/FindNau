import { db } from '../firebase';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';

export interface Feedback {
  id?: string;
  officeId: string;
  officeName?: string;
  userId: string;
  userName: string;
  userEmail?: string;
  rating: number;
  comment: string;
  createdAt: any;
  updatedAt?: any;
}

// ==========================================
// ADD
// ==========================================
export const addFeedback = async (
  feedback: Omit<Feedback, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  try {
    if (!feedback.userId) throw new Error('Missing userId');
    if (!feedback.officeId) throw new Error('Missing officeId');
    if (!feedback.rating || feedback.rating < 1 || feedback.rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    const docRef = await addDoc(collection(db, 'feedbacks'), {
      ...feedback,
      comment: feedback.comment?.trim() || '',
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('❌ Error adding feedback:', error);
    throw error;
  }
};

// ==========================================
// UPDATE (para sa EDIT feature)
// ==========================================
export const updateFeedback = async (
  feedbackId: string,
  data: { rating: number; comment: string }
): Promise<void> => {
  try {
    if (!feedbackId) throw new Error('Missing feedbackId');
    if (!data.rating || data.rating < 1 || data.rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    const ref = doc(db, 'feedbacks', feedbackId);
    await updateDoc(ref, {
      rating: data.rating,
      comment: data.comment?.trim() || '',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('❌ Error updating feedback:', error);
    throw error;
  }
};

// ==========================================
// DELETE
// ==========================================
export const deleteFeedback = async (feedbackId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'feedbacks', feedbackId));
  } catch (error) {
    console.error('❌ Error deleting feedback:', error);
    throw error;
  }
};

// ==========================================
// CHECK if user already submitted
// ==========================================
export const hasUserSubmittedFeedback = async (
  userId: string,
  officeId: string
): Promise<boolean> => {
  try {
    const q = query(
      collection(db, 'feedbacks'),
      where('userId', '==', userId),
      where('officeId', '==', officeId)
    );
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('Error checking existing feedback:', error);
    return false;
  }
};

// ==========================================
// GET (one-time reads)
// ==========================================
export const getOfficeFeedbacks = async (officeId: string): Promise<Feedback[]> => {
  try {
    const q = query(
      collection(db, 'feedbacks'),
      where('officeId', '==', officeId)
    );
    const snapshot = await getDocs(q);
    const list = snapshot.docs.map(
      (d) => ({ id: d.id, ...d.data() } as Feedback)
    );
    return list.sort(sortByNewest);
  } catch (error) {
    console.error('Error fetching office feedbacks:', error);
    return [];
  }
};

export const getAllFeedbacks = async (): Promise<Feedback[]> => {
  try {
    const q = query(collection(db, 'feedbacks'));
    const snapshot = await getDocs(q);
    const list = snapshot.docs.map(
      (d) => ({ id: d.id, ...d.data() } as Feedback)
    );
    return list.sort(sortByNewest);
  } catch (error) {
    console.error('Error fetching all feedbacks:', error);
    return [];
  }
};

// ==========================================
// SORT HELPER (client-side)
// ==========================================
const sortByNewest = (a: Feedback, b: Feedback) => {
  const ta = a.createdAt?.seconds ?? 0;
  const tb = b.createdAt?.seconds ?? 0;
  return tb - ta;
};

// ==========================================
// REAL-TIME — ALL (Admin)
// ==========================================
export const subscribeToAllFeedbacks = (
  callback: (feedbacks: Feedback[]) => void,
  onError?: (err: Error) => void
) => {
  // No `where` clause — safe even without composite index
  const q = query(collection(db, 'feedbacks'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() } as Feedback)
      );
      callback(list.sort(sortByNewest));
    },
    (error) => {
      console.error('❌ Error subscribing to all feedbacks:', error);
      onError?.(error);
    }
  );
};

// ==========================================
// REAL-TIME — ONE OFFICE (User side)
// ✅ FIXED: NO orderBy → no composite index needed
// ==========================================
export const subscribeToOfficeFeedbacks = (
  officeId: string,
  callback: (feedbacks: Feedback[]) => void,
  onError?: (err: Error) => void
) => {
  const q = query(
    collection(db, 'feedbacks'),
    where('officeId', '==', officeId)
    // ⚠️ Walang orderBy — sorted client-side para iwas composite index error
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() } as Feedback)
      );
      callback(list.sort(sortByNewest));
    },
    (error) => {
      console.error('❌ Error subscribing to office feedbacks:', error);
      onError?.(error);
    }
  );
};