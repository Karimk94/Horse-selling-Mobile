import React from 'react';
import { render } from '@testing-library/react-native';
import AppNavigator from '../AppNavigator';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../contexts/LanguageContext', () => ({
  useLanguage: jest.fn(),
}));

// Mock screens to keep test execution fast and isolated
jest.mock('../../screens/HomeScreen', () => () => null);
jest.mock('../../screens/HorseDetailScreen', () => () => null);
jest.mock('../../screens/FavoritesScreen', () => () => null);
jest.mock('../../screens/CreateListingScreen', () => () => null);
jest.mock('../../screens/SellHomeScreen', () => () => null);
jest.mock('../../screens/ProfileScreen', () => () => null);
jest.mock('../../screens/SavedAlertsScreen', () => () => null);
jest.mock('../../screens/OffersScreen', () => () => null);
jest.mock('../../screens/AdminPanelScreen', () => () => null);
jest.mock('../../screens/AdminEditUserScreen', () => () => null);
jest.mock('../../screens/AdminEditHorseScreen', () => () => null);
jest.mock('../../screens/AdminPushLogsScreen', () => () => null);
jest.mock('../../screens/AdminOfferAuditScreen', () => () => null);
jest.mock('../../screens/auth/LoginScreen', () => () => null);
jest.mock('../../screens/auth/SignupScreen', () => () => null);
jest.mock('../../screens/MarketplaceHomeScreen', () => () => null);
jest.mock('../../screens/EquipmentListScreen', () => () => null);
jest.mock('../../screens/EquipmentDetailScreen', () => () => null);
jest.mock('../../screens/CreateEquipmentScreen', () => () => null);
jest.mock('../../screens/RiderGearListScreen', () => () => null);
jest.mock('../../screens/RiderGearDetailScreen', () => () => null);
jest.mock('../../screens/CreateRiderGearScreen', () => () => null);
jest.mock('../../screens/ServiceListScreen', () => () => null);
jest.mock('../../screens/ServiceDetailScreen', () => () => null);
jest.mock('../../screens/CreateServiceScreen', () => () => null);
jest.mock('../../screens/AdminModerationDashboardScreen', () => () => null);

describe('AppNavigator Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useLanguage.mockReturnValue({
      t: (key) => key,
      isRTL: false,
      language: 'en',
    });
  });

  test('renders branded loading screen when auth is loading', () => {
    useAuth.mockReturnValue({
      loading: true,
      user: null,
    });

    const { getByTestId, getByText } = render(<AppNavigator />);

    expect(getByTestId('app-loading-screen')).toBeTruthy();
    expect(getByText('SteedMarket')).toBeTruthy();
    expect(getByText('Gulf Equestrian Marketplace')).toBeTruthy();
  });

  test('renders Arabic subtitle on branded loading screen when language is Arabic', () => {
    useAuth.mockReturnValue({
      loading: true,
      user: null,
    });
    useLanguage.mockReturnValue({
      t: (key) => key,
      isRTL: true,
      language: 'ar',
    });

    const { getByTestId, getByText } = render(<AppNavigator />);

    expect(getByTestId('app-loading-screen')).toBeTruthy();
    expect(getByText('سوق الفروسية الأول في الخليج')).toBeTruthy();
  });

  test('renders standard tabs and floating sell button for regular buyer/seller', () => {
    useAuth.mockReturnValue({
      loading: false,
      user: { id: 1, role: 'buyer', email: 'buyer@steedmarket.ae' },
    });

    const { getByTestId, queryByTestId } = render(<AppNavigator />);

    expect(getByTestId('tab-browse')).toBeTruthy();
    expect(getByTestId('tab-stable')).toBeTruthy();
    expect(getByTestId('tab-sell')).toBeTruthy();
    expect(getByTestId('tab-profile')).toBeTruthy();
    expect(queryByTestId('tab-admin')).toBeNull();
  });

  test('renders admin tab when user role is admin', () => {
    useAuth.mockReturnValue({
      loading: false,
      user: { id: 99, role: 'admin', email: 'admin@steedmarket.ae' },
    });

    const { getByTestId } = render(<AppNavigator />);

    expect(getByTestId('tab-browse')).toBeTruthy();
    expect(getByTestId('tab-stable')).toBeTruthy();
    expect(getByTestId('tab-sell')).toBeTruthy();
    expect(getByTestId('tab-profile')).toBeTruthy();
    expect(getByTestId('tab-admin')).toBeTruthy();
  });
});
