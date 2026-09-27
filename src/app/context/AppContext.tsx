import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../firebase';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc, arrayUnion } from 'firebase/firestore';
import { fetchUserData } from '../../services/userService';

export type Lang = 'en' | 'fil';
export type UserRole = 'admin' | 'user' | 'guest';

export interface AppUser {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt?: number;
  // Location fields (optional — para sa user map)
  municipality?: string;
  barangay?: string;
  purok?: string;
  province?: string;
  locationSet?: boolean;
  hasSeenTutorial?: boolean;
}

interface AppContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  user: AppUser | null;
  setUser: (user: AppUser | null) => void;
  isAdmin: boolean;
  isLoggedIn: boolean;
  authReady: boolean;
  t: (en: string, fil: string) => string;
  unreadCount: number;
  setUnreadCount: (n: number) => void;
  visitedOffices: string[];
  addVisitedOffice: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    try {
      const saved = localStorage.getItem('findnau_lang');
      return (saved as Lang) || 'en';
    } catch {
      return 'en';
    }
  });
  const [user, setUserState] = useState<AppUser | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [visitedOffices, setVisitedOffices] = useState<string[]>([]);
  const [authReady, setAuthReady] = useState(false);

  const setLangPersist = (l: Lang) => {
    setLang(l);
    try {
      localStorage.setItem('findnau_lang', l);
    } catch {}
  };

  useEffect(() => {
    let isMounted = true;

    const initializeAuthState = () => {
      try {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          if (!isMounted) return;

          if (firebaseUser) {
            const fallbackUser: AppUser = {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || 'User',
              email: firebaseUser.email || '',
              role: 'user',
            };

            try {
              let firestoreUser = await fetchUserData(firebaseUser.uid);
              if (!firestoreUser) {
                const userRef = doc(db, 'users', firebaseUser.uid);
                try {
                  await setDoc(userRef, {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email || '',
                    name: firebaseUser.displayName || 'User',
                    role: 'user',
                    createdAt: serverTimestamp(),
                    visitedOffices: [],
                  });
                  firestoreUser = await fetchUserData(firebaseUser.uid);
                } catch (error) {
                  console.error('User profile sync failed:', error);
                }
              }

              if (!isMounted) return;

              const createdSeconds =
                (firestoreUser as any)?.createdAt?.seconds ??
                (typeof (firestoreUser as any)?.createdAt === 'number'
                  ? (firestoreUser as any).createdAt
                  : undefined) ??
                Math.floor(Date.now() / 1000);

              setUserState({
                ...fallbackUser,
                ...(firestoreUser || {}),
                uid: firebaseUser.uid,
                createdAt: createdSeconds,
              });

              try {
                const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
                if (isMounted && userDoc.exists()) {
                  setVisitedOffices(userDoc.data().visitedOffices || []);
                }
              } catch (error) {
                console.error('Visited offices sync failed:', error);
              }
            } catch (err) {
              console.error('Auth user bootstrap failed:', err);
              if (isMounted) {
                setUserState({
                  ...fallbackUser,
                  createdAt: Math.floor(Date.now() / 1000),
                });
              }
            }
          } else {
            if (isMounted) {
              setUserState(null);
              setVisitedOffices([]);
              setUnreadCount(0);
            }
          }

          if (isMounted) setAuthReady(true);
        });

        return unsubscribe;
      } catch (err) {
        console.error('Auth listener setup failed:', err);
        if (isMounted) {
          setUserState(null);
          setVisitedOffices([]);
          setAuthReady(true);
        }
      }
    };

    const cleanup = initializeAuthState();

    return () => {
      isMounted = false;
      if (typeof cleanup === 'function') {
        cleanup();
      }
    };
  }, []);

  const setUser = useCallback((u: AppUser | null) => {
    setUserState(u);
  }, []);

  const addVisitedOffice = useCallback(async (id: string) => {
    setVisitedOffices((prev) => [id, ...prev.filter((v) => v !== id)].slice(0, 5));
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

  return (
    <AppContext.Provider
      value={{
        lang,
        setLang: setLangPersist,
        user,
        setUser,
        isAdmin,
        isLoggedIn,
        authReady,
        t,
        unreadCount,
        setUnreadCount,
        visitedOffices,
        addVisitedOffice,
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