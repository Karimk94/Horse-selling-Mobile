import React from 'react';
import { render } from '@testing-library/react-native';
import SellHomeScreen from '../SellHomeScreen';

describe('SellHomeScreen branding', () => {
  it('uses the shared horse mark for Sell a Horse', () => {
    const screen = render(<SellHomeScreen navigation={{ navigate: jest.fn() }} />);

    expect(screen.getByText('horse')).toBeTruthy();
    expect(screen.getByText('Sell a Horse')).toBeTruthy();
  });
});