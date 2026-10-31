import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import SellHomeScreen from '../SellHomeScreen';
import * as apiService from '../../services/api';

let mockAuth = { user: null, isAuthenticated: false };

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

jest.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    isRTL: false,
    language: 'en',
    t: (key) => key,
  }),
}));

jest.mock('../../services/api', () => ({
  getHorses: jest.fn(),
  getActionRequiredOffersCount: jest.fn(),
}));

describe('SellHomeScreen branding and functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth = { user: null, isAuthenticated: false };
    apiService.getHorses.mockResolvedValue({ data: [] });
    apiService.getActionRequiredOffersCount.mockResolvedValue({ data: { actionable_count: 0 } });
    jest.spyOn(Linking, 'openURL').mockImplementation(() => Promise.resolve());
  });

  afterEach(() => {
    Linking.openURL.mockRestore?.();
  });

  it('uses the shared horse mark for Sell a Horse in guest mode and handles sign in', () => {
    const navigate = jest.fn();
    const screen = render(<SellHomeScreen navigation={{ navigate }} />);

    expect(screen.getByText('horse')).toBeTruthy();
    expect(screen.getByText('Sell a Horse')).toBeTruthy();
    expect(screen.getByText('signIn')).toBeTruthy();
    expect(screen.getByTestId('seller-portal-vip-badge')).toBeTruthy();
    expect(screen.getByTestId('seller-merchant-shield')).toBeTruthy();
    expect(screen.getByTestId('seller-offmarket-consignment-card')).toBeTruthy();
    expect(screen.getByTestId('seller-hub-header-concierge-btn')).toBeTruthy();

    fireEvent.press(screen.getByTestId('sell-signin-btn'));
    expect(navigate).toHaveBeenCalledWith('AuthStack');
  });

  it('renders authenticated seller metrics, alerts and tips when logged in', async () => {
    mockAuth = { user: { id: 10, role: 'seller' }, isAuthenticated: true };
    apiService.getHorses.mockResolvedValue({ data: [{ id: 1 }, { id: 2 }] });
    apiService.getActionRequiredOffersCount.mockResolvedValue({ data: { actionable_count: 3 } });

    const navigate = jest.fn();
    const screen = render(<SellHomeScreen navigation={{ navigate }} />);

    await waitFor(() => {
      expect(screen.getByText('sellerHub')).toBeTruthy();
      expect(screen.getByText('activeListingsMetric')).toBeTruthy();
      expect(screen.getByText('2')).toBeTruthy();
      expect(screen.getByText('3')).toBeTruthy();
      expect(screen.getByText('sellerTipTitle')).toBeTruthy();
    });

    // Test header offers alert badge navigation
    const headerOffersBadge = screen.getByTestId('seller-hub-header-offers-badge');
    expect(headerOffersBadge).toBeTruthy();
    fireEvent.press(headerOffersBadge);
    expect(navigate).toHaveBeenCalledWith('Offers');

    // Test quick action offers navigation
    const actionOffersBtn = screen.getByTestId('seller-action-offers-btn');
    expect(actionOffersBtn).toBeTruthy();
    fireEvent.press(actionOffersBtn);
    expect(navigate).toHaveBeenCalledWith('Offers');

    // Test metric pending offers card navigation
    const metricOffersCard = screen.getByTestId('metric-pending-offers');
    expect(metricOffersCard).toBeTruthy();
    fireEvent.press(metricOffersCard);
    expect(navigate).toHaveBeenCalledWith('Offers');
  });

  it('navigates to the respective creation screens on tap for all 4 categories', () => {
    const navigate = jest.fn();
    const screen = render(<SellHomeScreen navigation={{ navigate }} />);

    fireEvent.press(screen.getByTestId('seller-hub-type-horse'));
    expect(navigate).toHaveBeenCalledWith('CreateListingMain');

    fireEvent.press(screen.getByTestId('seller-hub-type-equipment'));
    expect(navigate).toHaveBeenCalledWith('CreateEquipmentScreen');

    fireEvent.press(screen.getByTestId('seller-hub-type-rider_gear'));
    expect(navigate).toHaveBeenCalledWith('CreateRiderGearScreen');

    fireEvent.press(screen.getByTestId('seller-hub-type-services'));
    expect(navigate).toHaveBeenCalledWith('CreateServiceScreen');
  });

  it('renders merchant category badges and triggers WhatsApp concierge consultation from all buttons', () => {
    const screen = render(<SellHomeScreen navigation={{ navigate: jest.fn() }} />);

    expect(screen.getByTestId('sell-type-badge-horse')).toBeTruthy();
    expect(screen.getByTestId('sell-type-badge-equipment')).toBeTruthy();
    expect(screen.getByTestId('sell-type-badge-rider_gear')).toBeTruthy();
    expect(screen.getByTestId('sell-type-badge-services')).toBeTruthy();

    // Header concierge shortcut
    const headerConciergeBtn = screen.getByTestId('seller-hub-header-concierge-btn');
    expect(headerConciergeBtn).toBeTruthy();
    fireEvent.press(headerConciergeBtn);
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/971500000000'));

    // Merchant concierge card button
    const conciergeBtn = screen.getByTestId('sell-merchant-concierge-btn');
    expect(conciergeBtn).toBeTruthy();
    fireEvent.press(conciergeBtn);
    expect(Linking.openURL).toHaveBeenCalledTimes(2);

    // Off-market consignment concierge button
    const offmarketBtn = screen.getByTestId('seller-offmarket-concierge-btn');
    expect(offmarketBtn).toBeTruthy();
    fireEvent.press(offmarketBtn);
    expect(Linking.openURL).toHaveBeenCalledTimes(3);
  });
});