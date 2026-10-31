import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
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

  it('renders Smart Equestrian Inquiry Assistant and Trust Shield Cards and launches trial inquiry via WhatsApp', () => {
    const screen = render(
      <HorseDetailScreen
        navigation={{ goBack: jest.fn(), navigate: jest.fn() }}
        route={{
          params: {
            horse: {
              id: 'horse-42',
              title: 'Desert Wind',
              price: 45000,
              breed: 'Arabian',
              gender: 'stallion',
              images: [],
              status: 'approved',
              owner: {
                email: 'breeder@example.com',
                phone_number: '+971 55 999 8888',
                is_verified: true,
                profile: { first_name: 'Rashid', last_name: 'Al Maktoum', location: 'Abu Dhabi' },
              },
            },
          },
        }}
      />
    );

    expect(screen.getByText('inquiryAssistantTitle')).toBeTruthy();
    expect(screen.getByText('inquiryTrial')).toBeTruthy();
    expect(screen.getByText('inquiryVet')).toBeTruthy();
    expect(screen.getByText('inquiryVideo')).toBeTruthy();
    expect(screen.getByText('inquiryTransport')).toBeTruthy();
    expect(screen.getByText('trustShieldTitle')).toBeTruthy();
    expect(screen.getByText('trustShieldPpeTitle')).toBeTruthy();
    expect(screen.getByText('trustShieldPassportTitle')).toBeTruthy();
    expect(screen.getByText('trustShieldContractTitle')).toBeTruthy();
    expect(screen.getByText('trustShieldEscrowTitle')).toBeTruthy();

    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue();
    fireEvent.press(screen.getByText('inquiryTrial'));

    expect(openURL).toHaveBeenCalled();
    const calledUrl = openURL.mock.calls[0][0];
    expect(calledUrl).toContain('wa.me/971559998888');
    expect(decodeURIComponent(calledUrl)).toContain('Desert Wind');
    openURL.mockRestore();
  });

  it('renders back button, share button, and floating conformation badges over media', () => {
    const mockGoBack = jest.fn();
    const screen = render(
      <HorseDetailScreen
        navigation={{ goBack: mockGoBack, navigate: jest.fn() }}
        route={{
          params: {
            horse: {
              id: 'horse-99',
              title: 'Royal Sapphire',
              price: 150000,
              breed: 'Arabian',
              gender: 'stallion',
              age: 5,
              height: 15.2,
              images: ['https://example.com/horse1.jpg'],
              video_url: 'https://youtube.com/watch?v=123',
              vet_check_available: true,
              location_text: 'Dubai - Meydan Stables',
              status: 'approved',
              owner: {
                id: 'owner-1',
                email: 'royal@example.com',
                phone_number: '+971 50 777 6666',
                is_verified: true,
                profile: { first_name: 'Sheikh', last_name: 'Hamdan', location: 'Dubai' },
              },
            },
          },
        }}
      />
    );

    const backButton = screen.getByTestId('horse-detail-back-button');
    expect(backButton).toBeTruthy();
    fireEvent.press(backButton);
    expect(mockGoBack).toHaveBeenCalledTimes(1);

    expect(screen.getByTestId('horse-detail-share-button')).toBeTruthy();
    expect(screen.getByTestId('horse-detail-favorite-button')).toBeTruthy();

    expect(screen.getByTestId('floating-video-badge')).toBeTruthy();
    expect(screen.getByTestId('floating-vet-badge')).toBeTruthy();

    const emiratePill = screen.getByTestId('horse-emirate-pill');
    expect(emiratePill).toBeTruthy();
    expect(screen.getAllByText('Dubai - Meydan Stables').length).toBe(2);

    expect(screen.getByText('#SM-HORSE-')).toBeTruthy();
  });

  it('handles passport sharing via WhatsApp and native share sheet', async () => {
    const { Share } = require('react-native');
    const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    const canOpenSpy = jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue();

    const screen = render(
      <HorseDetailScreen
        navigation={{ goBack: jest.fn(), navigate: jest.fn() }}
        route={{
          params: {
            horse: {
              id: 'horse-55',
              title: 'Silver Star',
              price: 60000,
              breed: 'Thoroughbred',
              gender: 'mare',
              age: 4,
              images: [],
              status: 'approved',
              owner: {
                phone_number: '+971 52 111 2222',
              },
            },
          },
        }}
      />
    );

    const whatsappShareBtn = screen.getByTestId('passport-share-whatsapp-btn');
    fireEvent.press(whatsappShareBtn);
    await waitFor(() => {
      expect(canOpenSpy).toHaveBeenCalledWith(expect.stringContaining('whatsapp://send?text='));
      expect(openURL).toHaveBeenCalled();
    });

    const exportBtn = screen.getByTestId('passport-export-sheet-btn');
    fireEvent.press(exportBtn);
    expect(shareSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Silver Star',
        message: expect.stringContaining('Silver Star'),
      })
    );

    shareSpy.mockRestore();
    canOpenSpy.mockRestore();
    openURL.mockRestore();
  });

  it('triggers vet, video, and transport inquiry presets with enriched WhatsApp messages', () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue();

    const screen = render(
      <HorseDetailScreen
        navigation={{ goBack: jest.fn(), navigate: jest.fn() }}
        route={{
          params: {
            horse: {
              id: 'horse-77',
              title: 'Al Noor',
              price: 85000,
              breed: 'Arabian',
              gender: 'gelding',
              images: [],
              status: 'approved',
              owner: {
                phone_number: '+971 50 333 4444',
              },
            },
          },
        }}
      />
    );

    fireEvent.press(screen.getByTestId('inquiry-chip-vet'));
    expect(openURL).toHaveBeenLastCalledWith(
      expect.stringContaining('wa.me/971503334444')
    );
    expect(decodeURIComponent(openURL.mock.calls[0][0])).toContain('الفحص البيطري');

    fireEvent.press(screen.getByTestId('inquiry-chip-video'));
    expect(openURL).toHaveBeenLastCalledWith(
      expect.stringContaining('wa.me/971503334444')
    );
    expect(decodeURIComponent(openURL.mock.calls[1][0])).toContain('فيديو');

    fireEvent.press(screen.getByTestId('inquiry-chip-transport'));
    expect(openURL).toHaveBeenLastCalledWith(
      expect.stringContaining('wa.me/971503334444')
    );
    expect(decodeURIComponent(openURL.mock.calls[2][0])).toContain('نقل الخيل');

    openURL.mockRestore();
  });

  it('renders VIP accreditation badge and triggers broker hotline from header button', () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue();

    const screen = render(
      <HorseDetailScreen
        navigation={{ goBack: jest.fn(), navigate: jest.fn() }}
        route={{
          params: {
            horse: {
              id: 'horse-101',
              title: 'Kahil Al Shaqab',
              price: 250000,
              breed: 'Arabian',
              gender: 'stallion',
              images: [],
              status: 'approved',
              owner: {
                phone_number: '+971 50 111 9999',
              },
            },
          },
        }}
      />
    );

    expect(screen.getByTestId('horse-detail-vip-badge')).toBeTruthy();
    const hotlineBtn = screen.getByTestId('horse-detail-broker-hotline-btn');
    expect(hotlineBtn).toBeTruthy();

    fireEvent.press(hotlineBtn);
    expect(openURL).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/971500000000'));
    expect(decodeURIComponent(openURL.mock.calls[0][0])).toContain('Kahil Al Shaqab');
    openURL.mockRestore();
  });

  it('renders certified equine escrow ribbon and triggers consultation on tap', () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue();

    const screen = render(
      <HorseDetailScreen
        navigation={{ goBack: jest.fn(), navigate: jest.fn() }}
        route={{
          params: {
            horse: {
              id: 'horse-102',
              title: 'Dubai Millennium',
              price: 320000,
              breed: 'Thoroughbred',
              gender: 'stallion',
              images: [],
              status: 'approved',
              owner: {
                phone_number: '+971 50 222 8888',
              },
            },
          },
        }}
      />
    );

    const escrowBanner = screen.getByTestId('horse-detail-escrow-banner');
    expect(escrowBanner).toBeTruthy();

    fireEvent.press(escrowBanner);
    expect(openURL).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/971500000000'));
    expect(decodeURIComponent(openURL.mock.calls[0][0])).toContain('Dubai Millennium');
    openURL.mockRestore();
  });

  it('triggers escrow and vet inspection inquiry preset via WhatsApp', () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue();

    const screen = render(
      <HorseDetailScreen
        navigation={{ goBack: jest.fn(), navigate: jest.fn() }}
        route={{
          params: {
            horse: {
              id: 'horse-103',
              title: 'Marwan Star',
              price: 180000,
              breed: 'Arabian',
              gender: 'colt',
              images: [],
              status: 'approved',
              owner: {
                phone_number: '+971 50 555 7777',
              },
            },
          },
        }}
      />
    );

    const escrowChip = screen.getByTestId('inquiry-chip-escrow');
    expect(escrowChip).toBeTruthy();

    fireEvent.press(escrowChip);
    expect(openURL).toHaveBeenCalledWith(expect.stringContaining('wa.me/971505557777'));
    expect(decodeURIComponent(openURL.mock.calls[0][0])).toContain('الضمان المالي');
    openURL.mockRestore();
  });
});