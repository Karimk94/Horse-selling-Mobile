import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CategoryPicker from '../CategoryPicker';

describe('CategoryPicker', () => {
  it('renders modal when visible is true', () => {
    const { getByText } = render(
      <CategoryPicker
        visible={true}
        onClose={jest.fn()}
        onSelectCategory={jest.fn()}
        currentLanguage="ar"
      />
    );
    expect(getByText('اختر التصنيف')).toBeTruthy();
  });

  it('filters by search query', () => {
    const { getByPlaceholderText, getByText, queryByText } = render(
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
});
