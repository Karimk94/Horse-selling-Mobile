import React from 'react';
import { render } from '@testing-library/react-native';
import BrandMark from '../BrandMark';
import BrandLogo from '../BrandLogo';

describe('BrandMark & BrandLogo components', () => {
  it('renders BrandMark with default props without crashing', () => {
    const { getByLabelText } = render(<BrandMark />);
    expect(getByLabelText('SteedMarket Logo')).toBeTruthy();
  });

  it('renders BrandMark with custom size and tintColor', () => {
    const { getByLabelText } = render(<BrandMark size={48} tintColor="#ffffff" />);
    const image = getByLabelText('SteedMarket Logo');
    expect(image).toBeTruthy();
    expect(image.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ width: 48, height: 48 }),
        expect.objectContaining({ tintColor: '#ffffff' }),
      ])
    );
  });

  it('renders BrandLogo with title', () => {
    const { getByText, getByLabelText } = render(
      <BrandLogo title="SteedMarket" iconSize={36} />
    );
    expect(getByText('SteedMarket')).toBeTruthy();
    expect(getByLabelText('SteedMarket Logo')).toBeTruthy();
  });
});
