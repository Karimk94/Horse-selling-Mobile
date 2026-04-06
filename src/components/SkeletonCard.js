import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { COLORS, SPACING, RADIUS } from '../config/theme';

export default function SkeletonCard() {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    );
    shimmer.start();
    return () => shimmer.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });

  return (
    <View style={styles.container}>
      {/* Skeleton Image */}
      <Animated.View style={[styles.image, { opacity }]} />

      {/* Skeleton Content */}
      <View style={styles.content}>
        <Animated.View style={[styles.title, { opacity }]} />
        <Animated.View style={[styles.subtitle, { opacity }]} />
        <View style={styles.infoRow}>
          <Animated.View style={[styles.badge, { opacity }]} />
          <Animated.View style={[styles.price, { opacity }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.sm,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    ...require('../config/theme').SHADOWS.md,
  },
  image: {
    width: '100%',
    height: 220,
    backgroundColor: COLORS.skeleton,
  },
  content: {
    padding: SPACING.md,
  },
  title: {
    height: 18,
    backgroundColor: COLORS.skeleton,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.sm,
    width: '70%',
  },
  subtitle: {
    height: 14,
    backgroundColor: COLORS.skeleton,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.md,
    width: '40%',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  badge: {
    height: 28,
    width: '30%',
    backgroundColor: COLORS.skeleton,
    borderRadius: RADIUS.full,
  },
  price: {
    height: 20,
    width: '25%',
    backgroundColor: COLORS.skeleton,
    borderRadius: RADIUS.sm,
  },
});
