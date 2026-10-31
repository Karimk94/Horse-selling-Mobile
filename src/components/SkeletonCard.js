import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../config/theme';
import { useLanguage } from '../contexts/LanguageContext';

export default function SkeletonCard({ style, compact = false, isRTL: propIsRTL }) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  let langIsRTL = false;
  try {
    const lang = useLanguage();
    langIsRTL = !!lang?.isRTL;
  } catch (e) {}
  const isRTL = propIsRTL !== undefined ? propIsRTL : langIsRTL;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    shimmer.start();
    return () => shimmer.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.45, 0.9],
  });

  return (
    <View
      testID="skeleton-card"
      style={[
        styles.container,
        compact && styles.compactContainer,
        style,
      ]}
    >
      {/* Skeleton Media Image */}
      <View style={styles.imageContainer}>
        <Animated.View
          style={[styles.image, compact && styles.compactImage, { opacity }]}
        />
        {/* Floating VIP Badges */}
        <View style={[styles.floatingBadgesRow, isRTL && styles.rowRTL]}>
          <Animated.View
            testID="skeleton-badge-status"
            style={[styles.floatingBadge, { opacity }]}
          />
          <Animated.View
            testID="skeleton-badge-vet"
            style={[styles.floatingVetBadge, { opacity }]}
          />
        </View>
      </View>

      {/* Skeleton Content */}
      <View style={[styles.content, isRTL && styles.contentRTL]}>
        {/* Title Bar */}
        <Animated.View
          style={[
            styles.title,
            isRTL && styles.alignRight,
            { opacity },
          ]}
        />

        {/* Subtitle / Breed */}
        <Animated.View
          style={[
            styles.subtitle,
            isRTL && styles.alignRight,
            { opacity },
          ]}
        />

        {/* Chips / Pills Row */}
        <View style={[styles.chipsRow, isRTL && styles.rowRTL]}>
          <Animated.View style={[styles.chip, { opacity }]} />
          <Animated.View style={[styles.chipSmall, { opacity }]} />
        </View>

        {/* Price & Location Bottom Row */}
        <View style={[styles.bottomRow, isRTL && styles.rowRTL]}>
          <Animated.View style={[styles.pricePill, { opacity }]} />
          <Animated.View style={[styles.locationPill, { opacity }]} />
        </View>
      </View>
    </View>
  );
}

const WARM_SHIMMER = '#EAE5DC';

const styles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EFE7DA',
    ...SHADOWS.card,
  },
  compactContainer: {
    marginHorizontal: 0,
    marginVertical: SPACING.xs,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
  },
  image: {
    width: '100%',
    height: 200,
    backgroundColor: WARM_SHIMMER,
  },
  compactImage: {
    height: 140,
  },
  floatingBadgesRow: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    right: SPACING.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  floatingBadge: {
    width: 72,
    height: 22,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
  },
  floatingVetBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
  },
  content: {
    padding: SPACING.md,
  },
  contentRTL: {
    alignItems: 'flex-end',
  },
  title: {
    height: 18,
    backgroundColor: WARM_SHIMMER,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.sm,
    width: '75%',
  },
  subtitle: {
    height: 14,
    backgroundColor: WARM_SHIMMER,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.md,
    width: '45%',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  chip: {
    height: 20,
    width: 68,
    borderRadius: RADIUS.full,
    backgroundColor: WARM_SHIMMER,
  },
  chipSmall: {
    height: 20,
    width: 48,
    borderRadius: RADIUS.full,
    backgroundColor: WARM_SHIMMER,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: '#F0ECE4',
    width: '100%',
  },
  pricePill: {
    height: 22,
    width: '35%',
    backgroundColor: WARM_SHIMMER,
    borderRadius: RADIUS.sm,
  },
  locationPill: {
    height: 14,
    width: '30%',
    backgroundColor: WARM_SHIMMER,
    borderRadius: RADIUS.sm,
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  alignRight: {
    alignSelf: 'flex-end',
  },
});
