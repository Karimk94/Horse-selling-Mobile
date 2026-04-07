import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Animated,
  StatusBar,
  FlatList,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../config/theme';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import * as apiService from '../services/api';
import { calculateHorseTrustScore } from '../utils/trustScore';
import OfferHistorySheet from '../components/OfferHistorySheet';
import { extractApiErrorMessage } from '../utils/apiErrors';

const { width } = Dimensions.get('window');
const IMAGE_HEIGHT = 320;

export default function HorseDetailScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, user } = useAuth();
  const { t, isRTL } = useLanguage();
  const initialHorse = route?.params?.horse || null;
  const fallbackHorseId =
    initialHorse?.id ||
    route?.params?.horse_id ||
    route?.params?.horseId ||
    route?.params?.id ||
    route?.params?.listing_id ||
    null;
  const [horse, setHorse] = useState(initialHorse);
  const [isFav, setIsFav] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showOffersSheet, setShowOffersSheet] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const heartScale = useRef(new Animated.Value(1)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  const images = horse?.images?.length
    ? horse.images.map((img) => img.image_url)
    : horse?.image_url
    ? [horse.image_url]
    : [];

  // Re-fetch fresh data whenever this screen is focused
  useFocusEffect(
    useCallback(() => {
      const targetHorseId = horse?.id || fallbackHorseId;
      if (!targetHorseId) {
        return () => {};
      }

      apiService
        .getHorse(targetHorseId)
        .then((res) => setHorse(res.data))
        .catch(() => {});
    }, [horse?.id, fallbackHorseId])
  );

  // Check favorite status on mount
  React.useEffect(() => {
    const targetHorseId = horse?.id || fallbackHorseId;
    if (isAuthenticated && targetHorseId) {
      apiService
        .isFavorite(targetHorseId)
        .then((res) => setIsFav(res.data?.is_favorite ?? false))
        .catch(() => {});
    }
  }, [horse?.id, fallbackHorseId, isAuthenticated]);

  if (!horse) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const toggleFavorite = async () => {
    if (!isAuthenticated) {
      navigation.navigate('AuthStack');
      return;
    }
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

    const wasFav = isFav;
    setIsFav(!wasFav);
    try {
      wasFav
        ? await apiService.removeFavorite(horse.id)
        : await apiService.addFavorite(horse.id);
    } catch {
      setIsFav(wasFav);
    }
  };

  const displayPrice =
    horse.discount_price != null ? horse.discount_price : horse.price;
  const hasDiscount =
    horse.discount_price != null && horse.discount_price < horse.price;
  const isSold = horse.status === 'sold';
  const isDeleted = !!horse.deleted_at;
  const unavailableTitle = isSold ? t('sold') : t('error');
  const unavailableMessage = isDeleted ? t('listingUnavailable') : t('horseAlreadySold');
  const canManageListing = horse.owner?.id === user?.id || user?.role === 'admin';
  const canRestore = isDeleted && canManageListing;
  const canReopen = isSold && (horse.owner?.id === user?.id || user?.role === 'admin');
  const trust = calculateHorseTrustScore(horse);

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, IMAGE_HEIGHT - 100],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const getGenderLabel = (gender) => {
    if (!gender) return null;
    const map = {
      mare: t('genderMare'),
      gelding: t('genderGelding'),
      stallion: t('genderStallion'),
    };
    return map[gender] || (gender.charAt(0).toUpperCase() + gender.slice(1));
  };

  const DetailRow = ({ icon, label, value }) =>
    value ? (
      <View style={[styles.detailRow, isRTL && styles.rowRTL]}>
        <View style={styles.detailIcon}>
          <Ionicons name={icon} size={20} color={COLORS.primary} />
        </View>
        <View style={styles.detailTextWrap}>
          <Text style={[styles.detailLabel, isRTL && styles.textRTL]}>{label}</Text>
          <Text style={[styles.detailValue, isRTL && styles.textRTL]}>{value}</Text>
        </View>
      </View>
    ) : null;

  const openVetCertificate = async () => {
    const url = horse.vet_certificate_url;
    if (!url) return;
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert(t('error'), t('certificateOpenFailed'));
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert(t('error'), t('certificateOpenFailed'));
    }
  };

  const handleReopenListing = async () => {
    if (!canReopen || reopening) return;
    setReopening(true);
    try {
      await apiService.reopenHorseListing(horse.id);
      Alert.alert(t('success'), t('listingReopened'));
      navigation.goBack();
    } catch (error) {
      Alert.alert(t('error'), extractApiErrorMessage(error, t('listingReopenFailed')));
    } finally {
      setReopening(false);
    }
  };

  const handleDeleteListing = () => {
    if (!canManageListing || deleting) return;

    Alert.alert(
      t('deleteListing'),
      t('deleteListingConfirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('deleteListing'),
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await apiService.deleteHorse(horse.id);
              Alert.alert(t('success'), t('listingDeleted'));
              navigation.goBack();
            } catch (error) {
              Alert.alert(t('error'), extractApiErrorMessage(error, t('listingDeleteFailed')));
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleRestoreListing = async () => {
    if (!canRestore || restoring) return;

    setRestoring(true);
    try {
      const res = await apiService.restoreHorseListing(horse.id);
      setHorse(res.data);
      Alert.alert(t('success'), t('listingRestored'));
    } catch (error) {
      Alert.alert(t('error'), extractApiErrorMessage(error, t('listingRestoreFailed')));
    } finally {
      setRestoring(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Animated Header */}
      <Animated.View
        style={[
          styles.animatedHeader,
          { paddingTop: insets.top, opacity: headerOpacity },
        ]}
      >
        <Text style={[styles.animatedHeaderTitle, isRTL && styles.textRTL]} numberOfLines={1}>
          {horse.title}
        </Text>
      </Animated.View>

      {/* Back Button */}
      <TouchableOpacity
        style={[
          styles.backButton,
          { top: insets.top + SPACING.sm },
          isRTL ? styles.backButtonRTL : null,
        ]}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={COLORS.white} />
      </TouchableOpacity>

      {/* Share Button */}
      <TouchableOpacity
        style={[
          styles.shareButton,
          { top: insets.top + SPACING.sm },
          isRTL ? styles.shareButtonRTL : null,
        ]}
        onPress={toggleFavorite}
      >
        <Animated.View style={{ transform: [{ scale: heartScale }] }}>
          <Ionicons
            name={isFav ? 'heart' : 'heart-outline'}
            size={24}
            color={isFav ? COLORS.favorite : COLORS.white}
          />
        </Animated.View>
      </TouchableOpacity>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* Image Gallery */}
        <View style={styles.imageContainer}>
          {images.length > 0 ? (
            <>
              <FlatList
                data={images}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(_, i) => i.toString()}
                onMomentumScrollEnd={(e) => {
                  const idx = Math.round(e.nativeEvent.contentOffset.x / width);
                  setActiveImageIndex(idx);
                }}
                renderItem={({ item }) => (
                  <Image source={{ uri: item }} style={styles.heroImage} />
                )}
              />
              {images.length > 1 && (
                <View style={styles.pagination}>
                  {images.map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.paginationDot,
                        i === activeImageIndex && styles.paginationDotActive,
                      ]}
                    />
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="image-outline" size={64} color={COLORS.textLight} />
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Price & Title Card */}
          <View style={styles.mainCard}>
            <View style={styles.priceRow}>
              <View>
                <Text style={styles.price}>
                  ${displayPrice?.toLocaleString() ?? t('poa')}
                </Text>
                {hasDiscount && (
                  <Text style={styles.originalPrice}>
                    ${horse.price?.toLocaleString()}
                  </Text>
                )}
              </View>
              {hasDiscount && (
                <View style={styles.discountBadge}>
                  <Text style={styles.discountBadgeText}>
                    {horse.discount_type === 'percentage'
                      ? `${horse.discount_value}% ${t('off')}`
                      : t('sale')}
                  </Text>
                </View>
              )}
            </View>
            <View style={[styles.trustRow, isRTL && styles.rowRTL]}>
              <Text style={[styles.trustLabel, isRTL && styles.textRTL]}>{t('trustScore')}</Text>
              <View style={[styles.trustBadge, { borderColor: trust.color }]}>
                <Text style={[styles.trustBadgeText, { color: trust.color }]}>
                  {trust.score}% {t(trust.labelKey)}
                </Text>
              </View>
            </View>
            <Text style={[styles.title, isRTL && styles.textRTL]}>{horse.title}</Text>

            {isSold && (
              <View style={[styles.soldPill, isRTL && styles.rowRTL]}>
                <Ionicons name="checkmark-done-circle" size={16} color={COLORS.white} />
                <Text style={styles.soldPillText}>{t('sold')}</Text>
              </View>
            )}

            {/* Quick Stats */}
            <View style={[styles.quickStats, isRTL && styles.rowRTL]}>
              {horse.age != null && (
                <View style={styles.quickStat}>
                  <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
                  <Text style={[styles.quickStatText, isRTL && styles.textRTL]}>{horse.age} {t('yrs')}</Text>
                </View>
              )}
              {horse.height != null && (
                <View style={styles.quickStat}>
                  <Ionicons name="resize-outline" size={16} color={COLORS.primary} />
                  <Text style={[styles.quickStatText, isRTL && styles.textRTL]}>{horse.height}{t('hh')}</Text>
                </View>
              )}
              {horse.gender && (
                <View style={styles.quickStat}>
                  <Ionicons
                    name={horse.gender === 'mare' ? 'female' : 'male'}
                    size={16}
                    color={COLORS.primary}
                  />
                  <Text style={[styles.quickStatText, isRTL && styles.textRTL]}>{getGenderLabel(horse.gender)}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Details Card */}
          <View style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t('details')}</Text>
            <DetailRow icon="ribbon-outline" label={t('breed')} value={horse.breed} />
            <DetailRow
              icon="trophy-outline"
              label={t('discipline')}
              value={horse.discipline}
            />
            <DetailRow
              icon="calendar-outline"
              label={t('age')}
              value={horse.age != null ? `${horse.age} ${t('yrs')}` : null}
            />
            <DetailRow
              icon="resize-outline"
              label={t('height')}
              value={horse.height != null ? `${horse.height}${t('hh')}` : null}
            />
            <DetailRow
              icon={horse.gender === 'mare' ? 'female' : 'male'}
              label={t('gender')}
              value={getGenderLabel(horse.gender)}
            />
            {horse.vet_check_available && (
              <View style={[styles.vetBadge, isRTL && styles.rowRTL]}>
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={COLORS.success}
                />
                <Text style={[styles.vetBadgeText, isRTL && styles.textRTL]}>{t('vetCheck')}</Text>
              </View>
            )}
            {horse.vet_certificate_url && (
              <TouchableOpacity style={[styles.certificateLinkBtn, isRTL && styles.rowRTL]} onPress={openVetCertificate}>
                <Ionicons name="document-text-outline" size={18} color={COLORS.primary} />
                <Text style={[styles.certificateLinkText, isRTL && styles.textRTL]}>{t('viewVetCertificate')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {horse.status === 'rejected' && !!horse.rejection_reason && (
            <View style={[styles.rejectionCard, isRTL && styles.rejectionCardRTL]}>
              <View style={[styles.rejectionHeader, isRTL && styles.rowRTL]}>
                <Ionicons name="warning-outline" size={18} color={COLORS.error} />
                <Text style={[styles.rejectionTitle, isRTL && styles.textRTL]}>{t('rejectionReason')}</Text>
              </View>
              <Text style={[styles.rejectionText, isRTL && styles.textRTL]}>{horse.rejection_reason}</Text>
            </View>
          )}

          {canReopen && (
            <View style={styles.sectionCard}>
              <TouchableOpacity
                style={[styles.reopenBtn, isRTL && styles.rowRTL]}
                onPress={handleReopenListing}
                disabled={reopening}
              >
                {reopening ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Ionicons name="refresh-circle-outline" size={18} color={COLORS.white} />
                    <Text style={styles.reopenBtnText}>{t('reopenListing')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {canRestore && (
            <View style={styles.sectionCard}>
              <TouchableOpacity
                style={[styles.reopenBtn, isRTL && styles.rowRTL, restoring && styles.disabledActionBtn]}
                onPress={handleRestoreListing}
                disabled={restoring}
              >
                {restoring ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Ionicons name="return-up-back-outline" size={18} color={COLORS.white} />
                    <Text style={styles.reopenBtnText}>{t('restoreListing')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {canManageListing && (
            <View style={styles.sectionCard}>
              <TouchableOpacity
                style={[styles.deleteBtn, isRTL && styles.rowRTL, deleting && styles.disabledActionBtn]}
                onPress={handleDeleteListing}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={18} color={COLORS.white} />
                    <Text style={styles.deleteBtnText}>{t('deleteListing')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Description Card */}
          {horse.description && (
            <View style={styles.sectionCard}>
              <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t('description')}</Text>
              <Text style={[styles.description, isRTL && styles.textRTL]}>{horse.description}</Text>
            </View>
          )}

          {/* Owner Card */}
          {horse.owner && (
            <View style={styles.sectionCard}>
              <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t('aboutSeller')}</Text>
              <View style={[styles.ownerRow, isRTL && styles.rowRTL]}>
                <View style={styles.ownerAvatar}>
                  <Text style={styles.ownerInitial}>
                    {(
                      horse.owner.profile?.first_name?.[0] ||
                      horse.owner.email?.[0] ||
                      '?'
                    ).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.ownerInfo}>
                  <View style={[styles.ownerNameRow, isRTL && styles.rowRTL]}>
                    <Text style={[styles.ownerName, isRTL && styles.textRTL]}>
                      {horse.owner.profile?.first_name || t('userFallback')}{' '}
                      {horse.owner.profile?.last_name || ''}
                    </Text>
                    {horse.owner?.is_verified && (
                      <View style={[styles.ownerVerifiedBadge, isRTL && styles.rowRTL]}>
                        <Ionicons name="checkmark-circle" size={13} color={COLORS.success} />
                        <Text style={styles.ownerVerifiedText}>{t('verified')}</Text>
                      </View>
                    )}
                  </View>
                  {horse.owner.profile?.location && (
                    <View style={[styles.ownerLocation, isRTL && styles.rowRTL]}>
                      <Ionicons
                        name="location-outline"
                        size={14}
                        color={COLORS.textLight}
                      />
                      <Text style={[styles.ownerLocationText, isRTL && styles.textRTL]}>
                        {horse.owner.profile.location}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}

          <View style={{ height: 100 }} />
        </View>
      </Animated.ScrollView>

      {/* Bottom Action Bar */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: insets.bottom + SPACING.sm },
          isRTL && styles.bottomBarRTL,
        ]}
      >
        <View style={[styles.bottomBarPrice, isRTL && styles.bottomBarPriceRTL]}>
          <Text style={[styles.bottomBarPriceLabel, isRTL && styles.textRTL]}>{t('priceLabel')}</Text>
          <Text style={styles.bottomBarPriceValue}>
            ${displayPrice?.toLocaleString() ?? t('poa')}
          </Text>
        </View>
        <View style={[styles.actionButtonsWrap, isRTL && styles.actionButtonsWrapRTL]}>
          <TouchableOpacity
            style={[styles.offerBtn, isRTL && styles.offerBtnRTL, (isSold || isDeleted) && styles.disabledActionBtn]}
            onPress={() => ((isSold || isDeleted) ? Alert.alert(unavailableTitle, unavailableMessage) : setShowOffersSheet(true))}
          >
            <Ionicons name="pricetag-outline" size={18} color={COLORS.white} />
            <Text style={styles.offerBtnText}>{t('offers')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.contactBtn, isRTL && styles.contactBtnRTL, (isSold || isDeleted) && styles.disabledActionBtn]}
            onPress={() =>
              (isSold || isDeleted)
                ? Alert.alert(unavailableTitle, unavailableMessage)
                : Alert.alert(
                    t('contactSeller'),
                    horse.owner?.email
                      ? `${t('email')}: ${horse.owner.email}`
                      : t('sellerInfoUnavailable')
                  )
            }
          >
            <Ionicons name="chatbubble-outline" size={20} color={COLORS.white} />
            <Text style={styles.contactBtnText}>{t('contactSeller')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <OfferHistorySheet
        horseId={horse.id}
        isVisible={showOffersSheet}
        onClose={() => setShowOffersSheet(false)}
        userRole={horse.owner?.id === user?.id ? 'seller' : 'buyer'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  animatedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 60,
    paddingBottom: SPACING.md,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 'auto',
    minHeight: 90,
  },
  animatedHeaderTitle: {
    ...FONTS.h3,
    color: COLORS.white,
  },
  backButton: {
    position: 'absolute',
    left: SPACING.md,
    zIndex: 20,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonRTL: {
    left: 'auto',
    right: SPACING.md,
  },
  shareButton: {
    position: 'absolute',
    right: SPACING.md,
    zIndex: 20,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareButtonRTL: {
    right: 'auto',
    left: SPACING.md,
  },
  imageContainer: {
    width,
    height: IMAGE_HEIGHT,
    backgroundColor: COLORS.borderLight,
  },
  heroImage: {
    width,
    height: IMAGE_HEIGHT,
    resizeMode: 'cover',
  },
  placeholderImage: {
    width,
    height: IMAGE_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.borderLight,
  },
  pagination: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: SPACING.md,
    alignSelf: 'center',
    gap: SPACING.xs,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  paginationDotActive: {
    backgroundColor: COLORS.white,
    width: 20,
  },
  content: {
    marginTop: -RADIUS.xl,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    backgroundColor: COLORS.background,
    paddingTop: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  mainCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  price: {
    ...FONTS.price,
    color: COLORS.primary,
  },
  originalPrice: {
    ...FONTS.body,
    color: COLORS.textLight,
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  trustRow: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  discountBadge: {
    backgroundColor: COLORS.badge,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  discountBadgeText: {
    ...FONTS.caption,
    color: COLORS.badgeText,
    fontSize: 11,
  },
  soldPill: {
    marginTop: SPACING.xs,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: '#3E4B5B',
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  soldPillText: {
    ...FONTS.caption,
    color: COLORS.white,
    fontWeight: '700',
  },
  title: {
    ...FONTS.h2,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  quickStats: {
    flexDirection: 'row',
    gap: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  quickStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  quickStatText: {
    ...FONTS.body,
    color: COLORS.text,
    fontWeight: '500',
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  sectionTitle: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  detailTextWrap: {
    flex: 1,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight + '12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailLabel: {
    ...FONTS.bodySmall,
    color: COLORS.textLight,
  },
  detailValue: {
    ...FONTS.body,
    color: COLORS.text,
    fontWeight: '500',
  },
  vetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.success + '12',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    marginTop: SPACING.xs,
  },
  vetBadgeText: {
    ...FONTS.body,
    color: COLORS.success,
    fontWeight: '600',
  },
  certificateLinkBtn: {
    marginTop: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.primaryLight + '12',
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
  },
  certificateLinkText: {
    ...FONTS.bodySmall,
    color: COLORS.primary,
    fontWeight: '700',
  },
  description: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
  rejectionCard: {
    backgroundColor: COLORS.error + '10',
    borderWidth: 1,
    borderColor: COLORS.error + '30',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  rejectionCardRTL: {
    alignItems: 'flex-end',
  },
  rejectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  rejectionTitle: {
    ...FONTS.body,
    color: COLORS.error,
    fontWeight: '700',
  },
  rejectionText: {
    ...FONTS.bodySmall,
    color: COLORS.text,
    lineHeight: 20,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  ownerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryLight + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerInitial: {
    ...FONTS.h3,
    color: COLORS.primary,
  },
  ownerInfo: {
    flex: 1,
  },
  ownerName: {
    ...FONTS.body,
    color: COLORS.text,
    fontWeight: '600',
  },
  ownerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    flexWrap: 'wrap',
  },
  ownerVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.success + '12',
    paddingHorizontal: SPACING.xs + 2,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  ownerVerifiedText: {
    ...FONTS.caption,
    color: COLORS.success,
    fontWeight: '700',
    fontSize: 10,
  },
  ownerLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: 2,
  },
  ownerLocationText: {
    ...FONTS.bodySmall,
    color: COLORS.textLight,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    ...SHADOWS.tabBar,
  },
  bottomBarRTL: {
    flexDirection: 'row-reverse',
  },
  bottomBarPrice: {},
  bottomBarPriceRTL: {
    alignItems: 'flex-end',
  },
  bottomBarPriceLabel: {
    ...FONTS.bodySmall,
    color: COLORS.textLight,
  },
  bottomBarPriceValue: {
    ...FONTS.price,
    color: COLORS.primary,
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
  contactBtnRTL: {
    flexDirection: 'row-reverse',
  },
  contactBtnText: {
    ...FONTS.button,
    color: COLORS.white,
  },
  disabledActionBtn: {
    opacity: 0.55,
  },
  reopenBtn: {
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm + 2,
    gap: SPACING.xs,
    flexDirection: 'row',
  },
  reopenBtnText: {
    ...FONTS.button,
    color: COLORS.white,
  },
  deleteBtn: {
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm + 2,
    gap: SPACING.xs,
    flexDirection: 'row',
  },
  deleteBtnText: {
    ...FONTS.button,
    color: COLORS.white,
  },
  actionButtonsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  actionButtonsWrapRTL: {
    flexDirection: 'row-reverse',
  },
  offerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.secondary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
  offerBtnRTL: {
    flexDirection: 'row-reverse',
  },
  offerBtnText: {
    ...FONTS.button,
    color: COLORS.white,
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  textRTL: {
    textAlign: 'right',
  },
});

