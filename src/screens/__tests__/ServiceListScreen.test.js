import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
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
    const { getByText, getAllByText } = render(
      <ServiceListScreen navigation={{ navigate: jest.fn() }} route={{ params: { language: 'en' } }} />
    );

    await waitFor(() => {
      expect(getByText('VIP Air-Conditioned Horse Boarding')).toBeTruthy();
      expect(getByText('2,500 AED / month')).toBeTruthy();
      expect(getAllByText('Boarding & Stables').length).toBeGreaterThan(0);
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
});
