import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  Linking,
  ActivityIndicator,
  Alert,
  Modal,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Share,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getServiceDetail, sendServiceInquiry } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import DetailActionBar from '../components/DetailActionBar';
import SellerInfoCard from '../components/SellerInfoCard';
import BrandMark from '../components/BrandMark';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../config/theme';
import { toTelephoneNumber, toWhatsAppNumber } from '../utils/phoneNumbers';

const { width } = Dimensions.get('window');

export default function ServiceDetailScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { serviceId } = route.params || {};
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const heartScale = useRef(new Animated.Value(1)).current;

  // Inquiry Reservation Modal State
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [inquirerName, setInquirerName] = useState('');
  const [inquirerPhone, setInquirerPhone] = useState('');
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [submittingInquiry, setSubmittingInquiry] = useState(false);

  const { language: currentLanguage, t, isRTL } = useLanguage();
  const isArabic = currentLanguage === 'ar';

  useEffect(() => {
    async function loadDetail() {
      if (!serviceId) return;
      try {
        const response = await getServiceDetail(serviceId);
        setItem(response.data);
      } catch (error) {
        Alert.alert(t('error') || 'Error', isArabic ? 'فشل تحميل تفاصيل الخدمة.' : 'Failed to load service details.');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    }
    loadDetail();
  }, [serviceId]);

  const toggleFavorite = () => {
    Animated.sequence([
      Animated.timing(heartScale, { toValue: 1.3, duration: 120, useNativeDriver: true }),
      Animated.spring(heartScale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
    setIsFavorite(!isFavorite);
  };

  const handleCallProvider = () => {
    const phone = item?.provider?.phone_number || item?.provider?.profile?.phone_number;
    if (phone) {
      Linking.openURL(`tel:${toTelephoneNumber(phone)}`);
    } else {
      Alert.alert(t('error') || 'Error', isArabic ? 'رقم الهاتف غير متوفر.' : 'Phone number not available.');
    }
  };

  const handleWhatsApp = () => {
    const phone = item?.provider?.phone_number || item?.provider?.profile?.phone_number;
    if (phone) {
      const cleanPhone = toWhatsAppNumber(phone);
      const msg = encodeURIComponent(
        isArabic
          ? `مرحباً، أود الاستفسار عن خدمتك: ${item.title}`
          : `Hello, I am inquiring about your service: ${item.title}`
      );
      Linking.openURL(`https://wa.me/${cleanPhone}?text=${msg}`);
    } else {
      Alert.alert(t('error') || 'Error', isArabic ? 'رقم الهاتف غير متوفر.' : 'Phone number not available.');
    }
  };

  const handleShare = async () => {
    if (!item) return;
    const priceText = item.price ? `${Number(item.price).toLocaleString()} AED` : 'Quote';
    const message = isArabic
      ? `🏇 تفقد هذه الخدمة على ستيد ماركت: ${item.title} (${priceText}) - ${item.location_text || 'الإمارات'}\nhttps://steedmarket.ae/services/${item.id}`
      : `🏇 Check out this equine service on SteedMarket: ${item.title} (${priceText}) - ${item.location_text || 'UAE'}\nhttps://steedmarket.ae/services/${item.id}`;
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
    const priceText = item.price ? `${Number(item.price).toLocaleString()} AED` : 'Quote on Request';
    const text = isArabic
      ? `🏇 *جواز توثيق خدمات الفروسية - ستيد ماركت*\n*الخدمة:* ${item.title}\n*الموقع:* ${item.location_text || 'الإمارات'}\n*السعر:* ${priceText}\n*رقم التوثيق:* #SM-SRV-${String(item.id).slice(0, 6).toUpperCase()}\nhttps://steedmarket.ae/services/${item.id}`
      : `🏇 *SteedMarket Equine Service Passport*\n*Service:* ${item.title}\n*Location:* ${item.location_text || 'UAE'}\n*Rate:* ${priceText}\n*Serial:* #SM-SRV-${String(item.id).slice(0, 6).toUpperCase()}\nhttps://steedmarket.ae/services/${item.id}`;
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(text)}`);
  };

  const handleServiceCoordinatorHotline = () => {
    const text = isArabic
      ? `مرحباً منسق خدمات ستيد ماركت، أود المساعدة في تنسيق وحجز وضمان خدمة "${item.title}" (كود: #SM-SRV-${String(item.id).slice(0, 6).toUpperCase()}).`
      : `Hello SteedMarket Service Coordinator, I would like assistance coordinating, booking, and escrow securing service "${item.title}" (Ref: #SM-SRV-${String(item.id).slice(0, 6).toUpperCase()}).`;
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
      ? `مرحباً ستيد ماركت، أود تفعيل خدمة حساب الضمان وحماية حجز الخدمات (Escrow Service Protection) لخدمة "${item.title}".`
      : `Hello SteedMarket, I would like to activate Certified Escrow Service Protection for booking "${item.title}".`;
    const waUrl = `https://wa.me/971500000000?text=${encodeURIComponent(text)}`;
    try {
      const res = Linking.openURL(waUrl);
      if (res && typeof res.catch === 'function') {
        res.catch(() => {});
      }
    } catch (e) {}
  };

  const handlePresetInquiry = (presetType) => {
    const phone = item?.provider?.phone_number || item?.provider?.profile?.phone_number;
    if (!phone) {
      Alert.alert(t('error') || 'Error', isArabic ? 'رقم الهاتف غير متوفر.' : 'Phone number not available.');
      return;
    }
    const cleanPhone = toWhatsAppNumber(phone);
    const priceText = item.price ? `${Number(item.price).toLocaleString()} ${t('currencyAed') || 'AED'}` : '';
    let msg = '';

    switch (presetType) {
      case 'availability':
        msg = isArabic
          ? `مرحباً، بخصوص خدمة "${item.title}" (${priceText}):\n🗓️ ما هو أقرب موعد متاح لديكم لتقديم الخدمة وحجز موعد؟`
          : `Hello! Regarding your service "${item.title}" (${priceText}):\n🗓️ What is your earliest availability for this service?`;
        break;
      case 'area':
        msg = isArabic
          ? `مرحباً، أود الاستفسار عن نطاق خدمة "${item.title}":\n📍 هل تغطون منطقة وإسطبلات موقعي في الإمارات؟`
          : `Hello! Inquiring about service coverage for "${item.title}":\n📍 Do you cover my barn location in the UAE?`;
        break;
      case 'quote':
        msg = isArabic
          ? `مرحباً، بخصوص "${item.title}":\n💼 هل يمكن تزويدي بعرض سعر وتفاصيل الباقة لعدد من الخيول؟`
          : `Hello! Regarding "${item.title}":\n💼 Could you please share a detailed custom quote and package details?`;
        break;
      case 'chat':
        msg = isArabic
          ? `مرحباً، أود الاستفسار عن تفاصيل وحجز خدمة: ${item.title}`
          : `Hello! I would like to inquire about booking your service: ${item.title}`;
        break;
      case 'escrow':
        msg = isArabic
          ? `مرحباً، بخصوص خدمة "${item.title}" (${priceText}):\n🛡️ أود الحجز عبر نظام الضمان المالي المعتمد لستيد ماركت لضمان حقوق الطرفين.`
          : `Hello! Regarding your service "${item.title}" (${priceText}):\n🛡️ I would like to book through SteedMarket Certified Escrow Protection to secure milestone payments.`;
        break;
      default:
        msg = isArabic
          ? `مرحباً، أود الاستفسار عن خدمتك: ${item.title}`
          : `Hello, I am inquiring about your service: ${item.title}`;
    }

    Linking.openURL(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`);
  };

  const handleSendInquiry = async () => {
    if (!inquirerName.trim() || !inquirerPhone.trim()) {
      Alert.alert(t('error') || 'Error', isArabic ? 'يرجى إدخال الاسم ورقم الهاتف.' : 'Please enter name and phone number.');
      return;
    }

    setSubmittingInquiry(true);
    try {
      await sendServiceInquiry(item.id, {
        inquirer_name: inquirerName.trim(),
        inquirer_phone: inquirerPhone.trim(),
        message: inquiryMessage.trim() || null,
      });

      setShowInquiryModal(false);
      Alert.alert(
        'success',
        isArabic
          ? 'تم إرسال طلب الاستفسار / الحجز لمقدم الخدمة بنجاح.'
          : 'Inquiry / Reservation request sent successfully.'
      );
      setInquirerName('');
      setInquirerPhone('');
      setInquiryMessage('');
    } catch (error) {
      Alert.alert(
        t('error') || 'Error',
        error?.response?.data?.detail || (isArabic ? 'فشل إرسال الاستفسار.' : 'Failed to send inquiry.')
      );
    } finally {
      setSubmittingInquiry(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  if (!item) return null;

  const images = item.images?.length
    ? item.images
    : [{ id: '1', image_url: 'https://via.placeholder.com/600x400?text=Equestrian+Service' }];
  const categoryName = isArabic ? item.category?.name_ar : item.category?.name_en;

  const getPricingLabel = (pricingType, price) => {
    if (pricingType === 'inquiry' || !price) {
      return isArabic ? 'تواصل للاستفسار' : 'Inquiry Required';
    }
    const suffix = {
      fixed: 'AED',
      hourly: isArabic ? 'د.إ / ساعة' : 'AED / hr',
      daily: isArabic ? 'د.إ / يوم' : 'AED / day',
      monthly: isArabic ? 'د.إ / شهر' : 'AED / month',
      per_head: isArabic ? 'د.إ / رأس' : 'AED / head',
    }[pricingType] || 'AED';

    return `${Number(price).toLocaleString()} ${suffix}`;
  };

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

          {/* Floating Badges Stack */}
          <View style={[styles.floatingBadgesRow, isRTL && styles.rowRTL]}>
            {item.emergency_24_7 ? (
              <View testID="floating-service-emergency-badge" style={styles.floatingEmergencyBadge}>
                <Ionicons name="flash" size={12} color={COLORS.accent} />
                <Text style={styles.floatingEmergencyText}>
                  {isArabic ? 'طوارئ 24/7' : '24/7 Emergency'}
                </Text>
              </View>
            ) : null}

            {item.experience_years ? (
              <View testID="floating-service-exp-badge" style={styles.floatingExpBadge}>
                <Ionicons name="ribbon" size={12} color={COLORS.white} />
                <Text style={styles.floatingExpText}>
                  {item.experience_years} {isArabic ? 'سنوات خبرة' : 'Years Experience'}
                </Text>
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
              testID="service-back-button"
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
                testID="service-broker-hotline-btn"
                style={styles.floatingHotlineBtn}
                onPress={handleServiceCoordinatorHotline}
                accessibilityLabel="Service Coordinator WhatsApp Hotline"
              >
                <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
              </TouchableOpacity>

              <TouchableOpacity
                testID="service-share-button"
                style={styles.floatingHeaderBtn}
                onPress={handleShare}
                accessibilityLabel="Share Listing"
              >
                <Ionicons name="share-social-outline" size={20} color={COLORS.primary} />
              </TouchableOpacity>

              <TouchableOpacity
                testID="service-favorite-button"
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

          {categoryName && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{categoryName}</Text>
            </View>
          )}

          <Text style={[styles.title, isRTL && styles.textRTL]}>{item.title}</Text>

          {/* Price & Regional Stabling Header */}
          <View style={[styles.priceHeaderRow, isRTL && styles.rowRTL]}>
            <View>
              <Text style={styles.price}>{getPricingLabel(item.pricing_type, item.price)}</Text>
              <Text style={styles.priceSubText}>
                {item.pricing_type === 'inquiry'
                  ? (isArabic ? 'حسب متطلبات الخيل' : 'Based on horse requirements')
                  : (isArabic ? 'سعر معتمد شامل الضمان' : 'Verified escrow protected rate')}
              </Text>
            </View>

            {item.location_text ? (
              <View testID="service-location-pill" style={[styles.emiratePill, isRTL && styles.rowRTL]}>
                <Ionicons name="location-sharp" size={13} color={COLORS.primary} />
                <Text style={styles.emiratePillText} numberOfLines={1}>
                  {item.location_text}
                </Text>
              </View>
            ) : null}
          </View>

          {/* VIP Accreditation Badge */}
          <View testID="service-detail-vip-badge" style={[styles.vipAccreditationBadge, isRTL && styles.rowRTL]}>
            <View style={styles.livePulseDot} />
            <Ionicons name="ribbon" size={11} color="#D4AF37" />
            <Text style={styles.vipAccreditationText}>
              {isArabic ? 'خدمة فروسية معتمدة وموثقة التراخيص' : 'VIP ACCREDITED EQUINE SERVICE'}
            </Text>
          </View>

          {/* VIP Certified Service Escrow & Booking Ribbon */}
          <TouchableOpacity
            testID="service-detail-escrow-banner"
            style={[styles.escrowBanner, isRTL && styles.rowRTL]}
            onPress={handleEscrowConsultation}
            activeOpacity={0.88}
          >
            <View style={styles.escrowShieldIconWrap}>
              <Ionicons name="shield-checkmark" size={18} color="#C5A059" />
            </View>
            <View style={styles.escrowBannerTextCol}>
              <Text style={[styles.escrowBannerTitle, isRTL && styles.textRTL]}>
                {isArabic ? 'ضمان مالي وتأمين معتمد لحجز الخدمات' : 'VIP Certified Escrow & Booking Shield'}
              </Text>
              <Text style={[styles.escrowBannerSub, isRTL && styles.textRTL]}>
                {isArabic
                  ? 'حجز الدفعات مرحلياً حتى إتمام تقديم الخدمة ورضا مالك الخيل'
                  : 'Milestone escrow payment protection until full service completion'}
              </Text>
            </View>
            <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
          </TouchableOpacity>

          {/* Working Schedule & Availability Calendar */}
          {item.availability_calendar && (
            <View style={styles.calendarCard}>
              <View style={[styles.calendarHeader, isRTL && styles.rowRTL]}>
                <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
                <Text style={styles.calendarTitle}>
                  {isArabic ? 'جدول المواعيد وأوقات العمل' : 'Working Hours & Schedule'}
                </Text>
              </View>
              <Text style={[styles.calendarBody, isRTL && styles.textRTL]}>
                {item.availability_calendar}
              </Text>
            </View>
          )}

          {/* Location Box */}
          {item.location_text && (
            <View style={[styles.locationBox, isRTL && styles.rowRTL]}>
              <Ionicons name="location" size={20} color={COLORS.primary} />
              <Text style={[styles.locationBoxText, isRTL && styles.textRTL]}>{item.location_text}</Text>
            </View>
          )}

          {/* Description */}
          {item.description && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
                {t('description') || 'Description'}
              </Text>
              <Text style={[styles.descriptionText, isRTL && styles.textRTL]}>{item.description}</Text>
            </View>
          )}

          {/* Digital Equine Service Passport & Verification Card */}
          <View style={styles.passportCard}>
            <View style={[styles.passportHeader, isRTL && styles.rowRTL]}>
              <View style={styles.passportBadgeIconWrap}>
                <BrandMark size={22} />
              </View>
              <View style={[styles.passportHeaderTextWrap, isRTL && styles.passportHeaderTextWrapRTL]}>
                <View style={[styles.passportTitleRow, isRTL && styles.rowRTL]}>
                  <Text style={[styles.passportTitle, isRTL && styles.textRTL]}>
                    {isArabic ? 'جواز توثيق خدمات الفروسية' : 'Digital Service Passport'}
                  </Text>
                  <View style={styles.passportSerialBadge}>
                    <Text style={styles.passportSerialText}>
                      #SM-SRV-{String(item.id).slice(0, 6).toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.passportSubtitle, isRTL && styles.textRTL]}>
                  {isArabic
                    ? 'شهادة اعتماد واختصاص فروسية موثقة عبر ستيد ماركت'
                    : 'Verified Gulf equine service specification certificate'}
                </Text>
              </View>
            </View>

            <View style={styles.passportGrid}>
              <View style={[styles.passportGridRow, isRTL && styles.rowRTL]}>
                <View style={styles.passportGridCol}>
                  <Text style={styles.passportColLabel}>{isArabic ? 'القطاع' : 'Category'}</Text>
                  <Text style={styles.passportColValue}>{categoryName || (isArabic ? 'خدمة' : 'Service')}</Text>
                </View>
                <View style={styles.passportGridCol}>
                  <Text style={styles.passportColLabel}>{isArabic ? 'نوع الخدمة' : 'Service Type'}</Text>
                  <Text style={styles.passportColValue}>{item.service_type || (isArabic ? 'عام' : 'General')}</Text>
                </View>
                <View style={styles.passportGridCol}>
                  <Text style={styles.passportColLabel}>{isArabic ? 'الطوارئ' : 'Emergency'}</Text>
                  <Text style={[styles.passportColValue, { color: item.emergency_24_7 ? COLORS.accent : COLORS.primary }]}>
                    {item.emergency_24_7 ? (isArabic ? 'متاح 24/7' : '24/7 Available') : (isArabic ? 'مواعيد محددة' : 'Standard')}
                  </Text>
                </View>
              </View>

              <View style={[styles.passportGridRow, isRTL && styles.rowRTL]}>
                <View style={styles.passportGridCol}>
                  <Text style={styles.passportColLabel}>{isArabic ? 'نظام التسعير' : 'Rate Model'}</Text>
                  <Text style={styles.passportColValue}>
                    {item.pricing_type || (isArabic ? 'ثابت' : 'Fixed')}
                  </Text>
                </View>
                <View style={styles.passportGridCol}>
                  <Text style={styles.passportColLabel}>{isArabic ? 'الموقع' : 'Location'}</Text>
                  <Text style={styles.passportColValue} numberOfLines={1}>
                    {item.location_text || (isArabic ? 'الإمارات' : 'UAE')}
                  </Text>
                </View>
                <View style={styles.passportGridCol}>
                  <Text style={styles.passportColLabel}>{isArabic ? 'السعر' : 'Rate'}</Text>
                  <Text style={[styles.passportColValue, { color: COLORS.primary, fontWeight: '700' }]}>
                    {getPricingLabel(item.pricing_type, item.price)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Passport Quick Export Actions */}
            <View style={[styles.passportActionsRow, isRTL && styles.rowRTL]}>
              <TouchableOpacity
                testID="service-passport-share-whatsapp-btn"
                style={styles.passportWhatsAppBtn}
                onPress={handlePassportShareWhatsApp}
              >
                <Ionicons name="logo-whatsapp" size={15} color={COLORS.white} />
                <Text style={styles.passportWhatsAppText}>
                  {isArabic ? 'مشاركة الجواز عبر واتساب' : 'WhatsApp Passport'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                testID="service-passport-export-sheet-btn"
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

          {/* Smart Inquiry Assistant for Services */}
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
                  {t('inquiryAssistantSub') || (isArabic ? 'رسائل مهنية جاهزة للاستفسار والحجز بنقرة واحدة عبر واتساب' : '1-tap professional inquiry presets on WhatsApp')}
                </Text>
              </View>
            </View>

            <View style={styles.inquiryChipsGrid}>
              <TouchableOpacity
                testID="inquiry-chip-availability"
                style={[styles.inquiryPresetBtn, isRTL && styles.rowRTL]}
                activeOpacity={0.8}
                onPress={() => handlePresetInquiry('availability')}
              >
                <Text style={styles.inquiryPresetIcon}>🗓️</Text>
                <Text style={[styles.inquiryPresetText, isRTL && styles.textRTL]}>
                  {t('inquiryServiceAvailability') || (isArabic ? 'أقرب موعد متاح للحجز' : 'Earliest availability')}
                </Text>
                <Ionicons name="logo-whatsapp" size={16} color="#16a34a" />
              </TouchableOpacity>

              <TouchableOpacity
                testID="inquiry-chip-area"
                style={[styles.inquiryPresetBtn, isRTL && styles.rowRTL]}
                activeOpacity={0.8}
                onPress={() => handlePresetInquiry('area')}
              >
                <Text style={styles.inquiryPresetIcon}>📍</Text>
                <Text style={[styles.inquiryPresetText, isRTL && styles.textRTL]}>
                  {t('inquiryServiceArea') || (isArabic ? 'نطاق الخدمة والإسطبلات المغطاة' : 'Service area & stables coverage')}
                </Text>
                <Ionicons name="logo-whatsapp" size={16} color="#16a34a" />
              </TouchableOpacity>

              <TouchableOpacity
                testID="inquiry-chip-quote"
                style={[styles.inquiryPresetBtn, isRTL && styles.rowRTL]}
                activeOpacity={0.8}
                onPress={() => handlePresetInquiry('quote')}
              >
                <Text style={styles.inquiryPresetIcon}>💼</Text>
                <Text style={[styles.inquiryPresetText, isRTL && styles.textRTL]}>
                  {t('inquiryServiceQuote') || (isArabic ? 'طلب عرض سعر خاص ومخصص' : 'Custom quote & fleet packages')}
                </Text>
                <Ionicons name="logo-whatsapp" size={16} color="#16a34a" />
              </TouchableOpacity>

              <TouchableOpacity
                testID="inquiry-chip-chat"
                style={[styles.inquiryPresetBtn, isRTL && styles.rowRTL]}
                activeOpacity={0.8}
                onPress={() => handlePresetInquiry('chat')}
              >
                <Text style={styles.inquiryPresetIcon}>💬</Text>
                <Text style={[styles.inquiryPresetText, isRTL && styles.textRTL]}>
                  {isArabic ? 'محادثة مباشرة مع المزود' : 'Direct consultation on WhatsApp'}
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
                  {isArabic ? 'حساب الضمان والتأمين' : 'Escrow & Service Guarantee'}
                </Text>
                <Ionicons name="logo-whatsapp" size={16} color="#16a34a" />
              </TouchableOpacity>
            </View>
          </View>

          {/* SteedMarket Equine Service Guarantee Card */}
          <View style={styles.protectionCard}>
            <View style={[styles.protectionHeader, isRTL && styles.rowRTL]}>
              <Ionicons name="shield-checkmark" size={18} color={COLORS.accent} />
              <Text style={[styles.protectionTitle, isRTL && styles.textRTL]}>
                {t('marketplaceProtectionTitle') || (isArabic ? 'ضمان خدمات الفروسية المعتمدة' : 'SteedMarket Verified Service Guarantee')}
              </Text>
            </View>
            <Text style={[styles.protectionDesc, isRTL && styles.textRTL]}>
              {t('marketplaceProtectionDesc') || (isArabic
                ? 'مقدمو خدمات مرخصون ومعتمدون، حماية الدفع عبر حساب الضمان، وتغطية تأمينية للنقل والإيواء عبر إسطبلات الإمارات.'
                : 'Licensed and verified providers, escrow payment security, insured transport, and certified stabling standards across the UAE.')}
            </Text>
          </View>

          <SellerInfoCard seller={item.provider} isRTL={isRTL} t={t} />
        </View>
      </ScrollView>

      {/* Safe-Area Responsive Detail Action Bar */}
      <DetailActionBar
        title={item?.title}
        actions={[
          {
            id: 'inquiry',
            icon: 'chatbubbles',
            label: isArabic ? 'طلب حجز / استفسار' : 'Inquire / Reserve',
            color: COLORS.primary,
            onPress: () => setShowInquiryModal(true),
          },
          {
            id: 'call',
            icon: 'call',
            label: t('callOwner') || (isArabic ? 'اتصال بالمالك' : 'Call Owner'),
            color: '#16a34a',
            onPress: handleCallProvider,
          },
        ]}
      />

      {/* Inquiry Reservation Modal */}
      <Modal visible={showInquiryModal} animationType="slide" transparent>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={[styles.modalHeader, isRTL && styles.rowRTL]}>
                <Text style={styles.modalHeaderTitle}>
                  {isArabic ? 'إرسال طلب استفسار / حجز' : 'Send Inquiry Request'}
                </Text>
                <TouchableOpacity onPress={() => setShowInquiryModal(false)}>
                  <Ionicons name="close" size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <Text style={[styles.modalLabel, isRTL && styles.textRTL]}>
                  {isArabic ? 'الاسم بالكامل *' : 'Full Name *'}
                </Text>
                <TextInput
                  testID="modal-inquirer-name"
                  style={[styles.modalInput, { textAlign: isArabic ? 'right' : 'left' }]}
                  placeholder={isArabic ? 'أدخل اسمك...' : 'Enter your name...'}
                  value={inquirerName}
                  onChangeText={setInquirerName}
                  placeholderTextColor={COLORS.textLight}
                />

                <Text style={[styles.modalLabel, isRTL && styles.textRTL]}>
                  {isArabic ? 'رقم التواصل *' : 'Phone Number *'}
                </Text>
                <TextInput
                  testID="modal-inquirer-phone"
                  style={[styles.modalInput, { textAlign: isArabic ? 'right' : 'left' }]}
                  placeholder="+971501234567"
                  keyboardType="phone-pad"
                  value={inquirerPhone}
                  onChangeText={setInquirerPhone}
                  placeholderTextColor={COLORS.textLight}
                />

                <Text style={[styles.modalLabel, isRTL && styles.textRTL]}>
                  {isArabic ? 'رسالتك أو تفاصيل الطلب' : 'Message / Details'}
                </Text>
                <TextInput
                  testID="modal-inquiry-message"
                  style={[styles.modalInput, styles.modalTextArea, { textAlign: isArabic ? 'right' : 'left' }]}
                  placeholder={
                    isArabic
                      ? 'اكتب تفاصيل استفسارك أو تاريخ الحجز المطلوبة...'
                      : 'Details about your requested date or service...'
                  }
                  multiline
                  numberOfLines={3}
                  value={inquiryMessage}
                  onChangeText={setInquiryMessage}
                  placeholderTextColor={COLORS.textLight}
                />

                <TouchableOpacity
                  testID="modal-inquiry-submit-btn"
                  style={styles.modalSubmitBtn}
                  disabled={submittingInquiry}
                  onPress={handleSendInquiry}
                >
                  {submittingInquiry ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Text style={styles.modalSubmitBtnText}>
                      {isArabic ? 'إرسال الاستفسار' : 'Submit Request'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  floatingEmergencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 56, 38, 0.94)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.accent,
    gap: 4,
    ...SHADOWS.sm,
  },
  floatingEmergencyText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accent,
  },
  floatingExpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(197, 160, 89, 0.94)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 4,
    ...SHADOWS.sm,
  },
  floatingExpText: {
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
    marginBottom: 6,
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
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 0.3,
  },
  priceSubText: {
    fontSize: 11,
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
  calendarCard: {
    backgroundColor: '#FAF7F0',
    borderRadius: RADIUS.md,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8DCBF',
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  calendarTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  calendarBody: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 20,
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
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
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
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingVertical: 9,
    paddingHorizontal: 14,
    gap: 6,
  },
  passportExportText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  rejectionBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
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
    color: '#7F1D1D',
    lineHeight: 18,
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  textRTL: {
    textAlign: 'right',
  },
  inquiryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(15, 56, 38, 0.1)',
    marginBottom: 16,
    ...SHADOWS.sm,
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
    fontWeight: '700',
    color: COLORS.text,
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
    backgroundColor: '#FAF8F5',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EBE7E0',
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
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#E8DEC9',
    borderRadius: 12,
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
    fontWeight: '700',
    color: COLORS.primary,
  },
  protectionDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    ...SHADOWS.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 12,
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalBody: {
    paddingBottom: 10,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
    marginTop: 10,
  },
  modalInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
  },
  modalTextArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalSubmitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    ...SHADOWS.sm,
  },
  modalSubmitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
});
