import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { auth, googleProvider } from '../../firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
} from 'firebase/auth';

export default function LoginScreen() {
  const navigate = useNavigate();
  const { isLoggedIn, user, lang, setLang } = useApp();
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

  // Auto-redirect when logged in
  useEffect(() => {
    if (isLoggedIn) {
      if (user?.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/home');
      }
    }
  }, [isLoggedIn, user, navigate]);

  // --- Firebase login ---
  const handleLogin = async () => {
    setLoginError('');
    if (!loginEmail || !loginPassword) {
      setLoginError(lang === 'en' ? 'Please fill in all fields.' : 'Pakipunan ang lahat ng field.');
      return;
    }
    setLoginLoading(true);
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
    } catch (err: any) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  // --- Firebase signup ---
  const handleSignup = async () => {
    setSignupError('');
    setSignupSuccess('');
    if (!signupName || !signupEmail || !signupPassword || !signupConfirm) {
      setSignupError(lang === 'en' ? 'All fields are required.' : 'Lahat ng field ay kailangan.');
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
      const userCredential = await createUserWithEmailAndPassword(auth, signupEmail, signupPassword);
      await updateProfile(userCredential.user, { displayName: signupName });
      setSignupSuccess(lang === 'en' ? 'Account created! Redirecting...' : 'Nagawa na ang account! Nagre-redirect...');
    } catch (err: any) {
      setSignupError(err.message);
    } finally {
      setSignupLoading(false);
    }
  };

  // --- Firebase Google sign-in ---
  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      setLoginError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header banner – background_logo is visible, orange overlay is semi‑transparent */}
      <div className="relative overflow-hidden" style={{ minHeight: '280px' }}>
        {/* Background logo – FULLY visible because the overlay is now only 40% opaque */}
        <div className="absolute inset-0">
          <img
            src="/background_logo.jpg"
            alt=""
            className="w-full h-full object-cover"
            aria-hidden="true"
          />
        </div>
        {/* Orange overlay – reduced opacity so the background shows through */}
        <div className="absolute inset-0 bg-orange-500/40" />
        {/* Decorative circles */}
        <div className="absolute top-[-40px] right-[-40px] w-64 h-64 bg-orange-400 rounded-full opacity-20" />
        <div className="absolute bottom-[-30px] left-[-30px] w-48 h-48 bg-orange-600 rounded-full opacity-15" />
        <div className="absolute top-[80px] right-[20px] w-20 h-20 bg-orange-300 rounded-full opacity-20" />

        <button
          onClick={() => setLang(lang === 'en' ? 'fil' : 'en')}
          className="absolute top-4 right-4 z-10 bg-white/20 text-white text-xs px-3 py-1.5 rounded-full border border-white/30 hover:bg-white/30 transition-colors"
          aria-label={lang === 'en' ? 'Switch to Filipino' : 'Switch to English'}
          title={lang === 'en' ? 'Switch to Filipino' : 'Switch to English'}
        >
          {lang === 'en' ? '🇵🇭 FILIPINO' : '🇺🇸 ENGLISH'}
        </button>

        <div className="relative z-10 flex flex-col items-center text-white px-6 pt-10 pb-16">
        <div className="w-20 h-20 bg-white rounded-full p-1 mb-4 shadow-lg">
          <img
            src="/logo.jpg"
            alt="Naujan Municipality Logo"
            className="w-full h-full object-cover rounded-full"
          />
        </div>
          <h1 className="text-3xl font-bold text-white tracking-tight drop-shadow-lg">FindNau</h1>
          <p className="text-orange-50 text-sm text-center mt-1 font-medium drop-shadow-md">
            Municipal Building Navigation & E-Services
          </p>
          <p className="text-orange-100 text-xs text-center mt-0.5 drop-shadow-md">
            Municipality of Naujan, Oriental Mindoro
          </p>
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

              <div className="flex justify-end mt-2 mb-5">
                <button className="text-xs text-orange-500 hover:text-orange-600 font-medium">
                  {lang === 'en' ? 'Forgot password?' : 'Nakalimutang password?'}
                </button>
              </div>

              <button
                onClick={handleLogin}
                disabled={loginLoading}
                className="w-full bg-orange-500 text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-orange-600 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm shadow-orange-200 flex items-center justify-center gap-2"
              >
                {loginLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
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
                  ? 'Create your account to access all municipal services.'
                  : 'Gumawa ng account para ma-access ang lahat ng serbisyo.'}
              </p>
              {signupError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">{signupError}</div>}
              {signupSuccess && <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl mb-4">{signupSuccess}</div>}

              <div className="space-y-4">
                <div>
                  <label htmlFor="signup-name" className="block text-sm font-medium text-gray-700 mb-1.5">{lang === 'en' ? 'Full Name' : 'Buong Pangalan'}</label>
                  <input id="signup-name" type="text" value={signupName} onChange={e => setSignupName(e.target.value)} placeholder={lang === 'en' ? 'Juan dela Cruz' : 'Juan dela Cruz'} title={lang === 'en' ? 'Enter your full name' : 'Ilagay ang iyong buong pangalan'} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent text-sm transition-all" />
                </div>
                <div>
                  <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700 mb-1.5">{lang === 'en' ? 'Email Address' : 'Email Address'}</label>
                  <input id="signup-email" type="email" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} placeholder={lang === 'en' ? 'juan@email.com' : 'juan@email.com'} title={lang === 'en' ? 'Enter your email address' : 'Ilagay ang iyong email'} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent text-sm transition-all" />
                </div>
                <div>
                  <label htmlFor="signup-password" className="block text-sm font-medium text-gray-700 mb-1.5">{lang === 'en' ? 'Password' : 'Password'}</label>
                  <div className="relative">
                    <input id="signup-password" type={showSignupPassword ? 'text' : 'password'} value={signupPassword} onChange={e => setSignupPassword(e.target.value)} placeholder={lang === 'en' ? 'At least 6 characters' : 'Hindi bababa sa 6 na karakter'} title={lang === 'en' ? 'Create a password' : 'Gumawa ng password'} className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-12 text-gray-800 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent text-sm transition-all" />
                    <button onClick={() => setShowSignupPassword(!showSignupPassword)} aria-label={showSignupPassword ? 'Hide password' : 'Show password'} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">{showSignupPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                  </div>
                </div>
                <div>
                  <label htmlFor="signup-confirm" className="block text-sm font-medium text-gray-700 mb-1.5">{lang === 'en' ? 'Confirm Password' : 'Kumpirmahin ang Password'}</label>
                  <div className="relative">
                    <input id="signup-confirm" type={showSignupConfirm ? 'text' : 'password'} value={signupConfirm} onChange={e => setSignupConfirm(e.target.value)} placeholder={lang === 'en' ? 'Re-enter your password' : 'I-type muli ang password'} title={lang === 'en' ? 'Confirm your password' : 'Kumpirmahin ang password'} className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-12 text-gray-800 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent text-sm transition-all" />
                    <button onClick={() => setShowSignupConfirm(!showSignupConfirm)} aria-label={showSignupConfirm ? 'Hide password' : 'Show password'} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">{showSignupConfirm ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                  </div>
                </div>
              </div>

              <button onClick={handleSignup} disabled={signupLoading} className="w-full bg-orange-500 text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-orange-600 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm shadow-orange-200 flex items-center justify-center gap-2 mt-5">
                {signupLoading ? <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>{lang === 'en' ? 'Creating account...' : 'Gumagawa ng account...'}</> : <>{lang === 'en' ? 'Create Account' : 'Gumawa ng Account'}<ArrowRight size={16} /></>}
              </button>

              <div className="flex items-center my-4"><div className="flex-1 h-px bg-gray-100" /><span className="text-xs text-gray-400 px-3">{lang === 'en' ? 'or' : 'o'}</span><div className="flex-1 h-px bg-gray-100" /></div>

              <button onClick={handleGoogleSignIn} className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 text-gray-700 py-3 rounded-xl font-medium text-sm hover:bg-gray-50 active:scale-[0.98] transition-all">
                <svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                {lang === 'en' ? 'Sign up with Google' : 'Mag-sign up sa Google'}
              </button>

              <p className="text-xs text-gray-400 text-center mt-6">
                {lang === 'en' ? 'Already have an account? ' : 'May account na? '}
                <button onClick={() => setActiveTab('login')} className="text-orange-500 font-medium hover:text-orange-600">{lang === 'en' ? 'Sign In' : 'Mag-Sign In'}</button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}