import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import AdminOfferAuditScreen from '../AdminOfferAuditScreen';
import * as apiService from '../../services/api';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key) => key,
    isRTL: false,
  }),
}));

jest.mock('../../services/api', () => ({
  adminGetOfferTransitionAudits: jest.fn(),
}));

describe('AdminOfferAuditScreen', () => {
  const validOfferId = '123e4567-e89b-42d3-a456-426614174000';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    Alert.alert.mockRestore();
  });

  it('shows a validation alert for invalid offer ids and avoids the API call', async () => {
    const screen = render(
      <AdminOfferAuditScreen
        navigation={{ goBack: jest.fn() }}
        route={{ params: {} }}
      />
    );

    fireEvent.changeText(screen.getByPlaceholderText('adminOfferIdPlaceholder'), 'bad-id');
    fireEvent.press(screen.getByText('adminLookup'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('error', 'adminOfferAuditInvalidId');
      expect(apiService.adminGetOfferTransitionAudits).not.toHaveBeenCalled();
    });
  });

  it('loads transition history and renders returned audit content after lookup', async () => {
    apiService.adminGetOfferTransitionAudits.mockResolvedValue({
      data: {
        total: 1,
        logs: [
          {
            id: 'audit-1',
            actor: 'seller',
            from_status: 'pending',
            to_status: 'accepted',
            response_message: 'Accepted quickly',
            changed_by_user_id: 'user-1',
            created_at: '2026-04-05T12:00:00Z',
          },
        ],
      },
    });

    const screen = render(
      <AdminOfferAuditScreen
        navigation={{ goBack: jest.fn() }}
        route={{ params: {} }}
      />
    );

    fireEvent.changeText(screen.getByPlaceholderText('adminOfferIdPlaceholder'), validOfferId);

    await act(async () => {
      fireEvent.press(screen.getByText('adminLookup'));
    });

    await waitFor(() => {
      expect(apiService.adminGetOfferTransitionAudits).toHaveBeenCalledWith(validOfferId, {
        actor: null,
        toStatus: null,
      });
      expect(screen.getByText('seller')).toBeTruthy();
      expect(screen.getByText('accepted')).toBeTruthy();
      expect(screen.getByText('adminResponseMessage: Accepted quickly')).toBeTruthy();
    });
  });

  it('passes selected filters through when looking up an offer audit trail', async () => {
    apiService.adminGetOfferTransitionAudits.mockResolvedValue({
      data: {
        total: 0,
        logs: [],
      },
    });

    const screen = render(
      <AdminOfferAuditScreen
        navigation={{ goBack: jest.fn() }}
        route={{ params: {} }}
      />
    );

    fireEvent.changeText(screen.getByPlaceholderText('adminOfferIdPlaceholder'), validOfferId);
    fireEvent.press(screen.getByText('adminActorBuyer'));
    fireEvent.press(screen.getByText('adminStatusAccepted'));
    fireEvent.press(screen.getByText('adminLookup'));

    await waitFor(() => {
      expect(apiService.adminGetOfferTransitionAudits).toHaveBeenCalledWith(validOfferId, {
        actor: 'buyer',
        toStatus: 'accepted',
      });
    });
  });
});