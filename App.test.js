import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import App from './App';
import * as apiService from './src/services/api';
import { navigate } from './src/navigation/navigationService';

let notificationListener;

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
}));

jest.mock('./src/contexts/AuthContext', () => ({
  AuthProvider: ({ children }) => children,
}));

jest.mock('./src/contexts/LanguageContext', () => ({
  LanguageProvider: ({ children }) => children,
}));

jest.mock('./src/navigation/AppNavigator', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return () => React.createElement(Text, null, 'AppNavigator');
});

jest.mock('./src/navigation/navigationService', () => ({
  navigate: jest.fn(),
}));

jest.mock('./src/services/api', () => ({
  getHorse: jest.fn(),
  markSavedSearchAlertRead: jest.fn(),
}));

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getLastNotificationResponseAsync: jest.fn(async () => null),
  addNotificationResponseReceivedListener: jest.fn((callback) => {
    notificationListener = callback;
    return { remove: jest.fn() };
  }),
}));

describe('App notification navigation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    notificationListener = undefined;
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('routes offer notifications to the offers screen from the initial notification response', async () => {
    const Notifications = require('expo-notifications');
    Notifications.getLastNotificationResponseAsync.mockResolvedValue({
      notification: {
        request: {
          content: {
            data: {
              type: 'offer_accepted',
            },
          },
        },
      },
    });

    render(<App />);

    await act(async () => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('Main', {
        screen: 'Profile',
        params: { screen: 'Offers' },
      });
    });
  });

  it('opens horse detail and marks the alert read when a horse notification is received', async () => {
    apiService.getHorse.mockResolvedValue({
      data: { id: 'horse-1', title: 'Comet' },
    });

    render(<App />);

    await act(async () => {
      jest.runAllTimers();
    });

    await act(async () => {
      await notificationListener({
        notification: {
          request: {
            content: {
              data: {
                horse_id: 'horse-1',
                alert_id: 'alert-1',
                type: 'saved_search_match',
              },
            },
          },
        },
      });
    });

    await waitFor(() => {
      expect(apiService.markSavedSearchAlertRead).toHaveBeenCalledWith('alert-1');
      expect(apiService.getHorse).toHaveBeenCalledWith('horse-1');
      expect(navigate).toHaveBeenCalledWith('GlobalHorseDetail', {
        horse: { id: 'horse-1', title: 'Comet' },
      });
    });
  });
});