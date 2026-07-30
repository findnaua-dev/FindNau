import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyADCtAgyBAiO05ETh2hBC3gV7N4ECOQTeI",
  authDomain: "findnaufinal.firebaseapp.com",
  projectId: "findnaufinal",
  storageBucket: "findnaufinal.firebasestorage.app",
  messagingSenderId: "1067473881556",
  appId: "1:1067473881556:web:f6cc122300fada1653ee41",
  measurementId: "G-6HQJ81C95H"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);