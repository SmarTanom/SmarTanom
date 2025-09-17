import React, { createContext, useContext, useMemo, useState } from 'react';

// Holds ephemeral state for the OAuth-like flow across pages
const AuthFlowContext = createContext(null);

export function AuthFlowProvider({ children }) {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);

  const value = useMemo(
    () => ({ mode, setMode, email, setEmail, code, setCode, codeSent, setCodeSent }),
    [mode, email, code, codeSent]
  );

  return <AuthFlowContext.Provider value={value}>{children}</AuthFlowContext.Provider>;
}

export function useAuthFlow() {
  const ctx = useContext(AuthFlowContext);
  if (!ctx) throw new Error('useAuthFlow must be used within AuthFlowProvider');
  return ctx;
}
