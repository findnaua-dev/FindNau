import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { auth } from '../firebase';

// Firebase REST API endpoint for signup
const FIREBASE_API_KEY = "AIzaSyADCtAgyBAiO05ETh2hBC3gV7N4ECOQTeI";
const SIGN_UP_URL = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`;

export async function createStaffAccount(
  email: string,
  password: string,
  name: string,
  officeId: string
): Promise<string> {
  // 1. Create Firebase Auth user via REST API
  const response = await fetch(SIGN_UP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      returnSecureToken: true,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'Failed to create account');
  }

  const data = await response.json();
  const uid = data.localId;

  // 2. Create Firestore document for the staff with role and officeId
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, {
    uid,
    email,
    name,
    role: 'office_staff',
    officeId,
    createdAt: serverTimestamp(),
    visitedOffices: [],
  });

  return uid;
}