import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import AdminModerationDashboardScreen from '../AdminModerationDashboardScreen';
import * as apiService from '../../services/api';

jest.mock('../../services/api', () => ({
  adminGetPendingEquipment: jest.fn(),
  adminGetRejectedEquipment: jest.fn(),
  adminApproveEquipment: jest.fn(),
  adminRejectEquipment: jest.fn(),
  adminGetPendingRiderGear: jest.fn(),
  adminGetRejectedRiderGear: jest.fn(),
  adminApproveRiderGear: jest.fn(),
  adminRejectRiderGear: jest.fn(),
  adminGetPendingServices: jest.fn(),
  adminGetRejectedServices: jest.fn(),
  adminApproveService: jest.fn(),
  adminRejectService: jest.fn(),
}));

jest.mock('../../components/ToastProvider', () => ({
  useToast: () => ({ show: jest.fn() }),
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
    jest.spyOn(Linking, 'openURL').mockImplementation(() => Promise.resolve());
    apiService.adminGetPendingEquipment.mockResolvedValue({
      data: { items: mockPendingEquipment, total: 1 },
    });
    apiService.adminGetRejectedEquipment.mockResolvedValue({ data: { items: [], total: 0 } });
    apiService.adminGetPendingRiderGear.mockResolvedValue({ data: { items: [], total: 0 } });
    apiService.adminGetRejectedRiderGear.mockResolvedValue({ data: { items: [], total: 0 } });
    apiService.adminGetPendingServices.mockResolvedValue({ data: { items: [], total: 0 } });
    apiService.adminGetRejectedServices.mockResolvedValue({ data: { items: [], total: 0 } });
  });

  afterEach(() => {
    jest.restoreAllMocks();
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

  it('handles back button navigation', async () => {
    const goBack = jest.fn();
    const { getByTestId } = render(
      <AdminModerationDashboardScreen navigation={{ goBack }} route={{ params: {} }} />
    );

    fireEvent.press(getByTestId('admin-moderation-back-btn'));
    expect(goBack).toHaveBeenCalledTimes(1);
  });

  it('allows tab switching between verticals and status filters', async () => {
    const { getByTestId } = render(
      <AdminModerationDashboardScreen navigation={{ navigate: jest.fn() }} route={{ params: {} }} />
    );

    fireEvent.press(getByTestId('tab-rider-gear'));
    await waitFor(() => {
      expect(apiService.adminGetPendingRiderGear).toHaveBeenCalled();
    });

    fireEvent.press(getByTestId('filter-rejected'));
    await waitFor(() => {
      expect(apiService.adminGetRejectedRiderGear).toHaveBeenCalled();
    });
  });

  it('opens reject modal and populates quick reason chip', async () => {
    const { getByTestId } = render(
      <AdminModerationDashboardScreen navigation={{ navigate: jest.fn() }} route={{ params: {} }} />
    );

    await waitFor(() => {
      expect(getByTestId('admin-reject-button-eq-pending-1')).toBeTruthy();
    });

    fireEvent.press(getByTestId('admin-reject-button-eq-pending-1'));

    await waitFor(() => {
      expect(getByTestId('quick-reason-photos')).toBeTruthy();
      expect(getByTestId('reject-reason-input')).toBeTruthy();
    });

    fireEvent.press(getByTestId('quick-reason-photos'));
    expect(getByTestId('reject-reason-input').props.value).toContain('Low photo quality or resolution');
  });

  it('renders quality & accreditation standards shield and triggers lead moderator hotline and escalation', async () => {
    const { getByTestId } = render(
      <AdminModerationDashboardScreen navigation={{ navigate: jest.fn() }} route={{ params: {} }} />
    );

    // Header hotline button
    await waitFor(() => {
      expect(getByTestId('admin-moderation-header-concierge-btn')).toBeTruthy();
    });
    fireEvent.press(getByTestId('admin-moderation-header-concierge-btn'));
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/971500000000'));

    // Shield card and escalation button
    expect(getByTestId('moderation-standards-shield')).toBeTruthy();
    expect(getByTestId('moderation-escalation-concierge-btn')).toBeTruthy();
    fireEvent.press(getByTestId('moderation-escalation-concierge-btn'));
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/971500000000'));
  });
});

