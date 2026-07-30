import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Lang = 'en' | 'fil';
export type UserRole = 'admin' | 'user' | 'guest';

export interface AppUser {
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
  const [user, setUserState] = useState<AppUser | null>(() => {
    const saved = localStorage.getItem('findnau_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [unreadCount, setUnreadCount] = useState(2);
  const [visitedOffices, setVisitedOffices] = useState<string[]>(() => {
    const saved = localStorage.getItem('findnau_visited');
    return saved ? JSON.parse(saved) : [];
  });

  const setLangPersist = (l: Lang) => {
    setLang(l);
    localStorage.setItem('findnau_lang', l);
  };

  const setUser = (u: AppUser | null) => {
    setUserState(u);
    if (u) localStorage.setItem('findnau_user', JSON.stringify(u));
    else localStorage.removeItem('findnau_user');
  };

  const addVisitedOffice = (id: string) => {
    setVisitedOffices(prev => {
      const updated = [id, ...prev.filter(v => v !== id)].slice(0, 5);
      localStorage.setItem('findnau_visited', JSON.stringify(updated));
      return updated;
    });
  };

  const t = (en: string, fil: string) => lang === 'fil' ? fil : en;
  const isAdmin = user?.role === 'admin';
  const isLoggedIn = user !== null;

  return (
    <AppContext.Provider value={{
      lang, setLang: setLangPersist,
      user, setUser,
      isAdmin, isLoggedIn,
      t, unreadCount, setUnreadCount,
      visitedOffices, addVisitedOffice,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}