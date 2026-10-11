import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Linking, StyleSheet } from 'react-native';
import HorseDetailScreen from '../HorseDetailScreen';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaView: ({ children }) => require('react').createElement(require('react-native').View, null, children),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: false, user: null }),
}));

jest.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ isRTL: true, t: (key) => key }),
}));

jest.mock('../../services/api', () => ({}));

jest.mock('../../components/ToastProvider', () => ({
  useToast: () => ({ show: jest.fn() }),
}));

describe('HorseDetailScreen seller actions', () => {
  it('renders equipment-style Call and WhatsApp buttons in Arabic', () => {
    const screen = render(
      <HorseDetailScreen
        navigation={{ goBack: jest.fn(), navigate: jest.fn() }}
        route={{
          params: {
            horse: {
              id: 'horse-1',
              title: 'Arabian horse',
              price: 12000,
              breed: 'Arabian',
              gender: 'mare',
              images: [],
              status: 'approved',
              owner: {
                email: 'seller@example.com',
                phone_number: '+00971 50 123 4567',
                is_verified: true,
                profile: { first_name: 'Amira', last_name: 'Saleh', location: 'Dubai' },
              },
            },
          },
        }}
      />
    );

    const callButton = screen.getByTestId('horse-call-seller-button');
    const whatsappButton = screen.getByTestId('horse-whatsapp-seller-button');
    const emailAction = screen.getByTestId('seller-email-action');
    const callStyle = StyleSheet.flatten(callButton.props.style);
    const whatsappStyle = StyleSheet.flatten(whatsappButton.props.style);
    const footerStyle = StyleSheet.flatten(screen.getByTestId('horse-detail-footer').props.style);

    expect(callStyle.flex).toBe(1);
    expect(callStyle.backgroundColor).toBe('#2563eb');
    expect(whatsappStyle.flex).toBe(1);
    expect(whatsappStyle.backgroundColor).toBe('#16a34a');
    expect(callStyle.justifyContent).toBe('center');
    expect(whatsappStyle.justifyContent).toBe('center');
    expect(callStyle.paddingVertical).toBe(14);
    expect(whatsappStyle.paddingVertical).toBe(14);
    expect(callStyle.borderRadius).toBe(12);
    expect(whatsappStyle.borderRadius).toBe(12);
    expect(callStyle.marginHorizontal).toBe(6);
    expect(whatsappStyle.marginHorizontal).toBe(6);
    expect(footerStyle.paddingHorizontal).toBe(16);
    expect(footerStyle.paddingVertical).toBe(12);
    expect(footerStyle.elevation).toBe(8);
    expect(screen.queryByText('priceLabel')).toBeNull();
    expect(screen.getByText('callSeller')).toBeTruthy();
    expect(screen.getByText('whatsapp')).toBeTruthy();
    expect(screen.queryByText('offers')).toBeNull();
    expect(screen.getByText('seller@example.com')).toBeTruthy();
    expect(screen.getByText('Amira Saleh')).toBeTruthy();
    expect(screen.getByText('verified')).toBeTruthy();
    expect(screen.getByText('Dubai')).toBeTruthy();

    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue();
    fireEvent.press(callButton);
    expect(openURL).toHaveBeenLastCalledWith('tel:+971501234567');

    fireEvent.press(whatsappButton);
    expect(openURL).toHaveBeenLastCalledWith(
      `https://wa.me/971501234567?text=${encodeURIComponent('مرحباً، أود الاستفسار عن إعلانك: Arabian horse')}`
    );

    fireEvent.press(emailAction);
    expect(openURL).toHaveBeenLastCalledWith('mailto:seller@example.com?subject=Arabian%20horse');
    openURL.mockRestore();
  });
});