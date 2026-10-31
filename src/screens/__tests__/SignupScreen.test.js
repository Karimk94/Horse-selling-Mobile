import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import SignupScreen from '../auth/SignupScreen';

const mockSignUp = jest.fn();

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    signUp: mockSignUp,
    isAuthenticated: false,
    user: null,
  }),
}));

jest.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key) => key,
    isRTL: false,
    language: 'en',
    toggleLanguage: jest.fn(),
  }),
}));

jest.mock('../../components/ToastProvider', () => ({
  useToast: () => ({ show: jest.fn() }),
}));

describe('SignupScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Linking, 'openURL').mockImplementation(() => Promise.resolve());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders role cards, inputs, close button, and emirate chips', () => {
    const { getByTestId } = render(
      <SignupScreen navigation={{ goBack: jest.fn() }} />
    );

    expect(getByTestId('auth-close-button')).toBeTruthy();
    expect(getByTestId('signup-back-button')).toBeTruthy();
    expect(getByTestId('role-chip-buyer')).toBeTruthy();
    expect(getByTestId('role-chip-seller')).toBeTruthy();
    expect(getByTestId('role-chip-both')).toBeTruthy();
    expect(getByTestId('signup-firstname-input')).toBeTruthy();
    expect(getByTestId('signup-email-input')).toBeTruthy();
    expect(getByTestId('signup-phone-input')).toBeTruthy();
    expect(getByTestId('signup-password-input')).toBeTruthy();
    expect(getByTestId('signup-confirm-password-input')).toBeTruthy();
    expect(getByTestId('emirate-chip-dubai')).toBeTruthy();
  });

  it('renders topBar concierge shortcut and bottom trust charter shield with concierge assistance', () => {
    const { getByTestId } = render(
      <SignupScreen navigation={{ goBack: jest.fn() }} />
    );

    expect(getByTestId('signup-concierge-support-btn')).toBeTruthy();
    fireEvent.press(getByTestId('signup-concierge-support-btn'));
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/971500000000'));

    expect(getByTestId('signup-trust-shield')).toBeTruthy();
    expect(getByTestId('signup-concierge-btn')).toBeTruthy();
    fireEvent.press(getByTestId('signup-concierge-btn'));
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/971500000000'));
  });

  it('allows selecting role and emirate location chip', () => {
    const { getByTestId } = render(
      <SignupScreen navigation={{ goBack: jest.fn() }} />
    );

    // Tap seller role
    fireEvent.press(getByTestId('role-chip-seller'));

    // Tap Abu Dhabi chip
    fireEvent.press(getByTestId('emirate-chip-abu-dhabi'));
    expect(getByTestId('signup-location-input').props.value).toBe('Abu Dhabi');
  });

  it('handles modal dismiss close button', () => {
    const goBack = jest.fn();
    const canGoBack = jest.fn().mockReturnValue(true);
    const { getByTestId } = render(
      <SignupScreen navigation={{ goBack, canGoBack, getParent: () => null }} />
    );

    fireEvent.press(getByTestId('auth-close-button'));
    expect(goBack).toHaveBeenCalledTimes(1);
  });

  it('validates fields and calls signUp with correct payload', async () => {
    mockSignUp.mockResolvedValueOnce({ success: true });
    const goBack = jest.fn();
    const { getByTestId } = render(
      <SignupScreen navigation={{ goBack, canGoBack: () => true, getParent: () => null }} />
    );

    fireEvent.changeText(getByTestId('signup-firstname-input'), 'Mansoor');
    fireEvent.changeText(getByTestId('signup-lastname-input'), 'Al Nuaimi');
    fireEvent.changeText(getByTestId('signup-email-input'), 'mansoor@alnuaimi.ae');
    fireEvent.changeText(getByTestId('signup-phone-input'), '+971501234567');
    fireEvent.press(getByTestId('emirate-chip-dubai'));
    fireEvent.changeText(getByTestId('signup-password-input'), 'DesertGold2026!');
    fireEvent.changeText(getByTestId('signup-confirm-password-input'), 'DesertGold2026!');

    fireEvent.press(getByTestId('signup-submit-button'));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'mansoor@alnuaimi.ae',
        password: 'DesertGold2026!',
        first_name: 'Mansoor',
        last_name: 'Al Nuaimi',
        phone_number: '+971501234567',
        location: 'Dubai',
        role: 'buyer',
        language: 'en',
      });
    });
  });
});

