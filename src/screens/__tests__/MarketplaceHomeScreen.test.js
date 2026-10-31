import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import MarketplaceHomeScreen from '../MarketplaceHomeScreen';
import * as apiService from '../../services/api';

jest.mock('../../services/api', () => ({
  getEquipmentList: jest.fn(),
  getRiderGearList: jest.fn(),
  getServicesList: jest.fn(),
}));

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

describe('MarketplaceHomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    apiService.getEquipmentList.mockResolvedValue({ data: { items: [] } });
    apiService.getRiderGearList.mockResolvedValue({ data: { items: [] } });
    apiService.getServicesList.mockResolvedValue({ data: { items: [] } });
  });

  it('renders marketplace navigation modules correctly', async () => {
    const { getByText, getAllByText } = render(
      <MarketplaceHomeScreen navigation={{ navigate: jest.fn() }} route={{ params: { language: 'en' } }} />
    );

    await waitFor(() => {
      expect(getByText('Horses')).toBeTruthy();
      expect(getAllByText('horse').length).toBeGreaterThan(0);
      expect(getByText('Equipment')).toBeTruthy();
      expect(getByText('Rider Gear')).toBeTruthy();
      expect(getByText('Services')).toBeTruthy();
    });
  });

  it('navigates to equipment list when equipment module card is pressed', async () => {
    const navigate = jest.fn();
    const { getByText } = render(
      <MarketplaceHomeScreen navigation={{ navigate }} route={{ params: { language: 'en' } }} />
    );

    await waitFor(() => {
      expect(getByText('Equipment')).toBeTruthy();
    });

    fireEvent.press(getByText('Equipment'));
    expect(navigate).toHaveBeenCalledWith('EquipmentListScreen');
  });

  it('opens the horse listing screen from the horses module', async () => {
    const navigate = jest.fn();
    const { getByText } = render(
      <MarketplaceHomeScreen navigation={{ navigate }} route={{ params: { language: 'en' } }} />
    );

    await waitFor(() => {
      expect(getByText('Horses')).toBeTruthy();
    });

    fireEvent.press(getByText('Horses'));
    expect(navigate).toHaveBeenCalledWith('HomeMain');
  });

  it('opens horse creation from the Browse plus menu', async () => {
    const navigate = jest.fn();
    const screen = render(
      <MarketplaceHomeScreen navigation={{ navigate }} route={{ params: { language: 'en' } }} />
    );

    fireEvent.press(screen.getByTestId('marketplace-create-button'));

    await waitFor(() => {
      expect(screen.getByText('Add a Horse Listing')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('marketplace-create-horse-option'));
    expect(navigate).toHaveBeenCalledWith('CreateListingMain');
  });

  it('renders quick category shortcuts and navigates on tap', async () => {
    const navigate = jest.fn();
    const screen = render(
      <MarketplaceHomeScreen navigation={{ navigate }} route={{ params: { language: 'en' } }} />
    );

    await waitFor(() => {
      expect(screen.getByText('quickCategorySaddles')).toBeTruthy();
      expect(screen.getByText('conciergeBannerTitle')).toBeTruthy();
      expect(screen.getByText('marketplaceProtectionTitle')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('quickCategorySaddles'));
    expect(navigate).toHaveBeenCalledWith('EquipmentListScreen', { searchQuery: 'Saddle' });
  });

  it('triggers concierge chat via WhatsApp link when pressed', async () => {
    const { Linking } = require('react-native');
    const openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);

    const screen = render(
      <MarketplaceHomeScreen navigation={{ navigate: jest.fn() }} route={{ params: { language: 'en' } }} />
    );

    await waitFor(() => {
      expect(screen.getByText('chatWithConcierge')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('chatWithConcierge'));
    expect(openURLSpy).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/971500000000'));
  });

  it('handles search input clearing and search submission', async () => {
    const navigate = jest.fn();
    const screen = render(
      <MarketplaceHomeScreen navigation={{ navigate }} route={{ params: { language: 'en' } }} />
    );

    const input = screen.getByTestId('marketplace-search-input');
    fireEvent.changeText(input, 'Arabian Stallion');

    // Test clear button
    const clearBtn = screen.getByTestId('marketplace-search-clear-btn');
    expect(clearBtn).toBeTruthy();
    fireEvent.press(clearBtn);
    expect(input.props.value).toBe('');

    // Re-type and submit search
    fireEvent.changeText(input, 'Warmblood');
    fireEvent.press(screen.getByTestId('marketplace-search-submit-btn'));
    expect(navigate).toHaveBeenCalledWith('HomeMain', { searchQuery: 'Warmblood' });
  });

  it('navigates to OffersScreen from the header offers button', async () => {
    const navigate = jest.fn();
    const screen = render(
      <MarketplaceHomeScreen navigation={{ navigate }} route={{ params: { language: 'en' } }} />
    );

    await waitFor(() => {
      expect(screen.getByTestId('marketplace-header-offers-btn')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('marketplace-header-offers-btn'));
    expect(navigate).toHaveBeenCalledWith('OffersScreen');
  });

  it('switches search domain scope and navigates to the scoped module', async () => {
    const navigate = jest.fn();
    const screen = render(
      <MarketplaceHomeScreen navigation={{ navigate }} route={{ params: { language: 'en' } }} />
    );

    await waitFor(() => {
      expect(screen.getByTestId('marketplace-scope-equipment')).toBeTruthy();
    });

    // Select Equipment scope
    fireEvent.press(screen.getByTestId('marketplace-scope-equipment'));

    // Search with equipment scope active
    const input = screen.getByTestId('marketplace-search-input');
    fireEvent.changeText(input, 'Saddle');
    fireEvent.press(screen.getByTestId('marketplace-search-submit-btn'));
    expect(navigate).toHaveBeenCalledWith('EquipmentListScreen', { searchQuery: 'Saddle' });
  });

  it('opens creation modal from header create button and navigates to equipment creation', async () => {
    const navigate = jest.fn();
    const screen = render(
      <MarketplaceHomeScreen navigation={{ navigate }} route={{ params: { language: 'en' } }} />
    );

    await waitFor(() => {
      expect(screen.getByTestId('marketplace-header-create-btn')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('marketplace-header-create-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('marketplace-create-equipment-option')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('marketplace-create-equipment-option'));
    expect(navigate).toHaveBeenCalledWith('CreateEquipmentScreen');
  });

  it('navigates via See All buttons for equipment, rider gear, and services', async () => {
    const navigate = jest.fn();
    const screen = render(
      <MarketplaceHomeScreen navigation={{ navigate }} route={{ params: { language: 'en' } }} />
    );

    await waitFor(() => {
      expect(screen.getByTestId('see-all-equipment-btn')).toBeTruthy();
      expect(screen.getByTestId('see-all-rider-gear-btn')).toBeTruthy();
      expect(screen.getByTestId('see-all-services-btn')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('see-all-equipment-btn'));
    expect(navigate).toHaveBeenCalledWith('EquipmentListScreen');

    fireEvent.press(screen.getByTestId('see-all-rider-gear-btn'));
    expect(navigate).toHaveBeenCalledWith('RiderGearListScreen');

    fireEvent.press(screen.getByTestId('see-all-services-btn'));
    expect(navigate).toHaveBeenCalledWith('ServiceListScreen');
  });

  it('triggers concierge hotline from header button when pressed', async () => {
    const { Linking } = require('react-native');
    const openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);

    const screen = render(
      <MarketplaceHomeScreen navigation={{ navigate: jest.fn() }} route={{ params: { language: 'en' } }} />
    );

    await waitFor(() => {
      expect(screen.getByTestId('marketplace-header-hotline-btn')).toBeTruthy();
      expect(screen.getByTestId('brand-logo-vip-badge')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('marketplace-header-hotline-btn'));
    expect(openURLSpy).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/971500000000'));
  });

  it('triggers escrow consultation from trust section button when pressed', async () => {
    const { Linking } = require('react-native');
    const openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);

    const screen = render(
      <MarketplaceHomeScreen navigation={{ navigate: jest.fn() }} route={{ params: { language: 'en' } }} />
    );

    await waitFor(() => {
      expect(screen.getByTestId('marketplace-trust-escrow-btn')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('marketplace-trust-escrow-btn'));
    expect(openURLSpy).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/971500000000'));
  });
});
