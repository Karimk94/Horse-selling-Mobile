import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import AdminModerationDashboardScreen from '../AdminModerationDashboardScreen';
import * as apiService from '../../services/api';

jest.mock('../../services/api', () => ({
  adminGetPendingEquipment: jest.fn(),
  adminApproveEquipment: jest.fn(),
  adminRejectEquipment: jest.fn(),
  adminGetPendingRiderGear: jest.fn(),
  adminApproveRiderGear: jest.fn(),
  adminRejectRiderGear: jest.fn(),
  adminGetPendingServices: jest.fn(),
  adminApproveService: jest.fn(),
  adminRejectService: jest.fn(),
}));

const mockPendingEquipment = [
  {
    id: 'eq-pending-1',
    title: 'Pending Jumping Saddle',
    price: 3200,
    location_text: 'Sharjah, UAE',
    category: { name_ar: 'سروج القفز', name_en: 'Jumping Saddles' },
    images: [{ id: 'img-1', image_url: 'https://example.com/saddle.jpg' }],
  },
];

describe('AdminModerationDashboardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    apiService.adminGetPendingEquipment.mockResolvedValue({
      data: { items: mockPendingEquipment },
    });
    apiService.adminGetPendingRiderGear.mockResolvedValue({ data: { items: [] } });
    apiService.adminGetPendingServices.mockResolvedValue({ data: { items: [] } });
  });

  it('renders pending moderation items correctly', async () => {
    const { getByText } = render(
      <AdminModerationDashboardScreen navigation={{ navigate: jest.fn() }} route={{ params: { language: 'en' } }} />
    );

    await waitFor(() => {
      expect(getByText('Pending Jumping Saddle')).toBeTruthy();
      expect(getByText('3,200 AED')).toBeTruthy();
      expect(getByText('Jumping Saddles')).toBeTruthy();
    });
  });
});
