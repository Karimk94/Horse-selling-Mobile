import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import AdminPushLogsScreen from '../AdminPushLogsScreen';
import * as apiService from '../../services/api';

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
    t: (key) => key,
    isRTL: false,
  }),
}));

jest.mock('../../services/api', () => ({
  adminListPushDeliveryLogs: jest.fn(),
}));

describe('AdminPushLogsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads push delivery logs on focus and renders returned log content', async () => {
    apiService.adminListPushDeliveryLogs.mockResolvedValue({
      data: {
        total: 1,
        logs: [
          {
            id: 'log-1',
            status: 'failed',
            event_type: 'offer_new',
            provider: 'expo',
            accepted_count: 0,
            total_tokens: 2,
            failed_count: 2,
            target_user_id: 'user-1',
            error_message: 'Push gateway failed',
            created_at: '2026-04-05T12:00:00Z',
          },
        ],
      },
    });

    const screen = render(<AdminPushLogsScreen navigation={{ goBack: jest.fn() }} />);

    await waitFor(() => {
      expect(apiService.adminListPushDeliveryLogs).toHaveBeenCalledWith({
        status: null,
        eventType: null,
      });
      expect(screen.getByText('offer_new')).toBeTruthy();
      expect(screen.getByText('Provider: expo')).toBeTruthy();
      expect(screen.getByText('Push gateway failed')).toBeTruthy();
    });
  });

  it('passes filters through when the admin refreshes the list', async () => {
    apiService.adminListPushDeliveryLogs.mockResolvedValue({
      data: {
        total: 0,
        logs: [],
      },
    });

    const screen = render(<AdminPushLogsScreen navigation={{ goBack: jest.fn() }} />);

    await waitFor(() => {
      expect(apiService.adminListPushDeliveryLogs).toHaveBeenCalledTimes(1);
    });

    fireEvent.changeText(screen.getByPlaceholderText('adminEventTypePlaceholder'), 'offer_new');
    fireEvent.press(screen.getByText('error'));
    fireEvent.press(screen.getAllByText('adminRefresh')[0]);

    await waitFor(() => {
      expect(apiService.adminListPushDeliveryLogs).toHaveBeenLastCalledWith({
        status: 'failed',
        eventType: 'offer_new',
      });
    });
  });
});