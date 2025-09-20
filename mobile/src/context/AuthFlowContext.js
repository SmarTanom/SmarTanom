import React, { createContext, useContext, useState } from 'react';

const AuthFlowContext = createContext();

export const useAuthFlow = () => {
  const context = useContext(AuthFlowContext);
  if (!context) {
    throw new Error('useAuthFlow must be used within AuthFlowProvider');
  }
  return context;
};

export const AuthFlowProvider = ({ children }) => {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [username, setUsername] = useState('');

  const resetFlow = () => {
    setEmail('');
    setVerificationCode('');
    setUsername('');
    setMode('signin');
  };

  const value = {
    mode,
    setMode,
    email,
    setEmail,
    verificationCode,
    setVerificationCode,
    username,
    setUsername,
    resetFlow,
  };

  return (
    <AuthFlowContext.Provider value={value}>
      {children}
    </AuthFlowContext.Provider>
  );
};