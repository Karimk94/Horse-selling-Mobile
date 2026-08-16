import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../config/theme';

export default function BrandedSplash() {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xl,
    minWidth: 280,
    ...SHADOWS.card,
  },
  logoImage: {
    width: 260,
    height: 100,
  },
});

