import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS, SPACING } from '../config/theme';
import BrandMark from './BrandMark';

export default function BrandLogo({ title, iconSize = 32, textStyle, style }) {
  return (
    <View style={[styles.container, style]}>
      <BrandMark size={iconSize} />
      <Text style={[styles.title, textStyle]} numberOfLines={1} adjustsFontSizeToFit>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  title: {
    ...FONTS.h2,
    color: COLORS.primary,
    letterSpacing: 0,
    writingDirection: 'auto',
  },
});
