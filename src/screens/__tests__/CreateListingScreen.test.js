import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import CreateListingScreen from '../CreateListingScreen';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as apiService from '../../services/api';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 20, bottom: 20, left: 0, right: 0 }),
}));

let mockIsAuthenticated = true;

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: mockIsAuthenticated }),
}));

jest.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    isRTL: false,
    language: 'en',
    t: (key) => key,
  }),
}));

const mockToast = { show: jest.fn() };
jest.mock('../../components/ToastProvider', () => ({
  useToast: () => mockToast,
}));

jest.mock('../../services/locationService', () => ({
  searchLocations: jest.fn().mockResolvedValue([
    { display_name: 'Meydan Racecourse, Dubai', lat: 25.155, lon: 55.301 },
  ]),
}));

jest.mock('../../services/api', () => ({
  createHorse: jest.fn().mockResolvedValue({ id: 101, title: 'Desert Star' }),
  uploadMedia: jest.fn().mockResolvedValue({ data: { file_url: 'https://example.com/uploaded.jpg' } }),
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({
    canceled: false,
    assets: [
      { uri: 'file://horse1.jpg' },
      { uri: 'file://horse2.jpg' },
    ],
  }),
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn().mockResolvedValue({
    canceled: false,
    assets: [
      { uri: 'file://passport_vet.pdf', name: 'passport_vet.pdf', mimeType: 'application/pdf' },
    ],
  }),
}));

