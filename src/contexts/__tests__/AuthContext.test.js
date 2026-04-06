import React from 'react';
import { Text } from 'react-native';
import { act, render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from '../AuthContext';
import * as apiService from '../../services/api';
import { openAuthStack } from '../../navigation/navigationService';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getExpoPushTokenAsync: jest.fn(async () => ({ data: 'expo-token' })),
}));

jest.mock('../../navigation/navigationService', () => ({
  openAuthStack: jest.fn(),
}));

jest.mock('../../services/api', () => ({
  getProfile: jest.fn(),
  registerPushToken: jest.fn(async () => ({})),
  unregisterPushToken: jest.fn(async () => ({})),
  registerUnauthorizedHandler: jest.fn(),
  login: jest.fn(),
  signup: jest.fn(),
}));

function AuthProbe() {
  const { loading, isAuthenticated } = useAuth();
  return <Text>{loading ? 'loading' : isAuthenticated ? 'authenticated' : 'guest'}</Text>;
}

describe('AuthContext', () => {
  let unauthorizedHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    unauthorizedHandler = undefined;

    apiService.registerUnauthorizedHandler.mockImplementation((handler) => {
      unauthorizedHandler = handler;
      return jest.fn();
    });
  });

  it('clears the session and opens auth when the unauthorized handler fires', async () => {
    AsyncStorage.getItem.mockImplementation(async (key) => {
      if (key === 'accessToken') return 'access-token';
      return null;
    });
    apiService.getProfile.mockResolvedValue({
      data: { id: 'user-1', email: 'user@example.com', role: 'buyer' },
    });

    const screen = render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('authenticated')).toBeTruthy();
    });

    await act(async () => {
      await unauthorizedHandler();
    });

    await waitFor(() => {
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('accessToken');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('expoPushToken');
      expect(openAuthStack).toHaveBeenCalledTimes(1);
      expect(screen.getByText('guest')).toBeTruthy();
    });

    expect(apiService.unregisterPushToken).not.toHaveBeenCalled();
  });
});