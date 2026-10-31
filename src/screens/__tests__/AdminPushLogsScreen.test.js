import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
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
    jest.spyOn(Linking, 'openURL').mockImplementation(() => Promise.resolve());
  });

  afterEach(() => {
    jest.restoreAllMocks();
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
      expect(screen.getByText('Delivered')).toBeTruthy();
      expect(screen.getByText('Failed')).toBeTruthy();
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

  it('calls navigation.goBack when the back button is pressed', () => {
    const goBack = jest.fn();
    apiService.adminListPushDeliveryLogs.mockResolvedValue({ data: { total: 0, logs: [] } });

    const screen = render(<AdminPushLogsScreen navigation={{ goBack }} />);
    fireEvent.press(screen.getByTestId('admin-push-back-btn'));

    expect(goBack).toHaveBeenCalledTimes(1);
  });

  it('renders executive command header hotline and push reliability protocol shield with engineer inquiry', async () => {
    apiService.adminListPushDeliveryLogs.mockResolvedValue({ data: { total: 0, logs: [] } });

    const screen = render(<AdminPushLogsScreen navigation={{ goBack: jest.fn() }} />);

    // Header hotline button
    await waitFor(() => {
      expect(screen.getByTestId('admin-push-header-hotline-btn')).toBeTruthy();
    });
    fireEvent.press(screen.getByTestId('admin-push-header-hotline-btn'));
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/971500000000'));

    // Reliability protocol shield card & systems engineer consultation button
    expect(screen.getByTestId('admin-push-reliability-shield')).toBeTruthy();
    expect(screen.getByTestId('admin-push-engineer-consult-btn')).toBeTruthy();
    fireEvent.press(screen.getByTestId('admin-push-engineer-consult-btn'));
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/971500000000'));
  });
});