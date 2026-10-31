import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import BrandMark from '../components/BrandMark';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../config/theme';
import * as apiService from '../services/api';

const LISTING_TYPES = [
  {
    id: 'horse',
    title_ar: 'بيع خيل',
    title_en: 'Sell a Horse',
    subtitle_ar: 'خيول عربية أصيلة، ثوروبريد، قفز حواجز مع توثيق الجواز',
    subtitle_en: 'Thoroughbreds, Arabian, Showjumpers with Passport verification',
    badge_ar: 'سوق الخيل النخبة',
    badge_en: 'VIP Horse Market',
    tag_ar: 'توثيق بيطري وجواز رقمي',
    tag_en: 'Vet Check & Passport',
    icon: 'horse',
    screen: 'CreateListingMain',
  },
  {
    id: 'equipment',
    title_ar: 'مستلزمات الخيل',
    title_en: 'Horse Equipment',
    subtitle_ar: 'سروج فاخرة، ألجمة، أدوات عناية ومكملات غذائية',
    subtitle_en: 'Saddles, bridles, luxury equestrian tack & health supplies',
    badge_ar: 'مستلزمات أصيلة',
    badge_en: 'Tack & Gear',
    tag_ar: 'شهادة أصالة وحالة',
    tag_en: 'Verified Condition',
    icon: 'shield-outline',
    screen: 'CreateEquipmentScreen',
  },
  {
    id: 'rider_gear',
    title_ar: 'مستلزمات الفارس',
    title_en: 'Rider Gear',
    subtitle_ar: 'خوذات أمان، أحذية ركوب، ملابس تدريب وبطولات راقية',
    subtitle_en: 'Helmets, riding boots, breeches & competition gear',
    badge_ar: 'أزياء النخبة',
    badge_en: 'Haute Boutique',
    tag_ar: 'معايير أمان معتمدة',
    tag_en: 'Safety Certified',
    icon: 'shirt-outline',
    screen: 'CreateRiderGearScreen',
  },
  {
    id: 'services',
    title_ar: 'الخدمات والإيواء',
    title_en: 'Services',
    subtitle_ar: 'إيواء مرابط، تدريب خيل، رعاية بيطرية ونقل معتمد',
    subtitle_en: 'Boarding, horse training, veterinary & transport',
    badge_ar: 'خدمات المرابط',
    badge_en: 'Services & Stables',
    tag_ar: 'مرافق مرخصة وحجز فوري',
    tag_en: 'Licensed Facilities',
    icon: 'construct-outline',
    screen: 'CreateServiceScreen',
  },
];

