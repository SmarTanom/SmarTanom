import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthFlowProvider } from './features/auth/AuthFlowContext.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import ProtectedRoute from './components/auth/ProtectedRoute.jsx';
import PublicRoute from './components/auth/PublicRoute.jsx';
import { initializePWA, setupNetworkHandling, setupInstallPrompt } from './utils/pwaInit.js';
import LandingPage from './pages/LandingPage.jsx';
import EmailPage from './pages/EmailPage.jsx';
import CodePage from './pages/CodePage.jsx';
import UsernamePage from './pages/UsernamePage.jsx';
import SplashPage from './pages/SplashPage.jsx';
import SignupSetup from './pages/SignupSetup.jsx';
import AddDevicePage from './pages/AddDevicePage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminDevices from './pages/AdminDevices.jsx';
import AdminCreate from './pages/AdminCreate.jsx';
import AdminUsers from './pages/AdminUsers.jsx';
import AdminSettings from './pages/AdminSettings.jsx';
import DeviceDetails from './pages/DeviceDetails.jsx';
import AlertsPage from './pages/AlertsPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import StartCyclePage from './pages/StartCyclePage.jsx';
import NotificationsPage from './pages/NotificationsPage.jsx';
import PrivacySecurityPage from './pages/PrivacySecurityPage.jsx';
import DevCacheHelper from './components/dev/DevCacheHelper.jsx';

function useKeyboardViewport() {
  useEffect(() => {
    const docEl = document.documentElement;
    const body = document.body;
    const vv = window.visualViewport;

    function applyVvh(h) {
      // set CSS variable to be used by containers
      docEl.style.setProperty('--vvh', `${h}px`);
    }

    function setKb(open, offset = 0) {
      if (open) {
        body.classList.add('kb-open');
      } else {
        body.classList.remove('kb-open');
      }
      docEl.style.setProperty('--kb-offset', `${Math.max(offset, 0)}px`);
    }

    // Initial
    applyVvh(window.innerHeight);
    setKb(false, 0);

    let lastHeight = window.innerHeight;

    const onResize = () => {
      const h = vv ? vv.height : window.innerHeight;
      applyVvh(h);
      // Heuristic: if visual viewport height shrinks significantly, keyboard likely open
      const fullH = window.innerHeight;
      const delta = fullH - h;
      // Consider keyboard open if > 120px shrink (typical keyboards)
      const kbOpen = delta > 120;
      setKb(kbOpen, kbOpen ? delta : 0);
      lastHeight = h;
    };

    const onScroll = () => {
      // keep bottom offset updated as keyboard slides
      if (vv) {
        const h = vv.height;
        applyVvh(h);
        const fullH = window.innerHeight;
        const delta = fullH - h;
        const kbOpen = delta > 120;
        setKb(kbOpen, kbOpen ? delta : 0);
      }
    };

    vv?.addEventListener('resize', onResize);
    vv?.addEventListener('scroll', onScroll);
    window.addEventListener('resize', onResize);

    return () => {
      vv?.removeEventListener('resize', onResize);
      vv?.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      setKb(false, 0);
    };
  }, []);
}

export default function App() {
  useKeyboardViewport();

  // Initialize PWA features
  useEffect(() => {
    console.log('Initializing PWA...');

    const initPWA = async () => {
      try {
        // Check if this is the first load after a build update
        const buildVersion = import.meta.env.VITE_BUILD_VERSION || 'dev';
        const lastBuildVersion = localStorage.getItem('lastBuildVersion');

        if (lastBuildVersion && lastBuildVersion !== buildVersion) {
          console.log('🔄 Build version changed, clearing caches...');
          // Clear all caches when build version changes
          if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
          }
          // Unregister old service workers
          if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(registrations.map(reg => reg.unregister()));
          }
        }

        // Update build version
        localStorage.setItem('lastBuildVersion', buildVersion);

        // Initialize PWA service worker
        const { updateSW } = initializePWA();

        // Setup network status handling
        setupNetworkHandling();

        // Setup install prompt handling
        setupInstallPrompt();

        // Store update function globally for manual updates
        window.pwaUpdateSW = updateSW;

        console.log('✅ PWA initialized successfully');
      } catch (error) {
        console.error('❌ PWA initialization error:', error);
        // Don't throw - allow app to continue without PWA
      }
    };

    initPWA();
  }, []); return (
    <AuthProvider>
      <AuthFlowProvider>
        <Routes>
          {/* Public routes - only accessible to non-authenticated users */}
          <Route
            path="/splash"
            element={
              <PublicRoute>
                <SplashPage />
              </PublicRoute>
            }
          />
          <Route
            path="/"
            element={
              <PublicRoute>
                <LandingPage />
              </PublicRoute>
            }
          />
          <Route
            path="/signin/email"
            element={
              <PublicRoute>
                <EmailPage mode="signin" />
              </PublicRoute>
            }
          />
          <Route
            path="/signup/email"
            element={
              <PublicRoute>
                <EmailPage mode="signup" />
              </PublicRoute>
            }
          />
          <Route
            path="/signin/code"
            element={
              <PublicRoute>
                <CodePage mode="signin" />
              </PublicRoute>
            }
          />
          <Route
            path="/signup/code"
            element={
              <PublicRoute>
                <CodePage mode="signup" />
              </PublicRoute>
            }
          />

          {/* Signup flow routes - semi-protected (user needs to be in signup process) */}
          <Route
            path="/signup/setup"
            element={
              <PublicRoute redirectTo="/signup/username">
                <SignupSetup />
              </PublicRoute>
            }
          />
          <Route
            path="/signup/username"
            element={
              <PublicRoute redirectTo="/dashboard">
                <UsernamePage />
              </PublicRoute>
            }
          />

          {/* Protected routes - require authentication */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/add-device"
            element={
              <ProtectedRoute>
                <AddDevicePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/add-device/setup"
            element={
              <ProtectedRoute>
                <SignupSetup />
              </ProtectedRoute>
            }
          />
          <Route
            path="/start-cycle"
            element={
              <ProtectedRoute>
                <StartCyclePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/device/:deviceId"
            element={
              <ProtectedRoute>
                <DeviceDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/alerts"
            element={
              <ProtectedRoute>
                <AlertsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/privacy-security"
            element={
              <ProtectedRoute>
                <PrivacySecurityPage />
              </ProtectedRoute>
            }
          />

          {/* Admin routes - require admin privileges */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin={true}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/devices"
            element={
              <ProtectedRoute requireAdmin={true}>
                <AdminDevices />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/create"
            element={
              <ProtectedRoute requireAdmin={true}>
                <AdminCreate />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute requireAdmin={true}>
                <AdminUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute requireAdmin={true}>
                <AdminSettings />
              </ProtectedRoute>
            }
          />

          {/* Catch-all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {/* Development cache helper - only shows in dev mode */}
        {/* <DevCacheHelper /> */}
      </AuthFlowProvider>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </AuthProvider>
  );
}
