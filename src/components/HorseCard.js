import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  FlatList,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../config/theme';
import { useLanguage } from '../contexts/LanguageContext';
import { calculateHorseTrustScore } from '../utils/trustScore';
import { resolveMediaUrl } from '../config/api';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - SPACING.md * 2;
const IMAGE_HEIGHT = 220;

export default function HorseCard({ horse, onPress, onFavorite, isFavorited }) {
  const langContext = useLanguage?.() || {};
  const t = langContext.t || ((k) => k);
  const isRTL = !!langContext.isRTL;

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const heartScale = useRef(new Animated.Value(1)).current;
  const imageListRef = useRef(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const trust = useMemo(() => calculateHorseTrustScore(horse), [horse]);
  const images = useMemo(() => {
    if (Array.isArray(horse?.images) && horse.images.length > 0) {
      return horse.images.map((img) => resolveMediaUrl(img?.image_url)).filter(Boolean);
    }
    if (horse?.image_url) {
      const resolved = resolveMediaUrl(horse.image_url);
      return resolved ? [resolved] : [];
    }
    return [];
  }, [horse]);

  useEffect(() => {
    setActiveImageIndex(0);
    if (imageListRef.current) {
      imageListRef.current.scrollToOffset({ offset: 0, animated: false });
    }
  }, [horse?.id]);

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

  const displayPrice =
    horse?.discount_price != null ? horse.discount_price : horse?.price;
  const hasDiscount = horse?.discount_price != null && horse.discount_price < horse.price;
  const hasVideo = Boolean(horse?.video_url || horse?.has_video);
  const statusLabel =
    horse?.status === 'pending_review'
      ? t('pending')
      : horse?.status === 'rejected'
      ? t('rejected')
      : horse?.status === 'sold'
      ? t('sold')
      : horse?.status;

  const handleQuickInquiry = (e) => {
    e?.stopPropagation?.();
    const isArabic = isRTL;
    const horseTitle = horse?.title || 'Horse Listing';
    const priceStr = displayPrice != null ? `${displayPrice.toLocaleString()} AED` : '';
    const text = isArabic
      ? `مرحباً وسيط ستيد ماركت، أود الاستفسار مباشرة عن الخيل "${horseTitle}" ${priceStr ? `(السعر: ${priceStr})` : ''}`
      : `Hello SteedMarket Concierge, I would like to inquire directly about "${horseTitle}" ${priceStr ? `(Price: ${priceStr})` : ''}`;
    try {
      const res = Linking.openURL(`https://wa.me/971500000000?text=${encodeURIComponent(text)}`);
      if (res && typeof res.catch === 'function') {
        res.catch(() => {});
      }
    } catch (err) {}
  };

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
      <View style={styles.touchable}>
        <View style={styles.imageContainer}>
          {images.length > 0 ? (
            <>
              <FlatList
                ref={imageListRef}
                data={images}
                horizontal
                pagingEnabled
                bounces={false}
                showsHorizontalScrollIndicator={false}
                keyExtractor={(_, index) => `${horse?.id || 'horse'}-${index}`}
                onMomentumScrollEnd={(e) => {
                  const index = Math.round(e.nativeEvent.contentOffset.x / CARD_WIDTH);
                  setActiveImageIndex(index);
                }}
                renderItem={({ item }) => <Image source={{ uri: item }} style={styles.image} />}
              />
              {images.length > 1 && (
                <View style={styles.pagination}>
                  {images.map((_, index) => (
                    <View
                      key={`${horse?.id || 'horse'}-dot-${index}`}
                      style={[
                        styles.paginationDot,
                        index === activeImageIndex && styles.paginationDotActive,
                      ]}
                    />
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="image-outline" size={48} color={COLORS.textLight} />
            </View>
          )}

          {/* Top Badges Row: Status & Vet Checked */}
          <View
            style={[
              styles.topBadgesRow,
              isRTL
                ? { right: SPACING.sm, left: undefined, flexDirection: 'row-reverse' }
                : { left: SPACING.sm },
            ]}
          >
            {horse?.status && horse.status !== 'approved' && (
              <View
                style={[
                  styles.statusBadge,
                  horse.status === 'rejected' && styles.rejectedBadge,
                  horse.status === 'sold' && styles.soldBadge,
                ]}
              >
                <Text style={styles.statusText}>{statusLabel}</Text>
              </View>
            )}

            {horse?.vet_check_available && (
              <View style={[styles.vetBadge, isRTL && styles.rowRTL]}>
                <View style={styles.vetPulseDot} />
                <Ionicons name="shield-checkmark" size={12} color={COLORS.vetVerifiedText} />
                <Text style={styles.vetBadgeText}>{t('vetChecked')}</Text>
              </View>
            )}
          </View>

          {/* Top Right/Left: Favorite & Video indicator */}
          <View
            style={[
              styles.topRightRow,
              isRTL
                ? { left: SPACING.sm, right: undefined, flexDirection: 'row-reverse' }
                : { right: SPACING.sm },
            ]}
          >
            {hasVideo && (
              <View style={[styles.videoBadge, isRTL && styles.rowRTL]}>
                <Ionicons name="play" size={10} color={COLORS.white} />
                <Text style={styles.videoBadgeText}>{t('hasVideo')}</Text>
              </View>
            )}

            <TouchableOpacity
              testID="horse-card-favorite-btn"
              style={styles.favoriteBtn}
              onPress={handleFavorite}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Favorite"
            >
              <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                <Ionicons
                  name={isFavorited ? 'heart' : 'heart-outline'}
                  size={22}
                  color={isFavorited ? COLORS.favorite : COLORS.white}
                />
              </Animated.View>
            </TouchableOpacity>
          </View>

          {/* Price Container */}
          <View
            style={[
              styles.priceContainer,
              isRTL
                ? { right: SPACING.sm, left: undefined, flexDirection: 'row-reverse' }
                : { left: SPACING.sm },
            ]}
          >
            {hasDiscount && (
              <Text style={styles.originalPrice}>
                {horse?.price?.toLocaleString()} {t('currencyAed')}
              </Text>
            )}
            <Text style={styles.price}>
              {displayPrice != null
                ? `${displayPrice.toLocaleString()} ${t('currencyAed')}`
                : t('poa')}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.95}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={() => onPress?.(horse)}
        >
          <View style={styles.details}>
            <View style={[styles.trustRow, isRTL && styles.rowRTL]}>
              <View style={[styles.trustLeftGroup, isRTL && styles.rowRTL]}>
                <Text style={[styles.trustLabel, isRTL && styles.textRTL]}>{t('trustScore')}</Text>
                <View style={[styles.trustBadge, { borderColor: trust.color }]}>
                  <Text style={[styles.trustBadgeText, { color: trust.color }]}>
                    {trust.score}% {t(trust.labelKey)}
                  </Text>
                </View>
              </View>

              {horse?.owner?.is_verified && (
                <View style={[styles.verifiedSellerChip, isRTL && styles.rowRTL]}>
                  <Ionicons name="checkmark-circle" size={13} color={COLORS.success} />
                  <Text style={styles.verifiedSellerText}>{t('verifiedSellerBadge')}</Text>
                </View>
              )}
            </View>

            <Text style={[styles.title, isRTL && styles.textRTL]} numberOfLines={2}>
              {horse?.title}
            </Text>

            {/* Pedigree Teaser */}
            {(horse?.sire || horse?.dam) && (
              <View style={[styles.pedigreeRow, isRTL && styles.rowRTL]}>
                <Ionicons name="git-branch-outline" size={13} color={COLORS.accentDark} />
                <Text style={[styles.pedigreeText, isRTL && styles.textRTL]} numberOfLines={1}>
                  {horse?.sire ? `${t('sire')}: ${horse.sire}` : ''}
                  {horse?.sire && horse?.dam ? ' • ' : ''}
                  {horse?.dam ? `${t('dam')}: ${horse.dam}` : ''}
                </Text>
              </View>
            )}

            {horse?.status === 'rejected' && !!horse?.rejection_reason && (
              <View style={styles.rejectionReasonBox}>
                <Text style={[styles.rejectionReasonLabel, isRTL && styles.textRTL]}>
                  {t('rejectionReason')}
                </Text>
                <Text style={[styles.rejectionReasonText, isRTL && styles.textRTL]} numberOfLines={2}>
                  {horse.rejection_reason}
                </Text>
              </View>
            )}

            <View style={[styles.statsRow, isRTL && styles.rowRTL]}>
              {horse?.age != null && (
                <View style={[styles.stat, isRTL && styles.rowRTL]}>
                  <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
                  <Text style={[styles.statText, isRTL && styles.textRTL]}>
                    {horse.age} {t('yrs')}
                  </Text>
                </View>
              )}
              {horse?.height != null && (
                <View style={[styles.stat, isRTL && styles.rowRTL]}>
                  <Ionicons name="resize-outline" size={14} color={COLORS.textSecondary} />
                  <Text style={[styles.statText, isRTL && styles.textRTL]}>
                    {horse.height}{t('hh')}
                  </Text>
                </View>
              )}
              {horse?.gender && (
                <View style={[styles.stat, isRTL && styles.rowRTL]}>
                  <Ionicons
                    name={horse.gender === 'mare' ? 'female' : 'male'}
                    size={14}
                    color={COLORS.textSecondary}
                  />
                  <Text style={[styles.statText, isRTL && styles.textRTL]}>
                    {horse.gender === 'mare'
                      ? t('genderMare')
                      : horse.gender === 'gelding'
                      ? t('genderGelding')
                      : t('genderStallion')}
                  </Text>
                </View>
              )}
            </View>

            {/* Footer with Tags and 1-Tap WhatsApp Concierge Inquiry Button */}
            <View style={[styles.cardFooterRow, isRTL && styles.rowRTL]}>
              <View style={[styles.tagsRow, isRTL && styles.rowRTL, { flex: 1 }]}>
                {horse?.breed && (
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>{horse.breed}</Text>
                  </View>
                )}
                {horse?.discipline && (
                  <View style={[styles.tag, styles.disciplineTag]}>
                    <Text style={[styles.tagText, styles.disciplineTagText]}>{horse.discipline}</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                testID="horse-card-quick-inquiry-btn"
                style={[styles.quickInquiryBtn, isRTL && styles.rowRTL]}
                onPress={handleQuickInquiry}
                activeOpacity={0.8}
                accessibilityLabel="Quick WhatsApp Inquiry"
              >
                <Ionicons name="logo-whatsapp" size={13} color="#25D366" />
                <Text style={styles.quickInquiryText}>
                  {isRTL ? 'استفسار سريع' : 'Quick Inquiry'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </View>
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
    width: CARD_WIDTH,
    height: '100%',
    resizeMode: 'cover',
  },
  pagination: {
    position: 'absolute',
    bottom: SPACING.sm,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  paginationDotActive: {
    width: 14,
    backgroundColor: COLORS.white,
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
  topBadgesRow: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  topRightRow: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  videoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 56, 38, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  videoBadgeText: {
    ...FONTS.caption,
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
  },
  vetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.vetVerifiedBadge,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(21, 128, 61, 0.25)',
  },
  vetBadgeText: {
    ...FONTS.caption,
    color: COLORS.vetVerifiedText,
    fontSize: 10,
    fontWeight: '700',
  },
  favoriteBtn: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: RADIUS.full,
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    backgroundColor: COLORS.warning,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
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
    fontWeight: '700',
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
  trustLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
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
  verifiedSellerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.successLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  verifiedSellerText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.success,
  },
  title: {
    ...FONTS.h3,
    color: COLORS.text,
    marginTop: 2,
    marginBottom: 4,
    lineHeight: 22,
  },
  pedigreeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: SPACING.sm,
  },
  pedigreeText: {
    fontSize: 12,
    color: COLORS.accentDark,
    fontStyle: 'italic',
    fontWeight: '600',
    flex: 1,
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
    fontWeight: '500',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  tag: {
    backgroundColor: COLORS.primaryLight + '10',
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.primaryLight + '20',
  },
  tagText: {
    ...FONTS.caption,
    color: COLORS.primary,
    fontSize: 11,
    textTransform: 'capitalize',
    fontWeight: '600',
  },
  disciplineTag: {
    backgroundColor: COLORS.badge,
    borderColor: COLORS.accentLight,
  },
  disciplineTagText: {
    color: COLORS.badgeText,
    fontWeight: '700',
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.xs,
    marginTop: 2,
  },
  quickInquiryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#25D366' + '15',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: '#25D366' + '40',
  },
  quickInquiryText: {
    ...FONTS.caption,
    color: '#128C7E',
    fontWeight: '700',
    fontSize: 10,
  },
  vetPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 2,
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  textRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});

