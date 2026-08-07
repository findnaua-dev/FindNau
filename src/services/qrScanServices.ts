import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export async function recordQRScan(officeId: string, userId?: string) {
  await addDoc(collection(db, 'qrScans'), {
    officeId,
    userId: userId || 'guest',
    scannedAt: serverTimestamp(),
  });
}