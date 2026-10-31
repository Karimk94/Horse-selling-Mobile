import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Alert,
  Dimensions,
  Share,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getEquipmentDetail } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import SellerInfoCard from '../components/SellerInfoCard';
import DetailActionBar from '../components/DetailActionBar';
import BrandMark from '../components/BrandMark';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../config/theme';
import { toTelephoneNumber, toWhatsAppNumber } from '../utils/phoneNumbers';

const { width } = Dimensions.get('window');

export default function EquipmentDetailScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { equipmentId } = route.params || {};
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const heartScale = useRef(new Animated.Value(1)).current;

  const { language: currentLanguage, t, isRTL } = useLanguage();
  const isArabic = currentLanguage === 'ar';

  useEffect(() => {
    async function loadDetail() {
      if (!equipmentId) return;
      try {
        const response = await getEquipmentDetail(equipmentId);
        setItem(response.data);
      } catch (error) {
        Alert.alert(t('error') || 'Error', isArabic ? 'فشل تحميل تفاصيل المنتج.' : 'Failed to load equipment details.');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    }
    loadDetail();
  }, [equipmentId]);

  const toggleFavorite = () => {
    Animated.sequence([
      Animated.timing(heartScale, { toValue: 1.3, duration: 120, useNativeDriver: true }),
      Animated.spring(heartScale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
    setIsFavorite(!isFavorite);
  };

  const handleCallOwner = () => {
    const phone = item?.owner?.phone_number || item?.owner?.profile?.phone_number;
    if (phone) {
      Linking.openURL(`tel:${toTelephoneNumber(phone)}`);
    } else {
      Alert.alert(t('error') || 'Error', isArabic ? 'رقم الهاتف غير متوفر.' : 'Phone number not available.');
    }
  };

  const handleWhatsApp = () => {
    const phone = item?.owner?.phone_number || item?.owner?.profile?.phone_number;
    if (phone) {
      const cleanPhone = toWhatsAppNumber(phone);
      const msg = encodeURIComponent(
        isArabic
          ? `مرحباً، أود الاستفسار عن إعلانك: ${item.title}`
          : `Hello, I am inquiring about your listing: ${item.title}`
      );
      Linking.openURL(`https://wa.me/${cleanPhone}?text=${msg}`);
    } else {
      Alert.alert(t('error') || 'Error', isArabic ? 'رقم الهاتف غير متوفر.' : 'Phone number not available.');
    }
  };

  const handleShare = async () => {
    if (!item) return;
    const priceText = item.price ? `${Number(item.price).toLocaleString()} AED` : 'POA';
    const message = isArabic
      ? `🏇 تفقد هذا المنتج على ستيد ماركت: ${item.title} (${priceText}) - ${item.location_text || 'الإمارات'}\nhttps://steedmarket.ae/equipment/${item.id}`
      : `🏇 Check out this tack on SteedMarket: ${item.title} (${priceText}) - ${item.location_text || 'UAE'}\nhttps://steedmarket.ae/equipment/${item.id}`;
    try {
      await Share.share({
        title: item.title,
        message,
      });
    } catch (e) {
      console.warn('Share error:', e);
    }
  };

  const handlePassportShareWhatsApp = () => {
    if (!item) return;
    const priceText = item.price ? `${Number(item.price).toLocaleString()} AED` : 'POA';
    const text = isArabic
      ? `🏇 *جواز توثيق المستلزمات - ستيد ماركت*\n*المنتج:* ${item.title}\n*العلامة:* ${item.brand || 'معتمدة'}\n*السعر:* ${priceText}\n*الموقع:* ${item.location_text || 'الإمارات'}\n*رقم التوثيق:* #SM-TACK-${String(item.id).slice(0, 6).toUpperCase()}\nhttps://steedmarket.ae/equipment/${item.id}`
      : `🏇 *SteedMarket Tack Authentication Card*\n*Item:* ${item.title}\n*Brand:* ${item.brand || 'Verified'}\n*Price:* ${priceText}\n*Location:* ${item.location_text || 'UAE'}\n*Serial:* #SM-TACK-${String(item.id).slice(0, 6).toUpperCase()}\nhttps://steedmarket.ae/equipment/${item.id}`;
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(text)}`);
  };

  const handleTackBrokerHotline = () => {
    const text = isArabic
      ? `مرحباً مستشار مستلزمات ستيد ماركت، أود الاستفسار عن تفاصيل ومقاسات وتنسيق الشراء لإعلان "${item.title}" (كود: #SM-TACK-${String(item.id).slice(0, 6).toUpperCase()}).`
      : `Hello SteedMarket Tack Specialist, I would like assistance with measurements, fit advice, and escrow trial coordination for listing "${item.title}" (Ref: #SM-TACK-${String(item.id).slice(0, 6).toUpperCase()}).`;
    const waUrl = `https://wa.me/971500000000?text=${encodeURIComponent(text)}`;
    try {
      const res = Linking.openURL(waUrl);
      if (res && typeof res.catch === 'function') {
        res.catch(() => {});
      }
    } catch (e) {}
  };

  const handleEscrowConsultation = () => {
    const text = isArabic
      ? `مرحباً ستيد ماركت، أود تفعيل خدمة الضمان المالي المعتمد وتجربة الإسطبل (Escrow & Stable Trial) لشراء "${item.title}" بسعر ${Number(item.price || 0).toLocaleString()} درهم.`
      : `Hello SteedMarket, I would like to activate Certified Escrow & Stable Trial protection for purchasing "${item.title}" (${Number(item.price || 0).toLocaleString()} AED).`;
    const waUrl = `https://wa.me/971500000000?text=${encodeURIComponent(text)}`;
    try {
      const res = Linking.openURL(waUrl);
      if (res && typeof res.catch === 'function') {
        res.catch(() => {});
      }
    } catch (e) {}
  };

  const handlePresetInquiry = (presetType) => {
    const phone = item?.owner?.phone_number || item?.owner?.profile?.phone_number;
    if (!phone) {
      Alert.alert(t('error') || 'Error', isArabic ? 'رقم الهاتف غير متوفر.' : 'Phone number not available.');
      return;
    }
    const cleanPhone = toWhatsAppNumber(phone);
    const priceText = item.price ? `${Number(item.price).toLocaleString()} ${t('currencyAed') || 'AED'}` : '';
    let msg = '';

    switch (presetType) {
      case 'fit':
        msg = isArabic
          ? `مرحباً، بخصوص إعلان "${item.title}" (${priceText}):\n📏 هل يمكنك تزويدي بالمقاسات الدقيقة وهل يناسب الخيل العربية أم الأوروبية؟`
          : `Hello! Regarding your listing "${item.title}" (${priceText}):\n📏 Could you please share the exact measurements and whether it fits an Arabian or Warmblood?`;
        break;
      case 'condition':
        msg = isArabic
          ? `مرحباً، أود الاستفسار عن حالة "${item.title}":\n🔍 هل توجد أي تشققات بالجلد، أو خدوش، أو عيوب غير ظاهرة في الصور؟`
          : `Hello! Inquiring about the condition of "${item.title}":\n🔍 Are there any leather cracks, scuffs, repairs, or wear not visible in photos?`;
        break;
      case 'delivery':
        msg = isArabic
          ? `مرحباً، بخصوص "${item.title}":\n🚚 أين موقع الاستلام بالظبط، وهل يتوفر توصيل أو شحن داخل الإمارات؟`
          : `Hello! Regarding "${item.title}":\n🚚 Where is the collection location, or can you arrange courier delivery within the UAE?`;
        break;
      case 'trial':
        msg = isArabic
          ? `مرحباً، بخصوص إعلان "${item.title}":\n🏇 هل يمكن تجربة ومقاس السرج/المستلزم في الإسطبل قبل إتمام الشراء؟`
          : `Hello! Regarding your listing "${item.title}":\n🏇 Would it be possible to arrange an on-site trial/fitting at our stables before finalizing purchase?`;
        break;
      case 'escrow':
        msg = isArabic
          ? `مرحباً، بخصوص إعلان "${item.title}" (${priceText}):\n🛡️ أود الشراء عبر خدمة حساب الضمان والتجربة (Escrow & Fitting Trial) لضمان حجز المبلغ حتى مطابقة المقاس.`
          : `Hello! Regarding your listing "${item.title}" (${priceText}):\n🛡️ I would like to purchase through SteedMarket Certified Escrow & Trial protection to secure funds until fitting verification.`;
        break;
      default:
        msg = isArabic
          ? `مرحباً، أود الاستفسار عن إعلانك: ${item.title}`
          : `Hello, I am inquiring about your listing: ${item.title}`;
    }

    Linking.openURL(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  if (!item) {
    return null;
  }

  const images = item.images?.length
    ? item.images
    : [{ id: '1', image_url: 'https://via.placeholder.com/600x400?text=Equipment' }];
  const categoryName = isArabic ? item.category?.name_ar : item.category?.name_en;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Gallery Slider */}
        <View style={styles.galleryContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const slide = Math.round(e.nativeEvent.contentOffset.x / width);
              setActiveImageIndex(slide);
            }}
            scrollEventThrottle={16}
          >
            {images.map((img, i) => (
              <Image
                key={img.id || img.image_url || i}
                source={{ uri: img.image_url }}
                style={styles.galleryImage}
                resizeMode="cover"
              />
            ))}
          </ScrollView>

          {/* Floating Badges Row */}
          <View style={[styles.floatingBadgesRow, isRTL && styles.rowRTL]}>
            {item.condition ? (
              <View testID="floating-equipment-condition-badge" style={styles.floatingConditionBadge}>
                <Ionicons name="sparkles" size={12} color={COLORS.accent} />
                <Text style={styles.floatingConditionText}>
                  {item.condition === 'new'
                    ? (isArabic ? 'جديد بالكامل' : 'Brand New')
                    : item.condition === 'like_new'
                    ? (isArabic ? 'شبه جديد' : 'Like New')
                    : (isArabic ? 'مستعمل بحالة ممتازة' : 'Pre-Owned')}
                </Text>
              </View>
            ) : null}

            {item.brand ? (
              <View testID="floating-equipment-brand-badge" style={styles.floatingBrandBadge}>
                <Ionicons name="pricetag" size={12} color={COLORS.white} />
                <Text style={styles.floatingBrandText}>{item.brand}</Text>
              </View>
            ) : null}
          </View>

          {/* Image Counter & Pagination */}
          {images.length > 1 && (
            <View style={styles.galleryFooterOverlay}>
              <View style={styles.pagination}>
                {images.map((_, i) => (
                  <View
                    key={i}
                    style={[styles.paginationDot, i === activeImageIndex && styles.activeDot]}
                  />
                ))}
              </View>
              <View style={styles.counterPill}>
                <Text style={styles.counterPillText}>
                  {activeImageIndex + 1} / {images.length}
                </Text>
              </View>
            </View>
          )}

          {/* Top Bar Floating Navigation Actions */}
          <View style={[styles.floatingHeaderRow, isRTL && styles.rowRTL]}>
            <TouchableOpacity
              testID="equipment-back-button"
              style={[styles.floatingHeaderBtn, isRTL && styles.backButtonRTL]}
              onPress={() => navigation.goBack()}
              accessibilityLabel="Go Back"
            >
              <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={22} color={COLORS.primary} />
            </TouchableOpacity>

            <View style={styles.crestBadgeWrapper}>
              <BrandMark size={20} />
            </View>

            <View style={[styles.floatingHeaderRight, isRTL && styles.rowRTL]}>
              <TouchableOpacity
                testID="equipment-broker-hotline-btn"
                style={styles.floatingHotlineBtn}
                onPress={handleTackBrokerHotline}
                accessibilityLabel="Tack Specialist WhatsApp Hotline"
              >
                <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
              </TouchableOpacity>

              <TouchableOpacity
                testID="equipment-share-button"
                style={styles.floatingHeaderBtn}
                onPress={handleShare}
                accessibilityLabel="Share Listing"
              >
                <Ionicons name="share-social-outline" size={20} color={COLORS.primary} />
              </TouchableOpacity>

              <TouchableOpacity
                testID="equipment-favorite-button"
                style={styles.floatingHeaderBtn}
                onPress={toggleFavorite}
                accessibilityLabel="Favorite"
              >
                <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                  <Ionicons
                    name={isFavorite ? 'heart' : 'heart-outline'}
                    size={22}
                    color={isFavorite ? COLORS.error : COLORS.primary}
                  />
                </Animated.View>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Content Details */}
        <View style={styles.body}>
          {item.status === 'rejected' && (
            <View style={styles.rejectionBanner}>
              <View style={[styles.rejectionBannerHeader, isRTL && styles.rowRTL]}>
                <Ionicons name="alert-circle" size={18} color={COLORS.error} />
                <Text style={styles.rejectionBannerTitle}>
                  {isArabic ? 'تم رفض هذا الإعلان' : 'Listing Rejected'}
                </Text>
              </View>
              {item.rejection_reason && (
                <Text style={[styles.rejectionBannerReason, isRTL && styles.textRTL]}>
                  {isArabic ? `السبب: ${item.rejection_reason}` : `Reason: ${item.rejection_reason}`}
                </Text>
              )}
            </View>
          )}

          {/* Category Pill */}
          {categoryName && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{categoryName}</Text>
            </View>
          )}

          <Text style={[styles.title, isRTL && styles.textRTL]}>{item.title}</Text>

          {item.brand && (
            <Text style={[styles.brand, isRTL && styles.textRTL]}>
              {isArabic ? 'العلامة التجارية: ' : 'Brand: '}
              <Text style={styles.brandBold}>{item.brand}</Text>
            </Text>
          )}

          {/* Price & Location Header */}
          <View style={[styles.priceHeaderRow, isRTL && styles.rowRTL]}>
            <View>
              <Text style={styles.price}>{Number(item.price || 0).toLocaleString()} AED</Text>
              {item.quantity > 0 && (
                <Text style={styles.stockText}>
                  {isArabic ? `متوفر: ${item.quantity} قطع` : `${item.quantity} in stock`}
                </Text>
              )}
            </View>

            {item.location_text ? (
              <View testID="equipment-emirate-pill" style={[styles.emiratePill, isRTL && styles.rowRTL]}>
                <Ionicons name="location-sharp" size={13} color={COLORS.primary} />
                <Text style={styles.emiratePillText} numberOfLines={1}>
                  {item.location_text}
                </Text>
              </View>
            ) : null}
          </View>

          {/* VIP Accreditation Badge */}
          <View testID="equipment-detail-vip-badge" style={[styles.vipAccreditationBadge, isRTL && styles.rowRTL]}>
            <View style={styles.livePulseDot} />
            <Ionicons name="ribbon" size={11} color="#D4AF37" />
            <Text style={styles.vipAccreditationText}>
              {isArabic ? 'مستلزمات معتمدة ومفحوصة الأبعاد' : 'VIP CERTIFIED & SIZED TACK'}
            </Text>
          </View>

          {/* VIP Certified Escrow & Stable Trial Ribbon */}
          <TouchableOpacity
            testID="equipment-detail-escrow-banner"
            style={[styles.escrowBanner, isRTL && styles.rowRTL]}
            onPress={handleEscrowConsultation}
            activeOpacity={0.88}
          >
            <View style={styles.escrowShieldIconWrap}>
              <Ionicons name="shield-checkmark" size={18} color="#C5A059" />
            </View>
            <View style={styles.escrowBannerTextCol}>
              <Text style={[styles.escrowBannerTitle, isRTL && styles.textRTL]}>
                {isArabic ? 'ضمان مالي وتجربة في الإسطبل معتمدة' : 'VIP Certified Escrow & Stable Trial'}
              </Text>
              <Text style={[styles.escrowBannerSub, isRTL && styles.textRTL]}>
                {isArabic
                  ? 'حجز المبلغ في حساب ضمان آمن حتى استلام السرج وفحص المقاس'
                  : 'Funds held in official escrow until saddle inspection and gullet check'}
              </Text>
            </View>
            <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
          </TouchableOpacity>

          {/* Sizes */}
          {((item.sizes && item.sizes.length > 0) || item.custom_size) && (
            <View style={styles.sizesSection}>
              <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
                {isArabic ? 'المقاسات المتوفرة' : 'Available Sizes'}
              </Text>
              <View style={[styles.sizesRow, isRTL && styles.rowRTL]}>
                {item.sizes?.map((size, idx) => (
                  <View key={idx} style={styles.sizeChip}>
                    <Text style={styles.sizeChipText}>{size}</Text>
                  </View>
                ))}
                {item.custom_size && (
                  <View style={[styles.sizeChip, styles.customSizeChip]}>
                    <Text style={styles.customSizeChipText}>{item.custom_size}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Location Details Box */}
          {item.location_text && (
            <View style={[styles.locationBox, isRTL && styles.rowRTL]}>
              <Ionicons name="location" size={20} color={COLORS.primary} />
              <Text style={[styles.locationBoxText, isRTL && styles.textRTL]}>{item.location_text}</Text>
            </View>
          )}

          {/* Description */}
          {item.description && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t('description') || 'Description'}</Text>
              <Text style={[styles.descriptionText, isRTL && styles.textRTL]}>{item.description}</Text>
            </View>
          )}

          {/* Digital Tack & Equipment Authentication Card */}
          <View style={styles.passportCard}>
            <View style={[styles.passportHeader, isRTL && styles.rowRTL]}>
              <View style={styles.passportBadgeIconWrap}>
                <BrandMark size={22} />
              </View>
              <View style={[styles.passportHeaderTextWrap, isRTL && styles.passportHeaderTextWrapRTL]}>
                <View style={[styles.passportTitleRow, isRTL && styles.rowRTL]}>
                  <Text style={[styles.passportTitle, isRTL && styles.textRTL]}>
                    {isArabic ? 'بطاقة توثيق المستلزمات الرقمية' : 'Digital Tack Passport'}
                  </Text>
                  <View style={styles.passportSerialBadge}>
                    <Text style={styles.passportSerialText}>
                      #SM-TACK-{String(item.id).slice(0, 6).toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.passportSubtitle, isRTL && styles.textRTL]}>
                  {isArabic
                    ? 'شهادة مواصفات ومعاينة إسطبلات معتمدة عبر ستيد ماركت'
                    : 'Verified Gulf stabling specification certificate'}
                </Text>
              </View>
            </View>

            <View style={styles.passportGrid}>
              <View style={[styles.passportGridRow, isRTL && styles.rowRTL]}>
                <View style={styles.passportGridCol}>
                  <Text style={styles.passportColLabel}>{isArabic ? 'الفئة' : 'Category'}</Text>
                  <Text style={styles.passportColValue}>{categoryName || (isArabic ? 'عام' : 'Tack')}</Text>
                </View>
                <View style={styles.passportGridCol}>
                  <Text style={styles.passportColLabel}>{isArabic ? 'العلامة' : 'Brand'}</Text>
                  <Text style={styles.passportColValue}>{item.brand || (isArabic ? 'حرفي / مخصص' : 'Artisan')}</Text>
                </View>
                <View style={styles.passportGridCol}>
                  <Text style={styles.passportColLabel}>{isArabic ? 'الحالة' : 'Condition'}</Text>
                  <Text style={[styles.passportColValue, { color: COLORS.primary }]}>
                    {item.condition === 'new'
                      ? (isArabic ? 'جديد بالكامل' : 'Brand New')
                      : item.condition === 'like_new'
                      ? (isArabic ? 'شبه جديد' : 'Like New')
                      : (isArabic ? 'مستعمل ممتاز' : 'Pre-Owned')}
                  </Text>
                </View>
              </View>

              <View style={[styles.passportGridRow, isRTL && styles.rowRTL]}>
                <View style={styles.passportGridCol}>
                  <Text style={styles.passportColLabel}>{isArabic ? 'المقاس / القياس' : 'Size / Fit'}</Text>
                  <Text style={styles.passportColValue}>
                    {(item.sizes && item.sizes.join(', ')) || item.custom_size || (isArabic ? 'قياس موحد' : 'Universal')}
                  </Text>
                </View>
                <View style={styles.passportGridCol}>
                  <Text style={styles.passportColLabel}>{isArabic ? 'الإمارة / الموقع' : 'Location'}</Text>
                  <Text style={styles.passportColValue} numberOfLines={1}>
                    {item.location_text || (isArabic ? 'إسطبلات الإمارات' : 'UAE Stables')}
                  </Text>
                </View>
                <View style={styles.passportGridCol}>
                  <Text style={styles.passportColLabel}>{isArabic ? 'السعر' : 'Price'}</Text>
                  <Text style={[styles.passportColValue, { color: COLORS.primary, fontWeight: '700' }]}>
                    {item.price ? `${Number(item.price).toLocaleString()} AED` : 'POA'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Passport Quick Export Actions */}
            <View style={[styles.passportActionsRow, isRTL && styles.rowRTL]}>
              <TouchableOpacity
                testID="tack-passport-share-whatsapp-btn"
                style={styles.passportWhatsAppBtn}
                onPress={handlePassportShareWhatsApp}
              >
                <Ionicons name="logo-whatsapp" size={15} color={COLORS.white} />
                <Text style={styles.passportWhatsAppText}>
                  {isArabic ? 'مشاركة الجواز عبر واتساب' : 'WhatsApp Passport'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                testID="tack-passport-export-sheet-btn"
                style={styles.passportExportBtn}
                onPress={handleShare}
              >
                <Ionicons name="share-outline" size={15} color={COLORS.primary} />
                <Text style={styles.passportExportText}>
                  {isArabic ? 'مشاركة' : 'Share'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Smart Inquiry Assistant for Equipment */}
          <View style={styles.inquiryCard}>
            <View style={[styles.inquiryCardHeader, isRTL && styles.rowRTL]}>
              <View style={styles.inquiryIconWrap}>
                <Ionicons name="chatbubbles" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.inquiryHeaderTexts}>
                <Text style={[styles.inquiryCardTitle, isRTL && styles.textRTL]}>
                  {t('inquiryAssistantTitle') || (isArabic ? 'المساعد الذكي للاستفسار السريع' : 'Smart Inquiry Assistant')}
                </Text>
                <Text style={[styles.inquiryCardSub, isRTL && styles.textRTL]}>
                  {t('inquiryAssistantSub') || (isArabic ? 'رسائل مهنية جاهزة للاستفسار بنقرة واحدة عبر واتساب' : '1-tap professional inquiry presets on WhatsApp')}
                </Text>
              </View>
            </View>

            <View style={styles.inquiryChipsGrid}>
              <TouchableOpacity
                testID="inquiry-chip-fit"
                style={[styles.inquiryPresetBtn, isRTL && styles.rowRTL]}
                activeOpacity={0.8}
                onPress={() => handlePresetInquiry('fit')}
              >
                <Text style={styles.inquiryPresetIcon}>📏</Text>
                <Text style={[styles.inquiryPresetText, isRTL && styles.textRTL]}>
                  {t('inquiryEquipmentFit') || (isArabic ? 'المقاسات وملاءمة ظهر الخيل' : 'Saddle fit & measurements')}
                </Text>
                <Ionicons name="logo-whatsapp" size={16} color="#16a34a" />
              </TouchableOpacity>

              <TouchableOpacity
                testID="inquiry-chip-condition"
                style={[styles.inquiryPresetBtn, isRTL && styles.rowRTL]}
                activeOpacity={0.8}
                onPress={() => handlePresetInquiry('condition')}
              >
                <Text style={styles.inquiryPresetIcon}>🔍</Text>
                <Text style={[styles.inquiryPresetText, isRTL && styles.textRTL]}>
                  {t('inquiryEquipmentCondition') || (isArabic ? 'فحص الجلد وسلامة الهيكل' : 'Leather condition & tree soundness')}
                </Text>
                <Ionicons name="logo-whatsapp" size={16} color="#16a34a" />
              </TouchableOpacity>

              <TouchableOpacity
                testID="inquiry-chip-delivery"
                style={[styles.inquiryPresetBtn, isRTL && styles.rowRTL]}
                activeOpacity={0.8}
                onPress={() => handlePresetInquiry('delivery')}
              >
                <Text style={styles.inquiryPresetIcon}>🚚</Text>
                <Text style={[styles.inquiryPresetText, isRTL && styles.textRTL]}>
                  {t('inquiryEquipmentDelivery') || (isArabic ? 'موقع الاستلام وخيارات الشحن' : 'Collection location & shipping')}
                </Text>
                <Ionicons name="logo-whatsapp" size={16} color="#16a34a" />
              </TouchableOpacity>

              <TouchableOpacity
                testID="inquiry-chip-trial"
                style={[styles.inquiryPresetBtn, isRTL && styles.rowRTL]}
                activeOpacity={0.8}
                onPress={() => handlePresetInquiry('trial')}
              >
                <Text style={styles.inquiryPresetIcon}>🏇</Text>
                <Text style={[styles.inquiryPresetText, isRTL && styles.textRTL]}>
                  {isArabic ? 'طلب تجربة ومقاس في الإسطبل' : 'Request stable trial & fitting'}
                </Text>
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
                  {isArabic ? 'حساب الضمان والتجربة' : 'Escrow & Stable Trial'}
                </Text>
                <Ionicons name="logo-whatsapp" size={16} color="#16a34a" />
              </TouchableOpacity>
            </View>
          </View>

          {/* SteedMarket Tack Authenticity Shield Card */}
          <View style={styles.protectionCard}>
            <View style={[styles.protectionHeader, isRTL && styles.rowRTL]}>
              <Ionicons name="shield-checkmark" size={18} color={COLORS.accent} />
              <Text style={[styles.protectionTitle, isRTL && styles.textRTL]}>
                {t('marketplaceProtectionTitle') || (isArabic ? 'درع حماية وأصالة المستلزمات' : 'SteedMarket Tack Authenticity Shield')}
              </Text>
            </View>
            <Text style={[styles.protectionDesc, isRTL && styles.textRTL]}>
              {t('marketplaceProtectionDesc') || (isArabic
                ? 'توثيق العلامة التجارية، حماية الدفع بالضمان، وفحص المقاس والمواصفات قبل الاستلام في إسطبلات الإمارات.'
                : 'Brand authenticity assurance, secure escrow payment protection, and stable fitting inspection across UAE stabling.')}
            </Text>
          </View>

          <SellerInfoCard seller={item.owner} isRTL={isRTL} t={t} />
        </View>
      </ScrollView>

      {/* Safe-Area Responsive Detail Action Bar */}
      <DetailActionBar
        title={item.title}
        actions={[
          { id: 'call', icon: 'call', label: t('callOwner') || (isArabic ? 'اتصال بالمالك' : 'Call Owner'), color: COLORS.primary, onPress: handleCallOwner },
          { id: 'whatsapp', icon: 'logo-whatsapp', label: t('whatsapp') || (isArabic ? 'واتساب' : 'WhatsApp'), color: '#16a34a', onPress: handleWhatsApp },
        ]}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  galleryContainer: {
    position: 'relative',
    width: '100%',
    height: 310,
    backgroundColor: '#0f172a',
  },
  galleryImage: {
    width: width,
    height: 310,
  },
  floatingBadgesRow: {
    position: 'absolute',
    bottom: 22,
    left: 14,
    right: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  floatingConditionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 56, 38, 0.92)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 4,
    ...SHADOWS.sm,
  },
  floatingConditionText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.white,
  },
  floatingBrandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(197, 160, 89, 0.92)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 4,
    ...SHADOWS.sm,
  },
  floatingBrandText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.white,
  },
  galleryFooterOverlay: {
    position: 'absolute',
    bottom: 4,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9,
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    marginHorizontal: 3,
  },
  activeDot: {
    backgroundColor: COLORS.white,
    width: 14,
  },
  counterPill: {
    position: 'absolute',
    right: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  counterPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.white,
  },
  floatingHeaderRow: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  floatingHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  floatingHotlineBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(37, 211, 102, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  vipAccreditationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(197, 160, 89, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
    gap: 6,
    marginTop: 6,
    marginBottom: 8,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  vipAccreditationText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  escrowBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAF9',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.35)',
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 12,
    gap: 10,
    ...SHADOWS.subtle,
  },
  escrowShieldIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(197, 160, 89, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  escrowBannerTextCol: {
    flex: 1,
  },
  escrowBannerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
  },
  escrowBannerSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 15,
    marginTop: 1,
  },
  backButtonRTL: {
    transform: [{ scaleX: -1 }],
  },
  crestBadgeWrapper: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderWidth: 1.5,
    borderColor: 'rgba(197, 160, 89, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  floatingHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  body: {
    padding: 16,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(15, 56, 38, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(15, 56, 38, 0.15)',
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    lineHeight: 28,
    marginBottom: 4,
  },
  brand: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  brandBold: {
    fontWeight: '700',
    color: COLORS.primary,
  },
  priceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(15, 56, 38, 0.08)',
    marginBottom: 16,
    ...SHADOWS.sm,
  },
  price: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 0.3,
  },
  stockText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  emiratePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(197, 160, 89, 0.14)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.4)',
    maxWidth: '55%',
    gap: 4,
  },
  emiratePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  sizesSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  sizesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sizeChip: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sizeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  customSizeChip: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE047',
  },
  customSizeChipText: {
    color: '#92400E',
    fontWeight: '700',
  },
  locationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
    gap: 8,
  },
  locationBoxText: {
    fontSize: 13,
    color: COLORS.text,
    flex: 1,
    fontWeight: '500',
  },
  section: {
    marginBottom: 16,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.textSecondary,
  },
  passportCard: {
    backgroundColor: '#FAF7F0',
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: '#E8DCBF',
    padding: 16,
    marginBottom: 16,
    ...SHADOWS.card,
  },
  passportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  passportBadgeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(197, 160, 89, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
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
    justifyContent: 'space-between',
    gap: 6,
  },
  passportTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primary,
  },
  passportSerialBadge: {
    backgroundColor: 'rgba(15, 56, 38, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  passportSerialText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  passportSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  passportGrid: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.25)',
    gap: 12,
  },
  passportGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  passportGridCol: {
    flex: 1,
  },
  passportColLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  passportColValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  passportActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  passportWhatsAppBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    borderRadius: RADIUS.md,
    paddingVertical: 9,
    gap: 6,
    ...SHADOWS.sm,
  },
  passportWhatsAppText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  passportExportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: 'rgba(15, 56, 38, 0.2)',
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 9,
    gap: 5,
  },
  passportExportText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  inquiryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(15, 56, 38, 0.1)',
    marginBottom: 16,
    ...SHADOWS.card,
  },
  inquiryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  inquiryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(15, 56, 38, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inquiryHeaderTexts: {
    flex: 1,
  },
  inquiryCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primary,
  },
  inquiryCardSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  inquiryChipsGrid: {
    gap: 8,
  },
  inquiryPresetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF7F0',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#E8DCBF',
    gap: 8,
  },
  inquiryPresetIcon: {
    fontSize: 16,
  },
  inquiryPresetText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  protectionCard: {
    backgroundColor: '#FAF7F0',
    borderWidth: 1.5,
    borderColor: '#E8DCBF',
    borderRadius: RADIUS.md,
    padding: 14,
    marginBottom: 16,
  },
  protectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  protectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
  },
  protectionDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  rejectionBanner: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  rejectionBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  rejectionBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.error,
  },
  rejectionBannerReason: {
    fontSize: 13,
    color: '#7f1d1d',
    lineHeight: 18,
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  textRTL: {
    textAlign: 'right',
  },
});
