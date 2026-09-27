import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Eye, EyeOff, ArrowRight,
  MapPin, Search, CheckCircle, X, Loader2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { auth, googleProvider, db } from '../../firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { createOrUpdateUser } from '../../services/userService';
import {
  ORIENTAL_MINDORO,
  getBarangaysByMunicipality,
} from '../../../data/orientalMindoro';

export default function LoginScreen() {
  const navigate = useNavigate();
  const { isLoggedIn, user, lang } = useApp();
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');

  // --- Login fields ---
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // --- Signup fields ---
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirm, setSignupConfirm] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirm, setShowSignupConfirm] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState('');
  const [signupSuccess, setSignupSuccess] = useState('');

  // Location fields para sa signup
  const [signupMunicipality, setSignupMunicipality] = useState('');
  const [signupBarangay, setSignupBarangay] = useState('');
  const [signupPurok, setSignupPurok] = useState('');
  const [barangaySearch, setBarangaySearch] = useState('');

  const barangayOptions = signupMunicipality
    ? getBarangaysByMunicipality(signupMunicipality)
    : [];

  const filteredBarangays = barangaySearch.trim()
    ? barangayOptions.filter((b) =>
        b.toLowerCase().includes(barangaySearch.trim().toLowerCase())
      )
    : barangayOptions;

  // ✅ Auto-redirect (pero skip kung galing sa signup — tutorial flow muna)
  useEffect(() => {
    if (!isLoggedIn) return;

    const justSignedUp = (() => {
      try {
        return sessionStorage.getItem('findnau_just_signed_up') === 'true';
      } catch {
        return false;
      }
    })();

    if (justSignedUp) {
      try {
        sessionStorage.removeItem('findnau_just_signed_up');
      } catch {}
      return;
    }

    navigate(user?.role === 'admin' ? '/admin/dashboard' : '/home', { replace: true });
  }, [isLoggedIn, user, navigate]);

  useEffect(() => {
    getRedirectResult(auth).catch((err: any) => {
      if (err?.code) setLoginError(err.message || 'Google sign-in failed.');
    });
  }, []);

  // --- Firebase login ---
  const handleLogin = async () => {
    setLoginError('');
    if (!loginEmail || !loginPassword) {
      setLoginError(lang === 'en' ? 'Please fill in all fields.' : 'Pakipunan ang lahat ng field.');
      return;
    }
    setLoginLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      createOrUpdateUser(userCredential.user.uid, loginEmail, userCredential.user.displayName)
        .catch(error => console.error('User profile sync failed:', error));
    } catch (err: any) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  // --- Firebase signup (may location + tutorial redirect) ---
  const handleSignup = async () => {
    setSignupError('');
    setSignupSuccess('');

    if (!signupName || !signupEmail || !signupPassword || !signupConfirm) {
      setSignupError(lang === 'en' ? 'All fields are required.' : 'Lahat ng field ay kailangan.');
      return;
    }
    if (!signupMunicipality) {
      setSignupError(
        lang === 'en'
          ? 'Please select your municipality.'
          : 'Pakipili ang iyong munisipyo.'
      );
      return;
    }
    if (!signupBarangay) {
      setSignupError(
        lang === 'en'
          ? 'Please select your barangay.'
          : 'Pakipili ang iyong barangay.'
      );
      return;
    }
    if (signupPassword !== signupConfirm) {
      setSignupError(lang === 'en' ? 'Passwords do not match.' : 'Hindi magkatugma ang mga password.');
      return;
    }
    if (signupPassword.length < 6) {
      setSignupError(lang === 'en' ? 'Password must be at least 6 characters.' : 'Ang password ay dapat hindi bababa sa 6 na karakter.');
      return;
    }

    setSignupLoading(true);
    try {
      // 1) Firebase Auth account
      const userCredential = await createUserWithEmailAndPassword(auth, signupEmail, signupPassword);
      await updateProfile(userCredential.user, { displayName: signupName });

      // 2) User doc
      try {
        await createOrUpdateUser(userCredential.user.uid, signupEmail, signupName);
      } catch (e) {
        console.error('createOrUpdateUser failed:', e);
      }

      // 3) Location + tutorial flag
      try {
        const userRef = doc(db, 'users', userCredential.user.uid);
        await updateDoc(userRef, {
          municipality: signupMunicipality,
          barangay: signupBarangay,
          purok: signupPurok.trim(),
          province: 'Oriental Mindoro',
          locationSet: true,
          hasSeenTutorial: false,
          updatedAt: new Date(),
        });
      } catch (e) {
        console.error('Failed to save location:', e);
      }

      setSignupSuccess(
        lang === 'en'
          ? "Account created! Let's show you around..."
          : 'Nagawa na ang account! Ipapakita namin sa iyo...'
      );

      // ✅ 4) Redirect sa tutorial
      try {
        sessionStorage.setItem('findnau_just_signed_up', 'true');
      } catch {}

      setTimeout(() => {
        navigate('/tutorial?new=true', { replace: true });
      }, 900);

    } catch (err: any) {
      setSignupError(err.message);
    } finally {
      setSignupLoading(false);
    }
  };

  // --- Google sign-in ---
  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        createOrUpdateUser(result.user.uid, result.user.email, result.user.displayName)
          .catch(error => console.error('User profile sync failed:', error));
      }
    } catch (err: any) {
      const popupUnavailable = [
        'auth/popup-blocked',
        'auth/popup-closed-by-user',
        'auth/operation-not-supported-in-this-environment',
      ].includes(err?.code);

      if (popupUnavailable) {
        try {
          await signInWithRedirect(auth, googleProvider);
        } catch (redirectError: any) {
          setLoginError(redirectError.message || 'Google sign-in failed.');
        }
      } else {
        setLoginError(err.message || 'Google sign-in failed.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header banner */}
      <div className="relative overflow-hidden" style={{ minHeight: '280px' }}>
        <div className="absolute inset-0">
          <img src="/background_logo.jpg" alt="" className="w-full h-full object-cover" aria-hidden="true" />
        </div>
        <div className="absolute inset-0 bg-orange-900/65" />
        <div className="absolute top-[-40px] right-[-40px] w-64 h-64 bg-orange-400 rounded-full opacity-20" />
        <div className="absolute bottom-[-30px] left-[-30px] w-48 h-48 bg-orange-600 rounded-full opacity-15" />
        <div className="absolute top-[80px] right-[20px] w-20 h-20 bg-orange-300 rounded-full opacity-20" />

        <div className="relative z-10 flex flex-col items-center text-white px-6 pt-10 pb-16">
          <div className="w-20 h-20 p-1 mb-4 shadow-lg">
            <img src="/logo.jpg" alt="Naujan Municipality Logo" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight drop-shadow-lg">FindNau</h1>

          <div className="flex items-center gap-2 mt-1">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-white/20 border border-white/40 flex-shrink-0 shadow-md">
              <img src="/MunicipalLogo.jpg" alt="Naujan Municipal Seal" className="w-full h-full object-cover" />
            </div>
            <div className="text-left">
              <p className="text-orange-50 text-sm font-medium drop-shadow-md">
                Municipal Building Navigation & E-Services
              </p>
              <p className="text-orange-100 text-xs drop-shadow-md">
                Municipality of Naujan, Oriental Mindoro
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Card area */}
      <div className="flex-1 bg-white rounded-t-3xl -mt-6 relative z-10 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] max-w-md md:max-w-xl w-full mx-auto">
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab('login')}
            className={`flex-1 py-4 text-sm font-semibold transition-colors relative ${
              activeTab === 'login' ? 'text-orange-500' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {lang === 'en' ? 'Sign In' : 'Mag-Sign In'}
            {activeTab === 'login' && (
              <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-orange-500 rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('signup')}
            className={`flex-1 py-4 text-sm font-semibold transition-colors relative ${
              activeTab === 'signup' ? 'text-orange-500' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {lang === 'en' ? 'Create Account' : 'Gumawa ng Account'}
            {activeTab === 'signup' && (
              <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-orange-500 rounded-full" />
            )}
          </button>
        </div>

        <div className="px-6 pt-6 pb-10">
          {/* LOGIN TAB */}
          {activeTab === 'login' && (
            <>
              <p className="text-gray-500 text-sm mb-6">
                {lang === 'en'
                  ? 'Access municipal services and building navigation.'
                  : 'I-access ang mga serbisyong munisipal at navigation ng gusali.'}
              </p>

              {loginError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">
                  {loginError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1.5">
                    {lang === 'en' ? 'Email Address' : 'Email Address'}
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    placeholder={lang === 'en' ? 'yourname@email.com' : 'email@halimbawa.com'}
                    title={lang === 'en' ? 'Enter your email address' : 'Ilagay ang iyong email'}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent text-sm transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1.5">
                    {lang === 'en' ? 'Password' : 'Password'}
                  </label>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showLoginPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleLogin()}
                      placeholder={lang === 'en' ? 'Enter your password' : 'Ilagay ang iyong password'}
                      title={lang === 'en' ? 'Enter your password' : 'Ilagay ang iyong password'}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-12 text-gray-800 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent text-sm transition-all"
                    />
                    <button
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                      title={showLoginPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-2 mb-5" />

              <button
                onClick={handleLogin}
                disabled={loginLoading}
                className="w-full bg-orange-500 text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-orange-600 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm shadow-orange-200 flex items-center justify-center gap-2"
              >
                {loginLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    {lang === 'en' ? 'Signing in...' : 'Nag-sign in...'}
                  </>
                ) : (
                  <>
                    {lang === 'en' ? 'Sign In' : 'Mag-Sign In'}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <div className="flex items-center my-4">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-xs text-gray-400 px-3">{lang === 'en' ? 'or' : 'o'}</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              <button
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 text-gray-700 py-3 rounded-xl font-medium text-sm hover:bg-gray-50 active:scale-[0.98] transition-all"
              >
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                {lang === 'en' ? 'Continue with Google' : 'Magpatuloy sa Google'}
              </button>

              <p className="text-xs text-gray-400 text-center mt-6">
                {lang === 'en' ? "Don't have an account? " : 'Wala pang account? '}
                <button onClick={() => setActiveTab('signup')} className="text-orange-500 font-medium hover:text-orange-600">
                  {lang === 'en' ? 'Create Account' : 'Gumawa ng Account'}
                </button>
              </p>
            </>
          )}

          {/* SIGNUP TAB */}
          {activeTab === 'signup' && (
            <>
              <p className="text-gray-500 text-sm mb-6">
                {lang === 'en'
                  ? 'Create your account and set your location to access all municipal services.'
                  : 'Gumawa ng account at itakda ang iyong lokasyon para ma-access ang lahat ng serbisyo.'}
              </p>
              {signupError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">
                  {signupError}
                </div>
              )}
              {signupSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl mb-4">
                  {signupSuccess}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="signup-name" className="block text-sm font-medium text-gray-700 mb-1.5">
                    {lang === 'en' ? 'Full Name' : 'Buong Pangalan'}
                  </label>
                  <input
                    id="signup-name"
                    type="text"
                    value={signupName}
                    onChange={e => setSignupName(e.target.value)}
                    placeholder="Juan dela Cruz"
                    title={lang === 'en' ? 'Enter your full name' : 'Ilagay ang iyong buong pangalan'}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent text-sm transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700 mb-1.5">
                    {lang === 'en' ? 'Email Address' : 'Email Address'}
                  </label>
                  <input
                    id="signup-email"
                    type="email"
                    value={signupEmail}
                    onChange={e => setSignupEmail(e.target.value)}
                    placeholder="juan@email.com"
                    title={lang === 'en' ? 'Enter your email address' : 'Ilagay ang iyong email'}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent text-sm transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="signup-password" className="block text-sm font-medium text-gray-700 mb-1.5">
                    {lang === 'en' ? 'Password' : 'Password'}
                  </label>
                  <div className="relative">
                    <input
                      id="signup-password"
                      type={showSignupPassword ? 'text' : 'password'}
                      value={signupPassword}
                      onChange={e => setSignupPassword(e.target.value)}
                      placeholder={lang === 'en' ? 'At least 6 characters' : 'Hindi bababa sa 6 na karakter'}
                      title={lang === 'en' ? 'Create a password' : 'Gumawa ng password'}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-12 text-gray-800 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent text-sm transition-all"
                    />
                    <button
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showSignupPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="signup-confirm" className="block text-sm font-medium text-gray-700 mb-1.5">
                    {lang === 'en' ? 'Confirm Password' : 'Kumpirmahin ang Password'}
                  </label>
                  <div className="relative">
                    <input
                      id="signup-confirm"
                      type={showSignupConfirm ? 'text' : 'password'}
                      value={signupConfirm}
                      onChange={e => setSignupConfirm(e.target.value)}
                      placeholder={lang === 'en' ? 'Re-enter your password' : 'I-type muli ang password'}
                      title={lang === 'en' ? 'Confirm your password' : 'Kumpirmahin ang password'}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-12 text-gray-800 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent text-sm transition-all"
                    />
                    <button
                      onClick={() => setShowSignupConfirm(!showSignupConfirm)}
                      aria-label={showSignupConfirm ? 'Hide password' : 'Show password'}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showSignupConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* LOCATION SECTION */}
              <div className="mt-6 pt-5 border-t border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center">
                    <MapPin size={14} className="text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {lang === 'en' ? 'Your Location' : 'Iyong Lokasyon'}
                    </p>
                  </div>
                </div>

                <label className="block mb-3">
                  <select
                    value={signupMunicipality}
                    onChange={(e) => {
                      setSignupMunicipality(e.target.value);
                      setSignupBarangay('');
                      setBarangaySearch('');
                    }}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-gray-50 text-gray-800"
                  >
                    <option value="">
                      {lang === 'en' ? 'Select municipality…' : 'Pumili ng munisipyo…'}
                    </option>
                    {ORIENTAL_MINDORO.map((m) => (
                      <option key={m.name} value={m.name}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </label>

                {signupMunicipality && (
                  <div className="mb-3">
                    <span className="text-xs font-medium text-gray-700 mb-1.5 block">
                      {lang === 'en' ? 'Barangay' : 'Barangay'}{' '}
                      <span className="text-red-500">*</span>
                    </span>

                    {signupBarangay && (
                      <div className="mb-2 flex items-center justify-between bg-orange-50 border border-orange-100 rounded-xl px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <MapPin size={13} className="text-orange-500 flex-shrink-0" />
                          <p className="text-xs font-semibold text-orange-700 truncate">
                            {signupBarangay}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSignupBarangay('')}
                          className="text-orange-400 hover:text-orange-600 flex-shrink-0"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}

                    <div className="relative mb-2">
                      <Search
                        size={14}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        type="text"
                        value={barangaySearch}
                        onChange={(e) => setBarangaySearch(e.target.value)}
                        placeholder={
                          lang === 'en' ? 'Search barangay…' : 'Maghanap ng barangay…'
                        }
                        className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-gray-50"
                      />
                    </div>

                    <div className="max-h-44 overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-50">
                      {filteredBarangays.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-4">
                          {lang === 'en' ? 'No barangay found.' : 'Walang nahanap na barangay.'}
                        </p>
                      ) : (
                        filteredBarangays.map((b) => {
                          const isSelected = b === signupBarangay;
                          return (
                            <button
                              key={b}
                              type="button"
                              onClick={() => setSignupBarangay(b)}
                              className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between gap-2 ${
                                isSelected
                                  ? 'bg-orange-50 text-orange-700 font-semibold'
                                  : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <span className="truncate">{b}</span>
                              {isSelected && (
                                <CheckCircle
                                  size={14}
                                  className="text-orange-500 flex-shrink-0"
                                />
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {signupMunicipality && signupBarangay && (
                  <label className="block">
                    <span className="text-xs font-medium text-gray-700 mb-1.5 block">
                      {lang === 'en' ? 'Purok / Sitio' : 'Purok / Sitio'}{' '}
                      <span className="text-gray-400 font-normal">
                        ({lang === 'en' ? 'optional' : 'opsyonal'})
                      </span>
                    </span>
                    <input
                      type="text"
                      value={signupPurok}
                      onChange={(e) => setSignupPurok(e.target.value)}
                      placeholder={lang === 'en' ? 'e.g., Purok 3' : 'hal., Purok 3'}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-gray-50"
                    />
                  </label>
                )}
              </div>

              <button
                onClick={handleSignup}
                disabled={signupLoading}
                className="w-full bg-orange-500 text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-orange-600 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm shadow-orange-200 flex items-center justify-center gap-2 mt-6"
              >
                {signupLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    {lang === 'en' ? 'Creating account...' : 'Gumagawa ng account...'}
                  </>
                ) : (
                  <>
                    {lang === 'en' ? 'Create Account' : 'Gumawa ng Account'}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <div className="flex items-center my-4">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-xs text-gray-400 px-3">{lang === 'en' ? 'or' : 'o'}</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              <button
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 text-gray-700 py-3 rounded-xl font-medium text-sm hover:bg-gray-50 active:scale-[0.98] transition-all"
              >
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                {lang === 'en' ? 'Sign up with Google' : 'Mag-sign up sa Google'}
              </button>

              <p className="text-xs text-gray-400 text-center mt-6">
                {lang === 'en' ? 'Already have an account? ' : 'May account na? '}
                <button onClick={() => setActiveTab('login')} className="text-orange-500 font-medium hover:text-orange-600">
                  {lang === 'en' ? 'Sign In' : 'Mag-Sign In'}
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}