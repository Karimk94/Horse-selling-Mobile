import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../config/theme';

export default function BrandedSplash() {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.logoCircle}>
          <MaterialCommunityIcons
            name="horse-variant"
            size={64}
            color={COLORS.primary}
          />
        </View>
        <Text style={styles.brandEn}>SteedMarket</Text>
        <Text style={styles.brandAr}>ستيد ماركت</Text>
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
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xl,
    minWidth: 280,
    ...SHADOWS.card,
  },
  logoCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: COLORS.primaryLight + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  brandEn: {
    ...FONTS.h1,
    color: COLORS.primary,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  brandAr: {
    marginTop: SPACING.xs,
    fontSize: 24,
    color: COLORS.primary,
    fontWeight: '700',
  },
});
