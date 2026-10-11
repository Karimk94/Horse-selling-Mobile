import React from 'react';
import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import ProfileScreen from '../ProfileScreen';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback) => require('react').useEffect(callback, [callback]),
}));

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: null, email: 'seller@example.com', profile: {} },
    isAuthenticated: true,
    signOut: jest.fn(),
    refreshProfile: jest.fn(),
  }),
}));

jest.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key) => key,
    isRTL: true,
    language: 'ar',
    setLanguage: jest.fn(),
  }),
}));

jest.mock('../../components/ToastProvider', () => ({
  useToast: () => ({ show: jest.fn() }),
}));

jest.mock('../../services/api', () => ({
  getSavedSearchAlertsUnreadCount: jest.fn().mockResolvedValue({ data: { unread_count: 0 } }),
  getActionRequiredOffersCount: jest.fn().mockResolvedValue({ data: { actionable_count: 0 } }),
}));

describe('ProfileScreen Arabic settings layout', () => {
  it('stretches settings bars across the available section width in RTL', () => {
    const screen = render(<ProfileScreen navigation={{ navigate: jest.fn() }} />);
    const section = screen.getByTestId('profile-settings-section');
    const languageCard = screen.getByTestId('profile-language-card');
    const languageOptions = screen.getByTestId('profile-language-options');

    expect(StyleSheet.flatten(section.props.style).alignItems).toBe('stretch');
    expect(StyleSheet.flatten(languageCard.props.style).flexDirection).toBe('row');
    expect(StyleSheet.flatten(languageOptions.props.style).flexDirection).toBe('row');
    expect(screen.getByText('language')).toBeTruthy();
    expect(screen.getByText('savedAlerts')).toBeTruthy();
  });
});