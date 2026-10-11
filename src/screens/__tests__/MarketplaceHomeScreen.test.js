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
});
