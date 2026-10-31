import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import BrandLogo from '../BrandLogo';

describe('BrandLogo', () => {
  it('renders brand mark emblem and title text', () => {
    const { getByTestId, getByText } = render(
      <BrandLogo title="SteedMarket" />
    );

    expect(getByTestId('brand-logo-container')).toBeTruthy();
    expect(getByTestId('brand-logo-title')).toBeTruthy();
    expect(getByText('SteedMarket')).toBeTruthy();
  });

  it('renders subtitle tag when provided', () => {
    const { getByTestId, getByText } = render(
      <BrandLogo
        title="SteedMarket"
        subtitle="Equestrian Marketplace"
      />
    );

    expect(getByTestId('brand-logo-subtitle')).toBeTruthy();
    expect(getByText('Equestrian Marketplace')).toBeTruthy();
  });

  it('handles RTL mode correctly', () => {
    const { getByTestId } = render(
      <BrandLogo
        title="ستيد ماركت"
        subtitle="سوق الفروسية"
        isRTL={true}
      />
    );

    expect(getByTestId('brand-logo-container')).toBeTruthy();
  });

  it('renders VIP badge with pulse dot when showVipBadge is true', () => {
    const { getByTestId, getByText } = render(
      <BrandLogo
        title="SteedMarket"
        showVipBadge={true}
        vipBadgeText="VIP PLATFORM ACCREDITED"
      />
    );

    expect(getByTestId('brand-logo-vip-badge')).toBeTruthy();
    expect(getByText('VIP PLATFORM ACCREDITED')).toBeTruthy();
  });

  it('wraps with touchable and fires onPress when onPress prop is provided', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <BrandLogo
        title="SteedMarket"
        onPress={onPress}
      />
    );

    const touchable = getByTestId('brand-logo-touchable');
    expect(touchable).toBeTruthy();
    fireEvent.press(touchable);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
