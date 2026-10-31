import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { StyleSheet, Linking, Alert } from 'react-native';
import ProfileScreen from '../ProfileScreen';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback) => require('react').useEffect(callback, [callback]),
}));

let mockAuth = {
  user: { id: 'seller-1', email: 'seller@example.com', profile: { first_name: 'Rashid', last_name: 'Al Maktoum', location: 'Dubai' }, role: 'seller', is_verified: true },
  isAuthenticated: true,
  signOut: jest.fn(),
  refreshProfile: jest.fn(),
};

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

let mockLanguage = {
  t: (key) => key,
  isRTL: true,
  language: 'ar',
  setLanguage: jest.fn(),
};

jest.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => mockLanguage,
}));

jest.mock('../../components/ToastProvider', () => ({
  useToast: () => ({ show: jest.fn() }),
}));

jest.mock('../../services/api', () => ({
  getSavedSearchAlertsUnreadCount: jest.fn().mockResolvedValue({ data: { unread_count: 0 } }),
  getActionRequiredOffersCount: jest.fn().mockResolvedValue({ data: { actionable_count: 0 } }),
  getHorses: jest.fn().mockResolvedValue({ data: { horses: [] } }),
  getEquipmentList: jest.fn().mockResolvedValue({ data: { items: [] } }),
  getRiderGearList: jest.fn().mockResolvedValue({ data: { items: [] } }),
  getServicesList: jest.fn().mockResolvedValue({ data: { items: [] } }),
  updateProfile: jest.fn().mockResolvedValue({}),
}));

