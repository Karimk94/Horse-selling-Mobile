import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
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

  it('renders rider gear list items correctly', async () => {
    const { getByText } = render(
      <RiderGearListScreen navigation={{ navigate: jest.fn() }} route={{ params: { language: 'en' } }} />
    );

    await waitFor(() => {
      expect(getByText('Samshield Riding Helmet')).toBeTruthy();
      expect(getByText('1,850 AED')).toBeTruthy();
      expect(getByText('Riding Helmets')).toBeTruthy();
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
});
