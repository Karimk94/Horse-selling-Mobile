import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import FilterModal from '../FilterModal';
import * as apiService from '../../services/api';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }),
}));

let mockIsAuthenticated = true;

jest.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    isRTL: false,
    language: 'en',
    t: (key) => key,
  }),
}));

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: mockIsAuthenticated }),
}));

const mockToast = { show: jest.fn() };
jest.mock('../ToastProvider', () => ({
  useToast: () => mockToast,
}));

jest.mock('../../services/api', () => ({
  createSavedSearch: jest.fn().mockResolvedValue({ id: 99, name: 'Test Alert' }),
}));

describe('FilterModal Luxury Equine Discovery Intelligence', () => {
  beforeEach(() => {
    mockIsAuthenticated = true;
    jest.clearAllMocks();
    jest.spyOn(Linking, 'openURL').mockImplementation(() => Promise.resolve());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders filter modal with BrandMark, budget presets, and trust verification filters', () => {
    const onApply = jest.fn();
    const onClose = jest.fn();

    const screen = render(
      <FilterModal
        visible={true}
        onClose={onClose}
        onApply={onApply}
        initialFilters={{}}
      />
    );

    expect(screen.getByTestId('filter-modal-sheet')).toBeTruthy();
    expect(screen.getByText('filters')).toBeTruthy();
    expect(screen.getByText('< 25k')).toBeTruthy();
    expect(screen.getByText('25k - 50k')).toBeTruthy();
    expect(screen.getByText('50k - 100k')).toBeTruthy();
    expect(screen.getByText('100k - 250k')).toBeTruthy();
    expect(screen.getByText('250k+')).toBeTruthy();
    expect(screen.getByText('vetCheckedOnly')).toBeTruthy();
    expect(screen.getByText('verifiedSellersOnly')).toBeTruthy();
    expect(screen.getByText('With Video')).toBeTruthy();
  });

  it('selects a quick budget preset and reveals save search alert banner', () => {
    const onApply = jest.fn();
    const onClose = jest.fn();

    const screen = render(
      <FilterModal
        visible={true}
        onClose={onClose}
        onApply={onApply}
        initialFilters={{}}
      />
    );

    fireEvent.press(screen.getByText('25k - 50k'));

    // When criteria are selected, the saveSearchAlert action is shown
    expect(screen.getAllByText('saveSearchAlert').length).toBeGreaterThan(0);
    expect(screen.getByText('saveSearchAlertSub')).toBeTruthy();

    // Applying filters passes min_price and max_price
    fireEvent.press(screen.getByTestId('filter-apply-btn'));
    expect(onApply).toHaveBeenCalledWith({
      min_price: 25000,
      max_price: 50000,
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('selects UAE Emirate quick stabling chip (Dubai) and toggles it', () => {
    const onApply = jest.fn();
    const onClose = jest.fn();

    const screen = render(
      <FilterModal
        visible={true}
        onClose={onClose}
        onApply={onApply}
        initialFilters={{}}
      />
    );

    // Tap Dubai chip
    fireEvent.press(screen.getByTestId('filter-emirate-Dubai'));
    fireEvent.press(screen.getByTestId('filter-apply-btn'));

    expect(onApply).toHaveBeenCalledWith({
      q: 'Dubai',
      location: 'Dubai',
    });
  });

  it('selects popular breed quick chip (Arabian) and discipline chip (Show Jumping)', () => {
    const onApply = jest.fn();
    const onClose = jest.fn();

    const screen = render(
      <FilterModal
        visible={true}
        onClose={onClose}
        onApply={onApply}
        initialFilters={{}}
      />
    );

    fireEvent.press(screen.getByTestId('filter-breed-chip-Arabian'));
    fireEvent.press(screen.getByTestId('filter-discipline-Show Jumping'));

    fireEvent.press(screen.getByTestId('filter-apply-btn'));

    expect(onApply).toHaveBeenCalledWith({
      breed: 'Arabian',
      discipline: 'Show Jumping',
    });
  });

  it('selects trust filters and gender chips', () => {
    const onApply = jest.fn();
    const onClose = jest.fn();

    const screen = render(
      <FilterModal
        visible={true}
        onClose={onClose}
        onApply={onApply}
        initialFilters={{}}
      />
    );

    fireEvent.press(screen.getByTestId('filter-trust-vet'));
    fireEvent.press(screen.getByTestId('filter-trust-verified'));
    fireEvent.press(screen.getByTestId('filter-trust-video'));
    fireEvent.press(screen.getByTestId('filter-gender-mare'));

    fireEvent.press(screen.getByTestId('filter-apply-btn'));

    expect(onApply).toHaveBeenCalledWith({
      vet_check_available: true,
      verified_seller: true,
      has_video: true,
      gender: 'mare',
    });
  });

  it('selects quick age bracket and validates age range inputs', () => {
    const onApply = jest.fn();
    const onClose = jest.fn();

    const screen = render(
      <FilterModal
        visible={true}
        onClose={onClose}
        onApply={onApply}
        initialFilters={{}}
      />
    );

    // Select young age bracket (< 4 yrs)
    fireEvent.press(screen.getByTestId('filter-age-bracket-young'));

    fireEvent.press(screen.getByTestId('filter-apply-btn'));
    expect(onApply).toHaveBeenCalledWith({
      max_age: 3,
    });
  });

  it('validates numeric range error when min price is greater than max price', () => {
    const onApply = jest.fn();
    const onClose = jest.fn();

    const screen = render(
      <FilterModal
        visible={true}
        onClose={onClose}
        onApply={onApply}
        initialFilters={{}}
      />
    );

    fireEvent.changeText(screen.getByTestId('filter-price-min'), '100000');
    fireEvent.changeText(screen.getByTestId('filter-price-max'), '50000');

    fireEvent.press(screen.getByTestId('filter-apply-btn'));

    // Does not apply filters due to validation error
    expect(onApply).not.toHaveBeenCalled();
    expect(screen.getByText('minMustBeLessOrEqualMax')).toBeTruthy();
  });

  it('clears all active filters when Clear All is pressed', () => {
    const onApply = jest.fn();
    const onClose = jest.fn();

    const screen = render(
      <FilterModal
        visible={true}
        onClose={onClose}
        onApply={onApply}
        initialFilters={{ breed: 'Arabian', min_price: 50000 }}
      />
    );

    expect(screen.getByTestId('filter-clear-all-btn')).toBeTruthy();
    fireEvent.press(screen.getByTestId('filter-clear-all-btn'));

    // Now active count is 0 and clear-all is hidden
    expect(screen.queryByTestId('filter-clear-all-btn')).toBeNull();

    fireEvent.press(screen.getByTestId('filter-apply-btn'));
    expect(onApply).toHaveBeenCalledWith({});
  });

  it('saves search alert for authenticated user', async () => {
    mockIsAuthenticated = true;
    const screen = render(
      <FilterModal
        visible={true}
        onClose={jest.fn()}
        onApply={jest.fn()}
        initialFilters={{ breed: 'Arabian', discipline: 'Endurance' }}
      />
    );

    fireEvent.press(screen.getByTestId('filter-save-alert-btn'));

    await waitFor(() => {
      expect(apiService.createSavedSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Arabian Alert',
          search_criteria: expect.objectContaining({ breed: 'Arabian' }),
          notification_enabled: true,
        })
      );
      expect(mockToast.show).toHaveBeenCalledWith('alertSavedSuccess', { type: 'success' });
    });
  });

  it('prompts sign in when unauthenticated user attempts to save search alert', async () => {
    mockIsAuthenticated = false;
    const screen = render(
      <FilterModal
        visible={true}
        onClose={jest.fn()}
        onApply={jest.fn()}
        initialFilters={{ breed: 'Arabian' }}
      />
    );

    fireEvent.press(screen.getByTestId('filter-save-alert-btn'));

    await waitFor(() => {
      expect(apiService.createSavedSearch).not.toHaveBeenCalled();
      expect(mockToast.show).toHaveBeenCalledWith(
        'Please sign in to save search alerts',
        { type: 'warning' }
      );
    });
  });

  it('renders bespoke concierge discovery card and triggers WhatsApp concierge inquiry from header and discovery card', () => {
    const screen = render(
      <FilterModal
        visible={true}
        onClose={jest.fn()}
        onApply={jest.fn()}
        initialFilters={{ breed: 'Arabian', min_price: '50000' }}
      />
    );

    // Header hotline button
    expect(screen.getByTestId('filter-header-hotline-btn')).toBeTruthy();
    fireEvent.press(screen.getByTestId('filter-header-hotline-btn'));
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/971500000000'));

    // Bespoke discovery card & consultation button
    expect(screen.getByTestId('filter-concierge-discovery-card')).toBeTruthy();
    expect(screen.getByTestId('filter-concierge-hotline-btn')).toBeTruthy();
    fireEvent.press(screen.getByTestId('filter-concierge-hotline-btn'));
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/971500000000'));
  });
});

