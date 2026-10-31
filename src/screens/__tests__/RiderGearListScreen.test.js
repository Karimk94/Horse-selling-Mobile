import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import RiderGearListScreen from '../RiderGearListScreen';
import * as apiService from '../../services/api';

jest.mock('../../services/api', () => ({
  getRiderGearList: jest.fn(),
}));

const mockRiderGear = [
  {
    id: 'rg-1',
    title: 'Samshield Riding Helmet',
    brand: 'Samshield',
    gender: 'unisex',
    price: 1850,
    quantity: 1,
    location_text: 'Abu Dhabi, UAE',
    custom_size: '58cm M',
    category: { name_ar: 'خوذات الركوب', name_en: 'Riding Helmets' },
    images: [{ id: 'img-1', image_url: 'https://example.com/helmet.jpg' }],
  },
];

describe('RiderGearListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    apiService.getRiderGearList.mockResolvedValue({
      data: {
        total: 1,
        items: mockRiderGear,
      },
    });
  });

  it('renders rider gear list items correctly with badges and prices', async () => {
    const { getByText, getByTestId } = render(
      <RiderGearListScreen navigation={{ navigate: jest.fn() }} route={{ params: { language: 'en' } }} />
    );

    await waitFor(() => {
      expect(getByText('Samshield Riding Helmet')).toBeTruthy();
      expect(getByText('1,850 AED')).toBeTruthy();
      expect(getByText('Riding Helmets')).toBeTruthy();
      expect(getByText('Size: 58cm M')).toBeTruthy();
      expect(getByTestId('ridergear-card-rg-1')).toBeTruthy();
      expect(getByTestId('ridergear-results-count')).toBeTruthy();
    });
  });

  it('navigates to detail screen when card is pressed', async () => {
    const navigate = jest.fn();
    const { getByText } = render(
      <RiderGearListScreen navigation={{ navigate }} route={{ params: { language: 'en' } }} />
    );

    await waitFor(() => {
      expect(getByText('Samshield Riding Helmet')).toBeTruthy();
    });

    fireEvent.press(getByText('Samshield Riding Helmet'));
    expect(navigate).toHaveBeenCalledWith('RiderGearDetailScreen', { riderGearId: 'rg-1' });
  });

  it('navigates back and handles gender tab selection', async () => {
    const navigate = jest.fn();
    const goBack = jest.fn();
    const { getByTestId, getByText } = render(
      <RiderGearListScreen navigation={{ navigate, goBack }} route={{ params: { language: 'en' } }} />
    );

    fireEvent.press(getByTestId('ridergear-back-button'));
    expect(goBack).toHaveBeenCalledTimes(1);

    fireEvent.press(getByText('Women'));
    await waitFor(() => {
      expect(apiService.getRiderGearList).toHaveBeenCalled();
    });
  });

  it('navigates to CreateRiderGearScreen from header create button and FAB', async () => {
    const navigate = jest.fn();
    const { getByTestId } = render(
      <RiderGearListScreen navigation={{ navigate }} route={{ params: { language: 'en' } }} />
    );

    await waitFor(() => {
      expect(getByTestId('ridergear-header-create-button')).toBeTruthy();
    });

    fireEvent.press(getByTestId('ridergear-header-create-button'));
    expect(navigate).toHaveBeenCalledWith('CreateRiderGearScreen');

    fireEvent.press(getByTestId('ridergear-fab-create-btn'));
    expect(navigate).toHaveBeenCalledWith('CreateRiderGearScreen');
  });

  it('handles search input typing, clearing, and submission', async () => {
    const { getByTestId, queryByTestId } = render(
      <RiderGearListScreen navigation={{ navigate: jest.fn() }} route={{ params: { language: 'en' } }} />
    );

    await waitFor(() => {
      expect(getByTestId('ridergear-search-input')).toBeTruthy();
    });

    // Type query
    fireEvent.changeText(getByTestId('ridergear-search-input'), 'Samshield');
    expect(getByTestId('ridergear-search-clear-btn')).toBeTruthy();

    // Submit search
    fireEvent.press(getByTestId('ridergear-search-submit-btn'));
    expect(apiService.getRiderGearList).toHaveBeenCalled();

    // Clear search
    fireEvent.press(getByTestId('ridergear-search-clear-btn'));
    expect(queryByTestId('ridergear-search-clear-btn')).toBeNull();
  });

  it('handles emirate filter selection across UAE emirates', async () => {
    const { getByTestId } = render(
      <RiderGearListScreen navigation={{ navigate: jest.fn() }} route={{ params: { language: 'en' } }} />
    );

    await waitFor(() => {
      expect(getByTestId('ridergear-emirate-dubai')).toBeTruthy();
      expect(getByTestId('ridergear-emirate-abu_dhabi')).toBeTruthy();
      expect(getByTestId('ridergear-emirate-sharjah')).toBeTruthy();
    });

    fireEvent.press(getByTestId('ridergear-emirate-dubai'));
    expect(apiService.getRiderGearList).toHaveBeenCalled();
  });

  it('handles 1-tap clear filters chip when filters are active', async () => {
    const { getByTestId, queryByTestId } = render(
      <RiderGearListScreen navigation={{ navigate: jest.fn() }} route={{ params: { language: 'en' } }} />
    );

    await waitFor(() => {
      expect(getByTestId('ridergear-emirate-dubai')).toBeTruthy();
    });

    // Select emirate to activate filters
    fireEvent.press(getByTestId('ridergear-emirate-dubai'));

    await waitFor(() => {
      expect(getByTestId('ridergear-clear-filters-chip')).toBeTruthy();
    });

    fireEvent.press(getByTestId('ridergear-clear-filters-chip'));

    await waitFor(() => {
      expect(queryByTestId('ridergear-clear-filters-chip')).toBeNull();
    });
  });

  it('renders empty state suggestions and handles filter selection', async () => {
    apiService.getRiderGearList.mockResolvedValueOnce({
      data: { total: 0, items: [] },
    });

    const { getByText, getByTestId } = render(
      <RiderGearListScreen navigation={{ navigate: jest.fn() }} route={{ params: { language: 'en' } }} />
    );

    await waitFor(() => {
      expect(getByText('emptyCatalogTitle')).toBeTruthy();
      expect(getByText('postRiderGearCTA')).toBeTruthy();
      expect(getByText('Samshield')).toBeTruthy();
      expect(getByTestId('ridergear-suggestion-samshield')).toBeTruthy();
    });
  });

  it('handles VIP Haute-Equestrian Concierge WhatsApp inquiry in empty state', async () => {
    apiService.getRiderGearList.mockResolvedValue({
      data: { total: 0, items: [] },
    });

    const canOpenSpy = jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
    const openSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);

    const { getByTestId } = render(
      <RiderGearListScreen navigation={{ navigate: jest.fn() }} route={{ params: { language: 'en' } }} />
    );

    await waitFor(() => {
      expect(getByTestId('ridergear-empty-concierge-btn')).toBeTruthy();
    });

    fireEvent.press(getByTestId('ridergear-empty-concierge-btn'));

    await waitFor(() => {
      expect(canOpenSpy).toHaveBeenCalled();
      expect(openSpy).toHaveBeenCalledWith(expect.stringContaining('whatsapp://send?text='));
    });

    canOpenSpy.mockRestore();
    openSpy.mockRestore();
  });

  it('renders VIP accreditation badge and triggers stylist hotline from header', async () => {
    const openSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);

    const { getByTestId } = render(
      <RiderGearListScreen navigation={{ navigate: jest.fn() }} route={{ params: { language: 'en' } }} />
    );

    await waitFor(() => {
      expect(getByTestId('ridergear-vip-badge')).toBeTruthy();
      expect(getByTestId('ridergear-header-hotline-btn')).toBeTruthy();
    });

    fireEvent.press(getByTestId('ridergear-header-hotline-btn'));
    expect(openSpy).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/971500000000'));
    openSpy.mockRestore();
  });

  it('renders VIP escrow guarantee ribbon and triggers consultation on tap', async () => {
    const openSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);

    const { getByTestId } = render(
      <RiderGearListScreen navigation={{ navigate: jest.fn() }} route={{ params: { language: 'en' } }} />
    );

    await waitFor(() => {
      expect(getByTestId('ridergear-escrow-banner')).toBeTruthy();
    });

    fireEvent.press(getByTestId('ridergear-escrow-banner'));
    expect(openSpy).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/971500000000'));
    openSpy.mockRestore();
  });
});
