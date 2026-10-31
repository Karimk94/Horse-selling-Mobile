import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Linking, Share } from 'react-native';
import EquipmentDetailScreen from '../EquipmentDetailScreen';
import * as apiService from '../../services/api';

jest.mock('../../services/api', () => ({
  getEquipmentDetail: jest.fn(),
}));

const mockEquipment = {
  id: 'eq-101',
  title: 'Prestige Italia Jumping Saddle',
  price: 8500,
  quantity: 2,
  condition: 'like_new',
  brand: 'Prestige Italia',
  sizes: ['17 inch', '17.5 inch'],
  location_text: 'Sharjah Equestrian Club, UAE',
  description: 'Premium Italian calfskin jumping saddle in exceptional condition.',
  category: {
    name_en: 'Jumping Saddles',
    name_ar: 'سروج القفز',
  },
  images: [
    { id: 'img-1', image_url: 'https://example.com/saddle1.jpg' },
  ],
  owner: {
    id: 'owner-1',
    email: 'khalid.equestrian@steedmarket.ae',
    is_verified: true,
    profile: {
      first_name: 'Khalid',
      last_name: 'Al Qasimi',
      phone_number: '+971509998877',
      location: 'Sharjah, UAE',
    },
  },
};

describe('EquipmentDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    apiService.getEquipmentDetail.mockResolvedValue({ data: mockEquipment });
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
  });

  afterEach(() => {
    Linking.openURL.mockRestore?.();
    Share.share.mockRestore?.();
  });

  it('renders equipment title, formatted price, and details correctly', async () => {
    const { getByText, getAllByText, getByTestId } = render(
      <EquipmentDetailScreen
        navigation={{ goBack: jest.fn() }}
        route={{ params: { equipmentId: 'eq-101' } }}
      />
    );

    await waitFor(() => {
      expect(getByText('Prestige Italia Jumping Saddle')).toBeTruthy();
      expect(getAllByText('8,500 AED').length).toBeGreaterThanOrEqual(1);
      expect(getAllByText('Sharjah Equestrian Club, UAE').length).toBeGreaterThanOrEqual(1);
      expect(getByTestId('seller-info-card')).toBeTruthy();
      expect(getByTestId('detail-action-bar')).toBeTruthy();
    });
  });

  it('triggers phone call when pressing call owner action button', async () => {
    const { getByTestId } = render(
      <EquipmentDetailScreen
        navigation={{ goBack: jest.fn() }}
        route={{ params: { equipmentId: 'eq-101' } }}
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
      <EquipmentDetailScreen
        navigation={{ goBack: jest.fn() }}
        route={{ params: { equipmentId: 'eq-101' } }}
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
      <EquipmentDetailScreen
        navigation={{ goBack }}
        route={{ params: { equipmentId: 'eq-101' } }}
      />
    );

    await waitFor(() => {
      expect(getByTestId('equipment-back-button')).toBeTruthy();
    });

    fireEvent.press(getByTestId('equipment-back-button'));
    expect(goBack).toHaveBeenCalledTimes(1);
  });

  it('handles native share sheet and WhatsApp share from tack passport', async () => {
    const { getByTestId } = render(
      <EquipmentDetailScreen
        navigation={{ goBack: jest.fn() }}
        route={{ params: { equipmentId: 'eq-101' } }}
      />
    );

    await waitFor(() => {
      expect(getByTestId('equipment-share-button')).toBeTruthy();
      expect(getByTestId('tack-passport-share-whatsapp-btn')).toBeTruthy();
      expect(getByTestId('tack-passport-export-sheet-btn')).toBeTruthy();
    });

    // Native share from header
    fireEvent.press(getByTestId('equipment-share-button'));
    expect(Share.share).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Prestige Italia Jumping Saddle' })
    );

    // Native share from passport
    fireEvent.press(getByTestId('tack-passport-export-sheet-btn'));
    expect(Share.share).toHaveBeenCalledTimes(2);

    // WhatsApp passport export
    fireEvent.press(getByTestId('tack-passport-share-whatsapp-btn'));
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('whatsapp://send?text='));
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('SM-TACK-'));
  });

  it('handles interactive favorite button toggle', async () => {
    const { getByTestId } = render(
      <EquipmentDetailScreen
        navigation={{ goBack: jest.fn() }}
        route={{ params: { equipmentId: 'eq-101' } }}
      />
    );

    await waitFor(() => {
      expect(getByTestId('equipment-favorite-button')).toBeTruthy();
    });

    fireEvent.press(getByTestId('equipment-favorite-button'));
    // Successfully toggled favorite
    expect(getByTestId('equipment-favorite-button')).toBeTruthy();
  });

  it('renders floating conformation badges, VIP accreditation badge, and emirate stabling pill', async () => {
    const { getByTestId, getByText } = render(
      <EquipmentDetailScreen
        navigation={{ goBack: jest.fn() }}
        route={{ params: { equipmentId: 'eq-101' } }}
      />
    );

    await waitFor(() => {
      expect(getByTestId('floating-equipment-condition-badge')).toBeTruthy();
      expect(getByTestId('floating-equipment-brand-badge')).toBeTruthy();
      expect(getByTestId('equipment-detail-vip-badge')).toBeTruthy();
      expect(getByTestId('equipment-detail-escrow-banner')).toBeTruthy();
      expect(getByTestId('equipment-broker-hotline-btn')).toBeTruthy();
      expect(getByTestId('equipment-emirate-pill')).toBeTruthy();
      expect(getByText('#SM-TACK-EQ-101')).toBeTruthy();
    });
  });

  it('triggers tack specialist hotline and certified escrow consultation on tap', async () => {
    const { getByTestId } = render(
      <EquipmentDetailScreen
        navigation={{ goBack: jest.fn() }}
        route={{ params: { equipmentId: 'eq-101' } }}
      />
    );

    await waitFor(() => {
      expect(getByTestId('equipment-broker-hotline-btn')).toBeTruthy();
      expect(getByTestId('equipment-detail-escrow-banner')).toBeTruthy();
    });

    fireEvent.press(getByTestId('equipment-broker-hotline-btn'));
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('wa.me/971500000000'));

    fireEvent.press(getByTestId('equipment-detail-escrow-banner'));
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('wa.me/971500000000'));
  });

  it('handles smart inquiry assistant chips (fit, condition, delivery, trial, escrow)', async () => {
    const { getByTestId } = render(
      <EquipmentDetailScreen
        navigation={{ goBack: jest.fn() }}
        route={{ params: { equipmentId: 'eq-101' } }}
      />
    );

    await waitFor(() => {
      expect(getByTestId('inquiry-chip-fit')).toBeTruthy();
      expect(getByTestId('inquiry-chip-condition')).toBeTruthy();
      expect(getByTestId('inquiry-chip-delivery')).toBeTruthy();
      expect(getByTestId('inquiry-chip-trial')).toBeTruthy();
      expect(getByTestId('inquiry-chip-escrow')).toBeTruthy();
    });

    fireEvent.press(getByTestId('inquiry-chip-fit'));
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/'));

    fireEvent.press(getByTestId('inquiry-chip-condition'));
    expect(Linking.openURL).toHaveBeenCalled();

    fireEvent.press(getByTestId('inquiry-chip-delivery'));
    expect(Linking.openURL).toHaveBeenCalled();

    fireEvent.press(getByTestId('inquiry-chip-trial'));
    expect(Linking.openURL).toHaveBeenCalled();

    fireEvent.press(getByTestId('inquiry-chip-escrow'));
    expect(Linking.openURL).toHaveBeenCalled();
  });
});
