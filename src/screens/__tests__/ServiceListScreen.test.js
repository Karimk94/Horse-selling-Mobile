import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import ServiceListScreen from '../ServiceListScreen';
import * as apiService from '../../services/api';

jest.mock('../../services/api', () => ({
  getServicesList: jest.fn(),
}));

const mockService = [
  {
    id: 'srv-1',
    title: 'VIP Air-Conditioned Horse Boarding',
    service_type: 'housing_boarding',
    pricing_type: 'monthly',
    price: 2500,
    experience_years: 12,
    emergency_24_7: true,
    location_text: 'Dubai Stables, UAE',
    category: { name_ar: 'إيواء الخيل والبوائك', name_en: 'Boarding & Stables' },
    images: [{ id: 'img-1', image_url: 'https://example.com/stable.jpg' }],
  },
];

describe('ServiceListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    apiService.getServicesList.mockResolvedValue({
      data: {
        total: 1,
        items: mockService,
      },
    });
  });

  it('renders service list items correctly', async () => {
    const { getByText, getAllByText, getByTestId } = render(
      <ServiceListScreen navigation={{ navigate: jest.fn() }} route={{ params: { language: 'en' } }} />
    );

    await waitFor(() => {
      expect(getByText('VIP Air-Conditioned Horse Boarding')).toBeTruthy();
      expect(getByText('2,500 AED / month')).toBeTruthy();
      expect(getAllByText('Boarding & Stables').length).toBeGreaterThan(0);
      expect(getByTestId('service-card-srv-1')).toBeTruthy();
      expect(getByTestId('service-results-count')).toBeTruthy();
    });
  });

  it('navigates to detail screen when card is pressed', async () => {
    const navigate = jest.fn();
    const { getByText } = render(
      <ServiceListScreen navigation={{ navigate }} route={{ params: { language: 'en' } }} />
    );

    await waitFor(() => {
      expect(getByText('VIP Air-Conditioned Horse Boarding')).toBeTruthy();
    });

    fireEvent.press(getByText('VIP Air-Conditioned Horse Boarding'));
    expect(navigate).toHaveBeenCalledWith('ServiceDetailScreen', { serviceId: 'srv-1' });
  });

  it('navigates back and handles service type selection', async () => {
    const navigate = jest.fn();
    const goBack = jest.fn();
    const { getByTestId, getAllByText } = render(
      <ServiceListScreen navigation={{ navigate, goBack }} route={{ params: { language: 'en' } }} />
    );

    fireEvent.press(getByTestId('service-back-button'));
    expect(goBack).toHaveBeenCalledTimes(1);

    const transportButtons = getAllByText('Transport');
    fireEvent.press(transportButtons[0]);
    await waitFor(() => {
      expect(apiService.getServicesList).toHaveBeenCalled();
    });
  });

  it('navigates to CreateServiceScreen from header create button and FAB', async () => {
    const navigate = jest.fn();
    const { getByTestId } = render(
      <ServiceListScreen navigation={{ navigate }} route={{ params: { language: 'en' } }} />
    );

    await waitFor(() => {
      expect(getByTestId('service-header-create-button')).toBeTruthy();
    });

    fireEvent.press(getByTestId('service-header-create-button'));
    expect(navigate).toHaveBeenCalledWith('CreateServiceScreen');

    fireEvent.press(getByTestId('service-fab-create-btn'));
    expect(navigate).toHaveBeenCalledWith('CreateServiceScreen');
  });

  it('handles search input typing, clearing, and submission', async () => {
    const { getByTestId, queryByTestId } = render(
      <ServiceListScreen navigation={{ navigate: jest.fn() }} route={{ params: { language: 'en' } }} />
    );

    await waitFor(() => {
      expect(getByTestId('service-search-input')).toBeTruthy();
    });

    // Type query
    fireEvent.changeText(getByTestId('service-search-input'), 'Boarding');
    expect(getByTestId('service-search-clear-btn')).toBeTruthy();

    // Submit search
    fireEvent.press(getByTestId('service-search-submit-btn'));
    expect(apiService.getServicesList).toHaveBeenCalled();

    // Clear search
    fireEvent.press(getByTestId('service-search-clear-btn'));
    expect(queryByTestId('service-search-clear-btn')).toBeNull();
  });

  it('handles emirate filter selection across UAE emirates', async () => {
    const { getByTestId } = render(
      <ServiceListScreen navigation={{ navigate: jest.fn() }} route={{ params: { language: 'en' } }} />
    );

    await waitFor(() => {
      expect(getByTestId('service-emirate-dubai')).toBeTruthy();
      expect(getByTestId('service-emirate-abu_dhabi')).toBeTruthy();
      expect(getByTestId('service-emirate-sharjah')).toBeTruthy();
    });

    fireEvent.press(getByTestId('service-emirate-dubai'));
    expect(apiService.getServicesList).toHaveBeenCalled();
  });

  it('handles 1-tap clear filters chip when filters are active', async () => {
    const { getByTestId, queryByTestId } = render(
      <ServiceListScreen navigation={{ navigate: jest.fn() }} route={{ params: { language: 'en' } }} />
    );

    await waitFor(() => {
      expect(getByTestId('service-emirate-dubai')).toBeTruthy();
    });

    // Select emirate to activate filters
    fireEvent.press(getByTestId('service-emirate-dubai'));

    await waitFor(() => {
      expect(getByTestId('service-clear-filters-chip')).toBeTruthy();
    });

    fireEvent.press(getByTestId('service-clear-filters-chip'));

    await waitFor(() => {
      expect(queryByTestId('service-clear-filters-chip')).toBeNull();
    });
  });

  it('renders empty state suggestions and handles filter selection', async () => {
    apiService.getServicesList.mockResolvedValueOnce({
      data: { total: 0, items: [] },
    });

    const { getByText, getAllByText } = render(
      <ServiceListScreen navigation={{ navigate: jest.fn() }} route={{ params: { language: 'en' } }} />
    );

    await waitFor(() => {
      expect(getByText('emptyCatalogTitle')).toBeTruthy();
      expect(getByText('postServiceCTA')).toBeTruthy();
      expect(getAllByText('Transport').length).toBeGreaterThan(0);
    });
  });

  it('handles VIP Equine Services Concierge WhatsApp inquiry in empty state', async () => {
    apiService.getServicesList.mockResolvedValue({
      data: { total: 0, items: [] },
    });

    const canOpenSpy = jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
    const openSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);

    const { getByTestId } = render(
      <ServiceListScreen navigation={{ navigate: jest.fn() }} route={{ params: { language: 'en' } }} />
    );

    await waitFor(() => {
      expect(getByTestId('service-empty-concierge-btn')).toBeTruthy();
    });

    fireEvent.press(getByTestId('service-empty-concierge-btn'));

    await waitFor(() => {
      expect(canOpenSpy).toHaveBeenCalled();
      expect(openSpy).toHaveBeenCalledWith(expect.stringContaining('whatsapp://send?text='));
    });

    canOpenSpy.mockRestore();
    openSpy.mockRestore();
  });

  it('renders VIP accreditation badge and triggers service hotline from header', async () => {
    const openSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);

    const { getByTestId } = render(
      <ServiceListScreen navigation={{ navigate: jest.fn() }} route={{ params: { language: 'en' } }} />
    );

    await waitFor(() => {
      expect(getByTestId('service-vip-badge')).toBeTruthy();
      expect(getByTestId('service-header-hotline-btn')).toBeTruthy();
    });

    fireEvent.press(getByTestId('service-header-hotline-btn'));
    expect(openSpy).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/971500000000'));
    openSpy.mockRestore();
  });

  it('renders VIP service assurance ribbon and triggers consultation on tap', async () => {
    const openSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);

    const { getByTestId } = render(
      <ServiceListScreen navigation={{ navigate: jest.fn() }} route={{ params: { language: 'en' } }} />
    );

    await waitFor(() => {
      expect(getByTestId('service-escrow-banner')).toBeTruthy();
    });

    fireEvent.press(getByTestId('service-escrow-banner'));
    expect(openSpy).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/971500000000'));
    openSpy.mockRestore();
  });
});
