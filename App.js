import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { AuthProvider } from './src/contexts/AuthContext';
import { LanguageProvider } from './src/contexts/LanguageContext';
import AppNavigator from './src/navigation/AppNavigator';
import BrandedSplash from './src/components/BrandedSplash';
import ErrorBoundary from './src/components/ErrorBoundary';
import { navigate } from './src/navigation/navigationService';
import * as apiService from './src/services/api';
import ToastProvider from './src/components/ToastProvider';

// Configure notification behavior safely
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch (e) {
  console.warn('Notification handler init skipped:', e);
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1400);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleNotificationOpen = async (response) => {
      try {
        const data = response?.notification?.request?.content?.data || {};
        const horseId = data.horse_id || data.horseId;
        const alertId = data.alert_id || data.alertId;
        const type = data.type;

        const offerEventTypes = new Set([
          'offer_new',
          'offer_counter',
          'offer_accepted',
          'offer_rejected',
          'offer_cancelled',
          'listing_sold',
          'offer_sold',
        ]);

        if (type && offerEventTypes.has(type)) {
          navigate('Main', {
            screen: 'Profile',
            params: { screen: 'Offers' },
          });
          return;
        }

        if (!horseId) return;

        if (alertId) {
          try {
            await apiService.markSavedSearchAlertRead(alertId);
          } catch {}
        }

        const horseRes = await apiService.getHorse(horseId);
        navigate('GlobalHorseDetail', { horse: horseRes.data });
      } catch (err) {
        console.warn('Failed to handle notification open:', err);
      }
    };

    const setupNotificationHandling = async () => {
      try {
        const permissions = await Notifications.getPermissionsAsync();
        if (permissions.status !== 'granted') {
          await Notifications.requestPermissionsAsync();
        }

        const initialResponse = await Notifications.getLastNotificationResponseAsync();
        if (initialResponse) {
          await handleNotificationOpen(initialResponse);
        }
      } catch (err) {
        console.warn('Push notification setup skipped or failed:', err);
      }
    };

    setupNotificationHandling();

    let subscription;
    try {
      subscription = Notifications.addNotificationResponseReceivedListener((response) => {
        handleNotificationOpen(response);
      });
    } catch (err) {
      console.warn('Listener subscription failed:', err);
    }

    return () => {
      if (subscription && typeof subscription.remove === 'function') {
        subscription.remove();
      }
    };
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <LanguageProvider>
          {showSplash ? (
            <BrandedSplash />
          ) : (
            <AuthProvider>
              <ToastProvider>
                <React.Suspense fallback={null}>
                  <AppNavigator />
                </React.Suspense>
              </ToastProvider>
            </AuthProvider>
          )}
        </LanguageProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({});
