import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../firebase';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc, arrayUnion } from 'firebase/firestore';
import { fetchUserData } from '../../services/userService';

export type Lang = 'en' | 'fil';
export type UserRole = 'admin' | 'user' | 'guest';

export interface AppUser {
  uid: string;        // ← IMPORTANTE para hindi “guest”
  name: string;
  email: string;
  role: UserRole;
}

interface AppContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  user: AppUser | null;
  setUser: (user: AppUser | null) => void;
  isAdmin: boolean;
  isLoggedIn: boolean;
  t: (en: string, fil: string) => string;
  unreadCount: number;
  setUnreadCount: (n: number) => void;
  visitedOffices: string[];
  addVisitedOffice: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem('findnau_lang');
    return (saved as Lang) || 'en';
  });
  const [user, setUserState] = useState<AppUser | null>(null);
  const [unreadCount, setUnreadCount] = useState(2);
  const [visitedOffices, setVisitedOffices] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const setLangPersist = (l: Lang) => {
    setLang(l);
    localStorage.setItem('findnau_lang', l);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        let firestoreUser = await fetchUserData(firebaseUser.uid);
        if (!firestoreUser) {
          const userRef = doc(db, 'users', firebaseUser.uid);
          await setDoc(userRef, {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || 'User',
            role: 'user',
            createdAt: serverTimestamp(),
            visitedOffices: [],
          });
          firestoreUser = {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || 'User',
            email: firebaseUser.email || '',
            role: 'user',
          };
        }
        setUserState({
          uid: firebaseUser.uid,   // ← isama ang uid
          name: firestoreUser.name,
          email: firestoreUser.email,
          role: firestoreUser.role,
        });
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setVisitedOffices(userDoc.data().visitedOffices || []);
        }
      } else {
        setUserState(null);
        setVisitedOffices([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const setUser = useCallback((u: AppUser | null) => {
    setUserState(u);
  }, []);

  const addVisitedOffice = useCallback(async (id: string) => {
    setVisitedOffices(prev => [id, ...prev.filter(v => v !== id)].slice(0, 5));
    if (auth.currentUser) {
      try {
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          visitedOffices: arrayUnion(id),
        });
      } catch (err) {
        console.error('Failed to sync visited office:', err);
      }
    }
  }, []);

  const t = (en: string, fil: string) => (lang === 'fil' ? fil : en);
  const isAdmin = user?.role === 'admin';
  const isLoggedIn = user !== null;

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <AppContext.Provider
      value={{
        lang, setLang: setLangPersist,
        user, setUser,
        isAdmin, isLoggedIn,
        t, unreadCount, setUnreadCount,
        visitedOffices, addVisitedOffice,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}