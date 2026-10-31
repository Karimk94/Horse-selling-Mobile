import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import LoginScreen from '../auth/LoginScreen';

const mockSignIn = jest.fn();

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    signIn: mockSignIn,
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

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Linking, 'openURL').mockImplementation(() => Promise.resolve());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders branding, input fields, close button, and trust pillars', () => {
    const { getByTestId, getByText } = render(
      <LoginScreen navigation={{ goBack: jest.fn(), navigate: jest.fn() }} />
    );

    expect(getByTestId('auth-close-button')).toBeTruthy();
    expect(getByTestId('login-email-input')).toBeTruthy();
    expect(getByTestId('login-password-input')).toBeTruthy();
    expect(getByTestId('login-submit-button')).toBeTruthy();
    expect(getByText('authWelcomeTitle')).toBeTruthy();
    expect(getByText('authTrustUae')).toBeTruthy();
  });

  it('renders topBar concierge shortcut and bottom trust shield with concierge assistance', () => {
    const { getByTestId } = render(
      <LoginScreen navigation={{ goBack: jest.fn(), navigate: jest.fn() }} />
    );

    expect(getByTestId('login-concierge-support-btn')).toBeTruthy();
    fireEvent.press(getByTestId('login-concierge-support-btn'));
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/971500000000'));

    expect(getByTestId('login-trust-shield')).toBeTruthy();
    expect(getByTestId('login-concierge-btn')).toBeTruthy();
    fireEvent.press(getByTestId('login-concierge-btn'));
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/971500000000'));
  });

  it('handles top dismiss modal button click', () => {
    const goBack = jest.fn();
    const canGoBack = jest.fn().mockReturnValue(true);
    const { getByTestId } = render(
      <LoginScreen navigation={{ goBack, canGoBack, getParent: () => null }} />
    );

    fireEvent.press(getByTestId('auth-close-button'));
    expect(goBack).toHaveBeenCalledTimes(1);
  });

  it('validates fields and calls signIn with email and password', async () => {
    mockSignIn.mockResolvedValueOnce({ access_token: 'test_token' });
    const goBack = jest.fn();
    const { getByTestId } = render(
      <LoginScreen navigation={{ goBack, canGoBack: () => true }} />
    );

    fireEvent.changeText(getByTestId('login-email-input'), 'rider@steedmarket.ae');
    fireEvent.changeText(getByTestId('login-password-input'), 'SecurePass123');
    fireEvent.press(getByTestId('login-submit-button'));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('rider@steedmarket.ae', 'SecurePass123');
    });
  });

  it('navigates to Signup screen on tapping sign up link', () => {
    const navigate = jest.fn();
    const { getByTestId } = render(
      <LoginScreen navigation={{ navigate, goBack: jest.fn() }} />
    );

    fireEvent.press(getByTestId('navigate-signup-button'));
    expect(navigate).toHaveBeenCalledWith('Signup');
  });
});

