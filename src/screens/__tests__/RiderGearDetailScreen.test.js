import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Linking, Share } from 'react-native';
import RiderGearDetailScreen from '../RiderGearDetailScreen';
import * as apiService from '../../services/api';

jest.mock('../../services/api', () => ({
  getRiderGearDetail: jest.fn(),
}));

const mockRiderGear = {
  id: 'rg-202',
  title: 'Samshield Shadowmatt Riding Helmet',
  price: 2400,
  quantity: 3,
  gender: 'unisex',
  brand: 'Samshield',
  sizes: ['56cm', '57cm'],
  location_text: 'Dubai Polo & Equestrian Club, UAE',
  description: 'Premium safety certified riding helmet with luxury airflow ventilation.',
  category: {
    name_en: 'Riding Helmets',
    name_ar: 'خوذات الفروسية',
  },
  images: [
    { id: 'img-1', image_url: 'https://example.com/helmet.jpg' },
  ],
  owner: {
    id: 'owner-2',
    email: 'mubarak.rider@steedmarket.ae',
    is_verified: true,
    profile: {
      first_name: 'Mubarak',
      last_name: 'Al Ketbi',
      phone_number: '+971508887766',
      location: 'Dubai, UAE',
    },
  },
};

describe('RiderGearDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    apiService.getRiderGearDetail.mockResolvedValue({ data: mockRiderGear });
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
  });

  afterEach(() => {
    Linking.openURL.mockRestore?.();
    Share.share.mockRestore?.();
  });

  it('renders rider gear title, formatted price, and details correctly', async () => {
    const { getByText, getAllByText, getByTestId } = render(
      <RiderGearDetailScreen
        navigation={{ goBack: jest.fn() }}
        route={{ params: { riderGearId: 'rg-202' } }}
      />
    );

    await waitFor(() => {
      expect(getByText('Samshield Shadowmatt Riding Helmet')).toBeTruthy();
      expect(getAllByText('2,400 AED').length).toBeGreaterThanOrEqual(1);
      expect(getAllByText('Dubai Polo & Equestrian Club, UAE').length).toBeGreaterThanOrEqual(1);
      expect(getByTestId('seller-info-card')).toBeTruthy();
      expect(getByTestId('detail-action-bar')).toBeTruthy();
    });
  });

  it('triggers phone call when pressing call owner action button', async () => {
    const { getByTestId } = render(
      <RiderGearDetailScreen
        navigation={{ goBack: jest.fn() }}
        route={{ params: { riderGearId: 'rg-202' } }}
      />
    );

    await waitFor(() => {
      expect(getByTestId('detail-action-call')).toBeTruthy();
    });

    fireEvent.press(getByTestId('detail-action-call'));
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('tel:'));
  });

  it('triggers WhatsApp when pressing WhatsApp action button', async () => {
    const { getByTestId } = render(
      <RiderGearDetailScreen
        navigation={{ goBack: jest.fn() }}
        route={{ params: { riderGearId: 'rg-202' } }}
      />
    );

    await waitFor(() => {
      expect(getByTestId('detail-action-whatsapp')).toBeTruthy();
    });

    fireEvent.press(getByTestId('detail-action-whatsapp'));
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/'));
  });

  it('navigates back when back button is pressed', async () => {
    const goBack = jest.fn();
    const { getByTestId } = render(
      <RiderGearDetailScreen
        navigation={{ goBack }}
        route={{ params: { riderGearId: 'rg-202' } }}
      />
    );

    await waitFor(() => {
      expect(getByTestId('rider-gear-back-button')).toBeTruthy();
    });

    fireEvent.press(getByTestId('rider-gear-back-button'));
    expect(goBack).toHaveBeenCalledTimes(1);
  });

  it('handles native share sheet and WhatsApp share from rider gear passport', async () => {
    const { getByTestId } = render(
      <RiderGearDetailScreen
        navigation={{ goBack: jest.fn() }}
        route={{ params: { riderGearId: 'rg-202' } }}
      />
    );

    await waitFor(() => {
      expect(getByTestId('ridergear-passport-export-sheet-btn')).toBeTruthy();
      expect(getByTestId('ridergear-passport-share-whatsapp-btn')).toBeTruthy();
    });

    fireEvent.press(getByTestId('rider-gear-share-button'));
    expect(Share.share).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Samshield Shadowmatt Riding Helmet' })
    );

    fireEvent.press(getByTestId('ridergear-passport-export-sheet-btn'));
    expect(Share.share).toHaveBeenCalled();

    fireEvent.press(getByTestId('ridergear-passport-share-whatsapp-btn'));
    expect(Linking.openURL).toHaveBeenCalledWith(
      expect.stringContaining('whatsapp://send?text=')
    );
  });

  it('handles interactive favorite button toggle', async () => {
    const { getByTestId } = render(
      <RiderGearDetailScreen
        navigation={{ goBack: jest.fn() }}
        route={{ params: { riderGearId: 'rg-202' } }}
      />
    );

    await waitFor(() => {
      expect(getByTestId('rider-gear-favorite-button')).toBeTruthy();
    });

    fireEvent.press(getByTestId('rider-gear-favorite-button'));
  });

  it('renders floating conformation badges, VIP accreditation badge, and emirate location pill', async () => {
    const { getByTestId } = render(
      <RiderGearDetailScreen
        navigation={{ goBack: jest.fn() }}
        route={{ params: { riderGearId: 'rg-202' } }}
      />
    );

    await waitFor(() => {
      expect(getByTestId('floating-ridergear-gender-badge')).toBeTruthy();
      expect(getByTestId('floating-ridergear-brand-badge')).toBeTruthy();
      expect(getByTestId('ridergear-detail-vip-badge')).toBeTruthy();
      expect(getByTestId('ridergear-detail-escrow-banner')).toBeTruthy();
      expect(getByTestId('ridergear-broker-hotline-btn')).toBeTruthy();
      expect(getByTestId('rider-gear-location-pill')).toBeTruthy();
    });
  });

  it('triggers safety specialist hotline and certified escrow consultation on tap', async () => {
    const { getByTestId } = render(
      <RiderGearDetailScreen
        navigation={{ goBack: jest.fn() }}
        route={{ params: { riderGearId: 'rg-202' } }}
      />
    );

    await waitFor(() => {
      expect(getByTestId('ridergear-broker-hotline-btn')).toBeTruthy();
      expect(getByTestId('ridergear-detail-escrow-banner')).toBeTruthy();
    });

    fireEvent.press(getByTestId('ridergear-broker-hotline-btn'));
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('wa.me/971500000000'));

    fireEvent.press(getByTestId('ridergear-detail-escrow-banner'));
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('wa.me/971500000000'));
  });

  it('handles smart inquiry assistant chips (fit, safety, delivery, fitting, escrow)', async () => {
    const { getByTestId } = render(
      <RiderGearDetailScreen
        navigation={{ goBack: jest.fn() }}
        route={{ params: { riderGearId: 'rg-202' } }}
      />
    );

    await waitFor(() => {
      expect(getByTestId('inquiry-chip-fit')).toBeTruthy();
      expect(getByTestId('inquiry-chip-safety')).toBeTruthy();
      expect(getByTestId('inquiry-chip-delivery')).toBeTruthy();
      expect(getByTestId('inquiry-chip-fitting')).toBeTruthy();
      expect(getByTestId('inquiry-chip-escrow')).toBeTruthy();
    });

    fireEvent.press(getByTestId('inquiry-chip-fit'));
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/'));

    fireEvent.press(getByTestId('inquiry-chip-safety'));
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/'));

    fireEvent.press(getByTestId('inquiry-chip-delivery'));
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/'));

    fireEvent.press(getByTestId('inquiry-chip-fitting'));
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/'));

    fireEvent.press(getByTestId('inquiry-chip-escrow'));
    expect(Linking.openURL).toHaveBeenCalled();
  });
});
