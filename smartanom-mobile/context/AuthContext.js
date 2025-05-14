import React, { createContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

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
      const apiUrl = Platform.OS === 'android'
        ? 'http://10.0.2.2:8000/api/accounts/login/'
        : 'http://127.0.0.1:8000/api/accounts/login/';

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password
        }),
      });

      const responseData = await response.json();

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
      console.error("Login error:", error.message);
      return {
        success: false,
        error: error.message || "Network error. Please try again."
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