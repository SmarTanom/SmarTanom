// AppSettingsContext.js
import React, { createContext, useState, useEffect } from 'react';
import { Appearance } from 'react-native'; // For detecting system-wide dark/light mode

export const AppSettingsContext = createContext();

export const AppSettingsProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // Load the user's preference or system setting for dark mode
    const systemDarkMode = Appearance.getColorScheme() === 'dark';
    setDarkMode(systemDarkMode);
  }, []);

  // Toggle dark mode
  const toggleDarkMode = () => setDarkMode(prevMode => !prevMode);

  return (
    <AppSettingsContext.Provider value={{ darkMode, setDarkMode, toggleDarkMode }}>
      {children}
    </AppSettingsContext.Provider>
  );
};
