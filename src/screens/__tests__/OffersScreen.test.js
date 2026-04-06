import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import OffersScreen from '../OffersScreen';
import * as apiService from '../../services/api';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));

jest.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key) => key,
    isRTL: false,
  }),
}));

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'seller-1' },
  }),
}));

jest.mock('../../services/api', () => ({
  getMyOffers: jest.fn(),
  getHorse: jest.fn(),
  acceptOffer: jest.fn(),
  rejectOffer: jest.fn(),
  counterOffer: jest.fn(),
  cancelOffer: jest.fn(),
  markOfferHorseSold: jest.fn(),
}));

function buildOffer(overrides = {}) {
  return {
    id: 'offer-1',
    horse_id: 'horse-1',
    horse_title: 'Comet',
    status: 'pending',
    amount: 1200,
    counter_amount: null,
    buyer_id: 'buyer-1',
    seller_id: 'seller-1',
    buyer_email: 'buyer@example.com',
    seller_email: 'seller@example.com',
    created_at: '2026-04-05T12:00:00Z',
    ...overrides,
  };
}

describe('OffersScreen', () => {
  const navigation = {
    goBack: jest.fn(),
    navigate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    Alert.alert.mockRestore();
  });

  it('reloads offers when role and status filters change', async () => {
    apiService.getMyOffers.mockResolvedValue({
      data: { offers: [], total: 0, has_more: false },
    });

    const screen = render(<OffersScreen navigation={navigation} />);

    await waitFor(() => {
      expect(apiService.getMyOffers).toHaveBeenCalledWith('all', null, 0, 20);
      expect(screen.getByText('noOffers')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('roleSeller'));

    await waitFor(() => {
      expect(apiService.getMyOffers).toHaveBeenLastCalledWith('seller', null, 0, 20);
    });

    fireEvent.press(screen.getAllByText('status_accepted').slice(-1)[0]);

    await waitFor(() => {
      expect(apiService.getMyOffers).toHaveBeenLastCalledWith('seller', 'accepted', 0, 20);
    });
  });

  it('accepts a seller action-required offer, reloads, and shows success feedback', async () => {
    apiService.getMyOffers
      .mockResolvedValueOnce({
        data: { offers: [buildOffer()], total: 1, has_more: false },
      })
      .mockResolvedValueOnce({
        data: { offers: [buildOffer({ status: 'accepted' })], total: 1, has_more: false },
      });
    apiService.acceptOffer.mockResolvedValue({});

    const screen = render(<OffersScreen navigation={navigation} />);

    await waitFor(() => {
      expect(screen.getByText('accept')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByText('accept'));
    });

    await waitFor(() => {
      expect(apiService.acceptOffer).toHaveBeenCalledWith('offer-1', null);
      expect(apiService.getMyOffers).toHaveBeenCalledTimes(2);
      expect(Alert.alert).toHaveBeenCalledWith('success', 'offerAccepted');
    });
  });

  it('shows backend detail when accepting an offer fails', async () => {
    apiService.getMyOffers.mockResolvedValue({
      data: { offers: [buildOffer()], total: 1, has_more: false },
    });
    apiService.acceptOffer.mockRejectedValue({
      response: {
        data: {
          detail: 'Invalid offer transition: pending -> accepted',
        },
      },
    });

    const screen = render(<OffersScreen navigation={navigation} />);

    await waitFor(() => {
      expect(screen.getByText('accept')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByText('accept'));
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('error', 'Invalid offer transition: pending -> accepted');
    });
  });

  it('blocks counter submission when the entered amount is invalid', async () => {
    apiService.getMyOffers.mockResolvedValue({
      data: { offers: [buildOffer()], total: 1, has_more: false },
    });

    const screen = render(<OffersScreen navigation={navigation} />);

    await waitFor(() => {
      expect(screen.getByText('sendCounter')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('sendCounter'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('counterAmount')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getAllByText('sendCounter')[1]);
    });

    expect(apiService.counterOffer).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith('error', 'counterAmountRequired');
  });

  it('marks an accepted seller offer as sold and reloads the list', async () => {
    apiService.getMyOffers
      .mockResolvedValueOnce({
        data: {
          offers: [buildOffer({ status: 'accepted' })],
          total: 1,
          has_more: false,
        },
      })
      .mockResolvedValueOnce({
        data: {
          offers: [buildOffer({ status: 'accepted' })],
          total: 1,
          has_more: false,
        },
      });
    apiService.markOfferHorseSold.mockResolvedValue({});

    const screen = render(<OffersScreen navigation={navigation} />);

    await waitFor(() => {
      expect(screen.getByText('markSold')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByText('markSold'));
    });

    await waitFor(() => {
      expect(apiService.markOfferHorseSold).toHaveBeenCalledWith('offer-1');
      expect(apiService.getMyOffers).toHaveBeenCalledTimes(2);
      expect(Alert.alert).toHaveBeenCalledWith('success', 'horseMarkedSold');
    });
  });
});