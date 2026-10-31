import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import EmptyState from '../EmptyState';

describe('EmptyState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Linking, 'openURL').mockImplementation(() => Promise.resolve());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders title and subtitle correctly', () => {
    const { getByTestId, getByText } = render(
      <EmptyState
        title="No Saved Searches"
        subtitle="Save your filters to receive instant push alerts."
      />
    );

    expect(getByTestId('empty-state-container')).toBeTruthy();
    expect(getByTestId('empty-state-title')).toBeTruthy();
    expect(getByText('No Saved Searches')).toBeTruthy();
    expect(getByText('Save your filters to receive instant push alerts.')).toBeTruthy();
  });

  it('renders action button and triggers onPress callback', () => {
    const onButtonPress = jest.fn();
    const { getByTestId, getByText } = render(
      <EmptyState
        title="No Results"
        buttonTitle="Clear Filters"
        onButtonPress={onButtonPress}
      />
    );

    expect(getByTestId('empty-state-action-btn')).toBeTruthy();
    expect(getByText('Clear Filters')).toBeTruthy();

    fireEvent.press(getByTestId('empty-state-action-btn'));
    expect(onButtonPress).toHaveBeenCalledTimes(1);
  });

  it('renders suggestion chips and triggers onSelectSuggestion', () => {
    const onSelectSuggestion = jest.fn();
    const suggestions = ['Arabian', 'Endurance', 'Show Jumping'];

    const { getByTestId, getByText } = render(
      <EmptyState
        title="No Horses Found"
        suggestions={suggestions}
        onSelectSuggestion={onSelectSuggestion}
      />
    );

    expect(getByText('Arabian')).toBeTruthy();
    expect(getByText('Endurance')).toBeTruthy();

    fireEvent.press(getByTestId('empty-state-chip-arabian'));
    expect(onSelectSuggestion).toHaveBeenCalledWith('Arabian');
  });

  it('handles RTL mode correctly', () => {
    const { getByTestId } = render(
      <EmptyState title="لا توجد نتائج" isRTL={true} />
    );

    expect(getByTestId('empty-state-container')).toBeTruthy();
  });

  it('renders VIP Concierge button when showConcierge is true and triggers WhatsApp URL or custom callback', () => {
    const onConciergePress = jest.fn();
    const { getByTestId, rerender } = render(
      <EmptyState
        title="Rare Arabian Stallions"
        showConcierge={true}
        onConciergePress={onConciergePress}
      />
    );

    expect(getByTestId('empty-state-concierge-btn')).toBeTruthy();
    fireEvent.press(getByTestId('empty-state-concierge-btn'));
    expect(onConciergePress).toHaveBeenCalledTimes(1);

    // Rerender with default WhatsApp action
    rerender(
      <EmptyState
        title="Rare Arabian Stallions"
        showConcierge={true}
      />
    );
    fireEvent.press(getByTestId('empty-state-concierge-btn'));
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/971500000000'));
  });
});

