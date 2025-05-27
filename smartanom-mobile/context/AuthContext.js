
import React, { createContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("user");
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error("Failed to load user data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, []);

  // Simple login function that accepts any credentials
  const login = async (email, password) => {
    try {
      setIsLoading(true);

      // Create a mock user object
      const mockUser = {
        id: 1,
        name: "Demo User",
        email: email || "demo@smartanom.com",
        contact: "123-456-7890"
      };

      // Set user and save to storage
      setUser(mockUser);
      await AsyncStorage.setItem("user", JSON.stringify(mockUser));

      return { success: true };
    } catch (error) {
      console.error("Login error:", error);
      return {
        success: false,
        error: "Login failed. Please try again."
      };
    } finally {
      setIsLoading(false);
    }
  };



  const updateUserProfile = async (userData) => {
    try {
      if (!user) return false;

      // Update the user object with new data
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);

      // Save to AsyncStorage
      await AsyncStorage.setItem("user", JSON.stringify(updatedUser));

      return true;
    } catch (error) {
      console.error("Update profile error:", error);
      return false;
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      setUser(null);
      await AsyncStorage.removeItem("user");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      login,
      logout,
      updateUserProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};
