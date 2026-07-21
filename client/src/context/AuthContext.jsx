import React, { useState, useEffect, useCallback } from 'react';
import { AuthContext } from './auth';

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const clearAuth = useCallback(() => {
    localStorage.removeItem('seedbox_authenticated');
    localStorage.removeItem('seedbox_auth_timestamp');
    setIsAuthenticated(false);
  }, []);

  const checkAuthStatus = useCallback(() => {
    try {
      const authStatus = localStorage.getItem('seedbox_authenticated');
      const authTimestamp = localStorage.getItem('seedbox_auth_timestamp');
      
      if (authStatus === 'true' && authTimestamp) {
        // Check if authentication is still valid (optional: add expiration logic here)
        const timestamp = parseInt(authTimestamp);
        const now = Date.now();
        
        // Authentication expires after 30 days (optional)
        const EXPIRY_TIME = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
        
        if (now - timestamp < EXPIRY_TIME) {
          setIsAuthenticated(true);
        } else {
          // Clear expired authentication
          clearAuth();
        }
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      clearAuth();
    } finally {
      setIsLoading(false);
    }
  }, [clearAuth]);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const authenticate = () => {
    setIsAuthenticated(true);
  };

  const logout = () => {
    clearAuth();
    // Optionally redirect to login or refresh page
    window.location.reload();
  };

  const value = {
    isAuthenticated,
    isLoading,
    authenticate,
    logout,
    clearAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
