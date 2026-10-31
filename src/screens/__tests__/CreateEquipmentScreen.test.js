import React from 'react';
import { Linking } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import CreateEquipmentScreen from '../CreateEquipmentScreen';
import * as apiService from '../../services/api';

jest.mock('../../services/api', () => ({
  createEquipment: jest.fn().mockResolvedValue({ data: { id: 'eq-new' } }),
  uploadMedia: jest.fn(),
}));

jest.mock('../../services/locationService', () => ({
  searchLocations: jest.fn().mockResolvedValue([]),
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  launchImageLibraryAsync: jest.fn(),
}));

describe('CreateEquipmentScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Linking, 'openURL').mockImplementation(() => Promise.resolve());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders listing strength score, tips, and input fields', () => {
    const { getByText, getByTestId } = render(
      <CreateEquipmentScreen navigation={{ goBack: jest.fn() }} route={{ params: {} }} />
    );

    expect(getByText('listingStrengthScore')).toBeTruthy();
    expect(getByText('sellerTipsTitle')).toBeTruthy();
    expect(getByTestId('create-equipment-vip-badge')).toBeTruthy();
    expect(getByTestId('create-equipment-back-button')).toBeTruthy();
    expect(getByTestId('create-equipment-header-concierge-btn')).toBeTruthy();
    expect(getByTestId('seller-tack-specialist-btn')).toBeTruthy();
    expect(getByTestId('seller-tack-escrow-shield')).toBeTruthy();
    expect(getByTestId('create-tack-concierge-btn')).toBeTruthy();
  });

  it('handles back button navigation', () => {
    const goBack = jest.fn();
    const { getByTestId } = render(
      <CreateEquipmentScreen navigation={{ goBack }} route={{ params: {} }} />
    );

    fireEvent.press(getByTestId('create-equipment-back-button'));
    expect(goBack).toHaveBeenCalledTimes(1);
  });

  it('opens WhatsApp concierge from header button, specialist button, and escrow shield button', () => {
    const { getByTestId } = render(
      <CreateEquipmentScreen navigation={{ goBack: jest.fn() }} route={{ params: {} }} />
    );

    fireEvent.press(getByTestId('create-equipment-header-concierge-btn'));
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('wa.me/971500000000'));

    fireEvent.press(getByTestId('seller-tack-specialist-btn'));
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('wa.me/971500000000'));

    fireEvent.press(getByTestId('create-tack-concierge-btn'));
    expect(Linking.openURL).toHaveBeenCalledTimes(3);
  });

  it('allows condition selection and submits equipment listing when form is filled', async () => {
    const goBack = jest.fn();
    const { getByPlaceholderText, getByText, getByTestId } = render(
      <CreateEquipmentScreen navigation={{ goBack }} route={{ params: {} }} />
    );

    const titleInput = getByPlaceholderText('e.g. Prestige Jump Saddle 17.5"');
    fireEvent.changeText(titleInput, 'Prestige Jump Saddle');

    // Select 'like_new' condition chip
    const likeNewChip = getByTestId('condition-chip-like_new');
    fireEvent.press(likeNewChip);

    const priceInput = getByPlaceholderText('0');
    fireEvent.changeText(priceInput, '4500');

    const submitBtn = getByText('Publish Equipment Listing');
    fireEvent.press(submitBtn);

    await waitFor(() => {
      expect(apiService.createEquipment).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Prestige Jump Saddle',
          condition: 'like_new',
          price: 4500,
        })
      );
    });
  });
});