describe('ProfileScreen Arabic settings layout and VIP features', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth = {
      user: { id: 'seller-1', email: 'seller@example.com', profile: { first_name: 'Rashid', last_name: 'Al Maktoum', location: 'Dubai' }, role: 'seller', is_verified: true },
      isAuthenticated: true,
      signOut: jest.fn(),
      refreshProfile: jest.fn(),
    };
    mockLanguage = {
      t: (key) => key,
      isRTL: true,
      language: 'ar',
      setLanguage: jest.fn(),
    };
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    Linking.openURL.mockRestore?.();
    Alert.alert.mockRestore?.();
  });

  it('stretches settings bars across the available section width in RTL', async () => {
    const screen = render(<ProfileScreen navigation={{ navigate: jest.fn() }} />);
    await waitFor(() => {
      expect(screen.getByTestId('profile-vip-badge')).toBeTruthy();
      expect(screen.getByTestId('profile-settings-section')).toBeTruthy();
    });
    const section = screen.getByTestId('profile-settings-section');
    const languageCard = screen.getByTestId('profile-language-card');
    const languageOptions = screen.getByTestId('profile-language-options');

    expect(StyleSheet.flatten(section.props.style).alignItems).toBe('stretch');
    expect(StyleSheet.flatten(languageCard.props.style).flexDirection).toBe('row');
    expect(StyleSheet.flatten(languageOptions.props.style).flexDirection).toBe('row');
    expect(screen.getByText('language')).toBeTruthy();
    expect(screen.getByText('savedAlerts')).toBeTruthy();
  });

  it('renders Member Quick Hub grid tiles and navigates on press', async () => {
    const navigate = jest.fn();
    const screen = render(<ProfileScreen navigation={{ navigate }} />);
    await waitFor(() => {
      expect(screen.getByText('hubStableTitle')).toBeTruthy();
    });

    expect(screen.getByText('hubStableTitle')).toBeTruthy();
    expect(screen.getByText('hubAlertsTitle')).toBeTruthy();
    expect(screen.getByText('hubOffersTitle')).toBeTruthy();
    expect(screen.getByText('hubSellerTitle')).toBeTruthy();

    fireEvent.press(screen.getByText('hubStableTitle'));
    expect(navigate).toHaveBeenCalledWith('Stable');

    fireEvent.press(screen.getByText('hubSellerTitle'));
    expect(navigate).toHaveBeenCalledWith('Sell');
  });

  it('renders vertical listing filter pills and support concierge card', async () => {
    const screen = render(<ProfileScreen navigation={{ navigate: jest.fn() }} />);
    await waitFor(() => {
      expect(screen.getByText('supportConciergeTitle')).toBeTruthy();
    });

    expect(screen.getByText('filterAll')).toBeTruthy();
    expect(screen.getByText('filterHorses')).toBeTruthy();
    expect(screen.getByText('filterEquipment')).toBeTruthy();
    expect(screen.getByText('filterRiderGear')).toBeTruthy();
    expect(screen.getByText('filterServices')).toBeTruthy();
    expect(screen.getByText('supportConciergeTitle')).toBeTruthy();

    fireEvent.press(screen.getByText('supportConciergeTitle'));
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/971500000000'));
  });

  it('renders guest welcoming card and navigates to signin/signup when unauthenticated', () => {
    mockAuth.isAuthenticated = false;
    mockAuth.user = null;
    const navigate = jest.fn();

    const screen = render(<ProfileScreen navigation={{ navigate }} />);

    expect(screen.getByTestId('profile-guest-vip-badge')).toBeTruthy();
    expect(screen.getByTestId('profile-guest-view')).toBeTruthy();
    expect(screen.getByTestId('profile-guest-card')).toBeTruthy();
    expect(screen.getByText('guestWelcomeTitle')).toBeTruthy();
    expect(screen.getByText('benefitStable')).toBeTruthy();

    fireEvent.press(screen.getByTestId('guest-signin-btn'));
    expect(navigate).toHaveBeenCalledWith('AuthStack');

    fireEvent.press(screen.getByTestId('guest-signup-btn'));
    expect(navigate).toHaveBeenCalledWith('AuthStack', { screen: 'Signup' });
  });

  it('handles edit profile flow, signout confirmation, and header concierge button', async () => {
    const screen = render(<ProfileScreen navigation={{ navigate: jest.fn() }} />);
    await waitFor(() => {
      expect(screen.getByTestId('profile-header-support-btn')).toBeTruthy();
    });

    // Header support concierge
    const headerSupportBtn = screen.getByTestId('profile-header-support-btn');
    fireEvent.press(headerSupportBtn);
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/971500000000'));

    // Edit profile button toggles edit inputs
    const editBtn = screen.getByTestId('profile-edit-btn');
    fireEvent.press(editBtn);
    expect(screen.getByText('firstNameLabel')).toBeTruthy();
    expect(screen.getByText('lastNameLabel')).toBeTruthy();
    expect(screen.getByText('phoneLabel')).toBeTruthy();
    expect(screen.getByText('locationLabel')).toBeTruthy();

    // Sign out button triggers Alert
    const signOutBtn = screen.getByTestId('profile-signout-btn');
    fireEvent.press(signOutBtn);
    expect(Alert.alert).toHaveBeenCalledWith('signOut', 'signOutConfirm', expect.any(Array));
  });

  it('triggers guest header concierge button when unauthenticated', () => {
    mockAuth.isAuthenticated = false;
    mockAuth.user = null;
    const screen = render(<ProfileScreen navigation={{ navigate: jest.fn() }} />);
    const guestHeaderBtn = screen.getByTestId('profile-guest-header-support-btn');
    expect(guestHeaderBtn).toBeTruthy();
    fireEvent.press(guestHeaderBtn);
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/971500000000'));
  });

  it('renders SteedMarket VIP Equestrian Identity & Escrow Protection Shield card and triggers WhatsApp consultation from shield button', async () => {
    const screen = render(<ProfileScreen navigation={{ navigate: jest.fn() }} />);
    await waitFor(() => {
      expect(screen.getByTestId('profile-identity-shield')).toBeTruthy();
      expect(screen.getByTestId('profile-shield-concierge-btn')).toBeTruthy();
    });

    expect(screen.getByText('توثيق الشريحة والجواز')).toBeTruthy();
    expect(screen.getByText('حساب ضمان بنكي مخصص')).toBeTruthy();
    expect(screen.getByText('مستشار صفقات خيل مخصص')).toBeTruthy();

    const shieldBtn = screen.getByTestId('profile-shield-concierge-btn');
    fireEvent.press(shieldBtn);
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/971500000000'));
  });

  it('renders Admin Cockpit tile in hub grid when user role is admin and navigates on press', async () => {
    mockAuth.user.role = 'admin';
    const navigate = jest.fn();
    const screen = render(<ProfileScreen navigation={{ navigate }} />);
    await waitFor(() => {
      expect(screen.getByTestId('hub-admin-tile')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('hub-admin-tile'));
    expect(navigate).toHaveBeenCalledWith('Admin');
  });
});