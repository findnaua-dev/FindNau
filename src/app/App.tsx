import { Component, ReactNode } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router';
import { AppProvider, useApp } from './context/AppContext';
import LoginScreen from './components/LoginScreen';
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

// ───────────────── Protected & Admin Routes ─────────────────
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useApp();
  return isLoggedIn ? <>{children}</> : <Navigate to="/" replace />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useApp();
  return isAdmin ? <>{children}</> : <Navigate to="/" replace />;
}

// ───────────────── AppRoutes – NO duplicate auth listener ─────────────────
function AppRoutes() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<LoginScreen />} />
        <Route path="/home" element={<ProtectedRoute><HomeScreen /></ProtectedRoute>} />
        <Route path="/services" element={<ProtectedRoute><EServicesScreen /></ProtectedRoute>} />
        <Route path="/office/:id" element={<ProtectedRoute><OfficeDetailScreen /></ProtectedRoute>} />
        <Route path="/office/:id/service/:serviceId" element={<ProtectedRoute><ServiceDetailScreen /></ProtectedRoute>} />
        <Route path="/map" element={<ProtectedRoute><MapScreen /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><UserProfileScreen /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><NotificationsScreen /></ProtectedRoute>} />
        <Route path="/help" element={<ProtectedRoute><HelpCenterScreen /></ProtectedRoute>} />
        <Route path="/announcements" element={<ProtectedRoute><AnnouncementsScreen /></ProtectedRoute>} />
        <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="offices" element={<AdminOffices />} />
          <Route path="announcements" element={<AdminAnnouncements />} />
          <Route path="faqs" element={<AdminFaqs />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="map" element={<AdminMap />} />
          <Route path="qr" element={<AdminQR />} />
          <Route path="notifications" element={<AdminNotifications />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

// ───────────────── Main App wrapped in ErrorBoundary ─────────────────
export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </ErrorBoundary>
  );
}