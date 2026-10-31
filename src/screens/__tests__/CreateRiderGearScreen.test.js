import React from 'react';
import { Linking } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import CreateRiderGearScreen from '../CreateRiderGearScreen';
import * as apiService from '../../services/api';

jest.mock('../../services/api', () => ({
  createRiderGear: jest.fn().mockResolvedValue({ data: { id: 'rg-new' } }),
  uploadMedia: jest.fn(),
}));

jest.mock('../../services/locationService', () => ({
  searchLocations: jest.fn().mockResolvedValue([]),
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  launchImageLibraryAsync: jest.fn(),
}));

describe('CreateRiderGearScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Linking, 'openURL').mockImplementation(() => Promise.resolve());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders listing strength score, tips, and input fields', () => {
    const { getByText, getByTestId } = render(
      <CreateRiderGearScreen navigation={{ goBack: jest.fn() }} route={{ params: {} }} />
    );

    expect(getByText('listingStrengthScore')).toBeTruthy();
    expect(getByText('sellerTipsTitle')).toBeTruthy();
    expect(getByTestId('create-ridergear-vip-badge')).toBeTruthy();
    expect(getByTestId('create-ridergear-back-button')).toBeTruthy();
    expect(getByTestId('create-ridergear-header-concierge-btn')).toBeTruthy();
    expect(getByTestId('seller-rider-safety-btn')).toBeTruthy();
    expect(getByTestId('seller-ridergear-escrow-shield')).toBeTruthy();
    expect(getByTestId('create-ridergear-concierge-btn')).toBeTruthy();
  });

  it('handles back button navigation and gender selection', () => {
    const goBack = jest.fn();
    const { getByTestId, getByText } = render(
      <CreateRiderGearScreen navigation={{ goBack }} route={{ params: {} }} />
    );

    fireEvent.press(getByTestId('create-ridergear-back-button'));
    expect(goBack).toHaveBeenCalledTimes(1);

    const womenChip = getByTestId('gender-chip-female');
    expect(womenChip).toBeTruthy();
    fireEvent.press(womenChip);
  });

  it('opens WhatsApp concierge from header button, safety specialist button, and escrow shield button', () => {
    const { getByTestId } = render(
      <CreateRiderGearScreen navigation={{ goBack: jest.fn() }} route={{ params: {} }} />
    );

    fireEvent.press(getByTestId('create-ridergear-header-concierge-btn'));
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('wa.me/971500000000'));

    fireEvent.press(getByTestId('seller-rider-safety-btn'));
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('wa.me/971500000000'));

    fireEvent.press(getByTestId('create-ridergear-concierge-btn'));
    expect(Linking.openURL).toHaveBeenCalledTimes(3);
  });

  it('allows condition and gender selection and submits rider gear listing', async () => {
    const goBack = jest.fn();
    const { getByPlaceholderText, getByText, getByTestId } = render(
      <CreateRiderGearScreen navigation={{ goBack }} route={{ params: {} }} />
    );

    const titleInput = getByPlaceholderText('e.g. Samshield Shadowmatt Helmet Size M');
    fireEvent.changeText(titleInput, 'Samshield Shadowmatt Helmet');

    // Select 'female' gender chip
    const femaleChip = getByTestId('gender-chip-female');
    fireEvent.press(femaleChip);

    // Select 'like_new' condition chip
    const likeNewChip = getByTestId('condition-chip-like_new');
    fireEvent.press(likeNewChip);

    const priceInput = getByPlaceholderText('0');
    fireEvent.changeText(priceInput, '1850');

    const submitBtn = getByText('Publish Rider Gear Listing');
    fireEvent.press(submitBtn);

    await waitFor(() => {
      expect(apiService.createRiderGear).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Samshield Shadowmatt Helmet',
          gender: 'female',
          condition: 'like_new',
          price: 1850,
        })
      );
    });
  });
});