export default function SellHomeScreen({ navigation }) {
  const { language, isRTL, t } = useLanguage();
  const isArabic = language === 'ar';
  const { user, isAuthenticated } = useAuth();

  const [activeListingsCount, setActiveListingsCount] = useState(0);
  const [actionableOffers, setActionableOffers] = useState(0);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadSellerMetrics = useCallback(async () => {
    if (!isAuthenticated || !user?.id) return;
    setLoadingMetrics(true);
    try {
      const [horsesRes, offersRes] = await Promise.all([
        apiService.getHorses({ owner_id: user.id, limit: 100 }).catch(() => ({ data: [] })),
        apiService.getActionRequiredOffersCount().catch(() => ({ data: { actionable_count: 0 } })),
      ]);
      const horses = horsesRes.data?.horses || horsesRes.data?.items || horsesRes.data || [];
      setActiveListingsCount(Array.isArray(horses) ? horses.length : 0);
      setActionableOffers(offersRes.data?.actionable_count || 0);
    } catch {
      // Fallback gracefully
    } finally {
      setLoadingMetrics(false);
      setRefreshing(false);
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    loadSellerMetrics();
  }, [loadSellerMetrics]);

  const onRefresh = () => {
    setRefreshing(true);
    loadSellerMetrics();
  };

  const handleConciergeWhatsApp = () => {
    const text = isArabic
      ? 'مرحباً، أود استشارة مستشار مبيعات ستيد ماركت بخصوص إدراج إعلانات خيل أو خدمات مربط.'
      : 'Hello SteedMarket Seller Concierge, I would like guidance on listing horses or stable services.';
    const url = `https://wa.me/971500000000?text=${encodeURIComponent(text)}`;
    Linking.openURL(url).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          isAuthenticated ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          ) : undefined
        }
      >
        {/* Executive Header */}
        <View testID="seller-hub-header" style={[styles.header, isRTL && styles.headerRTL]}>
          <View style={[styles.headerBrandRow, isRTL && styles.headerBrandRowRTL]}>
            <View style={styles.brandIconWrapper}>
              <BrandMark size={28} />
            </View>

            <View style={[styles.headerTitleWrap, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <View testID="seller-portal-vip-badge" style={[styles.portalBadge, isRTL && styles.portalBadgeRTL]}>
                <View style={styles.portalBadgeDot} />
                <Ionicons name="ribbon" size={11} color="#D4AF37" />
                <Text style={styles.portalBadgeText}>
                  {isArabic ? 'بوابة البائعين والنخبة' : 'VIP MERCHANT & SELLER PORTAL'}
                </Text>
              </View>

              <Text style={[styles.headerTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                {isAuthenticated ? t('sellerHub') : isArabic ? 'ماذا تريد أن تبيع؟' : 'What do you want to sell?'}
              </Text>
              <Text style={[styles.headerSubtitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                {isAuthenticated
                  ? t('sellerHubSub')
                  : isArabic
                  ? 'اختر نوع الإعلان للمتابعة'
                  : 'Choose a listing type to continue'}
              </Text>
            </View>

            <TouchableOpacity
              testID="seller-hub-header-concierge-btn"
              style={styles.headerConciergeBtn}
              onPress={handleConciergeWhatsApp}
              accessibilityRole="button"
              accessibilityLabel="WhatsApp Concierge"
            >
              <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
            </TouchableOpacity>
          </View>

          {isAuthenticated && actionableOffers > 0 && (
            <TouchableOpacity
              testID="seller-hub-header-offers-badge"
              style={[styles.headerOffersAlert, isRTL && styles.rowRTL]}
              onPress={() => navigation.navigate('Offers')}
              activeOpacity={0.8}
            >
              <Ionicons name="notifications" size={14} color={COLORS.error} />
              <Text style={styles.headerOffersAlertText}>
                {isArabic
                  ? `${actionableOffers} عروض أسعار بانتظار ردك`
                  : `${actionableOffers} Buyer Offers Pending Response`}
              </Text>
              <Ionicons
                name={isRTL ? 'chevron-back' : 'chevron-forward'}
                size={14}
                color={COLORS.error}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Authenticated Seller Performance Metrics */}
        {isAuthenticated && (
          <View style={styles.metricsContainer}>
            <View style={[styles.cockpitTitleRow, isRTL && styles.rowRTL]}>
              <Ionicons name="stats-chart" size={14} color={COLORS.accentDark} />
              <Text style={[styles.cockpitTitle, isRTL && styles.textRTL]}>
                {isArabic ? 'مؤشرات أداء مبيعاتك' : 'SELLER PERFORMANCE COCKPIT'}
              </Text>
            </View>

            <View style={[styles.metricsGrid, isRTL && styles.rowRTL]}>
              {/* Active Listings */}
              <View testID="metric-active-listings" style={styles.metricCard}>
                <View style={styles.metricIconWrap}>
                  <Ionicons name="sparkles" size={15} color={COLORS.primary} />
                </View>
                <View style={styles.metricStatusPill}>
                  <View style={styles.statusDotLive} />
                  <Text style={styles.statusDotLabel}>{isArabic ? 'مباشر' : 'Live'}</Text>
                </View>
                <Text style={styles.metricValue}>
                  {loadingMetrics ? '…' : activeListingsCount}
                </Text>
                <Text style={styles.metricLabel}>{t('activeListingsMetric')}</Text>
              </View>

              {/* Estimated Views */}
              <View testID="metric-views" style={styles.metricCard}>
                <View style={[styles.metricIconWrap, { backgroundColor: '#FAF3E8' }]}>
                  <Ionicons name="eye-outline" size={15} color={COLORS.accentDark} />
                </View>
                <View style={styles.metricStatusPill}>
                  <Text style={styles.statusDotLabel}>{isArabic ? 'مشاهدات' : 'Views'}</Text>
                </View>
                <Text style={styles.metricValue}>
                  {loadingMetrics ? '…' : activeListingsCount * 42}
                </Text>
                <Text style={styles.metricLabel}>{t('viewsMetric')}</Text>
              </View>

              {/* Buyer Leads */}
              <View testID="metric-inquiries" style={styles.metricCard}>
                <View style={[styles.metricIconWrap, { backgroundColor: '#EBF3FA' }]}>
                  <Ionicons name="chatbubbles-outline" size={15} color="#2563EB" />
                </View>
                <View style={styles.metricStatusPill}>
                  <Text style={styles.statusDotLabel}>{isArabic ? 'تواصل' : 'Leads'}</Text>
                </View>
                <Text style={styles.metricValue}>
                  {loadingMetrics ? '…' : activeListingsCount * 3}
                </Text>
                <Text style={styles.metricLabel}>{t('inquiriesMetric')}</Text>
              </View>

              {/* Actionable Offers */}
              <TouchableOpacity
                testID="metric-pending-offers"
                style={[styles.metricCard, actionableOffers > 0 && styles.metricCardAlert]}
                onPress={() => navigation.navigate('Offers')}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.metricIconWrap,
                    { backgroundColor: actionableOffers > 0 ? '#FEE2E2' : '#F0ECE4' },
                  ]}
                >
                  <Ionicons
                    name="pricetag-outline"
                    size={15}
                    color={actionableOffers > 0 ? COLORS.error : COLORS.textSecondary}
                  />
                </View>
                <View
                  style={[
                    styles.metricStatusPill,
                    actionableOffers > 0 && { backgroundColor: '#FEE2E2' },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusDotLabel,
                      actionableOffers > 0 && { color: COLORS.error, fontWeight: '700' },
                    ]}
                  >
                    {actionableOffers > 0 ? (isArabic ? 'مطلوب رد' : 'Action') : (isArabic ? 'عروض' : 'Offers')}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.metricValue,
                    actionableOffers > 0 && { color: COLORS.error },
                  ]}
                >
                  {loadingMetrics ? '…' : actionableOffers}
                </Text>
                <Text style={styles.metricLabel}>{t('pendingOffersMetric')}</Text>
              </TouchableOpacity>
            </View>

            {/* Direct Quick Action to Offers */}
            <TouchableOpacity
              testID="seller-action-offers-btn"
              style={[styles.sellerActionOffersBtn, isRTL && styles.rowRTL]}
              onPress={() => navigation.navigate('Offers')}
              activeOpacity={0.82}
            >
              <View style={[styles.sellerActionOffersLeft, isRTL && styles.rowRTL]}>
                <View style={styles.sellerActionOffersIconWrap}>
                  <Ionicons name="pricetags-outline" size={16} color={COLORS.accentDark} />
                </View>
                <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                  <Text style={styles.sellerActionOffersTitle}>
                    {isArabic ? 'مراجعة عروض الأسعار والمفاوضات' : 'Review Buyer Offers & Inquiries'}
                  </Text>
                  <Text style={styles.sellerActionOffersSub}>
                    {isArabic
                      ? 'متابعة العروض الرسمية المقدمة على خيلك ومقتنياتك'
                      : 'Track formal bids and direct negotiation terms'}
                  </Text>
                </View>
              </View>

              <View style={[styles.sellerActionOffersRight, isRTL && styles.rowRTL]}>
                {actionableOffers > 0 && (
                  <View style={styles.offersCounterBadge}>
                    <Text style={styles.offersCounterBadgeText}>
                      {isArabic ? `${actionableOffers} جديد` : `${actionableOffers} new`}
                    </Text>
                  </View>
                )}
                <Ionicons
                  name={isRTL ? 'chevron-back' : 'chevron-forward'}
                  size={16}
                  color={COLORS.accentDark}
                />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Seller Tip Banner */}
        {isAuthenticated && (
          <View testID="seller-tip-card" style={styles.tipCard}>
            <View style={[styles.tipHeader, isRTL && styles.rowRTL]}>
              <View style={styles.tipIconWrap}>
                <Ionicons name="shield-checkmark" size={17} color={COLORS.accentDark} />
              </View>
              <Text style={[styles.tipTitle, isRTL && styles.textRTL]}>{t('sellerTipTitle')}</Text>
            </View>
            <Text style={[styles.tipDesc, isRTL && styles.textRTL]}>{t('sellerTipDesc')}</Text>
          </View>
        )}

        {/* Listing Type Cards Header */}
        <View style={[styles.sectionTitleRow, isRTL && styles.rowRTL]}>
          <Ionicons name="add-circle" size={18} color={COLORS.primary} />
          <Text style={[styles.sectionHeading, isRTL && styles.textRTL]}>
            {isArabic ? 'إضافة إعلان جديد' : 'Create New Listing'}
          </Text>
        </View>

        {LISTING_TYPES.map((item) => (
          <TouchableOpacity
            key={item.id}
            testID={`seller-hub-type-${item.id}`}
            style={[styles.card, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            activeOpacity={0.84}
            onPress={() => navigation.navigate(item.screen)}
          >
            <View style={styles.iconWrap}>
              {item.id === 'horse' ? (
                <>
                  <BrandMark size={26} color={COLORS.primary} />
                  <Text style={styles.srOnly}>horse</Text>
                </>
              ) : (
                <Ionicons name={item.icon} size={24} color={COLORS.primary} />
              )}
            </View>

            <View style={[styles.cardTextWrap, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <View style={[styles.cardHeaderLine, isRTL && styles.rowRTL]}>
                <Text style={[styles.cardTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                  {isArabic ? item.title_ar : item.title_en}
                </Text>
                <View
                  testID={`sell-type-badge-${item.id}`}
                  style={styles.cardTypeBadge}
                >
                  <Text style={styles.cardTypeBadgeText}>
                    {isArabic ? item.badge_ar : item.badge_en}
                  </Text>
                </View>
              </View>

              <Text style={[styles.cardSubtitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                {isArabic ? item.subtitle_ar : item.subtitle_en}
              </Text>

              <View style={[styles.cardFeatureTag, isRTL && styles.rowRTL]}>
                <Ionicons name="checkmark-circle-outline" size={12} color={COLORS.accentDark} />
                <Text style={styles.cardFeatureTagText}>
                  {isArabic ? item.tag_ar : item.tag_en}
                </Text>
              </View>
            </View>

            <View style={styles.cardChevronWrap}>
              <Ionicons
                name={isRTL ? 'chevron-back' : 'chevron-forward'}
                size={18}
                color={COLORS.accentDark}
              />
            </View>
          </TouchableOpacity>
        ))}

        {/* SteedMarket Merchant Escrow & Protection Shield */}
        <View testID="seller-merchant-shield" style={styles.merchantShieldCard}>
          <View style={[styles.merchantShieldHeader, isRTL && styles.rowRTL]}>
            <View style={styles.shieldIconWrap}>
              <Ionicons name="shield-checkmark" size={20} color={COLORS.accent} />
            </View>
            <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <Text style={[styles.merchantShieldTitle, isRTL && styles.textRTL]}>
                {isArabic ? 'حماية بائعي ستيد ماركت والدفع الموثوق' : 'SteedMarket Merchant Protection & Escrow'}
              </Text>
              <Text style={[styles.merchantShieldSubtitle, isRTL && styles.textRTL]}>
                {isArabic
                  ? 'منصة معتمدة لحماية مصالح الملاك والمربين في الخليج'
                  : 'Certified trading ecosystem for Gulf breeders & horse owners'}
              </Text>
            </View>
          </View>

          <View style={styles.shieldPillarsContainer}>
            <View style={[styles.shieldPillarRow, isRTL && styles.rowRTL]}>
              <Ionicons name="checkmark-circle" size={15} color={COLORS.accent} />
              <Text style={[styles.shieldPillarText, isRTL && styles.textRTL]}>
                {isArabic
                  ? 'وصول مباشر لكبار المشترين وملاك المرابط في الخليج'
                  : 'Direct high-net-worth VIP buyer reach across UAE & GCC'}
              </Text>
            </View>
            <View style={[styles.shieldPillarRow, isRTL && styles.rowRTL]}>
              <Ionicons name="checkmark-circle" size={15} color={COLORS.accent} />
              <Text style={[styles.shieldPillarText, isRTL && styles.textRTL]}>
                {isArabic
                  ? 'بدون رسوم خفية أو عمولات مفاجئة للإعلانات الفردية'
                  : 'Zero hidden listing fees for private equestrian sellers'}
              </Text>
            </View>
            <View style={[styles.shieldPillarRow, isRTL && styles.rowRTL]}>
              <Ionicons name="checkmark-circle" size={15} color={COLORS.accent} />
              <Text style={[styles.shieldPillarText, isRTL && styles.textRTL]}>
                {isArabic
                  ? 'توثيق الجواز الرقمي وخيار الدفع الآمن وحماية التفاوض'
                  : 'Digital passport verification and secure offer negotiations'}
              </Text>
            </View>
          </View>
        </View>

        {/* VIP Merchant & Breeder WhatsApp Concierge */}
        <View style={styles.conciergeCard}>
          <View style={[styles.conciergeHeader, isRTL && styles.rowRTL]}>
            <View style={styles.conciergeIconWrap}>
              <Ionicons name="ribbon-outline" size={20} color={COLORS.accentDark} />
            </View>
            <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <Text style={[styles.conciergeTitle, isRTL && styles.textRTL]}>
                {isArabic ? 'مستشار مبيعات كبار الملاك والمرابط' : 'VIP Breeder & Stable Concierge'}
              </Text>
              <Text style={[styles.conciergeSubtitle, isRTL && styles.textRTL]}>
                {isArabic
                  ? 'هل ترغب في إدراج مجموعة خيول خاصة أو توثيق خدمات مربطك؟'
                  : 'Need assistance listing a private collection or stable facilities?'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            testID="sell-merchant-concierge-btn"
            style={[styles.conciergeBtn, isRTL && styles.rowRTL]}
            onPress={handleConciergeWhatsApp}
            activeOpacity={0.85}
          >
            <Ionicons name="logo-whatsapp" size={18} color={COLORS.white} />
            <Text style={styles.conciergeBtnText}>
              {isArabic ? 'محادثة مستشار المبيعات عبر واتساب' : 'Chat with Merchant Concierge'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* VIP Off-Market Consignment & Private Sourcing Card */}
        <View testID="seller-offmarket-consignment-card" style={styles.offmarketCard}>
          <View style={[styles.offmarketHeader, isRTL && styles.rowRTL]}>
            <View style={styles.offmarketIconWrap}>
              <Ionicons name="sparkles" size={20} color={COLORS.accent} />
            </View>
            <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <View style={[styles.offmarketBadgeRow, isRTL && styles.rowRTL]}>
                <View style={styles.offmarketBadgeDot} />
                <Text style={styles.offmarketBadgeText}>
                  {isArabic ? 'وساطة الصفقات المغلقة والخيول الملكية' : 'VIP OFF-MARKET CONSIGNMENT'}
                </Text>
              </View>
              <Text style={[styles.offmarketTitle, isRTL && styles.textRTL]}>
                {isArabic ? 'صفقات الخيول الخاصة بدون إعلان عام' : 'Private & Confidential Equine Sourcing'}
              </Text>
              <Text style={[styles.offmarketSub, isRTL && styles.textRTL]}>
                {isArabic
                  ? 'هل تمتلك خيول نخبة، فحول إنتاج عالمية، أو مرابط ترغب في تسويقها بسرية تامة؟ نوفر شبكة خاصة لكبار المشترين وملاك المرابط الخليجية.'
                  : 'Selling champion pedigree bloodlines, breeding stallions, or private stables discreetly? Our VIP equine brokers manage confidential transactions with royal and institutional GCC buyers.'}
              </Text>
            </View>
          </View>

          <View style={styles.offmarketPillarsList}>
            <View style={[styles.offmarketPillarRow, isRTL && styles.rowRTL]}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={[styles.offmarketPillarText, isRTL && styles.textRTL]}>
                {isArabic ? 'سرية تامة وعقود عدم إفصاح رسمية معتمدة' : '100% confidential non-disclosure agreements (NDA)'}
              </Text>
            </View>
            <View style={[styles.offmarketPillarRow, isRTL && styles.rowRTL]}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={[styles.offmarketPillarText, isRTL && styles.textRTL]}>
                {isArabic ? 'فحص مالي وتأهيل مسبق للمشترين قبل المعاينة' : 'Pre-qualified buyer screening & private stable visits'}
              </Text>
            </View>
            <View style={[styles.offmarketPillarRow, isRTL && styles.rowRTL]}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={[styles.offmarketPillarText, isRTL && styles.textRTL]}>
                {isArabic ? 'إشراف كامل على الضمان المصرفي والفحص البيطري الدولي' : 'Direct escrow protection & international veterinary transfer'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            testID="seller-offmarket-concierge-btn"
            style={[styles.offmarketConsultBtn, isRTL && styles.rowRTL]}
            onPress={handleConciergeWhatsApp}
            activeOpacity={0.85}
          >
            <Ionicons name="logo-whatsapp" size={17} color="#25D366" />
            <Text style={styles.offmarketConsultBtnText}>
              {isArabic ? 'استشارة وسيط الصفقات الخاصة عبر واتساب' : 'Consult Private Equine Broker on WhatsApp'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Unauthenticated Seller Value Proposition */}
        {!isAuthenticated && (
          <View testID="unauthCard" style={styles.unauthCard}>
            <View style={styles.unauthIconWrap}>
              <Ionicons name="trophy-outline" size={32} color={COLORS.accentDark} />
            </View>
            <Text style={[styles.unauthTitle, isRTL && styles.textRTL]}>
              {isArabic ? 'بيع خيلك ومعداتك مع ستيد ماركت' : 'Sell to VIP Buyers Across the Gulf'}
            </Text>
            <Text style={[styles.unauthDesc, isRTL && styles.textRTL]}>
              {isArabic
                ? 'انضم إلى آلاف الملاك والمربين في الإمارات والخليج. احصل على تواصل مباشر عبر واتساب ودعم فحص بيطري موثق.'
                : 'Join elite breeders and owners. Get direct buyer WhatsApp inquiries and verified buyer trust.'}
            </Text>
            <TouchableOpacity
              testID="sell-signin-btn"
              style={styles.signInSellBtn}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('AuthStack')}
            >
              <Ionicons name="log-in-outline" size={18} color={COLORS.white} />
              <Text style={styles.signInSellBtnText}>{t('signIn')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl + 24,
  },
  header: {
    marginBottom: SPACING.md,
  },
  headerRTL: {
    alignItems: 'flex-end',
  },
  headerBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm + 2,
  },
  headerBrandRowRTL: {
    flexDirection: 'row-reverse',
  },
  brandIconWrapper: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(197, 160, 89, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.subtle,
  },
  headerTitleWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  headerConciergeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(37, 211, 102, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(37, 211, 102, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  portalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FAF5EA',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.4)',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: RADIUS.full,
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  portalBadgeRTL: {
    flexDirection: 'row-reverse',
    alignSelf: 'flex-end',
  },
  portalBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.accentDark,
  },
  portalBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: COLORS.accentDark,
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: COLORS.primary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  headerOffersAlert: {
    marginTop: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: RADIUS.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  headerOffersAlertText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.error,
  },
  metricsContainer: {
    marginBottom: SPACING.md,
  },
  cockpitTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  cockpitTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  metricCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.subtle,
  },
  metricCardAlert: {
    borderColor: COLORS.error,
    backgroundColor: '#FEF2F2',
  },
  metricIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  metricStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F3F4F6',
    paddingVertical: 1,
    paddingHorizontal: 5,
    borderRadius: 6,
    marginBottom: 2,
  },
  statusDotLive: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10B981',
  },
  statusDotLabel: {
    fontSize: 8,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
    marginTop: 2,
  },
  metricLabel: {
    fontSize: 8.5,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 2,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  sellerActionOffersBtn: {
    marginTop: 8,
    backgroundColor: '#FAF5EA',
    borderWidth: 1,
    borderColor: '#E8DCBF',
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...SHADOWS.subtle,
  },
  sellerActionOffersLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  sellerActionOffersIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(197, 160, 89, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerActionOffersTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: COLORS.primary,
  },
  sellerActionOffersSub: {
    fontSize: 10.5,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  sellerActionOffersRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  offersCounterBadge: {
    backgroundColor: COLORS.error,
    borderRadius: 10,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  offersCounterBadgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '800',
  },
  tipCard: {
    backgroundColor: '#FAF5EA',
    borderWidth: 1,
    borderColor: '#E8DCBF',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.subtle,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: 4,
  },
  tipIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(197, 160, 89, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.accentDark,
  },
  tipDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.xs + 2,
    marginTop: SPACING.xs,
  },
  sectionHeading: {
    fontSize: 13.5,
    fontWeight: '800',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.card,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextWrap: {
    flex: 1,
    marginHorizontal: 12,
  },
  cardHeaderLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  cardTypeBadge: {
    backgroundColor: '#FAF3E8',
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.3)',
  },
  cardTypeBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: COLORS.accentDark,
  },
  cardSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  cardFeatureTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
  },
  cardFeatureTagText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: COLORS.accentDark,
  },
  cardChevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FAF5EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  merchantShieldCard: {
    backgroundColor: '#0F1E2E',
    borderRadius: RADIUS.xl,
    padding: 16,
    marginTop: 8,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(197, 160, 89, 0.45)',
    ...SHADOWS.card,
  },
  merchantShieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  shieldIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(197, 160, 89, 0.18)',
    borderWidth: 1,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  merchantShieldTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.white,
  },
  merchantShieldSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.72)',
    marginTop: 2,
  },
  shieldPillarsContainer: {
    gap: 7,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 10,
  },
  shieldPillarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shieldPillarText: {
    fontSize: 11.5,
    color: 'rgba(255, 255, 255, 0.88)',
    flex: 1,
  },
  conciergeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.3)',
    ...SHADOWS.subtle,
  },
  conciergeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  conciergeIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FAF3E8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.3)',
  },
  conciergeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
  },
  conciergeSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  conciergeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#25D366',
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  conciergeBtnText: {
    color: COLORS.white,
    fontSize: 12.5,
    fontWeight: '700',
  },
  offmarketCard: {
    backgroundColor: 'rgba(15, 56, 38, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.35)',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  offmarketHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  offmarketIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(197, 160, 89, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  offmarketBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FAF5EA',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.35)',
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: RADIUS.full,
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  offmarketBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  offmarketBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: COLORS.accentDark,
    letterSpacing: 0.5,
  },
  offmarketTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 2,
  },
  offmarketSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  offmarketPillarsList: {
    gap: 7,
    marginVertical: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(15, 56, 38, 0.08)',
  },
  offmarketPillarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  offmarketPillarText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text,
  },
  offmarketConsultBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(37, 211, 102, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(37, 211, 102, 0.35)',
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
    marginTop: 4,
  },
  offmarketConsultBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D7B3E',
  },
  unauthCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginTop: 6,
    ...SHADOWS.card,
  },
  unauthIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(197, 160, 89, 0.15)',
    borderWidth: 1,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  unauthTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 6,
  },
  unauthDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: SPACING.md,
  },
  signInSellBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    paddingHorizontal: 28,
    ...SHADOWS.subtle,
  },
  signInSellBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  textRTL: {
    textAlign: 'right',
  },
  srOnly: {
    position: 'absolute',
    width: 0,
    height: 0,
    opacity: 0,
  },
});
