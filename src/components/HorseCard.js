import React, { useMemo, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../config/theme';
import { useLanguage } from '../contexts/LanguageContext';
import { calculateHorseTrustScore } from '../utils/trustScore';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - SPACING.md * 2;
const IMAGE_HEIGHT = 220;

export default function HorseCard({ horse, onPress, onFavorite, isFavorited }) {
  const { t } = useLanguage();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const heartScale = useRef(new Animated.Value(1)).current;
  const trust = useMemo(() => calculateHorseTrustScore(horse), [horse]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handleFavorite = () => {
    Animated.sequence([
      Animated.spring(heartScale, {
        toValue: 1.4,
        useNativeDriver: true,
        speed: 50,
        bounciness: 12,
      }),
      Animated.spring(heartScale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 50,
        bounciness: 8,
      }),
    ]).start();
    onFavorite?.(horse);
  };

  const imageUrl = horse.images?.[0]?.image_url || horse.image_url;
  const displayPrice =
    horse.discount_price != null ? horse.discount_price : horse.price;
  const hasDiscount = horse.discount_price != null && horse.discount_price < horse.price;
  const statusLabel =
    horse.status === 'pending_review'
      ? t('pending')
      : horse.status === 'rejected'
      ? t('rejected')
      : horse.status === 'sold'
      ? t('sold')
      : horse.status;

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        activeOpacity={0.95}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => onPress?.(horse)}
        style={styles.touchable}
      >
        <View style={styles.imageContainer}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.image} />
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="image-outline" size={48} color={COLORS.textLight} />
            </View>
          )}

          {/* Price Badge */}
          <View style={styles.priceContainer}>
            {hasDiscount && (
              <Text style={styles.originalPrice}>
                ${horse.price?.toLocaleString()}
              </Text>
            )}
            <Text style={styles.price}>
              ${displayPrice?.toLocaleString() ?? t('poa')}
            </Text>
          </View>

          {/* Favorite Button */}
          <TouchableOpacity
            style={styles.favoriteBtn}
            onPress={handleFavorite}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Animated.View style={{ transform: [{ scale: heartScale }] }}>
              <Ionicons
                name={isFavorited ? 'heart' : 'heart-outline'}
                size={24}
                color={isFavorited ? COLORS.favorite : COLORS.white}
              />
            </Animated.View>
          </TouchableOpacity>

          {/* Status Badge */}
          {horse.status && horse.status !== 'approved' && (
            <View
              style={[
                styles.statusBadge,
                horse.status === 'rejected' && styles.rejectedBadge,
                horse.status === 'sold' && styles.soldBadge,
              ]}
            >
              <Text style={styles.statusText}>
                {statusLabel}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.details}>
          <View style={styles.trustRow}>
            <Text style={styles.trustLabel}>{t('trustScore')}</Text>
            <View style={[styles.trustBadge, { borderColor: trust.color }]}> 
              <Text style={[styles.trustBadgeText, { color: trust.color }]}>
                {trust.score}% {t(trust.labelKey)}
              </Text>
            </View>
          </View>
          <Text style={styles.title} numberOfLines={2}>
            {horse.title}
          </Text>

          {horse.status === 'rejected' && !!horse.rejection_reason && (
            <View style={styles.rejectionReasonBox}>
              <Text style={styles.rejectionReasonLabel}>{t('rejectionReason')}</Text>
              <Text style={styles.rejectionReasonText} numberOfLines={2}>
                {horse.rejection_reason}
              </Text>
            </View>
          )}

          <View style={styles.statsRow}>
            {horse.age != null && (
              <View style={styles.stat}>
                <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
                <Text style={styles.statText}>{horse.age} {t('yrs')}</Text>
              </View>
            )}
            {horse.height != null && (
              <View style={styles.stat}>
                <Ionicons name="resize-outline" size={14} color={COLORS.textSecondary} />
                <Text style={styles.statText}>{horse.height}{t('hh')}</Text>
              </View>
            )}
            {horse.gender && (
              <View style={styles.stat}>
                <Ionicons
                  name={horse.gender === 'mare' ? 'female' : 'male'}
                  size={14}
                  color={COLORS.textSecondary}
                />
                <Text style={styles.statText}>
                  {horse.gender === 'mare' ? t('genderMare') : horse.gender === 'gelding' ? t('genderGelding') : t('genderStallion')}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.tagsRow}>
            {horse.breed && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>{horse.breed}</Text>
              </View>
            )}
            {horse.discipline && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>{horse.discipline}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.card,
    ...SHADOWS.card,
    overflow: 'hidden',
  },
  touchable: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: IMAGE_HEIGHT,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceContainer: {
    position: 'absolute',
    bottom: SPACING.sm,
    left: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  price: {
    ...FONTS.priceSm,
    color: COLORS.white,
  },
  originalPrice: {
    ...FONTS.bodySmall,
    color: COLORS.accentLight,
    textDecorationLine: 'line-through',
  },
  favoriteBtn: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: RADIUS.full,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    backgroundColor: COLORS.warning,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  rejectedBadge: {
    backgroundColor: COLORS.error,
  },
  soldBadge: {
    backgroundColor: '#3E4B5B',
  },
  statusText: {
    ...FONTS.caption,
    color: COLORS.white,
    fontSize: 10,
  },
  details: {
    padding: SPACING.md,
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  trustLabel: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  trustBadge: {
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    backgroundColor: COLORS.white,
  },
  trustBadgeText: {
    ...FONTS.caption,
    fontWeight: '700',
    fontSize: 10,
  },
  title: {
    ...FONTS.h3,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  rejectionReasonBox: {
    backgroundColor: COLORS.error + '10',
    borderWidth: 1,
    borderColor: COLORS.error + '30',
    borderRadius: RADIUS.sm,
    padding: SPACING.xs + 2,
    marginBottom: SPACING.sm,
  },
  rejectionReasonLabel: {
    ...FONTS.caption,
    color: COLORS.error,
    fontWeight: '700',
    marginBottom: 2,
  },
  rejectionReasonText: {
    ...FONTS.bodySmall,
    color: COLORS.text,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  statText: {
    ...FONTS.bodySmall,
    color: COLORS.textSecondary,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  tag: {
    backgroundColor: COLORS.borderLight,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  tagText: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    fontSize: 11,
    textTransform: 'capitalize',
  },
});
