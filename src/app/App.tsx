import { Component, ReactNode } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router';
import { AppProvider, useApp } from './context/AppContext';
import LoginScreen from './components/LoginScreen';
import WelcomeScreen from './components/WelcomeScreen';
import TutorialScreen from './components/TutorialScreen';
import HomeScreen from './components/HomeScreen';
import EServicesScreen from './components/EServicesScreen';
import OfficeDetailScreen from './components/OfficeDetailScreen';
import ServiceDetailScreen from './components/ServiceDetailScreen';
import MapScreen from './components/MapScreen';
import UserProfileScreen from './components/UserProfileScreen';
import NotificationsScreen from './components/NotificationsScreen';
import HelpCenterScreen from './components/HelpCenterScreen';
import AnnouncementsScreen from './components/AnnouncementsScreen';
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './components/admin/AdminDashboard';
import AdminOffices from './components/admin/AdminOffices';
import AdminAnnouncements from './components/admin/AdminAnnouncements';
import AdminReports from './components/admin/AdminReports';
import AdminMap from './components/admin/AdminMap';
import AdminQR from './components/admin/AdminQR';
import AdminNotifications from './components/admin/AdminNotifications';
import AdminFaqs from './components/admin/AdminFaqs';
import AdminHelpCenterSettings from './components/admin/AdminHelpCenterSettings';
import AdminFeedbacks from './components/admin/AdminFeedbacks';
import DirectionsScreen from './components/DirectionsScreen';

// ───────────────── Error Boundary ─────────────────
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: any) {
    console.error('ErrorBoundary caught an error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen flex flex-col items-center justify-center bg-gray-50">
          <h1 className="text-2xl font-bold text-gray-700 mb-2">Oops! Something went wrong.</h1>
          <p className="text-gray-500 mb-4">Please refresh the page or try again later.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600"
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// ───────────────── Loading Splash ─────────────────
function LoadingScreen() {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mb-3" />
      <p className="text-xs text-gray-400 font-medium">Loading...</p>
    </div>
  );
}

// ───────────────── Helper: sessionStorage flag ─────────────────
function getJustSignedUpFlag(): boolean {
  try {
    return sessionStorage.getItem('findnau_just_signed_up') === 'true';
  } catch {
    return false;
  }
}

function getWelcomeFlag(): boolean {
  try {
    return localStorage.getItem('findnau_welcomed') === 'true';
  } catch {
    return false;
  }
}

// ───────────────── Protected Routes ─────────────────
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isLoggedIn, authReady } = useApp();

  if (!authReady) return <LoadingScreen />;

  return isLoggedIn ? <>{children}</> : <Navigate to="/" replace />;
}

function AdminRoute({ children }: { children: ReactNode }) {
  const { isAdmin, authReady, isLoggedIn } = useApp();

  if (!authReady) return <LoadingScreen />;

  if (!isLoggedIn) return <Navigate to="/" replace />;
  if (!isAdmin) return <Navigate to="/home" replace />;

  return <>{children}</>;
}

// ✅ Public route — kung naka-login na, huwag nang ipakita ang LoginScreen
// Pero kung bagong signup, hayaang tutorial flow ang mag-navigate
function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { isLoggedIn, isAdmin, authReady } = useApp();

  if (!authReady) return <LoadingScreen />;

  // ✅ Skip redirect kung bagong signup (tutorial flow ang bahala)
  if (isLoggedIn && !getJustSignedUpFlag()) {
    return <Navigate to={isAdmin ? '/admin/dashboard' : '/home'} replace />;
  }

  return <>{children}</>;
}

// ───────────────── Landing logic ─────────────────
// First-time user → /welcome
// Welcome done → /login (o /home kung naka-login na)
function LandingRoute() {
  const welcomed = getWelcomeFlag();

  if (!welcomed) {
    return <Navigate to="/welcome" replace />;
  }

  return (
    <PublicOnlyRoute>
      <LoginScreen />
    </PublicOnlyRoute>
  );
}

// ───────────────── AppRoutes ─────────────────
function AppRoutes() {
  return (
    <HashRouter>
      <Routes>
        {/* ✅ Landing — check kung first-time user */}
        <Route path="/" element={<LandingRoute />} />

        {/* ✅ NEW: Welcome + Tutorial (public) */}
        <Route path="/welcome" element={<WelcomeScreen />} />
        <Route path="/tutorial" element={<TutorialScreen />} />

        {/* Login (para sa direct link at redirect) */}
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <LoginScreen />
            </PublicOnlyRoute>
          }
        />

        {/* Existing protected routes */}
        <Route path="/home" element={<ProtectedRoute><HomeScreen /></ProtectedRoute>} />
        <Route path="/services" element={<ProtectedRoute><EServicesScreen /></ProtectedRoute>} />
        <Route path="/office/:id" element={<ProtectedRoute><OfficeDetailScreen /></ProtectedRoute>} />
        <Route path="/office/:id/service/:serviceId" element={<ProtectedRoute><ServiceDetailScreen /></ProtectedRoute>} />
        <Route path="/map" element={<ProtectedRoute><MapScreen /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><UserProfileScreen /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><NotificationsScreen /></ProtectedRoute>} />
        <Route path="/help" element={<ProtectedRoute><HelpCenterScreen /></ProtectedRoute>} />
        <Route path="/directions" element={<DirectionsScreen />} />
        <Route path="/announcements" element={<ProtectedRoute><AnnouncementsScreen /></ProtectedRoute>} />

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="offices" element={<AdminOffices />} />
          <Route path="announcements" element={<AdminAnnouncements />} />
          <Route path="faqs" element={<AdminFaqs />} />
          <Route path="feedbacks" element={<AdminFeedbacks />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="map" element={<AdminMap />} />
          <Route path="qr" element={<AdminQR />} />
          <Route path="notifications" element={<AdminNotifications />} />
          <Route path="help-settings" element={<AdminHelpCenterSettings />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

// ───────────────── Main App ─────────────────
export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </ErrorBoundary>
  );
}