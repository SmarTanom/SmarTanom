import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthFlowProvider } from './features/auth/AuthFlowContext.jsx';
import LandingPage from './pages/LandingPage.jsx';
import EmailPage from './pages/EmailPage.jsx';
import CodePage from './pages/CodePage.jsx';
import UsernamePage from './pages/UsernamePage.jsx';
import SplashPage from './pages/SplashPage.jsx';
import SignupSetup from './pages/SignupSetup.jsx';
import Dashboard from './pages/Dashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';

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
  return (
    <AuthFlowProvider>
      <Routes>
        <Route path="/splash" element={<SplashPage />} />
        <Route path="/" element={<LandingPage />} />
        <Route path="/signin/email" element={<EmailPage mode="signin" />} />
        <Route path="/signup/email" element={<EmailPage mode="signup" />} />
        <Route path="/signin/code" element={<CodePage mode="signin" />} />
        <Route path="/signup/code" element={<CodePage mode="signup" />} />
        <Route path="/signup/setup" element={<SignupSetup />} />
        <Route path="/signup/username" element={<UsernamePage />} />
  <Route path="/dashboard" element={<Dashboard />} />
  <Route path="/admin" element={<AdminDashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthFlowProvider>
  );
}