describe('CreateListingScreen progressive disclosure wizard', () => {
  beforeEach(() => {
    mockIsAuthenticated = true;
    jest.clearAllMocks();
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  });

  afterEach(() => {
    Linking.openURL.mockRestore?.();
  });

  it('renders auth prompt if user is unauthenticated', () => {
    mockIsAuthenticated = false;
    const navigate = jest.fn();
    const screen = render(<CreateListingScreen navigation={{ navigate, goBack: jest.fn() }} />);

    expect(screen.getByText('signInToList')).toBeTruthy();
    fireEvent.press(screen.getByText('signIn'));
    expect(navigate).toHaveBeenCalledWith('AuthStack');
  });

  it('renders Step 1 (Media) with BrandMark header, 4-step wizard indicator, and conformation guide', () => {
    mockIsAuthenticated = true;
    const screen = render(<CreateListingScreen navigation={{ goBack: jest.fn() }} />);

    expect(screen.getByTestId('step-counter-badge')).toBeTruthy();
    expect(screen.getByText('1 / 4')).toBeTruthy();
    expect(screen.getByText('conformationGuide')).toBeTruthy();
    expect(screen.getByText('addPhotos')).toBeTruthy();
    expect(screen.getByTestId('create-listing-step-next')).toBeTruthy();
  });

  it('validates required media when attempting to proceed from Step 1 with no images', () => {
    mockIsAuthenticated = true;
    const screen = render(<CreateListingScreen navigation={{ goBack: jest.fn() }} />);

    fireEvent.press(screen.getByTestId('create-listing-step-next'));
    expect(screen.getByText('imagesRequired')).toBeTruthy();
  });

  it('allows adding photos via ImagePicker and advances to Step 2 (Identity & Breed)', async () => {
    mockIsAuthenticated = true;
    const screen = render(<CreateListingScreen navigation={{ goBack: jest.fn() }} />);

    fireEvent.press(screen.getByTestId('photo-add-btn'));

    await waitFor(() => {
      expect(screen.getByText('2/10')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('create-listing-step-next'));

    await waitFor(() => {
      expect(screen.getByTestId('step-2-container')).toBeTruthy();
      expect(screen.getByText('2 / 4')).toBeTruthy();
    });
  });

  it('validates required fields in Step 2, supports selecting breed, age, gender chips, and quick discipline shortcuts', async () => {
    mockIsAuthenticated = true;
    const screen = render(<CreateListingScreen navigation={{ goBack: jest.fn() }} />);

    // Add photos to proceed to Step 2
    fireEvent.press(screen.getByTestId('photo-add-btn'));
    await waitFor(() => expect(screen.getByText('2/10')).toBeTruthy());
    fireEvent.press(screen.getByTestId('create-listing-step-next'));

    await waitFor(() => expect(screen.getByTestId('step-2-container')).toBeTruthy());

    // Try to advance without filling required fields
    fireEvent.press(screen.getByTestId('create-listing-step-next'));
    expect(screen.getByText('titleRequired')).toBeTruthy();

    // Fill Title
    fireEvent.changeText(screen.getByTestId('horse-title-input'), 'Al Mirqab Champion');

    // Pick Breed via search in modal
    fireEvent.press(screen.getByTestId('horse-breed-picker'));
    fireEvent.changeText(screen.getByTestId('breed-search-input'), 'Arabian');
    fireEvent.press(screen.getByTestId('breed-item-Arabian'));

    // Pick Age via modal
    fireEvent.press(screen.getByTestId('horse-age-picker'));
    fireEvent.press(screen.getByTestId('age-item-5'));

    // Select Gender chip (Mare)
    fireEvent.press(screen.getByTestId('gender-mare'));

    // Tap quick discipline shortcut chip
    fireEvent.press(screen.getByTestId('discipline-chip-Endurance'));
    expect(screen.getByTestId('horse-discipline-input').props.value).toBe('Endurance');

    // Advance to Step 3
    fireEvent.press(screen.getByTestId('create-listing-step-next'));

    await waitFor(() => {
      expect(screen.getByTestId('step-3-container')).toBeTruthy();
      expect(screen.getByText('3 / 4')).toBeTruthy();
    });
  });

  it('handles Step 3 (Health & Vet) vetting toggle, PDF attachment, description length, and advances to Step 4', async () => {
    mockIsAuthenticated = true;
    const screen = render(<CreateListingScreen navigation={{ goBack: jest.fn() }} />);

    // Step 1 -> Step 2
    fireEvent.press(screen.getByTestId('photo-add-btn'));
    await waitFor(() => expect(screen.getByText('2/10')).toBeTruthy());
    fireEvent.press(screen.getByTestId('create-listing-step-next'));
    await waitFor(() => expect(screen.getByTestId('step-2-container')).toBeTruthy());

    // Step 2 -> Step 3
    fireEvent.changeText(screen.getByTestId('horse-title-input'), 'Desert Storm');
    fireEvent.press(screen.getByTestId('horse-breed-picker'));
    fireEvent.changeText(screen.getByTestId('breed-search-input'), 'Thoroughbred');
    fireEvent.press(screen.getByTestId('breed-item-Thoroughbred'));
    fireEvent.press(screen.getByTestId('horse-age-picker'));
    fireEvent.press(screen.getByTestId('age-item-4'));
    fireEvent.press(screen.getByTestId('create-listing-step-next'));

    await waitFor(() => expect(screen.getByTestId('step-3-container')).toBeTruthy());

    // Toggle Vet Check
    fireEvent.press(screen.getByTestId('vet-check-toggle'));
    expect(screen.getByTestId('upload-vet-cert-btn')).toBeTruthy();

    // Pick certificate PDF
    fireEvent.press(screen.getByTestId('upload-vet-cert-btn'));
    await waitFor(() => {
      expect(screen.getByText('passport_vet.pdf')).toBeTruthy();
    });

    // Provide description (< 30 chars triggers error)
    fireEvent.changeText(screen.getByTestId('horse-desc-input'), 'Too short');
    fireEvent.press(screen.getByTestId('create-listing-step-next'));
    expect(screen.getByText('descriptionMinLength')).toBeTruthy();

    // Provide valid description (>= 30 chars)
    fireEvent.changeText(
      screen.getByTestId('horse-desc-input'),
      'Magnificent endurance racing mare with champion lineage, perfect vetting records and supreme stamina.'
    );

    // Advance to Step 4
    fireEvent.press(screen.getByTestId('create-listing-step-next'));

    await waitFor(() => {
      expect(screen.getByTestId('step-4-container')).toBeTruthy();
      expect(screen.getByText('4 / 4')).toBeTruthy();
    });
  });

  it('completes Step 4 (Pricing & Review) with UAE Emirates quick chips, live price badge preview, and submits listing', async () => {
    mockIsAuthenticated = true;
    const goBack = jest.fn();
    const screen = render(<CreateListingScreen navigation={{ goBack }} />);

    // Step 1: Media
    fireEvent.press(screen.getByTestId('photo-add-btn'));
    await waitFor(() => expect(screen.getByText('2/10')).toBeTruthy());
    fireEvent.press(screen.getByTestId('create-listing-step-next'));

    // Step 2: Identity
    await waitFor(() => expect(screen.getByTestId('step-2-container')).toBeTruthy());
    fireEvent.changeText(screen.getByTestId('horse-title-input'), 'Royal Pegasus');
    fireEvent.press(screen.getByTestId('horse-breed-picker'));
    fireEvent.changeText(screen.getByTestId('breed-search-input'), 'Arabian');
    fireEvent.press(screen.getByTestId('breed-item-Arabian'));
    fireEvent.press(screen.getByTestId('horse-age-picker'));
    fireEvent.press(screen.getByTestId('age-item-6'));
    fireEvent.press(screen.getByTestId('create-listing-step-next'));

    // Step 3: Health
    await waitFor(() => expect(screen.getByTestId('step-3-container')).toBeTruthy());
    fireEvent.changeText(
      screen.getByTestId('horse-desc-input'),
      'Exceptional Arabian stallion with world-class bloodline, pristine condition and high endurance.'
    );
    fireEvent.press(screen.getByTestId('create-listing-step-next'));

    // Step 4: Pricing & Review
    await waitFor(() => expect(screen.getByTestId('step-4-container')).toBeTruthy());

    // Enter Price & verify live preview badge
    fireEvent.changeText(screen.getByTestId('horse-price-input'), '185000');
    expect(screen.getByTestId('price-preview-badge')).toBeTruthy();
    expect(screen.getAllByText('185,000 AED').length).toBe(2);

    // Select UAE Emirate quick chip (Dubai)
    fireEvent.press(screen.getByTestId('emirate-chip-Dubai'));
    expect(screen.getByTestId('horse-location-input').props.value).toBe('Dubai, UAE');

    // Submit for review
    fireEvent.press(screen.getByTestId('create-listing-submit-btn'));

    await waitFor(() => {
      expect(apiService.createHorse).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Royal Pegasus',
          price: 185000,
          breed: 'Arabian',
          age: 6,
          gender: 'stallion',
          location_text: 'Dubai, UAE',
        })
      );
      expect(mockToast.show).toHaveBeenCalledWith('listingSubmitted', { type: 'success' });
      expect(goBack).toHaveBeenCalled();
    });
  });

  it('supports navigating backward across steps using stepBack button', async () => {
    mockIsAuthenticated = true;
    const screen = render(<CreateListingScreen navigation={{ goBack: jest.fn() }} />);

    // Step 1 -> Add photo -> Next
    fireEvent.press(screen.getByTestId('photo-add-btn'));
    await waitFor(() => expect(screen.getByText('2/10')).toBeTruthy());
    fireEvent.press(screen.getByTestId('create-listing-step-next'));
    await waitFor(() => expect(screen.getByTestId('step-2-container')).toBeTruthy());

    // Step 2 -> Back -> Step 1
    fireEvent.press(screen.getByTestId('create-listing-step-back'));
    await waitFor(() => {
      expect(screen.getByTestId('step-1-container')).toBeTruthy();
      expect(screen.getByText('1 / 4')).toBeTruthy();
    });
  });

  it('triggers WhatsApp listing concierge inquiry when header concierge button is pressed', () => {
    mockIsAuthenticated = true;
    const screen = render(<CreateListingScreen navigation={{ goBack: jest.fn() }} />);

    expect(screen.getByTestId('create-listing-header-concierge-btn')).toBeTruthy();
    fireEvent.press(screen.getByTestId('create-listing-header-concierge-btn'));

    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/971500000000'));
  });

  it('renders VIP horse escrow shield and triggers concierge consultation in Step 4', async () => {
    mockIsAuthenticated = true;
    const screen = render(
      <CreateListingScreen
        navigation={{ goBack: jest.fn() }}
        initialStep={4}
        initialForm={{
          title: 'Royal Pegasus',
          price: '200000',
          breed: 'Arabian',
          age: '5',
          gender: 'stallion',
          discipline: 'Endurance',
          height: '15.2',
          description: 'A magnificent Arabian champion stallion with flawless vetting records.',
          vet_check_available: true,
        }}
        initialImages={['file://horse1.jpg']}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('step-4-container')).toBeTruthy();
      expect(screen.getByTestId('seller-horse-escrow-shield')).toBeTruthy();
      expect(screen.getByTestId('create-horse-concierge-btn')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('create-horse-concierge-btn'));
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/971500000000'));
  });

  it('renders VIP accreditation badge and triggers certified equine photographer concierge in Step 1', () => {
    mockIsAuthenticated = true;
    const screen = render(<CreateListingScreen navigation={{ goBack: jest.fn() }} />);

    expect(screen.getByTestId('create-listing-vip-badge')).toBeTruthy();
    const photoConciergeBtn = screen.getByTestId('seller-media-concierge-btn');
    expect(photoConciergeBtn).toBeTruthy();

    fireEvent.press(photoConciergeBtn);
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/971500000000'));
  });

  it('renders VIP health & vet inspection protocol banner in Step 3 and triggers WhatsApp consultation on tap', async () => {
    mockIsAuthenticated = true;
    const screen = render(
      <CreateListingScreen
        navigation={{ goBack: jest.fn() }}
        initialStep={3}
        initialForm={{
          title: 'Desert Moon',
          breed: 'Arabian',
          age: '6',
          gender: 'mare',
          description: 'A champion endurance mare with supreme stamina and pedigree.',
        }}
        initialImages={['file://horse1.jpg']}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('step-3-container')).toBeTruthy();
      expect(screen.getByTestId('seller-health-vet-protocol-banner')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('seller-health-vet-protocol-banner'));
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/971500000000'));
  });
});
