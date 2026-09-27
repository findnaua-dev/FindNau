import { doc, setDoc, getDoc, serverTimestamp, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { AppUser } from '../app/context/AppContext';

// Tawagin pagkatapos ng signup/login para matiyak na may dokumento
export async function createOrUpdateUser(
  uid: string,
  email: string | null,
  name: string | null
): Promise<void> {
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    // Bagong user – default role = 'user'
    await setDoc(userRef, {
      uid,
      email: email || '',
      name: name || 'User',
      role: 'user',          // Admin? Palitan sa Firestore console
      createdAt: serverTimestamp(),
      visitedOffices: [],
    });
  } else {
    // Existing – i‑update lang ang name/email (hindi ginagalaw ang role)
    await updateDoc(userRef, {
      email: email || snap.data()?.email,
      name: name || snap.data()?.name,
    });
  }
}

// Kunin ang user object (kasama ang role) mula Firestore
export async function fetchUserData(uid: string): Promise<AppUser | null> {
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return null;

  const data = snap.data();
  return {
    uid,
    name: data.name || 'User',
    email: data.email || '',
    role: data.role || 'user',
  };
}

// Idagdag ang office sa visited list ng user
export async function addVisitedOffice(uid: string, officeId: string): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    visitedOffices: arrayUnion(officeId),
  });
}