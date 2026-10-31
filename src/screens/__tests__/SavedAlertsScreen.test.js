import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import SavedAlertsScreen from '../SavedAlertsScreen';
import * as apiService from '../../services/api';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockT = (key) => key;

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb) => {
    const React = require('react');
    React.useEffect(() => {
      cb();
    }, []);
  },
}));

jest.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: mockT,
    isRTL: false,
    language: 'en',
  }),
}));

jest.mock('../../components/ToastProvider', () => ({
  useToast: () => ({ show: jest.fn() }),
}));

jest.mock('../../services/api', () => ({
  getSavedSearches: jest.fn(),
  getSavedSearchAlerts: jest.fn(),
  createSavedSearch: jest.fn(),
  deleteSavedSearch: jest.fn(),
  markSavedSearchAlertRead: jest.fn(),
  markAllSavedSearchAlertsRead: jest.fn(),
  getHorse: jest.fn(),
}));

describe('SavedAlertsScreen', () => {
  const mockAlerts = [
    {
      id: 'alert-1',
      name: 'Arabian Hunter Search',
      breed: 'Arabian',
      discipline: 'Show Jumping',
      min_price: 25000,
      max_price: 50000,
      vet_check_available: true,
      verified_seller: true,
    },
  ];

  const mockInbox = [
    {
      id: 'inbox-1',
      title: 'New Horse Match: Desert Wind',
      message: 'A new Arabian horse matching your Show Jumping criteria was listed.',
      horse_id: 'horse-10',
      is_read: false,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    apiService.getSavedSearches.mockResolvedValue({ data: mockAlerts });
    apiService.getSavedSearchAlerts.mockResolvedValue({ data: mockInbox });
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  });

  afterEach(() => {
    Linking.openURL.mockRestore?.();
  });

  it('renders quick budget presets and quick discipline chips', async () => {
    const screen = render(<SavedAlertsScreen navigation={{ goBack: jest.fn(), navigate: jest.fn() }} />);

    await waitFor(() => {
      expect(screen.getByText('quickDisciplinePresets')).toBeTruthy();
      expect(screen.getByText('disciplineShowJumping')).toBeTruthy();
      expect(screen.getByText('disciplineEndurance')).toBeTruthy();
      expect(screen.getByText('< 25k')).toBeTruthy();
      expect(screen.getByText('25k - 50k')).toBeTruthy();
    });

    // Tap on '< 25k' preset
    fireEvent.press(screen.getByText('< 25k'));

    expect(screen.getByDisplayValue('0')).toBeTruthy();
    expect(screen.getByDisplayValue('25000')).toBeTruthy();
  });

  it('renders saved alert cards with structured criteria pills', async () => {
    const screen = render(<SavedAlertsScreen navigation={{ goBack: jest.fn(), navigate: jest.fn() }} />);

    await waitFor(() => {
      expect(screen.getByText('Arabian Hunter Search')).toBeTruthy();
      expect(screen.getByText('🐎 Arabian')).toBeTruthy();
      expect(screen.getByText('🏆 Show Jumping')).toBeTruthy();
      expect(screen.getByText('💰 25,000 - 50,000 currencyAed')).toBeTruthy();
    });
  });

  it('renders inbox items and navigates to horse details on press', async () => {
    apiService.getHorse.mockResolvedValue({
      data: { id: 'horse-10', title: 'Desert Wind' },
    });
    apiService.markSavedSearchAlertRead.mockResolvedValue({});

    const navigate = jest.fn();
    const screen = render(<SavedAlertsScreen navigation={{ goBack: jest.fn(), navigate }} />);

    await waitFor(() => {
      expect(screen.getByText('New Horse Match: Desert Wind')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('New Horse Match: Desert Wind'));

    await waitFor(() => {
      expect(apiService.markSavedSearchAlertRead).toHaveBeenCalledWith('inbox-1');
      expect(apiService.getHorse).toHaveBeenCalledWith('horse-10');
      expect(navigate).toHaveBeenCalledWith('HorseDetail', {
        horse: { id: 'horse-10', title: 'Desert Wind' },
      });
    });
  });

  it('renders VIP Equine Match Concierge hero card with active agent and unread match stats', async () => {
    const screen = render(<SavedAlertsScreen navigation={{ goBack: jest.fn(), navigate: jest.fn() }} />);

    await waitFor(() => {
      expect(screen.getByText('alertConciergeTitle')).toBeTruthy();
      expect(screen.getByText('1 activeAlertAgents')).toBeTruthy();
      expect(screen.getByText('1 newMatchesFound')).toBeTruthy();
      expect(screen.getByTestId('alerts-metric-active-agents')).toBeTruthy();
      expect(screen.getByTestId('alerts-metric-unread-matches')).toBeTruthy();
      expect(screen.getByTestId('alerts-metric-total-matches')).toBeTruthy();
      expect(screen.getByTestId('alerts-metric-radar-status')).toBeTruthy();
    });
  });

  it('toggles collapsible alert creation studio', async () => {
    const screen = render(<SavedAlertsScreen navigation={{ goBack: jest.fn(), navigate: jest.fn() }} />);

    await waitFor(() => {
      expect(screen.getByTestId('toggle-alert-form')).toBeTruthy();
      expect(screen.getByText('hideAlertForm')).toBeTruthy();
      expect(screen.getByText('quickDisciplinePresets')).toBeTruthy();
    });

    // Collapse the form
    fireEvent.press(screen.getByTestId('toggle-alert-form'));

    await waitFor(() => {
      expect(screen.getByText('createNewAlertToggle')).toBeTruthy();
      expect(screen.queryByText('quickDisciplinePresets')).toBeNull();
    });

    // Re-expand the form
    fireEvent.press(screen.getByTestId('toggle-alert-form'));

    await waitFor(() => {
      expect(screen.getByText('hideAlertForm')).toBeTruthy();
      expect(screen.getByText('quickDisciplinePresets')).toBeTruthy();
    });
  });

  it('selects popular breed chip and updates the breed input', async () => {
    const screen = render(<SavedAlertsScreen navigation={{ goBack: jest.fn(), navigate: jest.fn() }} />);

    await waitFor(() => {
      expect(screen.getByTestId('breed-chip-arabian')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('breed-chip-arabian'));

    expect(screen.getByDisplayValue('Arabian')).toBeTruthy();

    // Tapping it again unselects it
    fireEvent.press(screen.getByTestId('breed-chip-arabian'));
    expect(screen.queryByDisplayValue('Arabian')).toBeNull();
  });

  it('triggers search live matches for a saved alert card', async () => {
    const navigate = jest.fn();
    const screen = render(<SavedAlertsScreen navigation={{ goBack: jest.fn(), navigate }} />);

    await waitFor(() => {
      expect(screen.getByTestId('run-search-alert-1')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('run-search-alert-1'));

    expect(navigate).toHaveBeenCalledWith(
      'Browse',
      expect.objectContaining({
        screen: 'HomeMain',
        params: expect.objectContaining({
          breed: 'Arabian',
          discipline: 'Show Jumping',
          minPrice: 25000,
          maxPrice: 50000,
          vetCheckOnly: true,
          verifiedSellerOnly: true,
        }),
      })
    );
  });

  it('handles luxury header navigation, refresh, and WhatsApp concierge shortcut', async () => {
    const goBack = jest.fn();
    const screen = render(<SavedAlertsScreen navigation={{ goBack, navigate: jest.fn() }} />);

    await waitFor(() => {
      expect(screen.getByTestId('saved-alerts-vip-badge')).toBeTruthy();
      expect(screen.getByTestId('alerts-back-button')).toBeTruthy();
      expect(screen.getByTestId('alerts-header-refresh-btn')).toBeTruthy();
      expect(screen.getByTestId('alerts-header-concierge-btn')).toBeTruthy();
      expect(screen.getByTestId('saved-alerts-header-concierge-btn')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('alerts-back-button'));
    expect(goBack).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByTestId('alerts-header-refresh-btn'));
    await waitFor(() => {
      expect(apiService.getSavedSearches).toHaveBeenCalledTimes(2);
    });

    fireEvent.press(screen.getByTestId('saved-alerts-header-concierge-btn'));
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/971500000000'));
  });

  it('renders VIP Pedigree Scout card and triggers WhatsApp consultation', async () => {
    const screen = render(<SavedAlertsScreen navigation={{ goBack: jest.fn(), navigate: jest.fn() }} />);

    await waitFor(() => {
      expect(screen.getByTestId('alerts-scout-card')).toBeTruthy();
      expect(screen.getByTestId('alerts-scout-whatsapp-btn')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('alerts-scout-whatsapp-btn'));
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/971500000000'));
  });

  it('switches radar domain scope and navigates to target modules', async () => {
    const navigate = jest.fn();
    const screen = render(<SavedAlertsScreen navigation={{ goBack: jest.fn(), navigate }} />);

    await waitFor(() => {
      expect(screen.getByTestId('alerts-scope-horses')).toBeTruthy();
      expect(screen.getByTestId('alerts-scope-equipment')).toBeTruthy();
      expect(screen.getByTestId('alerts-scope-rider_gear')).toBeTruthy();
      expect(screen.getByTestId('alerts-scope-services')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('alerts-scope-equipment'));
    expect(navigate).toHaveBeenCalledWith('EquipmentList');

    fireEvent.press(screen.getByTestId('alerts-scope-rider_gear'));
    expect(navigate).toHaveBeenCalledWith('RiderGearList');

    fireEvent.press(screen.getByTestId('alerts-scope-services'));
    expect(navigate).toHaveBeenCalledWith('ServiceList');
  });

  it('renders empty states with discovery action buttons and bespoke concierge when alerts and inbox are empty', async () => {
    apiService.getSavedSearches.mockResolvedValue({ data: [] });
    apiService.getSavedSearchAlerts.mockResolvedValue({ data: [] });

    const navigate = jest.fn();
    const screen = render(
      <SavedAlertsScreen
        navigation={{ goBack: jest.fn(), navigate }}
        initialAlerts={[]}
        initialInbox={[]}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('alerts-inbox-empty')).toBeTruthy();
      expect(screen.getByTestId('alerts-saved-empty')).toBeTruthy();
      expect(screen.getByTestId('alerts-empty-browse-btn')).toBeTruthy();
      expect(screen.getByTestId('alerts-empty-create-btn')).toBeTruthy();
      expect(screen.getByTestId('saved-alerts-empty-concierge-btn')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('alerts-empty-browse-btn'));
    expect(navigate).toHaveBeenCalledWith(
      'Browse',
      expect.objectContaining({ screen: 'HomeMain' })
    );

    fireEvent.press(screen.getByTestId('alerts-empty-create-btn'));
    expect(screen.getByText('quickDisciplinePresets')).toBeTruthy();

    fireEvent.press(screen.getByTestId('saved-alerts-empty-concierge-btn'));
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/971500000000'));
  });
});

