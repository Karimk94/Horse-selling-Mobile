import React from 'react';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { AuthProvider } from './src/contexts/AuthContext';
import { LanguageProvider } from './src/contexts/LanguageContext';
import AppNavigator from './src/navigation/AppNavigator';
import BrandedSplash from './src/components/BrandedSplash';
import { navigate } from './src/navigation/navigationService';
import * as apiService from './src/services/api';
import { API_BASE_URL } from './src/config/api';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1400);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleNotificationOpen = async (response) => {
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

      try {
        if (alertId) {
          try {
            await apiService.markSavedSearchAlertRead(alertId);
          } catch {}
        }

        const horseRes = await apiService.getHorse(horseId);
        navigate('GlobalHorseDetail', { horse: horseRes.data });
      } catch {}
    };

    const setupNotificationHandling = async () => {
      const permissions = await Notifications.getPermissionsAsync();
      if (permissions.status !== 'granted') {
        await Notifications.requestPermissionsAsync();
      }

      const initialResponse = await Notifications.getLastNotificationResponseAsync();
      if (initialResponse) {
        await handleNotificationOpen(initialResponse);
      }
    };

    setupNotificationHandling();

    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        handleNotificationOpen(response);
      }
    );

    return () => subscription.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <View style={styles.debugBanner} pointerEvents="none">
        <Text style={styles.debugText}>API: {API_BASE_URL}</Text>
      </View>
      <LanguageProvider>
        {showSplash ? (
          <BrandedSplash />
        ) : (
          <AuthProvider>
            <AppNavigator />
          </AuthProvider>
        )}
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  debugBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 9999,
    alignItems: 'center',
  },
  debugText: {
    color: '#fff',
    fontSize: 12,
  },
});
