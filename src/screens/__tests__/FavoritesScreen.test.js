import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Linking } from 'react-native';
import FavoritesScreen from '../FavoritesScreen';
import * as apiService from '../../services/api';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));

let mockIsAuthenticated = false;

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: mockIsAuthenticated }),
}));

jest.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    isRTL: false,
    language: 'en',
    t: (key, ...args) => {
      if (typeof key === 'string') {
        if (key === 'savedCount') return `${args[0]} saved horses`;
        return key;
      }
      return key;
    },
  }),
}));

jest.mock('../../services/api', () => ({
  getFavorites: jest.fn().mockResolvedValue({ data: [] }),
  removeFavorite: jest.fn().mockResolvedValue({}),
}));

describe('FavoritesScreen multi-category stable', () => {
  beforeEach(() => {
    mockIsAuthenticated = false;
    jest.clearAllMocks();
    apiService.getFavorites.mockResolvedValue({ data: [] });
    jest.spyOn(Linking, 'openURL').mockImplementation(() => Promise.resolve());
  });

  afterEach(() => {
    Linking.openURL.mockRestore?.();
  });

  it('renders sign in prompt when user is unauthenticated', () => {
    mockIsAuthenticated = false;
    const navigate = jest.fn();
    const screen = render(<FavoritesScreen navigation={{ navigate }} />);

    expect(screen.getByTestId('stable-unauth-vip-badge')).toBeTruthy();
    expect(screen.getByText('signInToViewStable')).toBeTruthy();
    expect(screen.getByTestId('unauth-view')).toBeTruthy();

    fireEvent.press(screen.getByText('signIn'));
    expect(navigate).toHaveBeenCalledWith('AuthStack');

    fireEvent.press(screen.getByTestId('unauth-concierge-btn'));
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/971500000000'));
  });

  it('renders multi-category tabs and switches across equipment, rider gear, and services', () => {
    mockIsAuthenticated = true;
    const navigate = jest.fn();
    const screen = render(<FavoritesScreen navigation={{ navigate }} />);

    expect(screen.getByTestId('stable-vip-badge')).toBeTruthy();
    expect(screen.getByText('tabHorses')).toBeTruthy();
    expect(screen.getByText('tabEquipment')).toBeTruthy();
    expect(screen.getByText('tabRiderGear')).toBeTruthy();
    expect(screen.getByText('tabServices')).toBeTruthy();

    // Switch to Equipment
    fireEvent.press(screen.getByText('tabEquipment'));
    expect(screen.getByText('noSavedEquipment')).toBeTruthy();
    expect(screen.getByText('browseEquipment')).toBeTruthy();
    fireEvent.press(screen.getByText('browseEquipment'));
    expect(navigate).toHaveBeenCalledWith('EquipmentListScreen');

    // Switch to Rider Gear
    fireEvent.press(screen.getByText('tabRiderGear'));
    expect(screen.getByText('noSavedRiderGear')).toBeTruthy();
    expect(screen.getByText('browseRiderGear')).toBeTruthy();
    fireEvent.press(screen.getByText('browseRiderGear'));
    expect(navigate).toHaveBeenCalledWith('RiderGearListScreen');

    // Switch to Services
    fireEvent.press(screen.getByText('tabServices'));
    expect(screen.getByText('noSavedServices')).toBeTruthy();
    expect(screen.getByText('browseServices')).toBeTruthy();
    fireEvent.press(screen.getByText('browseServices'));
    expect(navigate).toHaveBeenCalledWith('ServiceListScreen');
  });

  it('renders empty horses sanctuary with discovery chips and concierge search', () => {
    mockIsAuthenticated = true;
    const navigate = jest.fn();
    const screen = render(<FavoritesScreen navigation={{ navigate }} />);

    expect(screen.getByText('noFavorites')).toBeTruthy();
    expect(screen.getByText('noFavoritesSubtitle')).toBeTruthy();

    // Test discovery chip
    const chip = screen.getByTestId('stable-chip-Showjumping');
    expect(chip).toBeTruthy();
    fireEvent.press(chip);
    expect(navigate).toHaveBeenCalledWith('HomeMain');

    // Test browse button
    const browseBtn = screen.getByTestId('empty-browse-horses-btn');
    fireEvent.press(browseBtn);
    expect(navigate).toHaveBeenCalledWith('HomeMain');

    // Test concierge button
    const conciergeBtn = screen.getByTestId('empty-stable-concierge-btn');
    fireEvent.press(conciergeBtn);
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/971500000000'));
  });

  it('renders saved horses stable portfolio, header actions, and WhatsApp share', () => {
    mockIsAuthenticated = true;
    const mockHorse = {
      id: 88,
      title: 'Desert Wind',
      price: 120000,
      breed: 'Arabian Purebred',
      location: 'Dubai',
      images: ['https://example.com/horse.jpg'],
    };

    const navigate = jest.fn();
    const screen = render(
      <FavoritesScreen navigation={{ navigate }} initialFavorites={[mockHorse]} />
    );

    expect(screen.getByTestId('stable-portfolio-card')).toBeTruthy();
    expect(screen.getByText('Desert Wind')).toBeTruthy();

    // Test WhatsApp share of stable collection
    const shareBtn = screen.getByTestId('stable-share-whatsapp-btn');
    expect(shareBtn).toBeTruthy();
    fireEvent.press(shareBtn);
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/?text='));

    // Test header explore marketplace shortcut
    const exploreBtn = screen.getByTestId('favorites-header-explore-btn');
    expect(exploreBtn).toBeTruthy();
    fireEvent.press(exploreBtn);
    expect(navigate).toHaveBeenCalledWith('MarketplaceHomeScreen');
  });

  it('triggers VIP concierge consultation from authenticated and unauthenticated header buttons', () => {
    // Unauthenticated header concierge button
    mockIsAuthenticated = false;
    const screen1 = render(<FavoritesScreen navigation={{ navigate: jest.fn() }} />);
    const unauthHeaderBtn = screen1.getByTestId('favorites-unauth-header-concierge-btn');
    expect(unauthHeaderBtn).toBeTruthy();
    fireEvent.press(unauthHeaderBtn);
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/971500000000'));
    screen1.unmount();

    // Authenticated header concierge button
    mockIsAuthenticated = true;
    const screen2 = render(<FavoritesScreen navigation={{ navigate: jest.fn() }} />);
    const authHeaderBtn = screen2.getByTestId('favorites-header-concierge-btn');
    expect(authHeaderBtn).toBeTruthy();
    fireEvent.press(authHeaderBtn);
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/971500000000'));
  });

  it('renders 3 Stud & Sanctuary trust pillars and triggers WhatsApp consultation from stable portfolio card', () => {
    mockIsAuthenticated = true;
    const mockHorse = {
      id: 99,
      title: 'Royal Najd',
      price: 250000,
      breed: 'Arabian Purebred',
      location: 'Riyadh',
    };

    const screen = render(
      <FavoritesScreen navigation={{ navigate: jest.fn() }} initialFavorites={[mockHorse]} />
    );

    expect(screen.getByTestId('stable-portfolio-card')).toBeTruthy();
    expect(screen.getByText('WAHO Pedigree Tracking')).toBeTruthy();
    expect(screen.getByText('Live Price Surveillance')).toBeTruthy();
    expect(screen.getByText('Priority Off-Market Access')).toBeTruthy();

    const conciergeBtn = screen.getByTestId('stable-portfolio-concierge-btn');
    expect(conciergeBtn).toBeTruthy();
    fireEvent.press(conciergeBtn);
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/971500000000'));
  });

  it('triggers custom concierge request from empty equipment, rider gear, and services tabs', () => {
    mockIsAuthenticated = true;
    const screen = render(<FavoritesScreen navigation={{ navigate: jest.fn() }} />);

    // Equipment tab concierge
    fireEvent.press(screen.getByText('tabEquipment'));
    const equipConcierge = screen.getByTestId('empty-equipment-concierge-btn');
    expect(equipConcierge).toBeTruthy();
    fireEvent.press(equipConcierge);
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/971500000000'));

    // Rider gear tab concierge
    fireEvent.press(screen.getByText('tabRiderGear'));
    const gearConcierge = screen.getByTestId('empty-rider-gear-concierge-btn');
    expect(gearConcierge).toBeTruthy();
    fireEvent.press(gearConcierge);
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/971500000000'));

    // Services tab concierge
    fireEvent.press(screen.getByText('tabServices'));
    const servConcierge = screen.getByTestId('empty-services-concierge-btn');
    expect(servConcierge).toBeTruthy();
    fireEvent.press(servConcierge);
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/971500000000'));
  });
});
