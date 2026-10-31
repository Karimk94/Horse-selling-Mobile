import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import EquipmentListScreen from '../EquipmentListScreen';
import * as apiService from '../../services/api';

jest.mock('../../services/api', () => ({
  getEquipmentList: jest.fn(),
}));

const mockEquipment = [
  {
    id: 'eq-1',
    title: 'Leather Jumping Saddle',
    brand: 'Prestige',
    condition: 'new',
    price: 4500,
    quantity: 1,
    location_text: 'Dubai, UAE',
    category: { name_ar: 'السروج', name_en: 'Saddles' },
    images: [{ id: 'img-1', image_url: 'https://example.com/saddle.jpg' }],
  },
];

describe('EquipmentListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    apiService.getEquipmentList.mockResolvedValue({
      data: {
        total: 1,
        items: mockEquipment,
      },
    });
  });

  it('renders equipment list items correctly with badges and prices', async () => {
    const { getByText, getByTestId } = render(
      <EquipmentListScreen navigation={{ navigate: jest.fn() }} route={{ params: { language: 'en' } }} />
    );

    await waitFor(() => {
      expect(getByText('Leather Jumping Saddle')).toBeTruthy();
      expect(getByText('4,500 AED')).toBeTruthy();
      expect(getByText('Saddles')).toBeTruthy();
      expect(getByText('New')).toBeTruthy();
      expect(getByTestId('equipment-card-eq-1')).toBeTruthy();
      expect(getByTestId('equipment-results-count')).toBeTruthy();
    });
  });

  it('navigates to detail screen when card is pressed', async () => {
    const navigate = jest.fn();
    const { getByTestId } = render(
      <EquipmentListScreen navigation={{ navigate }} route={{ params: { language: 'en' } }} />
    );

    await waitFor(() => {
      expect(getByTestId('equipment-card-eq-1')).toBeTruthy();
    });

    fireEvent.press(getByTestId('equipment-card-eq-1'));
    expect(navigate).toHaveBeenCalledWith('EquipmentDetailScreen', { equipmentId: 'eq-1' });
  });

  it('navigates back and handles create header and FAB buttons', async () => {
    const navigate = jest.fn();
    const goBack = jest.fn();
    const { getByTestId } = render(
      <EquipmentListScreen navigation={{ navigate, goBack }} route={{ params: { language: 'en' } }} />
    );

    await waitFor(() => {
      expect(getByTestId('equipment-back-button')).toBeTruthy();
    });

    fireEvent.press(getByTestId('equipment-back-button'));
    expect(goBack).toHaveBeenCalledTimes(1);

    fireEvent.press(getByTestId('equipment-header-create-button'));
    expect(navigate).toHaveBeenCalledWith('CreateEquipmentScreen');
  });

  it('handles search input typing, clearing, and submission', async () => {
    const { getByTestId, queryByTestId } = render(
      <EquipmentListScreen navigation={{ navigate: jest.fn() }} route={{ params: { language: 'en' } }} />
    );

    await waitFor(() => {
      expect(getByTestId('equipment-search-input')).toBeTruthy();
    });

    // Type query
    fireEvent.changeText(getByTestId('equipment-search-input'), 'Prestige');
    expect(getByTestId('equipment-search-clear-btn')).toBeTruthy();

    // Submit search
    fireEvent.press(getByTestId('equipment-search-submit-btn'));
    expect(apiService.getEquipmentList).toHaveBeenCalled();

    // Clear search
    fireEvent.press(getByTestId('equipment-search-clear-btn'));
    expect(queryByTestId('equipment-search-clear-btn')).toBeNull();
  });

  it('handles emirate filter selection across UAE emirates', async () => {
    const { getByTestId } = render(
      <EquipmentListScreen navigation={{ navigate: jest.fn() }} route={{ params: { language: 'en' } }} />
    );

    await waitFor(() => {
      expect(getByTestId('equipment-emirate-dubai')).toBeTruthy();
      expect(getByTestId('equipment-emirate-sharjah')).toBeTruthy();
      expect(getByTestId('equipment-emirate-ras_al_khaimah')).toBeTruthy();
    });

    fireEvent.press(getByTestId('equipment-emirate-dubai'));
    expect(apiService.getEquipmentList).toHaveBeenCalled();
  });

  it('handles condition filter chips (all, new, used)', async () => {
    const { getByTestId } = render(
      <EquipmentListScreen navigation={{ navigate: jest.fn() }} route={{ params: { language: 'en' } }} />
    );

    await waitFor(() => {
      expect(getByTestId('equipment-condition-all')).toBeTruthy();
      expect(getByTestId('equipment-condition-new')).toBeTruthy();
      expect(getByTestId('equipment-condition-used')).toBeTruthy();
    });

    fireEvent.press(getByTestId('equipment-condition-new'));
    expect(apiService.getEquipmentList).toHaveBeenCalledWith(
      expect.objectContaining({ condition: 'new' })
    );

    fireEvent.press(getByTestId('equipment-condition-used'));
    expect(apiService.getEquipmentList).toHaveBeenCalledWith(
      expect.objectContaining({ condition: 'used' })
    );

    fireEvent.press(getByTestId('equipment-condition-all'));
    expect(apiService.getEquipmentList).toHaveBeenCalled();
  });

  it('handles 1-tap clear filters chip when filters are active', async () => {
    const { getByTestId, queryByTestId } = render(
      <EquipmentListScreen navigation={{ navigate: jest.fn() }} route={{ params: { language: 'en' } }} />
    );

    await waitFor(() => {
      expect(getByTestId('equipment-emirate-dubai')).toBeTruthy();
    });

    // Select emirate to activate filters
    fireEvent.press(getByTestId('equipment-emirate-dubai'));

    await waitFor(() => {
      expect(getByTestId('equipment-active-filters-tag')).toBeTruthy();
      expect(getByTestId('equipment-clear-filters-chip')).toBeTruthy();
    });

    fireEvent.press(getByTestId('equipment-clear-filters-chip'));

    await waitFor(() => {
      expect(queryByTestId('equipment-clear-filters-chip')).toBeNull();
    });
  });

  it('renders empty state suggestions and handles filter selection', async () => {
    apiService.getEquipmentList.mockResolvedValue({
      data: { total: 0, items: [] },
    });

    const { getByText, getByTestId } = render(
      <EquipmentListScreen navigation={{ navigate: jest.fn() }} route={{ params: { language: 'en' } }} />
    );

    await waitFor(() => {
      expect(getByText('emptyCatalogTitle')).toBeTruthy();
      expect(getByText('postEquipmentCTA')).toBeTruthy();
      expect(getByText('Prestige')).toBeTruthy();
      expect(getByTestId('equipment-suggestion-prestige')).toBeTruthy();
    });

    fireEvent.press(getByTestId('equipment-suggestion-prestige'));
    expect(apiService.getEquipmentList).toHaveBeenCalled();
  });

  it('handles VIP Tack Concierge WhatsApp inquiry in empty state', async () => {
    apiService.getEquipmentList.mockResolvedValue({
      data: { total: 0, items: [] },
    });

    const canOpenSpy = jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
    const openSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);

    const { getByTestId } = render(
      <EquipmentListScreen navigation={{ navigate: jest.fn() }} route={{ params: { language: 'en' } }} />
    );

    await waitFor(() => {
      expect(getByTestId('equipment-empty-concierge-btn')).toBeTruthy();
    });

    fireEvent.press(getByTestId('equipment-empty-concierge-btn'));

    await waitFor(() => {
      expect(canOpenSpy).toHaveBeenCalled();
      expect(openSpy).toHaveBeenCalledWith(expect.stringContaining('whatsapp://send?text='));
    });

    canOpenSpy.mockRestore();
    openSpy.mockRestore();
  });

  it('renders VIP accreditation badge and triggers tack hotline from header', async () => {
    const openSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);

    const { getByTestId } = render(
      <EquipmentListScreen navigation={{ navigate: jest.fn() }} route={{ params: { language: 'en' } }} />
    );

    await waitFor(() => {
      expect(getByTestId('equipment-vip-badge')).toBeTruthy();
      expect(getByTestId('equipment-header-hotline-btn')).toBeTruthy();
    });

    fireEvent.press(getByTestId('equipment-header-hotline-btn'));
    expect(openSpy).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/971500000000'));
    openSpy.mockRestore();
  });

  it('renders VIP escrow guarantee ribbon and triggers consultation on tap', async () => {
    const openSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);

    const { getByTestId } = render(
      <EquipmentListScreen navigation={{ navigate: jest.fn() }} route={{ params: { language: 'en' } }} />
    );

    await waitFor(() => {
      expect(getByTestId('equipment-escrow-banner')).toBeTruthy();
    });

    fireEvent.press(getByTestId('equipment-escrow-banner'));
    expect(openSpy).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/971500000000'));
    openSpy.mockRestore();
  });
});
