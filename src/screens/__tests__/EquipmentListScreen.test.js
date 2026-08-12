import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
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

  it('renders equipment list items correctly', async () => {
    const { getByText } = render(
      <EquipmentListScreen navigation={{ navigate: jest.fn() }} route={{ params: { language: 'en' } }} />
    );

    await waitFor(() => {
      expect(getByText('Leather Jumping Saddle')).toBeTruthy();
      expect(getByText('4,500 AED')).toBeTruthy();
      expect(getByText('Saddles')).toBeTruthy();
    });
  });

  it('navigates to detail screen when card is pressed', async () => {
    const navigate = jest.fn();
    const { getByText } = render(
      <EquipmentListScreen navigation={{ navigate }} route={{ params: { language: 'en' } }} />
    );

    await waitFor(() => {
      expect(getByText('Leather Jumping Saddle')).toBeTruthy();
    });

    fireEvent.press(getByText('Leather Jumping Saddle'));
    expect(navigate).toHaveBeenCalledWith('EquipmentDetailScreen', { equipmentId: 'eq-1' });
  });
});
