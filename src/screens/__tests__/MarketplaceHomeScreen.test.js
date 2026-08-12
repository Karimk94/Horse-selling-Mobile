import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import MarketplaceHomeScreen from '../MarketplaceHomeScreen';
import * as apiService from '../../services/api';

jest.mock('../../services/api', () => ({
  getEquipmentList: jest.fn(),
  getRiderGearList: jest.fn(),
  getServicesList: jest.fn(),
}));

describe('MarketplaceHomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    apiService.getEquipmentList.mockResolvedValue({ data: { items: [] } });
    apiService.getRiderGearList.mockResolvedValue({ data: { items: [] } });
    apiService.getServicesList.mockResolvedValue({ data: { items: [] } });
  });

  it('renders marketplace navigation modules correctly', async () => {
    const { getByText } = render(
      <MarketplaceHomeScreen navigation={{ navigate: jest.fn() }} route={{ params: { language: 'en' } }} />
    );

    await waitFor(() => {
      expect(getByText('Horses')).toBeTruthy();
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
});
