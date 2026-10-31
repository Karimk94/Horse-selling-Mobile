import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import SellerInfoCard from '../SellerInfoCard';

describe('SellerInfoCard', () => {
  const mockSeller = {
    id: 'seller-1',
    email: 'tariq.breeder@steedmarket.ae',
    is_verified: true,
    profile: {
      first_name: 'Tariq',
      last_name: 'Al Hashemi',
      phone_number: '+971501112233',
      location: 'Dubai Stables',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  });

  afterEach(() => {
    Linking.openURL.mockRestore?.();
  });

  it('renders null when seller is null', () => {
    const { queryByTestId } = render(<SellerInfoCard seller={null} />);
    expect(queryByTestId('seller-info-card')).toBeNull();
  });

  it('renders seller details, name, verified badge, and location', () => {
    const { getByTestId, getByText } = render(
      <SellerInfoCard seller={mockSeller} t={(k) => k} />
    );

    expect(getByTestId('seller-info-card')).toBeTruthy();
    expect(getByText('Tariq Al Hashemi')).toBeTruthy();
    expect(getByText('T')).toBeTruthy(); // initial
    expect(getByText('Dubai Stables')).toBeTruthy();
    expect(getByText('tariq.breeder@steedmarket.ae')).toBeTruthy();
  });

  it('handles email press invoking Linking.openURL or custom onEmailPress', () => {
    const onEmailPress = jest.fn();
    const { getByTestId, rerender } = render(
      <SellerInfoCard seller={mockSeller} onEmailPress={onEmailPress} />
    );

    fireEvent.press(getByTestId('seller-email-action'));
    expect(onEmailPress).toHaveBeenCalledTimes(1);

    rerender(<SellerInfoCard seller={mockSeller} />);
    fireEvent.press(getByTestId('seller-email-action'));
    expect(Linking.openURL).toHaveBeenCalledWith('mailto:tariq.breeder@steedmarket.ae');
  });

  it('handles call and WhatsApp press when phone number exists', () => {
    const onCallPress = jest.fn();
    const onWhatsAppPress = jest.fn();

    const { getByTestId, rerender } = render(
      <SellerInfoCard
        seller={mockSeller}
        onCallPress={onCallPress}
        onWhatsAppPress={onWhatsAppPress}
      />
    );

    fireEvent.press(getByTestId('seller-call-action'));
    expect(onCallPress).toHaveBeenCalledTimes(1);

    fireEvent.press(getByTestId('seller-whatsapp-action'));
    expect(onWhatsAppPress).toHaveBeenCalledTimes(1);

    rerender(<SellerInfoCard seller={mockSeller} itemTitle="Prestige Saddle" />);
    fireEvent.press(getByTestId('seller-call-action'));
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('tel:'));

    fireEvent.press(getByTestId('seller-whatsapp-action'));
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/'));
  });

  it('renders SteedMarket concierge verification button and triggers WhatsApp inquiry', () => {
    const { getByTestId } = render(
      <SellerInfoCard seller={mockSeller} itemTitle="Prestige Saddle" />
    );

    expect(getByTestId('seller-concierge-verify-btn')).toBeTruthy();
    fireEvent.press(getByTestId('seller-concierge-verify-btn'));
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/971500000000'));
  });
});

