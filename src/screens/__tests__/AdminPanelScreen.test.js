import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import AdminPanelScreen from '../AdminPanelScreen';
import * as apiService from '../../services/api';

const mockT = (key) => key;

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    useFocusEffect: (callback) => {
      React.useEffect(() => callback(), [callback]);
    },
  };
});

jest.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: mockT,
    isRTL: false,
  }),
}));

jest.mock('../../components/HorseCard', () => {
  const { Text } = require('react-native');
  return function MockHorseCard({ horse }) {
    return <Text>{horse?.title || 'horse'}</Text>;
  };
});

jest.mock('../../services/api', () => ({
  adminGetDashboardSnapshot: jest.fn(),
  adminFetchDashboard: jest.fn(),
  getAdminRequestTelemetry: jest.fn(() => []),
  clearAdminRequestTelemetry: jest.fn(),
  cancelAllAdminRequests: jest.fn(),
  isRequestCanceled: jest.fn(() => false),
  adminListUsersCancelable: jest.fn(),
  adminListListingsCancelable: jest.fn(),
  adminListPendingListingsCancelable: jest.fn(),
  adminListDeletedListingsCancelable: jest.fn(),
  adminListUsers: jest.fn(),
  adminListListings: jest.fn(),
  adminListPendingListings: jest.fn(),
  adminListDeletedListings: jest.fn(),
  adminListReviews: jest.fn(),
  adminGetSecurityStatus: jest.fn(),
  adminPurgeExpiredDeletedListings: jest.fn(),
  adminBulkPurgeDeletedListings: jest.fn(),
  adminBulkRestoreListings: jest.fn(),
  restoreHorseListing: jest.fn(),
  adminApproveListing: jest.fn(),
  adminRejectListing: jest.fn(),
  adminUpdateUser: jest.fn(),
  adminUpdateUserRole: jest.fn(),
}));

describe('AdminPanelScreen purge confirmation', () => {
  const navigation = { navigate: jest.fn() };

  const seedAdminPanelData = (
    securityStatus = {
      purge_confirm_token_strong: true,
      expiry_purge_enabled: true,
      restore_window_days: 30,
    }
  ) => {
    const payload = {
      users: { users: [], total: 0 },
      listings: { listings: [], total: 0 },
      pending: { listings: [], total: 0 },
      deleted: {
        listings: [
          {
            id: 'listing-1',
            title: 'Deleted Horse',
            breed: 'Arabian',
            owner: { email: 'owner@example.com' },
            deleted_at: '2026-04-01T00:00:00Z',
          },
        ],
        total: 1,
        restore_window_days: 30,
      },
      reviews: { reviews: [] },
      security: securityStatus,
    };

    apiService.adminGetDashboardSnapshot.mockReturnValue(null);
    apiService.adminFetchDashboard.mockResolvedValue(payload);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    seedAdminPanelData();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    Alert.alert.mockRestore();
  });

  it('blocks manual purge when typed confirmation is not PURGE', async () => {
    const screen = render(<AdminPanelScreen navigation={navigation} initialTab="deleted" />);

    await waitFor(() => {
      expect(apiService.adminFetchDashboard).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText('adminPurgeExpired')).toBeTruthy();
    });
    fireEvent.press(screen.getByText('adminPurgeExpired'));

    await waitFor(() => {
      expect(screen.getByText('adminPurgeTypeToConfirm')).toBeTruthy();
    });

    fireEvent.changeText(screen.getByPlaceholderText('adminPurgeTypePlaceholder'), 'WRONG');
    fireEvent.press(screen.getByText('adminPurgeConfirmAction'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('error', 'adminPurgeTypeInvalid');
      expect(apiService.adminPurgeExpiredDeletedListings).not.toHaveBeenCalled();
    });
  });

  it('allows manual purge when typed confirmation is PURGE', async () => {
    apiService.adminPurgeExpiredDeletedListings.mockResolvedValue({
      data: { purged_count: 1 },
    });

    const screen = render(<AdminPanelScreen navigation={navigation} initialTab="deleted" />);

    await waitFor(() => {
      expect(apiService.adminFetchDashboard).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText('adminPurgeExpired')).toBeTruthy();
    });
    fireEvent.press(screen.getByText('adminPurgeExpired'));

    await waitFor(() => {
      expect(screen.getByText('adminPurgeTypeToConfirm')).toBeTruthy();
    });

    fireEvent.changeText(screen.getByPlaceholderText('adminPurgeTypePlaceholder'), 'PURGE');
    fireEvent.press(screen.getByText('adminPurgeConfirmAction'));

    await waitFor(() => {
      expect(apiService.adminPurgeExpiredDeletedListings).toHaveBeenCalledTimes(1);
      expect(Alert.alert).toHaveBeenCalledWith('success', 'adminPurgeExpiredSuccess: 1');
    });
  });

  it('blocks bulk purge when typed confirmation is not PURGE', async () => {
    const screen = render(<AdminPanelScreen navigation={navigation} initialTab="deleted" />);

    await waitFor(() => {
      expect(apiService.adminFetchDashboard).toHaveBeenCalled();
    });

    fireEvent.press(screen.getByTestId('deleted-select-listing-1'));

    await waitFor(() => {
      expect(screen.getByTestId('bulk-purge-selected-btn')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('bulk-purge-selected-btn'));

    await waitFor(() => {
      expect(screen.getByText('adminPurgeTypeToConfirm')).toBeTruthy();
    });

    fireEvent.changeText(screen.getByPlaceholderText('adminPurgeTypePlaceholder'), 'WRONG');
    fireEvent.press(screen.getByText('adminPurgeConfirmAction'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('error', 'adminPurgeTypeInvalid');
      expect(apiService.adminBulkPurgeDeletedListings).not.toHaveBeenCalled();
    });
  });

  it('allows bulk purge when typed confirmation is PURGE', async () => {
    apiService.adminBulkPurgeDeletedListings.mockResolvedValue({
      data: { purged_count: 1, not_expired_count: 0 },
    });

    const screen = render(<AdminPanelScreen navigation={navigation} initialTab="deleted" />);

    await waitFor(() => {
      expect(apiService.adminFetchDashboard).toHaveBeenCalled();
    });

    fireEvent.press(screen.getByTestId('deleted-select-listing-1'));

    await waitFor(() => {
      expect(screen.getByTestId('bulk-purge-selected-btn')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('bulk-purge-selected-btn'));

    await waitFor(() => {
      expect(screen.getByText('adminPurgeTypeToConfirm')).toBeTruthy();
    });

    fireEvent.changeText(screen.getByPlaceholderText('adminPurgeTypePlaceholder'), 'PURGE');
    fireEvent.press(screen.getByText('adminPurgeConfirmAction'));

    await waitFor(() => {
      expect(apiService.adminBulkPurgeDeletedListings).toHaveBeenCalledWith(['listing-1']);
      expect(Alert.alert).toHaveBeenCalledWith('success', 'deleted: 1, notExpired: 0');
    });
  });

  it('keeps admin panel usable when security status payload is missing', async () => {
    seedAdminPanelData(null);

    const screen = render(<AdminPanelScreen navigation={navigation} initialTab="deleted" />);

    await waitFor(() => {
      expect(apiService.adminFetchDashboard).toHaveBeenCalled();
      expect(screen.getByText('adminPurgeExpired')).toBeTruthy();
    });

    expect(Alert.alert).not.toHaveBeenCalledWith('error', 'adminLoadFailed');
  });
});
