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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../config/theme';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import * as apiService from '../services/api';
import { calculateHorseTrustScore } from '../utils/trustScore';
import { extractApiErrorMessage } from '../utils/apiErrors';
import { useToast } from '../components/ToastProvider';
import SellerInfoCard from '../components/SellerInfoCard';
import { toTelephoneNumber, toWhatsAppNumber } from '../utils/phoneNumbers';
import { resolveMediaUrl } from '../config/api';


const { width } = Dimensions.get('window');
const IMAGE_HEIGHT = 320;

export default function HorseDetailScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, user } = useAuth();
  const { t, isRTL } = useLanguage();
  const toast = useToast();
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
  const [reopening, setReopening] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const heartScale = useRef(new Animated.Value(1)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  const images = horse?.images?.length
    ? horse.images.map((img) => resolveMediaUrl(img?.image_url)).filter(Boolean)
    : horse?.image_url
    ? [resolveMediaUrl(horse.image_url)].filter(Boolean)
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
        toast.show(t('certificateOpenFailed'), { type: 'error' });
        return;
      }
      await Linking.openURL(url);
    } catch {
      toast.show(t('certificateOpenFailed'), { type: 'error' });
    }
  };

  const getSellerPhone = () =>
    horse.owner?.phone_number || horse.owner?.profile?.phone_number;

  const handleCallSeller = () => {
    if (isSold || isDeleted) {
      Alert.alert(unavailableTitle, unavailableMessage);
      return;
    }

    const phone = getSellerPhone();
    if (phone) {
      Linking.openURL(`tel:${toTelephoneNumber(phone)}`);
    } else {
      Alert.alert(t('error'), isRTL ? 'رقم الهاتف غير متوفر.' : 'Phone number not available.');
    }
  };

  const handleWhatsAppSeller = () => {
    if (isSold || isDeleted) {
      Alert.alert(unavailableTitle, unavailableMessage);
      return;
    }

    const phone = getSellerPhone();
    if (phone) {
      const cleanPhone = toWhatsAppNumber(phone);
      const message = isRTL
        ? `مرحباً، أود الاستفسار عن إعلانك: ${horse.title}`
        : `Hello, I am inquiring about your listing: ${horse.title}`;
      Linking.openURL(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`);
    } else {
      Alert.alert(t('error'), isRTL ? 'رقم الهاتف غير متوفر.' : 'Phone number not available.');
    }
  };

  const handleEmailSeller = () => {
    if (isSold || isDeleted) {
      Alert.alert(unavailableTitle, unavailableMessage);
      return;
    }

    const email = horse.owner?.email;
    if (email) {
      Linking.openURL(`mailto:${email}?subject=${encodeURIComponent(horse.title)}`);
    } else {
      Alert.alert(t('error'), t('sellerInfoUnavailable'));
    }
  };

  const handleReopenListing = async () => {
    if (!canReopen || reopening) return;
    setReopening(true);
    try {
      await apiService.reopenHorseListing(horse.id);
      toast.show(t('listingReopened'), { type: 'success' });
      navigation.goBack();
    } catch (error) {
      toast.show(extractApiErrorMessage(error, t('listingReopenFailed')), { type: 'error' });
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
                toast.show(t('listingDeleted'), { type: 'success' });
                navigation.goBack();
              } catch (error) {
              toast.show(extractApiErrorMessage(error, t('listingDeleteFailed')), { type: 'error' });
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
      toast.show(t('listingRestored'), { type: 'success' });
    } catch (error) {
      toast.show(extractApiErrorMessage(error, t('listingRestoreFailed')), { type: 'error' });
    } finally {
      setRestoring(false);
    }
  };

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
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
        ]}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color={COLORS.white} />
      </TouchableOpacity>

      {/* Share Button */}
      <TouchableOpacity
        style={[
          styles.shareButton,
          { top: insets.top + SPACING.sm },
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
        contentContainerStyle={styles.scrollContent}
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
            {horse.location_text && (
              <View style={[styles.locationRow, isRTL && styles.rowRTL]}>
                <Ionicons name="location-outline" size={18} color={COLORS.primary} />
                <Text style={[styles.locationRowText, isRTL && styles.textRTL]}>{horse.location_text}</Text>
              </View>
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

          <SellerInfoCard
            seller={horse.owner}
            isRTL={isRTL}
            t={t}
            onEmailPress={handleEmailSeller}
          />

        </View>
      </Animated.ScrollView>

      {/* Bottom Action Bar */}
      <View testID="horse-detail-footer" style={styles.bottomBar}>
        <TouchableOpacity
          testID="horse-call-seller-button"
          style={[styles.actionBtn, styles.callBtn, (isSold || isDeleted) && styles.disabledActionBtn]}
          onPress={handleCallSeller}
        >
          <Ionicons name="call" size={20} color="#ffffff" />
          <Text style={styles.actionBtnText}>{t('callSeller')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID="horse-whatsapp-seller-button"
          style={[styles.actionBtn, styles.whatsappBtn, (isSold || isDeleted) && styles.disabledActionBtn]}
          onPress={handleWhatsAppSeller}
        >
          <Ionicons name="logo-whatsapp" size={20} color="#ffffff" />
          <Text style={styles.actionBtnText}>{t('whatsapp')}</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
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
  scrollContent: {
    paddingBottom: 90,
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
  locationRow: {
    marginTop: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  locationRowText: {
    ...FONTS.bodySmall,
    color: COLORS.textSecondary,
    flex: 1,
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
  ownerEmailAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  ownerEmailText: {
    ...FONTS.bodySmall,
    color: COLORS.primary,
    flex: 1,
    textAlign: 'left',
    writingDirection: 'ltr',
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
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    elevation: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginHorizontal: 6,
  },
  callBtn: {
    backgroundColor: '#2563eb',
  },
  whatsappBtn: {
    backgroundColor: '#16a34a',
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    marginLeft: 8,
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
    gap: SPACING.xs,
    width: '100%',
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  textRTL: {
    textAlign: 'right',
  },
});

