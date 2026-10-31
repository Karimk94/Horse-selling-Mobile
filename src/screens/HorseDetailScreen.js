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
  Share,
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
import OfferHistorySheet from '../components/OfferHistorySheet';
import { toTelephoneNumber, toWhatsAppNumber } from '../utils/phoneNumbers';
import { resolveMediaUrl } from '../config/api';
import BrandMark from '../components/BrandMark';

const { width } = Dimensions.get('window');
const IMAGE_HEIGHT = 320;

export default function HorseDetailScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, user } = useAuth();
  const { t, isRTL, language } = useLanguage();
  const isArabic = language === 'ar' || isRTL;
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
  const [showOfferSheet, setShowOfferSheet] = useState(false);
  const [expandedPedigree, setExpandedPedigree] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const heartScale = useRef(new Animated.Value(1)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  const images = horse?.images?.length
    ? horse.images.map((img) => resolveMediaUrl(typeof img === 'string' ? img : img?.image_url)).filter(Boolean)
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

  const handleBrokerHotline = () => {
    const horseRef = `#SM-${String(horse.id).slice(0, 6).toUpperCase()}`;
    const priceText = horse.price ? `${Number(horse.price).toLocaleString()} ${t('currencyAed')}` : 'POA';
    const text = isArabic
      ? `مرحباً ستيد ماركت، أود استشارة وسيط خيل معتمد بخصوص الخيل "${horse.title}" (${horseRef}) بسعر (${priceText}). أود التنسيق للمعاينة أو الفحص البيطري أو حساب الضمان.`
      : `Hello SteedMarket Equine Broker, I would like certified consultation regarding "${horse.title}" (${horseRef}) listed at ${priceText}. I want to arrange a viewing, vet inspection, or escrow protection.`;
    const waUrl = `https://wa.me/971500000000?text=${encodeURIComponent(text)}`;
    try {
      const res = Linking.openURL(waUrl);
      if (res && typeof res.catch === 'function') {
        res.catch(() => {});
      }
    } catch (e) {}
  };

  const handleCallSeller = () => {
    if (isSold || isDeleted) {
      Alert.alert(unavailableTitle, unavailableMessage);
      return;
    }

    const phone = getSellerPhone();
    if (phone) {
      try {
        const res = Linking.openURL(`tel:${toTelephoneNumber(phone)}`);
        if (res && typeof res.catch === 'function') {
          res.catch(() => {});
        }
      } catch (e) {}
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
      try {
        const res = Linking.openURL(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`);
        if (res && typeof res.catch === 'function') {
          res.catch(() => {});
        }
      } catch (e) {}
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
      try {
        const res = Linking.openURL(`mailto:${email}?subject=${encodeURIComponent(horse.title)}`);
        if (res && typeof res.catch === 'function') {
          res.catch(() => {});
        }
      } catch (e) {}
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

  const getSharePayload = () => {
    const sireDam =
      horse.sire || horse.dam
        ? `\n🧬 Sire: ${horse.sire || 'Registered'} • Dam: ${horse.dam || 'Registered'}`
        : '';
    const vet = horse.vet_check_available
      ? isArabic
        ? '\n🩺 فحص بيطري معتمد وموثق'
        : '\n🩺 Vet Check: Cleared & Verified'
      : '';
    const priceText = horse.price
      ? `${Number(horse.price).toLocaleString()} ${t('currencyAed')}`
      : 'POA';
    const link = `https://steedmarket.ae/horses/${horse.id}`;

    if (isArabic) {
      return `🐎 *${horse.title}* (${horse.breed || 'أصيل'})\n💰 السعر: ${priceText}\n🎂 العمر: ${horse.age} سنوات | ${t(horse.gender === 'mare' ? 'genderMare' : horse.gender === 'gelding' ? 'genderGelding' : 'genderStallion')}${sireDam}${vet}\n📍 الموقع: ${horse.location_text || 'الإمارات'}\n\n✨ شاهد صور القوام وفيديو الحركة والنسب الكامل على ستيد ماركت:\n${link}`;
    }
    return `🐎 *${horse.title}* (${horse.breed || 'Purebred'})\n💰 Price: ${priceText}\n🎂 Age: ${horse.age} yrs | ${t(horse.gender === 'mare' ? 'genderMare' : horse.gender === 'gelding' ? 'genderGelding' : 'genderStallion')}${sireDam}${vet}\n📍 Location: ${horse.location_text || 'UAE'}\n\n✨ View conformation, movement video & full pedigree on SteedMarket:\n${link}`;
  };

  const handleShareToWhatsApp = async () => {
    const text = getSharePayload();
    const url = `whatsapp://send?text=${encodeURIComponent(text)}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        await Share.share({ message: text });
      }
    } catch {
      await Share.share({ message: text });
    }
  };

  const handleSharePassport = async () => {
    const text = getSharePayload();
    try {
      await Share.share({
        title: horse.title,
        message: text,
      });
    } catch {
      // Ignore dismiss
    }
  };

  const handlePresetInquiry = (presetType) => {
    if (isSold || isDeleted) {
      Alert.alert(unavailableTitle, unavailableMessage);
      return;
    }
    const phone = getSellerPhone();
    if (!phone) {
      Alert.alert(t('error'), isRTL ? 'رقم الهاتف غير متوفر.' : 'Phone number not available.');
      return;
    }
    const cleanPhone = toWhatsAppNumber(phone);
    const link = `https://steedmarket.ae/horses/${horse.id}`;
    let inquiryText = '';

    const priceText = horse.price ? `${Number(horse.price).toLocaleString()} ${t('currencyAed')}` : 'POA';

    switch (presetType) {
      case 'trial':
        inquiryText = isArabic
          ? `مرحباً، أنا مهتم بـ "${horse.title}" المعروض على ستيد ماركت بسعر (${priceText}).\n🗓️ هل يمكن تحديد موعد لمعاينة وتجربة الخيل هذا الأسبوع؟\n${link}`
          : `Hello! I am interested in "${horse.title}" on SteedMarket (${priceText}).\n🗓️ Is a trial ride or viewing visit available this week?\n${link}`;
        break;
      case 'vet':
        inquiryText = isArabic
          ? `مرحباً، بخصوص إعلان "${horse.title}" (${priceText}):\n🩺 هل يمكنك تزويدي بتقرير الفحص البيطري الحديث، الأشعة (X-Rays)، وجدول التطعيمات؟\n${link}`
          : `Hello! Regarding your listing "${horse.title}" (${priceText}):\n🩺 Could you please share the pre-purchase vet inspection report, x-rays, and vaccination history?\n${link}`;
        break;
      case 'video':
        inquiryText = isArabic
          ? `مرحباً، أود الاطلاع أكثر على إعلان "${horse.title}":\n🎥 هل يمكنك مشاركة مقاطع فيديو حديثة لمشية وحركة الخيل، والخبب، والكانتر أو القفز؟\n${link}`
          : `Hello! I would love to see more movement clips of "${horse.title}":\n🎥 Could you please share recent video clips of the horse in movement, trot, canter, or over fences?\n${link}`;
        break;
      case 'transport':
        inquiryText = isArabic
          ? `مرحباً، بخصوص "${horse.title}" على ستيد ماركت:\n🚚 أين يتواجد إسطبل الخيل حالياً، وهل يتوفر تنسيق لنقل الخيل للإسطبل الخاص بي؟\n${link}`
          : `Hello! Regarding "${horse.title}" on SteedMarket:\n🚚 Where is the horse currently stabled, and can you assist with regional equine transport?\n${link}`;
        break;
      case 'escrow':
        inquiryText = isArabic
          ? `مرحباً، أود إتمام شراء "${horse.title}" (${priceText}) عبر حساب الضمان المالي المعتمد وتنسيق الفحص البيطري الرسمي عبر ستيد ماركت:\n${link}`
          : `Hello! I would like to purchase "${horse.title}" (${priceText}) through SteedMarket Certified Escrow and arrange an official pre-purchase vet exam:\n${link}`;
        break;
      default:
        inquiryText = isArabic
          ? `مرحباً، أود الاستفسار عن إعلانك: ${horse.title}`
          : `Hello, I am inquiring about your listing: ${horse.title}`;
    }

    try {
      const res = Linking.openURL(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(inquiryText)}`);
      if (res && typeof res.catch === 'function') {
        res.catch(() => {});
      }
    } catch (e) {}
  };

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Animated Header */}
      <Animated.View
        style={[
          styles.animatedHeader,
          { paddingTop: insets.top, opacity: headerOpacity },
          isRTL && styles.rowRTL,
        ]}
      >
        <BrandMark size={22} />
        <Text style={[styles.animatedHeaderTitle, isRTL && styles.textRTL]} numberOfLines={1}>
          {horse.title}
        </Text>
      </Animated.View>

      {/* Back Button */}
      <TouchableOpacity
        testID="horse-detail-back-button"
        style={[
          styles.backButton,
          { top: insets.top + SPACING.sm },
          isRTL && styles.backButtonRTL,
        ]}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={COLORS.white} />
      </TouchableOpacity>

      {/* Share Button */}
      <TouchableOpacity
        testID="horse-detail-share-button"
        style={[
          styles.shareButton,
          { top: insets.top + SPACING.sm, right: isRTL ? undefined : SPACING.md + 48, left: isRTL ? SPACING.md + 48 : undefined },
        ]}
        onPress={handleSharePassport}
      >
        <Ionicons name="share-social-outline" size={20} color={COLORS.white} />
      </TouchableOpacity>

      {/* Equine Broker WhatsApp Hotline Button */}
      <TouchableOpacity
        testID="horse-detail-broker-hotline-btn"
        style={[
          styles.hotlineButton,
          { top: insets.top + SPACING.sm, right: isRTL ? undefined : SPACING.md + 96, left: isRTL ? SPACING.md + 96 : undefined },
        ]}
        onPress={handleBrokerHotline}
        activeOpacity={0.8}
        accessibilityLabel="Equine Broker WhatsApp Hotline"
      >
        <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
      </TouchableOpacity>

      {/* Favorite Button */}
      <TouchableOpacity
        testID="horse-detail-favorite-button"
        style={[
          styles.favoriteButton,
          { top: insets.top + SPACING.sm, right: isRTL ? undefined : SPACING.md, left: isRTL ? SPACING.md : undefined },
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
              <BrandMark size={48} />
              <Ionicons name="image-outline" size={32} color={COLORS.textLight} style={{ marginTop: 8 }} />
            </View>
          )}

          {/* Floating Conformation Badges */}
          <View style={[styles.floatingBadgesRow, isRTL && styles.rowRTL]}>
            {Boolean(horse.video_url || horse.has_video) && (
              <View style={styles.floatingVideoBadge} testID="floating-video-badge">
                <Ionicons name="play" size={12} color={COLORS.white} />
                <Text style={styles.floatingVideoBadgeText}>{t('hasVideo') || 'Video'}</Text>
              </View>
            )}
            {horse.vet_check_available && (
              <View style={styles.floatingVetBadge} testID="floating-vet-badge">
                <Ionicons name="checkmark-circle" size={12} color={COLORS.white} />
                <Text style={styles.floatingVetBadgeText}>{t('vetChecked') || 'Vet Checked'}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Price & Title Card */}
          <View style={styles.mainCard}>
            {/* VIP Equine Exchange Accreditation Badge */}
            <View testID="horse-detail-vip-badge" style={[styles.vipBadge, isRTL && styles.rowRTL]}>
              <View style={styles.vipPulseDot} />
              <Ionicons name="ribbon" size={11} color="#D4AF37" />
              <Text style={styles.vipBadgeText}>
                {isArabic ? 'خيل معتمد ومسجل في بورصة الخليج' : 'VIP VERIFIED GULF EQUINE'}
              </Text>
            </View>

            <View style={styles.priceRow}>
              <View>
                <Text style={styles.price}>
                  {displayPrice != null
                    ? `${displayPrice.toLocaleString()} ${t('currencyAed')}`
                    : t('poa')}
                </Text>
                {hasDiscount && (
                  <Text style={styles.originalPrice}>
                    {horse.price?.toLocaleString()} {t('currencyAed')}
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

            {/* Regional Stabling Emirate Pill */}
            {Boolean(horse.location_text) && (
              <View style={[styles.emiratePill, isRTL && styles.rowRTL]} testID="horse-emirate-pill">
                <Ionicons name="location" size={13} color={COLORS.accentDark} />
                <Text style={styles.emiratePillText}>{horse.location_text}</Text>
              </View>
            )}

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

          {/* VIP Veterinary Escrow & Certified Transaction Guarantee Ribbon */}
          <TouchableOpacity
            testID="horse-detail-escrow-banner"
            style={[styles.escrowBanner, isRTL && styles.rowRTL]}
            onPress={handleBrokerHotline}
            activeOpacity={0.88}
          >
            <View style={styles.escrowBannerPulse} />
            <Ionicons name="shield-checkmark" size={16} color="#D4AF37" />
            <Text style={[styles.escrowBannerText, isRTL && styles.textRTL]}>
              {isArabic
                ? 'جميع صفقات الخيل مؤمنة بحساب الضمان المالي المعتمد والفحص البيطري الرسمي'
                : 'Certified Equine Escrow & Official Vet Inspection secured for every transaction'}
            </Text>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={15} color="#8C6D23" />
          </TouchableOpacity>

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

          {/* Movement Video Banner (if available) */}
          {Boolean(horse.video_url || horse.has_video) && (
            <TouchableOpacity
              style={[styles.videoBannerBtn, isRTL && styles.rowRTL]}
              activeOpacity={0.85}
              onPress={() => {
                if (horse.video_url) {
                  Linking.openURL(horse.video_url);
                } else {
                  toast.show(isArabic ? 'جاري تجهيز مقطع الفيديو للمعاينة' : 'Video preview is being prepared', { type: 'normal' });
                }
              }}
            >
              <View style={styles.videoPlayCircle}>
                <Ionicons name="play" size={20} color={COLORS.white} />
              </View>
              <View style={styles.videoBannerTextWrap}>
                <Text style={[styles.videoBannerTitle, isRTL && styles.textRTL]}>
                  {t('watchMovementVideo')}
                </Text>
                <Text style={[styles.videoBannerSub, isRTL && styles.textRTL]}>
                  {isArabic ? 'معاينة حركة الخيل في الخبب والكنتر (4K)' : '4K Conformation & Movement Gaits (Trot/Canter)'}
                </Text>
              </View>
              <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color={COLORS.white} />
            </TouchableOpacity>
          )}

          {/* Trust & Verification Audit Card */}
          <View style={styles.sectionCard}>
            <View style={[styles.sectionCardHeader, isRTL && styles.rowRTL]}>
              <View style={[styles.sectionTitleRow, isRTL && styles.rowRTL]}>
                <Ionicons name="shield-checkmark" size={20} color={COLORS.primary} />
                <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
                  {t('trustVerificationAudit')}
                </Text>
              </View>
              <View style={[styles.trustScorePill, { borderColor: trust.color }]}>
                <Text style={[styles.trustScorePillText, { color: trust.color }]}>
                  {trust.score}% {t(trust.labelKey)}
                </Text>
              </View>
            </View>

            <View style={styles.auditList}>
              <View style={[styles.auditItem, isRTL && styles.rowRTL]}>
                <Ionicons
                  name={horse.owner?.is_verified ? 'checkmark-circle' : 'time-outline'}
                  size={18}
                  color={horse.owner?.is_verified ? COLORS.success : COLORS.warning}
                />
                <View style={[styles.auditTextWrap, isRTL && styles.auditTextWrapRTL]}>
                  <Text style={[styles.auditTitle, isRTL && styles.textRTL]}>{t('verifiedSeller')}</Text>
                  <Text style={[styles.auditSubtitle, isRTL && styles.textRTL]}>
                    {horse.owner?.is_verified
                      ? (isArabic ? 'الهوية والاسطبل موثقان رسمياً' : 'Identity & stable officially verified')
                      : (isArabic ? 'عضو قياسي في المنصة' : 'Standard marketplace member')}
                  </Text>
                </View>
              </View>

              <View style={[styles.auditItem, isRTL && styles.rowRTL]}>
                <Ionicons
                  name={horse.vet_check_available ? 'checkmark-circle' : 'alert-circle-outline'}
                  size={18}
                  color={horse.vet_check_available ? COLORS.success : COLORS.textLight}
                />
                <View style={[styles.auditTextWrap, isRTL && styles.auditTextWrapRTL]}>
                  <Text style={[styles.auditTitle, isRTL && styles.textRTL]}>{t('vetCheck')}</Text>
                  <Text style={[styles.auditSubtitle, isRTL && styles.textRTL]}>
                    {horse.vet_check_available
                      ? (isArabic ? 'فحص سريري وشعاعي متاح للمعاينة' : 'Clinical & radiograph exam available')
                      : (isArabic ? 'يمكن طلب الفحص بالتنسيق مع البائع' : 'Can be coordinated upon request')}
                  </Text>
                </View>
              </View>

              <View style={[styles.auditItem, isRTL && styles.rowRTL]}>
                <Ionicons
                  name={horse.vet_certificate_url ? 'checkmark-circle' : 'document-outline'}
                  size={18}
                  color={horse.vet_certificate_url ? COLORS.success : COLORS.textLight}
                />
                <View style={[styles.auditTextWrap, isRTL && styles.auditTextWrapRTL]}>
                  <Text style={[styles.auditTitle, isRTL && styles.textRTL]}>{t('passportRegistered')}</Text>
                  <Text style={[styles.auditSubtitle, isRTL && styles.textRTL]}>
                    {horse.vet_certificate_url
                      ? (isArabic ? 'مستند الجواز والفحص مرفوع رقمياً' : 'Passport certificate uploaded & attached')
                      : (isArabic ? 'جواز رسمي ورقم شريحة إلكترونية' : 'Equine passport & microchip registered')}
                  </Text>
                </View>
              </View>

              <View style={[styles.auditItem, isRTL && styles.rowRTL]}>
                <Ionicons name="images-outline" size={18} color={COLORS.primary} />
                <View style={[styles.auditTextWrap, isRTL && styles.auditTextWrapRTL]}>
                  <Text style={[styles.auditTitle, isRTL && styles.textRTL]}>{t('highResMedia')}</Text>
                  <Text style={[styles.auditSubtitle, isRTL && styles.textRTL]}>
                    {isArabic
                      ? `${images.length} صور عالية الجودة لزوايا الوقوف والحركة`
                      : `${images.length} high-resolution conformation & movement views`}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Interactive Pedigree Tree Card */}
          <View style={styles.sectionCard}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.sectionCardHeader, isRTL && styles.rowRTL]}
              onPress={() => setExpandedPedigree(!expandedPedigree)}
            >
              <View style={[styles.sectionTitleRow, isRTL && styles.rowRTL]}>
                <Ionicons name="git-network-outline" size={20} color={COLORS.accentDark} />
                <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
                  {t('pedigreeLineage')}
                </Text>
              </View>
              <Ionicons
                name={expandedPedigree ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>

            <View style={styles.pedigreeTreeContainer}>
              <View style={[styles.pedigreeNode, styles.subjectNode]}>
                <Text style={styles.pedigreeNodeTitle}>{horse.title}</Text>
                <Text style={styles.pedigreeNodeSub}>{horse.breed || 'Purebred'}</Text>
              </View>

              <View style={[styles.pedigreeBranchesRow, isRTL && styles.rowRTL]}>
                <View style={[styles.pedigreeNode, styles.sireNode]}>
                  <View style={styles.pedigreeGenderBadge}>
                    <Text style={styles.pedigreeGenderBadgeText}>{t('sire')}</Text>
                  </View>
                  <Text style={styles.pedigreeNodeName} numberOfLines={1}>
                    {horse.sire || (isArabic ? 'الأب مسجل' : 'Registered Sire')}
                  </Text>
                </View>

                <View style={[styles.pedigreeNode, styles.damNode]}>
                  <View style={[styles.pedigreeGenderBadge, styles.damBadge]}>
                    <Text style={styles.pedigreeGenderBadgeText}>{t('dam')}</Text>
                  </View>
                  <Text style={styles.pedigreeNodeName} numberOfLines={1}>
                    {horse.dam || (isArabic ? 'الأم مسجلة' : 'Registered Dam')}
                  </Text>
                </View>
              </View>

              {expandedPedigree && (
                <View style={[styles.grandParentsRow, isRTL && styles.rowRTL]}>
                  <View style={styles.grandBranch}>
                    <View style={styles.grandNode}>
                      <Text style={styles.grandNodeRole}>{t('sire')} × {t('sire')}</Text>
                      <Text style={styles.grandNodeText} numberOfLines={1}>{horse.sire ? `${horse.sire} I` : 'Grandsire (Paternal)'}</Text>
                    </View>
                    <View style={styles.grandNode}>
                      <Text style={styles.grandNodeRole}>{t('dam')} × {t('sire')}</Text>
                      <Text style={styles.grandNodeText} numberOfLines={1}>Granddam (Paternal)</Text>
                    </View>
                  </View>

                  <View style={styles.grandBranch}>
                    <View style={styles.grandNode}>
                      <Text style={styles.grandNodeRole}>{t('sire')} × {t('dam')}</Text>
                      <Text style={styles.grandNodeText} numberOfLines={1}>Grandsire (Maternal)</Text>
                    </View>
                    <View style={styles.grandNode}>
                      <Text style={styles.grandNodeRole}>{t('dam')} × {t('dam')}</Text>
                      <Text style={styles.grandNodeText} numberOfLines={1}>Granddam (Maternal)</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Digital Horse Passport & VIP Share Card */}
          <View style={styles.passportCard}>
            <View style={[styles.passportHeader, isRTL && styles.rowRTL]}>
              <View style={styles.passportBadgeIconWrap}>
                <BrandMark size={22} />
              </View>
              <View style={[styles.passportHeaderTextWrap, isRTL && styles.passportHeaderTextWrapRTL]}>
                <View style={[styles.passportTitleRow, isRTL && styles.rowRTL]}>
                  <Text style={[styles.passportTitle, isRTL && styles.textRTL]}>
                    {t('digitalHorsePassport')}
                  </Text>
                  <View style={styles.passportSerialBadge}>
                    <Text style={styles.passportSerialText}>
                      #SM-{String(horse.id).slice(0, 6).toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.passportSubtitle, isRTL && styles.textRTL]}>
                  {t('digitalPassportSub')}
                </Text>
              </View>
            </View>

            <View style={styles.passportGrid}>
              <View style={[styles.passportGridRow, isRTL && styles.rowRTL]}>
                <View style={styles.passportGridCol}>
                  <Text style={styles.passportColLabel}>{t('breed')}</Text>
                  <Text style={styles.passportColValue}>{horse.breed || 'Purebred'}</Text>
                </View>
                <View style={styles.passportGridCol}>
                  <Text style={styles.passportColLabel}>{t('age')}</Text>
                  <Text style={styles.passportColValue}>{horse.age} {isArabic ? 'سنوات' : 'yrs'}</Text>
                </View>
                <View style={styles.passportGridCol}>
                  <Text style={styles.passportColLabel}>{t('gender')}</Text>
                  <Text style={styles.passportColValue}>
                    {t(
                      horse.gender === 'mare'
                        ? 'genderMare'
                        : horse.gender === 'gelding'
                        ? 'genderGelding'
                        : 'genderStallion'
                    )}
                  </Text>
                </View>
              </View>

              <View style={[styles.passportGridRow, isRTL && styles.rowRTL]}>
                <View style={styles.passportGridCol}>
                  <Text style={styles.passportColLabel}>{t('vetCheck')}</Text>
                  <Text
                    style={[
                      styles.passportColValue,
                      { color: horse.vet_check_available ? COLORS.success : COLORS.textSecondary },
                    ]}
                  >
                    {horse.vet_check_available
                      ? isArabic
                        ? '✓ معتمد'
                        : '✓ Cleared'
                      : isArabic
                      ? 'غير متوفر'
                      : 'N/A'}
                  </Text>
                </View>
                <View style={styles.passportGridCol}>
                  <Text style={styles.passportColLabel}>{t('discipline')}</Text>
                  <Text style={styles.passportColValue}>
                    {horse.discipline || (isArabic ? 'عام' : 'All-round')}
                  </Text>
                </View>
                <View style={styles.passportGridCol}>
                  <Text style={styles.passportColLabel}>{t('price')}</Text>
                  <Text style={[styles.passportColValue, { color: COLORS.primary, fontWeight: '700' }]}>
                    {horse.price ? `${Number(horse.price).toLocaleString()} ${t('currencyAed')}` : 'POA'}
                  </Text>
                </View>
              </View>
            </View>

            {/* One-Tap Share to WhatsApp & Contacts */}
            <View style={[styles.passportShareRow, isRTL && styles.rowRTL]}>
              <TouchableOpacity
                testID="passport-share-whatsapp-btn"
                style={styles.passportWhatsAppBtn}
                activeOpacity={0.85}
                onPress={handleShareToWhatsApp}
              >
                <Ionicons name="logo-whatsapp" size={18} color={COLORS.white} />
                <Text style={styles.passportWhatsAppBtnText}>{t('shareViaWhatsApp')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                testID="passport-export-sheet-btn"
                style={styles.passportShareSheetBtn}
                activeOpacity={0.85}
                onPress={handleSharePassport}
              >
                <Ionicons name="share-social-outline" size={18} color={COLORS.primary} />
                <Text style={styles.passportShareSheetBtnText}>{t('exportPassport')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Smart Equestrian Inquiry Assistant */}
          <View style={styles.inquiryCard}>
            <View style={[styles.inquiryCardHeader, isRTL && styles.rowRTL]}>
              <View style={styles.inquiryIconWrap}>
                <Ionicons name="chatbubbles" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.inquiryHeaderTexts}>
                <Text style={[styles.inquiryCardTitle, isRTL && styles.textRTL]}>
                  {t('inquiryAssistantTitle')}
                </Text>
                <Text style={[styles.inquiryCardSub, isRTL && styles.textRTL]}>
                  {t('inquiryAssistantSub')}
                </Text>
              </View>
            </View>

            <View style={styles.inquiryChipsGrid}>
              <TouchableOpacity
                testID="inquiry-chip-trial"
                style={[styles.inquiryPresetBtn, isRTL && styles.rowRTL]}
                activeOpacity={0.8}
                onPress={() => handlePresetInquiry('trial')}
              >
                <Text style={styles.inquiryPresetIcon}>🗓️</Text>
                <Text style={[styles.inquiryPresetText, isRTL && styles.textRTL]}>{t('inquiryTrial')}</Text>
                <Ionicons name="logo-whatsapp" size={16} color="#16a34a" />
              </TouchableOpacity>

              <TouchableOpacity
                testID="inquiry-chip-vet"
                style={[styles.inquiryPresetBtn, isRTL && styles.rowRTL]}
                activeOpacity={0.8}
                onPress={() => handlePresetInquiry('vet')}
              >
                <Text style={styles.inquiryPresetIcon}>🩺</Text>
                <Text style={[styles.inquiryPresetText, isRTL && styles.textRTL]}>{t('inquiryVet')}</Text>
                <Ionicons name="logo-whatsapp" size={16} color="#16a34a" />
              </TouchableOpacity>

              <TouchableOpacity
                testID="inquiry-chip-video"
                style={[styles.inquiryPresetBtn, isRTL && styles.rowRTL]}
                activeOpacity={0.8}
                onPress={() => handlePresetInquiry('video')}
              >
                <Text style={styles.inquiryPresetIcon}>🎥</Text>
                <Text style={[styles.inquiryPresetText, isRTL && styles.textRTL]}>{t('inquiryVideo')}</Text>
                <Ionicons name="logo-whatsapp" size={16} color="#16a34a" />
              </TouchableOpacity>

              <TouchableOpacity
                testID="inquiry-chip-transport"
                style={[styles.inquiryPresetBtn, isRTL && styles.rowRTL]}
                activeOpacity={0.8}
                onPress={() => handlePresetInquiry('transport')}
              >
                <Text style={styles.inquiryPresetIcon}>🚚</Text>
                <Text style={[styles.inquiryPresetText, isRTL && styles.textRTL]}>{t('inquiryTransport')}</Text>
                <Ionicons name="logo-whatsapp" size={16} color="#16a34a" />
              </TouchableOpacity>

              <TouchableOpacity
                testID="inquiry-chip-escrow"
                style={[styles.inquiryPresetBtn, isRTL && styles.rowRTL]}
                activeOpacity={0.8}
                onPress={() => handlePresetInquiry('escrow')}
              >
                <Text style={styles.inquiryPresetIcon}>🛡️</Text>
                <Text style={[styles.inquiryPresetText, isRTL && styles.textRTL]}>
                  {isArabic ? 'حساب الضمان والفحص البيطري' : 'Escrow & Vet Inspection'}
                </Text>
                <Ionicons name="logo-whatsapp" size={16} color="#16a34a" />
              </TouchableOpacity>
            </View>
          </View>

          {/* SteedMarket Equine Trust Shield & Buyer Protection */}
          <View style={styles.trustShieldCard}>
            <View style={[styles.trustShieldHeader, isRTL && styles.rowRTL]}>
              <View style={styles.trustShieldIconWrap}>
                <Ionicons name="shield-checkmark" size={22} color={COLORS.gold || '#C5A059'} />
              </View>
              <View style={styles.trustShieldHeaderTexts}>
                <Text style={[styles.trustShieldTitle, isRTL && styles.textRTL]}>
                  {t('trustShieldTitle')}
                </Text>
                <Text style={[styles.trustShieldSub, isRTL && styles.textRTL]}>
                  {t('trustShieldSub')}
                </Text>
              </View>
            </View>

            <View style={styles.trustShieldItems}>
              <View style={[styles.trustShieldItem, isRTL && styles.rowRTL]}>
                <Ionicons name="medkit-outline" size={18} color={COLORS.primary} style={styles.trustItemIcon} />
                <View style={styles.trustItemContent}>
                  <Text style={[styles.trustItemTitle, isRTL && styles.textRTL]}>{t('trustShieldPpeTitle')}</Text>
                  <Text style={[styles.trustItemDesc, isRTL && styles.textRTL]}>{t('trustShieldPpeDesc')}</Text>
                </View>
              </View>

              <View style={[styles.trustShieldItem, isRTL && styles.rowRTL]}>
                <Ionicons name="qr-code-outline" size={18} color={COLORS.primary} style={styles.trustItemIcon} />
                <View style={styles.trustItemContent}>
                  <Text style={[styles.trustItemTitle, isRTL && styles.textRTL]}>{t('trustShieldPassportTitle')}</Text>
                  <Text style={[styles.trustItemDesc, isRTL && styles.textRTL]}>{t('trustShieldPassportDesc')}</Text>
                </View>
              </View>

              <View style={[styles.trustShieldItem, isRTL && styles.rowRTL]}>
                <Ionicons name="document-text-outline" size={18} color={COLORS.primary} style={styles.trustItemIcon} />
                <View style={styles.trustItemContent}>
                  <Text style={[styles.trustItemTitle, isRTL && styles.textRTL]}>{t('trustShieldContractTitle')}</Text>
                  <Text style={[styles.trustItemDesc, isRTL && styles.textRTL]}>{t('trustShieldContractDesc')}</Text>
                </View>
              </View>

              <View style={[styles.trustShieldItem, isRTL && styles.rowRTL]}>
                <Ionicons name="lock-closed-outline" size={18} color={COLORS.primary} style={styles.trustItemIcon} />
                <View style={styles.trustItemContent}>
                  <Text style={[styles.trustItemTitle, isRTL && styles.textRTL]}>{t('trustShieldEscrowTitle')}</Text>
                  <Text style={[styles.trustItemDesc, isRTL && styles.textRTL]}>{t('trustShieldEscrowDesc')}</Text>
                </View>
              </View>
            </View>
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
      <View
        testID="horse-detail-footer"
        style={[
          styles.bottomBar,
          { paddingBottom: Math.max(insets.bottom, 12) },
          isRTL && styles.rowRTL,
        ]}
      >
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
          <Ionicons name="logo-whatsapp" size={18} color="#ffffff" />
          <Text style={styles.actionBtnText}>{t('whatsapp')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID="horse-make-offer-button"
          style={[styles.actionBtn, styles.offerBtn, (isSold || isDeleted) && styles.disabledActionBtn]}
          onPress={() => {
            if (!isAuthenticated) {
              navigation.navigate('AuthStack');
              return;
            }
            setShowOfferSheet(true);
          }}
        >
          <Ionicons name="pricetag-outline" size={18} color="#ffffff" />
          <Text style={styles.actionBtnText}>{t('makeOffer')}</Text>
        </TouchableOpacity>
      </View>

      <OfferHistorySheet
        horseId={horse.id}
        horseTitle={horse.title}
        listingPrice={horse.price}
        sellerPhone={horse.owner?.phone_number}
        isVisible={showOfferSheet}
        onClose={() => setShowOfferSheet(false)}
        userRole={horse.owner?.id === user?.id ? 'seller' : 'buyer'}
      />

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
  backButtonRTL: {
    left: undefined,
    right: SPACING.md,
  },
  favoriteButton: {
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
  hotlineButton: {
    position: 'absolute',
    right: SPACING.md + 96,
    zIndex: 20,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(37, 211, 102, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingBadgesRow: {
    position: 'absolute',
    top: SPACING.lg + 36,
    left: SPACING.md,
    flexDirection: 'row',
    gap: SPACING.xs,
    zIndex: 15,
  },
  floatingVideoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 56, 38, 0.88)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  floatingVideoBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.white,
  },
  floatingVetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(34, 197, 94, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  floatingVetBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.white,
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
  vipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF5E8',
    borderWidth: 1,
    borderColor: '#D4AF37',
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
    alignSelf: 'flex-start',
    gap: 5,
  },
  vipPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  vipBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#8C6D23',
    letterSpacing: 0.5,
  },
  escrowBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(197, 160, 89, 0.09)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.32)',
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 2,
    marginBottom: SPACING.md,
    gap: 8,
  },
  escrowBannerPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  escrowBannerText: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '700',
    color: '#8C6D23',
    lineHeight: 16,
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
  emiratePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FAF5EA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: '#E8DCBF',
    alignSelf: 'flex-start',
    marginBottom: SPACING.sm,
  },
  emiratePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.accentDark,
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
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    ...SHADOWS.cardHover,
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
  offerBtn: {
    backgroundColor: COLORS.accentDark,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    marginLeft: 4,
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
  videoBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
    ...SHADOWS.card,
  },
  videoPlayCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoBannerTextWrap: {
    flex: 1,
  },
  videoBannerTitle: {
    ...FONTS.h3,
    color: COLORS.white,
    fontSize: 15,
  },
  videoBannerSub: {
    ...FONTS.bodySmall,
    color: COLORS.accentLight,
    marginTop: 2,
  },
  sectionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  trustScorePill: {
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 3,
    backgroundColor: COLORS.white,
  },
  trustScorePillText: {
    ...FONTS.caption,
    fontWeight: '700',
    fontSize: 11,
  },
  auditList: {
    marginTop: SPACING.xs,
    gap: SPACING.sm,
  },
  auditItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  auditTextWrap: {
    flex: 1,
  },
  auditTextWrapRTL: {
    alignItems: 'flex-end',
  },
  auditTitle: {
    ...FONTS.body,
    fontWeight: '700',
    fontSize: 14,
    color: COLORS.text,
  },
  auditSubtitle: {
    ...FONTS.bodySmall,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  pedigreeTreeContainer: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.sm + 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pedigreeNode: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  subjectNode: {
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight + '12',
    borderColor: COLORS.primaryLight + '30',
    marginBottom: SPACING.sm,
  },
  pedigreeNodeTitle: {
    ...FONTS.h3,
    color: COLORS.primary,
    fontSize: 15,
  },
  pedigreeNodeSub: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  pedigreeBranchesRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  sireNode: {
    flex: 1,
    borderColor: COLORS.accentLight,
  },
  damNode: {
    flex: 1,
    borderColor: '#E2E8F0',
  },
  pedigreeGenderBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.accentDark,
    borderRadius: RADIUS.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginBottom: 4,
  },
  damBadge: {
    backgroundColor: '#8B5CF6',
  },
  pedigreeGenderBadgeText: {
    ...FONTS.caption,
    color: COLORS.white,
    fontSize: 9,
    fontWeight: '700',
  },
  pedigreeNodeName: {
    ...FONTS.bodySmall,
    fontWeight: '700',
    color: COLORS.text,
  },
  grandParentsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  grandBranch: {
    flex: 1,
    gap: SPACING.xs,
  },
  grandNode: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm - 2,
    padding: 6,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  grandNodeRole: {
    ...FONTS.caption,
    fontSize: 9,
    color: COLORS.textLight,
    fontWeight: '700',
  },
  grandNodeText: {
    ...FONTS.bodySmall,
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  textRTL: {
    textAlign: 'right',
  },
  passportCard: {
    backgroundColor: '#FAF7F0',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1.5,
    borderColor: '#E2D5BE',
    ...SHADOWS.card,
  },
  passportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm + 2,
  },
  passportBadgeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFE7D5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  passportHeaderTextWrap: {
    flex: 1,
  },
  passportHeaderTextWrapRTL: {
    alignItems: 'flex-end',
  },
  passportTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  passportTitle: {
    ...FONTS.h3,
    color: COLORS.primary,
  },
  passportSerialBadge: {
    backgroundColor: '#FAF5EA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E8DCBF',
  },
  passportSerialText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.accentDark,
    letterSpacing: 0.5,
  },
  passportSubtitle: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  passportGrid: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#E8DEC9',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  passportGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  passportGridCol: {
    flex: 1,
  },
  passportColLabel: {
    ...FONTS.caption,
    fontSize: 10,
    color: COLORS.textLight,
    textTransform: 'uppercase',
  },
  passportColValue: {
    ...FONTS.bodySmall,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 2,
  },
  passportShareRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  passportWhatsAppBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#16a34a',
    paddingVertical: 12,
    borderRadius: RADIUS.full,
    ...SHADOWS.soft,
  },
  passportWhatsAppBtnText: {
    ...FONTS.button,
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  passportShareSheetBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: RADIUS.full,
    ...SHADOWS.soft,
  },
  passportShareSheetBtnText: {
    ...FONTS.button,
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  inquiryCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#EBE7E0',
    marginBottom: SPACING.md,
    ...SHADOWS.soft,
  },
  inquiryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  inquiryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inquiryHeaderTexts: {
    flex: 1,
  },
  inquiryCardTitle: {
    ...FONTS.h3,
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '700',
  },
  inquiryCardSub: {
    ...FONTS.caption,
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 1,
  },
  inquiryChipsGrid: {
    gap: SPACING.xs,
    marginTop: 4,
  },
  inquiryPresetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#EBE7E0',
    gap: 8,
  },
  inquiryPresetIcon: {
    fontSize: 16,
  },
  inquiryPresetText: {
    ...FONTS.bodySmall,
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  trustShieldCard: {
    backgroundColor: '#F5F9F6',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#D4E7DC',
    marginBottom: SPACING.md,
    ...SHADOWS.soft,
  },
  trustShieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
    paddingBottom: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#E2EFE7',
  },
  trustShieldIconWrap: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: '#E6F4EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustShieldHeaderTexts: {
    flex: 1,
  },
  trustShieldTitle: {
    ...FONTS.h3,
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: '700',
  },
  trustShieldSub: {
    ...FONTS.caption,
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  trustShieldItems: {
    gap: SPACING.sm,
    marginTop: 4,
  },
  trustShieldItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.xs,
  },
  trustItemIcon: {
    marginTop: 2,
  },
  trustItemContent: {
    flex: 1,
  },
  trustItemTitle: {
    ...FONTS.bodySmall,
    fontWeight: '700',
    color: COLORS.text,
    fontSize: 12,
  },
  trustItemDesc: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 1,
  },
});

