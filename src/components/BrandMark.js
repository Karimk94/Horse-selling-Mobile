import React from 'react';
import { Image, StyleSheet } from 'react-native';
import { COLORS } from '../config/theme';

const BRAND_LOGO = require('../../assets/logo.png');

export default function BrandMark({ size = 32, color, tintColor, style, resizeMode = 'contain' }) {
  // If an explicit light/white tint is desired (e.g. active tab), use it; otherwise show natural logo colors
  const activeTint =
    tintColor ||
    (color && color !== COLORS.primary && color !== '#1B4332' && color !== '#1b4332'
      ? color
      : undefined);

  return (
    <Image
      source={BRAND_LOGO}
      style={[
        {
          width: size,
          height: size,
        },
        activeTint ? { tintColor: activeTint } : null,
        style,
      ]}
      resizeMode={resizeMode}
      accessibilityRole="image"
      accessibilityLabel="SteedMarket Logo"
    />
  );
}

