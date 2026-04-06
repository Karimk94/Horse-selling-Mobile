import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as apiService from '../services/api';
import { openAuthStack } from '../navigation/navigationService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(async ({ unregisterPush = true, openAuth = false } = {}) => {
    try {
      if (unregisterPush) {
        const storedPushToken = await AsyncStorage.getItem('expoPushToken');
        if (storedPushToken) {
          await apiService.unregisterPushToken(storedPushToken, {
            skipUnauthorizedHandler: true,
          });
        }
      }
    } catch {
      // Best-effort unregister.
    }

    await AsyncStorage.removeItem('accessToken');
    await AsyncStorage.removeItem('expoPushToken');
    setToken(null);
    setUser(null);

    if (openAuth) {
      openAuthStack();
    }
  }, []);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  useEffect(() => {
    const unregister = apiService.registerUnauthorizedHandler(async () => {
      await clearSession({ unregisterPush: false, openAuth: true });
    });

    return unregister;
  }, [clearSession]);

  const syncPushToken = async () => {
    if (Platform.OS === 'web') return;
    try {
      const permissions = await Notifications.getPermissionsAsync();
      let status = permissions.status;
      if (status !== 'granted') {
        const requested = await Notifications.requestPermissionsAsync();
        status = requested.status;
      }
      if (status !== 'granted') return;

      const pushToken = (await Notifications.getExpoPushTokenAsync()).data;
      if (!pushToken) return;

      await apiService.registerPushToken(pushToken, Platform.OS);
      await AsyncStorage.setItem('expoPushToken', pushToken);
    } catch {
      // Ignore token sync failures silently.
    }
  };

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('accessToken');
      if (storedToken) {
        setToken(storedToken);
        try {
          const res = await apiService.getProfile();
          setUser(res.data);
          await syncPushToken();
        } catch {
          await clearSession({ unregisterPush: false, openAuth: false });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email, password) => {
    const res = await apiService.login(email, password);
    const accessToken = res.data.access_token;
    await AsyncStorage.setItem('accessToken', accessToken);
    setToken(accessToken);
    const profileRes = await apiService.getProfile();
    setUser(profileRes.data);
    await syncPushToken();
    return res.data;
  };

  const signUp = async (data) => {
    const res = await apiService.signup(data);
    const accessToken = res.data.access_token;
    await AsyncStorage.setItem('accessToken', accessToken);
    setToken(accessToken);
    const profileRes = await apiService.getProfile();
    setUser(profileRes.data);
    await syncPushToken();
    return res.data;
  };

  const signOut = async () => {
    await clearSession({ unregisterPush: true, openAuth: false });
  };

  const refreshProfile = async () => {
    try {
      const res = await apiService.getProfile();
      setUser(res.data);
      await syncPushToken();
    } catch {}
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!token,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
