import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthFlowProvider } from './features/auth/AuthFlowContext.jsx';
import LandingPage from './pages/LandingPage.jsx';
import EmailPage from './pages/EmailPage.jsx';
import CodePage from './pages/CodePage.jsx';
import UsernamePage from './pages/UsernamePage.jsx';

export default function App() {
  return (
    <AuthFlowProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/signin/email" element={<EmailPage mode="signin" />} />
        <Route path="/signup/email" element={<EmailPage mode="signup" />} />
        <Route path="/signin/code" element={<CodePage mode="signin" />} />
        <Route path="/signup/code" element={<CodePage mode="signup" />} />
        <Route path="/signup/username" element={<UsernamePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthFlowProvider>
  );
}
