
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

  // Function to check if account is locked
  const isAccountLocked = async (email) => {
    try {
      const lockData = await AsyncStorage.getItem(`lockout_${email}`);
      if (!lockData) {
        console.log(`No lockout data for ${email}`);
        return false;
      }
      
      const data = JSON.parse(lockData);
      console.log(`Lockout data for ${email}:`, data);
      
      // If account is explicitly locked
      if (data.locked) {
        const lockoutTime = new Date(data.timestamp);
        const now = new Date();
        const hoursPassed = (now - lockoutTime) / (1000 * 60 * 60);
        
        console.log(`Account locked, hours passed: ${hoursPassed}`);
        
        // If 24 hours have passed, unlock the account
        if (hoursPassed >= 24) {
          console.log(`Unlocking account for ${email} after 24 hours`);
          await AsyncStorage.setItem(`lockout_${email}`, JSON.stringify({
            attempts: 0,
            timestamp: now.toISOString(),
            locked: false
          }));
          return false;
        }
        console.log(`Account for ${email} is still locked`);
        return true;
      }
      
      // Check if attempts >= 5 (should be locked)
      if (data.attempts >= 5) {
        console.log(`Account for ${email} should be locked (${data.attempts} attempts)`);
        // Update to ensure it's marked as locked
        await AsyncStorage.setItem(`lockout_${email}`, JSON.stringify({
          ...data,
          locked: true
        }));
        return true;
      }
      
      console.log(`Account for ${email} is not locked (${data.attempts} attempts)`);
      return false;
    } catch (error) {
      console.error("Error checking account lock:", error);
      return false;
    }
  };
  
  // Function to record failed login attempt
  const recordFailedAttempt = async (email) => {
    try {
      const lockData = await AsyncStorage.getItem(`lockout_${email}`);
      const now = new Date();
      
      if (!lockData) {
        // First failed attempt
        await AsyncStorage.setItem(`lockout_${email}`, JSON.stringify({
          attempts: 1,
          timestamp: now.toISOString(),
          locked: false
        }));
        console.log(`First failed attempt for ${email}`);
        return 1;
      } else {
        const data = JSON.parse(lockData);
        const newAttempts = data.attempts + 1;
        const locked = newAttempts >= 5;
        
        console.log(`Failed attempt for ${email}: ${newAttempts}/5, locked: ${locked}`);
        
        await AsyncStorage.setItem(`lockout_${email}`, JSON.stringify({
          attempts: newAttempts,
          timestamp: now.toISOString(),
          locked: locked
        }));
        
        return newAttempts;
      }
    } catch (error) {
      console.error("Error recording failed attempt:", error);
      return 0;
    }
  };
  
  // Function to reset login attempts on successful login
  const resetLoginAttempts = async (email) => {
    try {
      await AsyncStorage.setItem(`lockout_${email}`, JSON.stringify({
        attempts: 0,
        timestamp: new Date().toISOString(),
        locked: false
      }));
    } catch (error) {
      console.error("Error resetting login attempts:", error);
    }
  };

  const login = async (email, password) => {
    try {
      setIsLoading(true);
      
      // Normalize email
      email = email.toLowerCase().trim();
      
      // Check if account is locked
      const locked = await isAccountLocked(email);
      if (locked) {
        const lockData = JSON.parse(await AsyncStorage.getItem(`lockout_${email}`));
        const lockTime = new Date(lockData.timestamp);
        const now = new Date();
        const hoursRemaining = 24 - ((now - lockTime) / (1000 * 60 * 60));
        
        console.log(`Account ${email} is locked, ${hoursRemaining} hours remaining`);
        
        return {
          success: false,
          error: `Account locked due to too many failed attempts. Try again in ${Math.ceil(hoursRemaining)}h.`
        };
      }
      
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
        // Record failed attempt
        const attempts = await recordFailedAttempt(email);
        const attemptsLeft = 5 - attempts;
        
        console.log(`Login failed for ${email}, attempts: ${attempts}, remaining: ${attemptsLeft}`);
        
        let errorMessage = "Login failed";
        if (responseData.error) {
          errorMessage = responseData.error;
        } else if (responseData.detail) {
          errorMessage = responseData.detail;
        } else if (responseData.non_field_errors) {
          errorMessage = responseData.non_field_errors.join(', ');
        }
        
        // Add attempts remaining to error message
        if (attemptsLeft > 0) {
          errorMessage += ` (${attemptsLeft} attempts remaining)`;
        } else {
          errorMessage = "Account locked for 24 hours due to too many failed attempts.";
          
          // Ensure account is marked as locked
          await AsyncStorage.setItem(`lockout_${email}`, JSON.stringify({
            attempts: 5,
            timestamp: new Date().toISOString(),
            locked: true
          }));
        }
        
        return {
          success: false,
          error: errorMessage
        };
      }

      if (responseData.token && responseData.user) {
        // Reset login attempts on successful login
        await resetLoginAttempts(email);
        
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
