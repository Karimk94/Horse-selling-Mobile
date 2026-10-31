import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Linking, Alert, Share } from 'react-native';
import ServiceDetailScreen from '../ServiceDetailScreen';
import * as apiService from '../../services/api';

jest.mock('../../services/api', () => ({
  getServiceDetail: jest.fn(),
  sendServiceInquiry: jest.fn(),
}));

const mockService = {
  id: 'srv-303',
  title: 'Elite VIP Horse Transport UAE & GCC',
  price: 1500,
  pricing_type: 'fixed',
  experience_years: 15,
  emergency_24_7: true,
  location_text: 'Abu Dhabi Equestrian Club, UAE',
  description: 'Air-conditioned luxury 6-horse carrier with experienced equine handlers.',
  category: {
    name_en: 'Equine Transport',
    name_ar: 'نقل الخيل',
  },
  images: [
    { id: 'img-1', image_url: 'https://example.com/transport.jpg' },
  ],
  provider: {
    id: 'prov-1',
    email: 'transport@steedmarket.ae',
    is_verified: true,
    profile: {
      first_name: 'Mansour',
      last_name: 'Al Dhaheri',
      phone_number: '+971507776655',
      location: 'Abu Dhabi, UAE',
    },
  },
};

describe('ServiceDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    apiService.getServiceDetail.mockResolvedValue({ data: mockService });
    apiService.sendServiceInquiry.mockResolvedValue({ data: { success: true } });
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
  });

  afterEach(() => {
    Linking.openURL.mockRestore?.();
    Alert.alert.mockRestore?.();
    Share.share.mockRestore?.();
  });

  it('renders service title, price, provider details, and location correctly', async () => {
    const { getByText, getAllByText, getByTestId } = render(
      <ServiceDetailScreen
        navigation={{ goBack: jest.fn() }}
        route={{ params: { serviceId: 'srv-303' } }}
      />
    );

    await waitFor(() => {
      expect(getByText('Elite VIP Horse Transport UAE & GCC')).toBeTruthy();
      expect(getAllByText('1,500 AED').length).toBeGreaterThanOrEqual(1);
      expect(getAllByText('Abu Dhabi Equestrian Club, UAE').length).toBeGreaterThanOrEqual(1);
      expect(getByTestId('seller-info-card')).toBeTruthy();
      expect(getByTestId('detail-action-bar')).toBeTruthy();
    });
  });

  it('triggers phone call when pressing call owner action button', async () => {
    const { getByTestId } = render(
      <ServiceDetailScreen
        navigation={{ goBack: jest.fn() }}
        route={{ params: { serviceId: 'srv-303' } }}
      />
    );

    await waitFor(() => {
      expect(getByTestId('detail-action-call')).toBeTruthy();
    });

    fireEvent.press(getByTestId('detail-action-call'));
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('tel:'));
  });

  it('opens inquiry reservation modal and submits request', async () => {
    const { getByTestId } = render(
      <ServiceDetailScreen
        navigation={{ goBack: jest.fn() }}
        route={{ params: { serviceId: 'srv-303' } }}
      />
    );

    await waitFor(() => {
      expect(getByTestId('detail-action-inquiry')).toBeTruthy();
    });

    fireEvent.press(getByTestId('detail-action-inquiry'));

    await waitFor(() => {
      expect(getByTestId('modal-inquirer-name')).toBeTruthy();
      expect(getByTestId('modal-inquirer-phone')).toBeTruthy();
      expect(getByTestId('modal-inquiry-message')).toBeTruthy();
    });

    fireEvent.changeText(getByTestId('modal-inquirer-name'), 'Rashid Al Nuaimi');
    fireEvent.changeText(getByTestId('modal-inquirer-phone'), '+971501112233');
    fireEvent.changeText(getByTestId('modal-inquiry-message'), 'Need transport for 2 horses this Friday.');

    fireEvent.press(getByTestId('modal-inquiry-submit-btn'));

    await waitFor(() => {
      expect(apiService.sendServiceInquiry).toHaveBeenCalledWith('srv-303', {
        inquirer_name: 'Rashid Al Nuaimi',
        inquirer_phone: '+971501112233',
        message: 'Need transport for 2 horses this Friday.',
      });
      expect(Alert.alert).toHaveBeenCalledWith(
        'success',
        expect.stringContaining('sent successfully')
      );
    });
  });

  it('navigates back when back button is pressed', async () => {
    const goBack = jest.fn();
    const { getByTestId } = render(
      <ServiceDetailScreen
        navigation={{ goBack }}
        route={{ params: { serviceId: 'srv-303' } }}
      />
    );

    await waitFor(() => {
      expect(getByTestId('service-back-button')).toBeTruthy();
    });

    fireEvent.press(getByTestId('service-back-button'));
    expect(goBack).toHaveBeenCalledTimes(1);
  });

  it('handles native share sheet and WhatsApp share from service passport', async () => {
    const { getByTestId } = render(
      <ServiceDetailScreen
        navigation={{ goBack: jest.fn() }}
        route={{ params: { serviceId: 'srv-303' } }}
      />
    );

    await waitFor(() => {
      expect(getByTestId('service-passport-export-sheet-btn')).toBeTruthy();
      expect(getByTestId('service-passport-share-whatsapp-btn')).toBeTruthy();
    });

    fireEvent.press(getByTestId('service-share-button'));
    expect(Share.share).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Elite VIP Horse Transport UAE & GCC' })
    );

    fireEvent.press(getByTestId('service-passport-export-sheet-btn'));
    expect(Share.share).toHaveBeenCalled();

    fireEvent.press(getByTestId('service-passport-share-whatsapp-btn'));
    expect(Linking.openURL).toHaveBeenCalledWith(
      expect.stringContaining('whatsapp://send?text=')
    );
  });

  it('handles interactive favorite button toggle', async () => {
    const { getByTestId } = render(
      <ServiceDetailScreen
        navigation={{ goBack: jest.fn() }}
        route={{ params: { serviceId: 'srv-303' } }}
      />
    );

    await waitFor(() => {
      expect(getByTestId('service-favorite-button')).toBeTruthy();
    });

    fireEvent.press(getByTestId('service-favorite-button'));
  });

  it('renders floating conformation badges, VIP accreditation badge, and emirate location pill', async () => {
    const { getByTestId } = render(
      <ServiceDetailScreen
        navigation={{ goBack: jest.fn() }}
        route={{ params: { serviceId: 'srv-303' } }}
      />
    );

    await waitFor(() => {
      expect(getByTestId('floating-service-emergency-badge')).toBeTruthy();
      expect(getByTestId('floating-service-exp-badge')).toBeTruthy();
      expect(getByTestId('service-detail-vip-badge')).toBeTruthy();
      expect(getByTestId('service-detail-escrow-banner')).toBeTruthy();
      expect(getByTestId('service-broker-hotline-btn')).toBeTruthy();
      expect(getByTestId('service-location-pill')).toBeTruthy();
    });
  });

  it('triggers service coordinator hotline and certified escrow consultation on tap', async () => {
    const { getByTestId } = render(
      <ServiceDetailScreen
        navigation={{ goBack: jest.fn() }}
        route={{ params: { serviceId: 'srv-303' } }}
      />
    );

    await waitFor(() => {
      expect(getByTestId('service-broker-hotline-btn')).toBeTruthy();
      expect(getByTestId('service-detail-escrow-banner')).toBeTruthy();
    });

    fireEvent.press(getByTestId('service-broker-hotline-btn'));
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('wa.me/971500000000'));

    fireEvent.press(getByTestId('service-detail-escrow-banner'));
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('wa.me/971500000000'));
  });

  it('handles smart inquiry assistant chips (availability, area, quote, chat, escrow)', async () => {
    const { getByTestId } = render(
      <ServiceDetailScreen
        navigation={{ goBack: jest.fn() }}
        route={{ params: { serviceId: 'srv-303' } }}
      />
    );

    await waitFor(() => {
      expect(getByTestId('inquiry-chip-availability')).toBeTruthy();
      expect(getByTestId('inquiry-chip-area')).toBeTruthy();
      expect(getByTestId('inquiry-chip-quote')).toBeTruthy();
      expect(getByTestId('inquiry-chip-chat')).toBeTruthy();
      expect(getByTestId('inquiry-chip-escrow')).toBeTruthy();
    });

    fireEvent.press(getByTestId('inquiry-chip-availability'));
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/'));

    fireEvent.press(getByTestId('inquiry-chip-area'));
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/'));

    fireEvent.press(getByTestId('inquiry-chip-quote'));
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/'));

    fireEvent.press(getByTestId('inquiry-chip-chat'));
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/'));

    fireEvent.press(getByTestId('inquiry-chip-escrow'));
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/'));
  });
});
