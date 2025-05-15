import React, { createContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Get the appropriate API URL based on platform - always use production for now
  const getApiBaseUrl = () => {
    // Always use production URL to avoid connection issues
    return 'https://smartanom-django-backend-prod.onrender.com';
  };

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const [storedUser, storedToken] = await Promise.all([
          AsyncStorage.getItem("user"),
          AsyncStorage.getItem("token"),
        ]);

        if (storedUser && storedToken) {
          setUser(JSON.parse(storedUser));
          setToken(storedToken);
        }
      } catch (error) {
        console.error("Failed to load user data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, []);

  const login = async (email, password) => {
    try {
      setIsLoading(true);
      const baseUrl = getApiBaseUrl();
      const apiUrl = `${baseUrl}/api/accounts/login`;
      console.log("Attempting login to:", apiUrl);
      
      // Create an AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password
        }),
        signal: controller.signal
      });
      
      // Clear the timeout
      clearTimeout(timeoutId);
      
      console.log("Response status:", response.status);
      
      const responseData = await response.json();
      console.log("Login response data:", responseData);

      if (!response.ok) {
        let errorMessage = "Login failed";
        if (responseData.error) {
          errorMessage = responseData.error;
        } else if (responseData.detail) {
          errorMessage = responseData.detail;
        } else if (responseData.non_field_errors) {
          errorMessage = responseData.non_field_errors.join(', ');
        }
        throw new Error(errorMessage);
      }

      if (responseData.token && responseData.user) {
        setUser(responseData.user);
        setToken(responseData.token);
        await AsyncStorage.setItem("user", JSON.stringify(responseData.user));
        await AsyncStorage.setItem("token", responseData.token);
        return { success: true };
      } else {
        return {
          success: false,
          error: "Invalid response from server"
        };
      }
    } catch (error) {
      console.error("Login error:", error);
      
      let errorMessage = "Network error. Please try again.";
      
      if (error.name === 'AbortError') {
        errorMessage = "Request timed out. The server might be down or your connection is slow.";
      } else if (error.message?.includes("Network request failed")) {
        errorMessage = "Network connection failed. Please check your internet connection.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return {
        success: false,
        error: errorMessage
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
      setToken(null);
      await Promise.all([
        AsyncStorage.removeItem("user"),
        AsyncStorage.removeItem("token"),
      ]);
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isLoading,
      login,
      logout,
      updateUserProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};
