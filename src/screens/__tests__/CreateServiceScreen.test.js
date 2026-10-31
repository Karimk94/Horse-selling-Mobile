import React from 'react';
import { Linking } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import CreateServiceScreen from '../CreateServiceScreen';
import * as apiService from '../../services/api';

jest.mock('../../services/api', () => ({
  createService: jest.fn().mockResolvedValue({ data: { id: 'srv-new' } }),
  uploadMedia: jest.fn(),
}));

jest.mock('../../services/locationService', () => ({
  searchLocations: jest.fn().mockResolvedValue([]),
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  launchImageLibraryAsync: jest.fn(),
}));

describe('CreateServiceScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Linking, 'openURL').mockImplementation(() => Promise.resolve());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders listing strength score, tips, service inputs, and concierge shortcuts', () => {
    const { getByText, getByTestId } = render(
      <CreateServiceScreen navigation={{ goBack: jest.fn() }} route={{ params: {} }} />
    );

    expect(getByText('listingStrengthScore')).toBeTruthy();
    expect(getByText('sellerTipsTitle')).toBeTruthy();
    expect(getByText('emergencyToggleLabel')).toBeTruthy();
    expect(getByTestId('create-service-vip-badge')).toBeTruthy();
    expect(getByTestId('create-service-back-button')).toBeTruthy();
    expect(getByTestId('create-service-header-concierge-btn')).toBeTruthy();
    expect(getByTestId('seller-service-licensing-btn')).toBeTruthy();
    expect(getByTestId('seller-service-escrow-shield')).toBeTruthy();
    expect(getByTestId('create-service-concierge-btn')).toBeTruthy();
  });

  it('handles back button navigation and service type selection', () => {
    const goBack = jest.fn();
    const { getByTestId, getByText } = render(
      <CreateServiceScreen navigation={{ goBack }} route={{ params: {} }} />
    );

    fireEvent.press(getByTestId('create-service-back-button'));
    expect(goBack).toHaveBeenCalledTimes(1);

    const transportChip = getByTestId('service-type-chip-commercial_transport');
    expect(transportChip).toBeTruthy();
    fireEvent.press(transportChip);
  });

  it('opens WhatsApp concierge from header button, licensing button, and trust shield button', () => {
    const { getByTestId } = render(
      <CreateServiceScreen navigation={{ goBack: jest.fn() }} route={{ params: {} }} />
    );

    fireEvent.press(getByTestId('create-service-header-concierge-btn'));
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('wa.me/971500000000'));

    fireEvent.press(getByTestId('seller-service-licensing-btn'));
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('wa.me/971500000000'));

    fireEvent.press(getByTestId('create-service-concierge-btn'));
    expect(Linking.openURL).toHaveBeenCalledTimes(3);
  });

  it('submits service listing with selected pricing and experience model', async () => {
    const goBack = jest.fn();
    const { getByPlaceholderText, getByText, getByTestId } = render(
      <CreateServiceScreen navigation={{ goBack }} route={{ params: {} }} />
    );

    const titleInput = getByPlaceholderText('e.g. VIP Air-Conditioned Horse Boarding & Care');
    fireEvent.changeText(titleInput, 'VIP Horse Boarding');

    // Select monthly pricing chip
    const monthlyChip = getByTestId('pricing-chip-monthly');
    fireEvent.press(monthlyChip);

    const priceInput = getByPlaceholderText('0');
    fireEvent.changeText(priceInput, '3500');

    // Select 5-10 Yrs experience
    const expChip = getByTestId('exp-chip-5-10');
    fireEvent.press(expChip);

    const submitBtn = getByText('Publish Equine Service');
    fireEvent.press(submitBtn);

    await waitFor(() => {
      expect(apiService.createService).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'VIP Horse Boarding',
          pricing_type: 'monthly',
          price: 3500,
        })
      );
    });
  });
});
