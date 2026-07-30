import { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router';
import { AppProvider, useApp } from './context/AppContext';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import LoginScreen from './components/LoginScreen';
import HomeScreen from './components/HomeScreen';
import EServicesScreen from './components/EServicesScreen';
import OfficeDetailScreen from './components/OfficeDetailScreen';
import ServiceDetailScreen from './components/ServiceDetailScreen';
import MapScreen from './components/MapScreen';
import UserProfileScreen from './components/UserProfileScreen';
import NotificationsScreen from './components/NotificationsScreen';
import HelpCenterScreen from './components/HelpCenterScreen';
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './components/admin/AdminDashboard';
import AdminOffices from './components/admin/AdminOffices';
import AdminAnnouncements from './components/admin/AdminAnnouncements'; // <-- bagong import
import AdminReports from './components/admin/AdminReports';
import AdminMap from './components/admin/AdminMap';
import AdminQR from './components/admin/AdminQR';
import AdminNotifications from './components/admin/AdminNotifications';
import AdminFaqs from './components/admin/AdminFaqs';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useApp();
  return isLoggedIn ? <>{children}</> : <Navigate to="/" replace />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useApp();
  return isAdmin ? <>{children}</> : <Navigate to="/" replace />;
}

function AppRoutes() {
  const { setUser } = useApp();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const isAdminUser = firebaseUser.email === 'admin@naujan.com';
        setUser({
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          email: firebaseUser.email || '',
          role: isAdminUser ? 'admin' : 'user',
        });
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, [setUser]);

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
        <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="offices" element={<AdminOffices />} />
          <Route path="announcements" element={<AdminAnnouncements />} />  {/* bagong route */}
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

export default function App() {
  return (
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  );
}