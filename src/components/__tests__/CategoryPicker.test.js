import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import CategoryPicker from '../CategoryPicker';

describe('CategoryPicker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  });

  afterEach(() => {
    Linking.openURL.mockRestore?.();
  });

  it('renders modal when visible is true', () => {
    const { getByText, getByTestId } = render(
      <CategoryPicker
        visible={true}
        onClose={jest.fn()}
        onSelectCategory={jest.fn()}
        currentLanguage="ar"
      />
    );
    expect(getByText('اختر التصنيف')).toBeTruthy();
    expect(getByTestId('category-picker-modal')).toBeTruthy();
  });

  it('filters by search query', () => {
    const { getByPlaceholderText, getByText } = render(
      <CategoryPicker
        visible={true}
        onClose={jest.fn()}
        onSelectCategory={jest.fn()}
        currentLanguage="en"
      />
    );
    const searchInput = getByPlaceholderText('Search categories...');
    fireEvent.changeText(searchInput, 'Saddles');
    expect(getByText('Tack & Saddlery')).toBeTruthy();
  });

  it('calls onSelectCategory when a child item is tapped', () => {
    const onSelectCategory = jest.fn();
    const { getByText } = render(
      <CategoryPicker
        visible={true}
        onClose={jest.fn()}
        onSelectCategory={onSelectCategory}
        currentLanguage="en"
      />
    );
    // Tap on parent to expand
    fireEvent.press(getByText('Tack & Saddlery'));
    // Tap child
    fireEvent.press(getByText('Saddles'));
    expect(onSelectCategory).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'saddles' })
    );
  });

  it('switches vertical module tabs and displays respective categories', () => {
    const { getByTestId, getByText } = render(
      <CategoryPicker
        visible={true}
        onClose={jest.fn()}
        onSelectCategory={jest.fn()}
        currentLanguage="en"
      />
    );

    // Switch to Rider Gear tab
    fireEvent.press(getByTestId('category-tab-rider_gear'));
    expect(getByText('Riding Apparel')).toBeTruthy();

    // Switch to Services tab
    fireEvent.press(getByTestId('category-tab-services'));
    expect(getByText('Housing & Daily Care')).toBeTruthy();
  });

  it('clears search input via clear button', () => {
    const { getByTestId, getByPlaceholderText } = render(
      <CategoryPicker
        visible={true}
        onClose={jest.fn()}
        onSelectCategory={jest.fn()}
        currentLanguage="en"
      />
    );

    const searchInput = getByPlaceholderText('Search categories...');
    fireEvent.changeText(searchInput, 'nonexistentxyz');

    expect(getByTestId('category-empty-state')).toBeTruthy();
    expect(getByTestId('category-search-clear-btn')).toBeTruthy();

    fireEvent.press(getByTestId('category-search-clear-btn'));
    expect(searchInput.props.value).toBe('');
  });

  it('highlights selected slug correctly', () => {
    const { getByTestId } = render(
      <CategoryPicker
        visible={true}
        onClose={jest.fn()}
        onSelectCategory={jest.fn()}
        currentLanguage="en"
        selectedSlug="tack-saddlery"
      />
    );

    expect(getByTestId('category-parent-card-tack-saddlery')).toBeTruthy();
  });

  it('calls onClose when close button is pressed', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <CategoryPicker
        visible={true}
        onClose={onClose}
        onSelectCategory={jest.fn()}
        currentLanguage="en"
      />
    );

    fireEvent.press(getByTestId('category-picker-close-btn'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders VIP catalog badge and triggers WhatsApp hotline on press', () => {
    const { getByText, getByTestId } = render(
      <CategoryPicker
        visible={true}
        onClose={jest.fn()}
        onSelectCategory={jest.fn()}
        currentLanguage="en"
      />
    );

    expect(getByText('VIP ACCREDITED EQUINE CATALOG')).toBeTruthy();
    const hotlineBtn = getByTestId('category-picker-hotline-btn');
    expect(hotlineBtn).toBeTruthy();

    fireEvent.press(hotlineBtn);
    expect(Linking.openURL).toHaveBeenCalledWith(
      expect.stringContaining('wa.me/971500000000')
    );
  });

  it('renders GCC taxonomy protocol shield card in list header', () => {
    const { getByTestId, getByText } = render(
      <CategoryPicker
        visible={true}
        onClose={jest.fn()}
        onSelectCategory={jest.fn()}
        currentLanguage="en"
      />
    );

    expect(getByTestId('category-catalog-shield')).toBeTruthy();
    expect(getByText('OFFICIAL GCC TAXONOMY PROTOCOL')).toBeTruthy();
    expect(getByText('Equine Taxonomy & Catalog Standards')).toBeTruthy();
  });

  it('shows custom category request button on empty state and opens WhatsApp with query', () => {
    const { getByPlaceholderText, getByTestId } = render(
      <CategoryPicker
        visible={true}
        onClose={jest.fn()}
        onSelectCategory={jest.fn()}
        currentLanguage="en"
      />
    );

    const searchInput = getByPlaceholderText('Search categories...');
    fireEvent.changeText(searchInput, 'Custom Titanium Horseshoe');

    const emptyBtn = getByTestId('category-empty-concierge-btn');
    expect(emptyBtn).toBeTruthy();

    fireEvent.press(emptyBtn);
    expect(Linking.openURL).toHaveBeenCalledWith(
      expect.stringContaining('wa.me/971500000000')
    );
    expect(Linking.openURL).toHaveBeenCalledWith(
      expect.stringContaining(encodeURIComponent('Custom Titanium Horseshoe'))
    );
  });
});
