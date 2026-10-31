import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert, Linking } from 'react-native';
import OfferHistorySheet from '../OfferHistorySheet';
import * as apiService from '../../services/api';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockT = (key) => key;

jest.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: mockT,
    isRTL: false,
    language: 'en',
  }),
}));

jest.mock('../../components/ToastProvider', () => ({
  useToast: () => ({ show: jest.fn() }),
}));

jest.mock('../../services/api', () => ({
  getHorseOffers: jest.fn(),
  getMyOffers: jest.fn(),
  createOffer: jest.fn(),
  counterOffer: jest.fn(),
  acceptOffer: jest.fn(),
  rejectOffer: jest.fn(),
}));

describe('OfferHistorySheet', () => {
  const mockOffers = [
    {
      id: 'offer-1',
      horse_id: 'horse-10',
      horse_title: 'Desert Wind',
      amount: 80000,
      counter_amount: null,
      message: 'Formal interest in Desert Wind',
      response_message: null,
      status: 'pending',
      buyer_email: 'buyer@example.com',
      created_at: '2026-10-25T10:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    apiService.getMyOffers.mockResolvedValue({ data: { offers: mockOffers } });
    apiService.getHorseOffers.mockResolvedValue({ data: { offers: mockOffers } });
  });

  it('renders offer history list and displays amount in AED', async () => {
    const screen = render(
      <OfferHistorySheet
        horseId="horse-10"
        horseTitle="Desert Wind"
        listingPrice={100000}
        isVisible={true}
        onClose={jest.fn()}
        userRole="buyer"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('offerHistory')).toBeTruthy();
      expect(screen.getByText('Desert Wind')).toBeTruthy();
      expect(screen.getByText('80,000 currencyAed')).toBeTruthy();
      expect(screen.getByText('status_pending')).toBeTruthy();
    });
  });

  it('opens offer creation form with asking price and smart offer calculation chips', async () => {
    const screen = render(
      <OfferHistorySheet
        horseId="horse-10"
        horseTitle="Desert Wind"
        listingPrice={100000}
        isVisible={true}
        onClose={jest.fn()}
        userRole="buyer"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('create-offer-button')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('create-offer-button'));

    expect(screen.getByText('offerListingPrice 100,000 currencyAed')).toBeTruthy();
    expect(screen.getByTestId('quick-offer-chip-0')).toBeTruthy();
    expect(screen.getByText('offerTrustShieldTitle')).toBeTruthy();

    // Tap on -5% chip (chip index 1: 95,000)
    fireEvent.press(screen.getByTestId('quick-offer-chip-1'));

    expect(screen.getByDisplayValue('95000')).toBeTruthy();
  });

  it('submits a new offer successfully and reloads list', async () => {
    apiService.createOffer.mockResolvedValue({});
    const onOfferUpdated = jest.fn();

    const screen = render(
      <OfferHistorySheet
        horseId="horse-10"
        horseTitle="Desert Wind"
        listingPrice={100000}
        isVisible={true}
        onClose={jest.fn()}
        userRole="buyer"
        onOfferUpdated={onOfferUpdated}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('create-offer-button')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('create-offer-button'));

    fireEvent.changeText(screen.getByTestId('offer-amount-input'), '90000');
    fireEvent.changeText(screen.getByTestId('offer-message-input'), 'Veterinary vetting included');

    fireEvent.press(screen.getByTestId('submit-offer-button'));

    await waitFor(() => {
      expect(apiService.createOffer).toHaveBeenCalledWith('horse-10', 90000, 'Veterinary vetting included');
      expect(onOfferUpdated).toHaveBeenCalled();
    });
  });

  it('opens selected offer details and supports WhatsApp consultation', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue();

    const screen = render(
      <OfferHistorySheet
        horseId="horse-10"
        horseTitle="Desert Wind"
        sellerPhone="+971501234567"
        listingPrice={100000}
        isVisible={true}
        onClose={jest.fn()}
        userRole="buyer"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('offer-card-offer-1')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('offer-card-offer-1'));

    expect(screen.getByText('offerDetails')).toBeTruthy();
    expect(screen.getByTestId('whatsapp-offer-button')).toBeTruthy();

    fireEvent.press(screen.getByTestId('whatsapp-offer-button'));

    expect(openURL).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/971501234567?text='));
    openURL.mockRestore();
  });

  it('seller accepts an offer via alert confirmation', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation((title, msg, buttons) => {
      // Find accept button and trigger its onPress
      const acceptBtn = buttons?.find((b) => b.text === 'accept');
      acceptBtn?.onPress?.();
    });
    apiService.acceptOffer.mockResolvedValue({});
    const onOfferUpdated = jest.fn();

    const screen = render(
      <OfferHistorySheet
        horseId="horse-10"
        horseTitle="Desert Wind"
        listingPrice={100000}
        isVisible={true}
        onClose={jest.fn()}
        userRole="seller"
        onOfferUpdated={onOfferUpdated}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('offer-card-offer-1')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('offer-card-offer-1'));

    expect(screen.getByTestId('accept-offer-button')).toBeTruthy();
    fireEvent.press(screen.getByTestId('accept-offer-button'));

    await waitFor(() => {
      expect(apiService.acceptOffer).toHaveBeenCalledWith('offer-1', '');
      expect(onOfferUpdated).toHaveBeenCalled();
    });
  });

  it('seller submits a counter offer using quick calculation chip', async () => {
    apiService.counterOffer.mockResolvedValue({});
    const onOfferUpdated = jest.fn();

    const screen = render(
      <OfferHistorySheet
        horseId="horse-10"
        horseTitle="Desert Wind"
        listingPrice={100000}
        isVisible={true}
        onClose={jest.fn()}
        userRole="seller"
        onOfferUpdated={onOfferUpdated}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('offer-card-offer-1')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('offer-card-offer-1'));

    expect(screen.getByTestId('counter-offer-button')).toBeTruthy();
    fireEvent.press(screen.getByTestId('counter-offer-button'));

    // Verify counter calculation chips (+5% chip index 0: 80,000 * 1.05 = 84,000)
    expect(screen.getByTestId('quick-counter-chip-0')).toBeTruthy();
    fireEvent.press(screen.getByTestId('quick-counter-chip-0'));

    expect(screen.getByDisplayValue('84000')).toBeTruthy();

    fireEvent.press(screen.getByTestId('submit-response-button'));

    await waitFor(() => {
      expect(apiService.counterOffer).toHaveBeenCalledWith('offer-1', 84000, '');
      expect(onOfferUpdated).toHaveBeenCalled();
    });
  });

  it('renders VIP governance badge and triggers concierge hotline from header', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue();

    const screen = render(
      <OfferHistorySheet
        horseId="horse-10"
        horseTitle="Desert Wind"
        listingPrice={100000}
        isVisible={true}
        onClose={jest.fn()}
        userRole="buyer"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('VIP ESCROW & OFFER GOVERNANCE')).toBeTruthy();
      expect(screen.getByTestId('offer-header-hotline-btn')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('offer-header-hotline-btn'));
    expect(openURL).toHaveBeenCalledWith(
      expect.stringContaining('https://wa.me/971500000000?text=')
    );
    expect(openURL).toHaveBeenCalledWith(
      expect.stringContaining(encodeURIComponent('Desert Wind'))
    );
    openURL.mockRestore();
  });

  it('renders VIP escrow guarantee card in offer details and triggers escrow consultation', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue();

    const screen = render(
      <OfferHistorySheet
        horseId="horse-10"
        horseTitle="Desert Wind"
        listingPrice={100000}
        isVisible={true}
        onClose={jest.fn()}
        userRole="buyer"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('offer-card-offer-1')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('offer-card-offer-1'));

    expect(screen.getByTestId('offer-escrow-guarantee-card')).toBeTruthy();
    expect(screen.getByText('STEEDMARKET VIP ESCROW GUARANTEE')).toBeTruthy();
    expect(screen.getByText('Protected Equine Escrow Settlement')).toBeTruthy();

    const escrowBtn = screen.getByTestId('offer-concierge-escrow-btn');
    expect(escrowBtn).toBeTruthy();

    fireEvent.press(escrowBtn);
    expect(openURL).toHaveBeenCalledWith(
      expect.stringContaining('https://wa.me/971500000000?text=')
    );
    expect(openURL).toHaveBeenCalledWith(
      expect.stringContaining(encodeURIComponent('80,000'))
    );
    openURL.mockRestore();
  });

  it('renders valuation concierge button in empty state and launches WhatsApp', async () => {
    apiService.getMyOffers.mockResolvedValue({ data: { offers: [] } });
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue();

    const screen = render(
      <OfferHistorySheet
        horseId="horse-10"
        horseTitle="Desert Wind"
        listingPrice={100000}
        isVisible={true}
        onClose={jest.fn()}
        userRole="buyer"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('offer-empty-concierge-btn')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('offer-empty-concierge-btn'));
    expect(openURL).toHaveBeenCalledWith(
      expect.stringContaining('https://wa.me/971500000000?text=')
    );
    expect(openURL).toHaveBeenCalledWith(
      expect.stringContaining(encodeURIComponent('Desert Wind'))
    );
    openURL.mockRestore();
  });
});
