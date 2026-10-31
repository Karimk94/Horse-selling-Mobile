import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import HorseCard from '../HorseCard';

const enTranslations = {
  currencyAed: 'AED',
  vetChecked: 'Vet-checked',
  verifiedSellerBadge: 'Verified Seller',
  hasVideo: 'Video',
  genderStallion: 'Stallion',
  genderMare: 'Mare',
  genderGelding: 'Gelding',
  yrs: 'yrs',
  hh: 'hh',
  trustScore: 'Trust',
  sire: 'Sire',
  dam: 'Dam',
  rejectionReason: 'Rejection Reason',
};

jest.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key) => enTranslations[key] || key,
    isRTL: false,
    language: 'en',
  }),
}));

const mockHorse = {
  id: 'horse-101',
  title: 'Royal Desert Champion',
  price: 320000,
  discount_price: 295000,
  breed: 'Purebred Arabian',
  age: 6,
  gender: 'stallion',
  discipline: 'Endurance',
  height: 1.55,
  sire: 'Marwan Al Shaqab',
  dam: 'Royal Princess',
  vet_check_available: true,
  status: 'approved',
  owner: {
    is_verified: true,
  },
  images: [
    { id: 'img-1', image_url: 'https://example.com/horse1.jpg' },
    { id: 'img-2', image_url: 'https://example.com/horse2.jpg' },
  ],
};

describe('HorseCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Linking, 'openURL').mockImplementation(() => Promise.resolve());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders horse title, breed, age, height, gender, and discounted price correctly', () => {
    const { getByText } = render(
      <HorseCard horse={mockHorse} isFavorited={false} />
    );

    expect(getByText('Royal Desert Champion')).toBeTruthy();
    expect(getByText('Purebred Arabian')).toBeTruthy();
    expect(getByText('Endurance')).toBeTruthy();
    expect(getByText('6 yrs')).toBeTruthy();
    expect(getByText('1.55hh')).toBeTruthy();
    expect(getByText('Stallion')).toBeTruthy();
    expect(getByText('295,000 AED')).toBeTruthy();
    expect(getByText('320,000 AED')).toBeTruthy(); // strikethrough original
  });

  it('renders pedigree teaser when sire and dam are present', () => {
    const { getByText } = render(
      <HorseCard horse={mockHorse} isFavorited={false} />
    );

    expect(getByText(/Marwan Al Shaqab.*Royal Princess/)).toBeTruthy();
  });

  it('renders vet-checked badge and verified seller indicator', () => {
    const { getByText } = render(
      <HorseCard horse={mockHorse} isFavorited={false} />
    );

    expect(getByText('Vet-checked')).toBeTruthy();
    expect(getByText('Verified Seller')).toBeTruthy();
  });

  it('handles card press triggering onPress callback with horse object', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <HorseCard horse={mockHorse} onPress={onPress} isFavorited={false} />
    );

    fireEvent.press(getByText('Royal Desert Champion'));
    expect(onPress).toHaveBeenCalledWith(mockHorse);
  });

  it('handles favorite button press triggering onFavorite callback', () => {
    const onFavorite = jest.fn();
    const { getByTestId } = render(
      <HorseCard horse={mockHorse} onFavorite={onFavorite} isFavorited={true} />
    );

    const favBtn = getByTestId('horse-card-favorite-btn');
    expect(favBtn).toBeTruthy();
    fireEvent.press(favBtn);
    expect(onFavorite).toHaveBeenCalledWith(mockHorse);
  });

  it('renders 1-tap WhatsApp quick inquiry button and opens concierge hotline', () => {
    const { getByTestId } = render(
      <HorseCard horse={mockHorse} isFavorited={false} />
    );

    const inquiryBtn = getByTestId('horse-card-quick-inquiry-btn');
    expect(inquiryBtn).toBeTruthy();

    fireEvent.press(inquiryBtn);
    expect(Linking.openURL).toHaveBeenCalledWith(
      expect.stringContaining('https://wa.me/971500000000')
    );
  });

  it('renders rejection reason when horse status is rejected', () => {
    const rejectedHorse = {
      ...mockHorse,
      status: 'rejected',
      rejection_reason: 'Pedigree certificate requires official WAHO stamp',
    };

    const { getByText } = render(
      <HorseCard horse={rejectedHorse} isFavorited={false} />
    );

    expect(getByText('Pedigree certificate requires official WAHO stamp')).toBeTruthy();
  });

  it('renders correctly in Arabic RTL mode', () => {
    const { getByText, getByTestId } = render(
      <HorseCard horse={mockHorse} isFavorited={false} />
    );

    expect(getByText('Royal Desert Champion')).toBeTruthy();
    expect(getByTestId('horse-card-quick-inquiry-btn')).toBeTruthy();
  });
});

