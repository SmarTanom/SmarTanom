import React, { createContext, useState, useEffect, useContext } from 'react';
import { Appearance } from 'react-native'; // For detecting system-wide dark/light mode

export const AppSettingsContext = createContext();

// Custom hook to access the app settings context
export const useAppSettings = () => {
  return useContext(AppSettingsContext);
};

export const AppSettingsProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    setDarkMode(false); // Force light mode as default
  }, []);
  

  // Toggle dark mode
  const toggleDarkMode = () => setDarkMode(prevMode => !prevMode);

  return (
    <AppSettingsContext.Provider value={{ darkMode, setDarkMode, toggleDarkMode }}>
      {children}
    </AppSettingsContext.Provider>
  );
};
