import React from 'react';
import { Linking } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import HomeScreen from '../HomeScreen';
import * as apiService from '../../services/api';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb) => {
    require('react').useEffect(() => {
      const cleanup = cb();
      return () => {
        if (typeof cleanup === 'function') cleanup();
      };
    }, []);
  },
}));

let mockIsAuthenticated = false;
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: mockIsAuthenticated }),
}));

jest.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ isRTL: true, t: (key) => key }),
}));

const mockToastShow = jest.fn();
jest.mock('../../components/ToastProvider', () => ({
  useToast: () => ({ show: mockToastShow }),
}));

jest.mock('../../services/api', () => ({
  getHorses: jest.fn().mockResolvedValue({ data: { horses: [], total: 0 } }),
  getFavorites: jest.fn().mockResolvedValue({ data: [] }),
  createSavedSearch: jest.fn().mockResolvedValue({ data: { id: 'alert-1' } }),
}));

describe('HomeScreen flagship discovery catalog & regional stabling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAuthenticated = false;
    apiService.getHorses.mockResolvedValue({ data: { horses: [], total: 0 } });
  });

  it('returns to Browse hub from back button and navigates to CreateListing from header button', async () => {
    const mockGoBack = jest.fn();
    const mockNavigate = jest.fn();
    const screen = render(<HomeScreen navigation={{ goBack: mockGoBack, navigate: mockNavigate }} />);

    fireEvent.press(screen.getByTestId('horse-list-back-button'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);

    const createButton = screen.getByTestId('horse-list-create-button');
    expect(createButton).toBeTruthy();
    fireEvent.press(createButton);
    expect(mockNavigate).toHaveBeenCalledWith('CreateListing');
  });

  it('opens filter modal when header filter button is pressed', async () => {
    const screen = render(<HomeScreen navigation={{ goBack: jest.fn(), navigate: jest.fn() }} />);

    const headerFilterBtn = screen.getByTestId('horse-header-filter-btn');
    expect(headerFilterBtn).toBeTruthy();
    fireEvent.press(headerFilterBtn);

    expect(screen.getByTestId('filter-modal-sheet')).toBeTruthy();
  });

  it('handles search input, clearing via 1-tap clear button, and submitting', () => {
    const screen = render(<HomeScreen navigation={{ goBack: jest.fn(), navigate: jest.fn() }} />);
    const searchInput = screen.getByTestId('horse-search-input');

    fireEvent.changeText(searchInput, 'Arabian Stallion');
    expect(searchInput.props.value).toBe('Arabian Stallion');

    const submitBtn = screen.getByTestId('horse-search-submit-btn');
    expect(submitBtn).toBeTruthy();
    fireEvent.press(submitBtn);
    expect(apiService.getHorses).toHaveBeenCalled();

    const clearBtn = screen.getByTestId('horse-search-clear-btn');
    expect(clearBtn).toBeTruthy();
    fireEvent.press(clearBtn);

    expect(screen.getByTestId('horse-search-input').props.value).toBe('');
  });

  it('renders fast trust filter chips and handles presses', () => {
    const screen = render(<HomeScreen navigation={{ goBack: jest.fn(), navigate: jest.fn() }} />);

    const vetCheckChip = screen.getByText('filterVetChecked');
    expect(vetCheckChip).toBeTruthy();
    fireEvent.press(vetCheckChip);

    const verifiedBreederChip = screen.getByText('filterVerifiedSeller');
    expect(verifiedBreederChip).toBeTruthy();
    fireEvent.press(verifiedBreederChip);

    const videoChip = screen.getByText('filterHasVideo');
    expect(videoChip).toBeTruthy();
    fireEvent.press(videoChip);
  });

  it('renders all 8 UAE Emirate chips and budget range chips', () => {
    const screen = render(<HomeScreen navigation={{ goBack: jest.fn(), navigate: jest.fn() }} />);

    expect(screen.getByText('allEmirates')).toBeTruthy();
    expect(screen.getByText('emirateDubai')).toBeTruthy();
    expect(screen.getByText('emirateAbuDhabi')).toBeTruthy();
    expect(screen.getByText('emirateSharjah')).toBeTruthy();
    expect(screen.getByText('emirateAjman')).toBeTruthy();
    expect(screen.getByText('emirateAlAin')).toBeTruthy();
    expect(screen.getByText('emirateRasAlKhaimah')).toBeTruthy();
    expect(screen.getByText('emirateFujairah')).toBeTruthy();
    expect(screen.getByText('emirateUmmAlQuwain')).toBeTruthy();

    fireEvent.press(screen.getByText('emirateRasAlKhaimah'));
    expect(apiService.getHorses).toHaveBeenCalled();

    const budgetChip = screen.getByText('budgetUnder50k');
    expect(budgetChip).toBeTruthy();
    fireEvent.press(budgetChip);
  });

  it('renders quick discipline filter chips including Beauty / Halter and Polo', () => {
    const screen = render(<HomeScreen navigation={{ goBack: jest.fn(), navigate: jest.fn() }} />);

    expect(screen.getByText('allDisciplines')).toBeTruthy();
    expect(screen.getByText('disciplineShowJumping')).toBeTruthy();
    expect(screen.getByText('disciplineEndurance')).toBeTruthy();
    expect(screen.getByText('disciplineDressage')).toBeTruthy();
    expect(screen.getByText('disciplineRacing')).toBeTruthy();
    expect(screen.getByText('disciplineBeauty')).toBeTruthy();
    expect(screen.getByText('disciplinePolo')).toBeTruthy();

    fireEvent.press(screen.getByText('disciplineBeauty'));
    expect(apiService.getHorses).toHaveBeenCalled();
  });

  it('resets discovery constraints when 1-tap clear chip is pressed', () => {
    const screen = render(<HomeScreen navigation={{ goBack: jest.fn(), navigate: jest.fn() }} />);

    fireEvent.changeText(screen.getByTestId('horse-search-input'), 'Desert');

    const clearChip = screen.getByTestId('horse-clear-filters-chip');
    expect(clearChip).toBeTruthy();
    fireEvent.press(clearChip);

    expect(screen.getByTestId('horse-search-input').props.value).toBe('');
  });

  it('prompts unauthenticated user to sign in when saving alert from empty state', async () => {
    const screen = render(<HomeScreen navigation={{ goBack: jest.fn(), navigate: jest.fn() }} />);

    fireEvent.changeText(screen.getByTestId('horse-search-input'), 'Rare Friesian');

    const emptySaveAlertBtn = await screen.findByTestId('horse-empty-save-alert-btn');
    expect(emptySaveAlertBtn).toBeTruthy();

    fireEvent.press(emptySaveAlertBtn);
    expect(mockToastShow).toHaveBeenCalledWith(
      expect.stringContaining('signInToSaveAlert'),
      expect.objectContaining({ type: 'warning' })
    );
  });

  it('saves search alert for authenticated user when pressed in empty state', async () => {
    mockIsAuthenticated = true;
    const screen = render(<HomeScreen navigation={{ goBack: jest.fn(), navigate: jest.fn() }} />);

    fireEvent.changeText(screen.getByTestId('horse-search-input'), 'Warmblood Champion');

    const emptySaveAlertBtn = await screen.findByTestId('horse-empty-save-alert-btn');
    expect(emptySaveAlertBtn).toBeTruthy();

    fireEvent.press(emptySaveAlertBtn);

    await waitFor(() => {
      expect(apiService.createSavedSearch).toHaveBeenCalled();
      expect(mockToastShow).toHaveBeenCalledWith(
        expect.stringContaining('searchAlertSaved'),
        expect.objectContaining({ type: 'success' })
      );
    });
  });

  it('renders VIP accreditation badge and triggers broker hotline from header', async () => {
    const openSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);

    const screen = render(<HomeScreen navigation={{ goBack: jest.fn(), navigate: jest.fn() }} />);

    expect(screen.getByTestId('horse-vip-badge')).toBeTruthy();
    const hotlineBtn = screen.getByTestId('horse-header-hotline-btn');
    expect(hotlineBtn).toBeTruthy();

    fireEvent.press(hotlineBtn);
    expect(openSpy).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/971500000000'));
    openSpy.mockRestore();
  });

  it('renders certified equine escrow & vet inspection ribbon and triggers consultation on tap', async () => {
    const openSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);

    const screen = render(<HomeScreen navigation={{ goBack: jest.fn(), navigate: jest.fn() }} />);

    const escrowBanner = screen.getByTestId('horse-escrow-banner');
    expect(escrowBanner).toBeTruthy();

    fireEvent.press(escrowBanner);
    expect(openSpy).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/971500000000'));
    openSpy.mockRestore();
  });

  it('handles bespoke horse sourcing WhatsApp inquiry in empty state', async () => {
    const openSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);

    const screen = render(<HomeScreen navigation={{ goBack: jest.fn(), navigate: jest.fn() }} />);

    const emptyConciergeBtn = await screen.findByTestId('horse-empty-concierge-btn');
    expect(emptyConciergeBtn).toBeTruthy();

    fireEvent.press(emptyConciergeBtn);
    expect(openSpy).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/971500000000'));
    openSpy.mockRestore();
  });
});

