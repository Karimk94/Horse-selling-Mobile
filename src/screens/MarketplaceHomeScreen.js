import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  FlatList,
  ActivityIndicator,
  Modal,
  Linking,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getEquipmentList, getRiderGearList, getServicesList } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../config/theme';
import BrandLogo from '../components/BrandLogo';
import BrandMark from '../components/BrandMark';

const MODULES = [
  {
    id: 'horses',
    title_ar: 'بيع الخيول',
    title_en: 'Horses',
    subtitle_ar: 'خيول أصيلة ومعتمدة',
    subtitle_en: 'Purebreds & Sport Horses',
    icon: 'horse',
    screen: 'HomeMain',
  },
  {
    id: 'equipment',
    title_ar: 'مستلزمات الخيل',
    title_en: 'Equipment',
    subtitle_ar: 'سروج ومعدات عناية',
    subtitle_en: 'Saddles, Tack & Care',
    icon: 'shield-outline',
    screen: 'EquipmentListScreen',
  },
  {
    id: 'rider_gear',
    title_ar: 'مستلزمات الفارس',
    title_en: 'Rider Gear',
    subtitle_ar: 'أزياء وخوذ وأحذية',
    subtitle_en: 'Apparel, Helmets & Boots',
    icon: 'shirt-outline',
    screen: 'RiderGearListScreen',
  },
  {
    id: 'services',
    title_ar: 'الخدمات والإيواء',
    title_en: 'Services',
    subtitle_ar: 'إيواء وتدريب ونقل',
    subtitle_en: 'Boarding, Training & Transport',
    icon: 'construct-outline',
    screen: 'ServiceListScreen',
  },
];

const QUICK_SHORTCUTS = [
  { id: 'saddles', titleKey: 'quickCategorySaddles', icon: 'shield-outline', screen: 'EquipmentListScreen', param: { searchQuery: 'Saddle' } },
  { id: 'helmets', titleKey: 'quickCategoryHelmets', icon: 'shield-checkmark-outline', screen: 'RiderGearListScreen', param: { searchQuery: 'Helmet' } },
  { id: 'stables', titleKey: 'quickCategoryStables', icon: 'home-outline', screen: 'ServiceListScreen', param: { searchQuery: 'Boarding' } },
  { id: 'transport', titleKey: 'quickCategoryTransport', icon: 'car-outline', screen: 'ServiceListScreen', param: { searchQuery: 'Transport' } },
  { id: 'boots', titleKey: 'quickCategoryBoots', icon: 'footsteps-outline', screen: 'RiderGearListScreen', param: { searchQuery: 'Boots' } },
];

export default function MarketplaceHomeScreen({ navigation }) {
  const { language, t, isRTL } = useLanguage();
  const { user } = useAuth();
  const isArabic = language === 'ar';
  const isAdmin = user?.role === 'admin';

  const [activeModule, setActiveModule] = useState('horses');
  const [searchQuery, setSearchQuery] = useState('');

  // Featured Items State
  const [featuredEquipment, setFeaturedEquipment] = useState([]);
  const [featuredRiderGear, setFeaturedRiderGear] = useState([]);
  const [featuredServices, setFeaturedServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Listing creation modal
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadHomeData = useCallback(async () => {
    try {
      const [eqRes, rgRes, srvRes] = await Promise.all([
        getEquipmentList({ limit: 5 }),
        getRiderGearList({ limit: 5 }),
        getServicesList({ limit: 5 }),
      ]);

      setFeaturedEquipment(eqRes.data?.items || []);
      setFeaturedRiderGear(rgRes.data?.items || []);
      setFeaturedServices(srvRes.data?.items || []);
    } catch (error) {
      console.warn('[MarketplaceHomeScreen] Load error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadHomeData();
  }, [loadHomeData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadHomeData();
  };

  const handleGlobalSearch = () => {
    if (!searchQuery.trim()) return;

    if (activeModule === 'equipment') {
      navigation.navigate('EquipmentListScreen', { searchQuery: searchQuery.trim() });
    } else if (activeModule === 'rider_gear') {
      navigation.navigate('RiderGearListScreen', { searchQuery: searchQuery.trim() });
    } else if (activeModule === 'services') {
      navigation.navigate('ServiceListScreen', { searchQuery: searchQuery.trim() });
    } else {
      navigation.navigate('HomeMain', { searchQuery: searchQuery.trim() });
    }
  };

  const handleHeaderConciergeHotline = () => {
    const text = isArabic
      ? 'مرحباً ستيد ماركت، أود استشارة الوسيط المعتمد بخصوص بيع، شراء أو توثيق خيل ومستلزمات فروسية.'
      : 'Hello SteedMarket Concierge, I need assistance with buying, selling, or verifying an equine listing on the marketplace.';
    try {
      const res = Linking.openURL(`https://wa.me/971500000000?text=${encodeURIComponent(text)}`);
      if (res && typeof res.catch === 'function') {
        res.catch(() => {});
      }
    } catch (e) {}
  };

  const handleConciergeChat = () => {
    const msg = isArabic
      ? 'مرحباً، أود المساعدة في البحث عن خيل أو مستلزمات عبر ستيد ماركت.'
      : 'Hello, I would like concierge assistance finding an equestrian listing on SteedMarket.';
    try {
      const res = Linking.openURL(`https://wa.me/971500000000?text=${encodeURIComponent(msg)}`);
      if (res && typeof res.catch === 'function') {
        res.catch(() => {});
      }
    } catch (e) {}
  };

  const handleEscrowConciergeConsultation = () => {
    const text = isArabic
      ? 'مرحباً ستيد ماركت، أود الاستفسار عن خدمة الضمان المالي والوساطة المعتمدة (Escrow) لإتمام صفقة فروسية آمنة.'
      : 'Hello SteedMarket Escrow Desk, I would like to inquire about certified escrow settlement protection for an equestrian transaction.';
    try {
      const res = Linking.openURL(`https://wa.me/971500000000?text=${encodeURIComponent(text)}`);
      if (res && typeof res.catch === 'function') {
        res.catch(() => {});
      }
    } catch (e) {}
  };

  const renderHorizontalCard = (item, type) => {
    const mainImage = item.images?.[0]?.image_url || 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=400';
    const detailScreen =
      type === 'equipment'
        ? 'EquipmentDetailScreen'
        : type === 'rider_gear'
        ? 'RiderGearDetailScreen'
        : 'ServiceDetailScreen';
    const paramKey =
      type === 'equipment'
        ? 'equipmentId'
        : type === 'rider_gear'
        ? 'riderGearId'
        : 'serviceId';

    const categoryName = isArabic
      ? item.category?.name_ar || item.category_name_ar
      : item.category?.name_en || item.category_name_en;

    const locationText = item.location_text || item.location;

    return (
      <TouchableOpacity
        style={styles.hCard}
        activeOpacity={0.88}
        onPress={() => navigation.navigate(detailScreen, { [paramKey]: item.id })}
      >
        <View style={styles.hCardImageContainer}>
          <Image source={{ uri: mainImage }} style={styles.hCardImage} resizeMode="cover" />
          {categoryName && (
            <View style={[styles.hCardCategoryPill, isRTL ? styles.pillRTL : styles.pillLTR]}>
              <Text style={styles.hCardCategoryText} numberOfLines={1}>
                {categoryName}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.hCardBody}>
          <Text style={[styles.hCardTitle, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
            {item.title}
          </Text>

          {locationText && (
            <View style={[styles.hCardMetaRow, isRTL && styles.rowRTL]}>
              <Ionicons name="location" size={12} color={COLORS.accentDark} />
              <Text style={[styles.hCardMetaText, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
                {locationText}
              </Text>
            </View>
          )}

          <View style={[styles.hCardPriceRow, isRTL && styles.rowRTL]}>
            <Text style={styles.hCardPrice}>
              {item.price ? `${item.price.toLocaleString()} ${t('currencyAed') || 'AED'}` : 'POA'}
            </Text>
            {item.brand ? (
              <View style={styles.brandChip}>
                <Text style={styles.hCardBrandText} numberOfLines={1}>
                  {item.brand}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyCategoryCard = (categoryType, createScreen) => (
    <View style={styles.emptyCardContainer}>
      <View style={styles.emptyCardIconWrap}>
        <Ionicons name="sparkles-outline" size={24} color={COLORS.accent} />
      </View>
      <Text style={[styles.emptyCardTitle, isRTL && styles.textRTL]}>{t('beFirstToList')}</Text>
      <Text style={[styles.emptyCardSub, isRTL && styles.textRTL]}>{t('beFirstToListSub')}</Text>
      <TouchableOpacity
        style={styles.emptyCardBtn}
        onPress={() => navigation.navigate(createScreen)}
        activeOpacity={0.85}
      >
        <Ionicons name="add-circle-outline" size={16} color={COLORS.white} />
        <Text style={styles.emptyCardBtnText}>{t('listNow')}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Header Bar */}
        <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.headerBrandCol, isRTL && styles.rowRTL]}>
            <View style={[styles.brandIconWrapper, isRTL && { marginRight: 0, marginLeft: 10 }]}>
              <BrandMark size={28} />
            </View>
            <View style={styles.headerTexts}>
              <Text style={[styles.brandSubtitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                {t('marketplaceHeroSubtitle')}
              </Text>
              <BrandLogo
                title={isArabic ? 'الخيل والخدمات' : 'SteedMarket Hub'}
                iconSize={26}
                showVipBadge={true}
                textStyle={[styles.brandTitle, { textAlign: isRTL ? 'right' : 'left' }]}
                style={styles.brandTitleRow}
              />
            </View>
          </View>

          <View style={[styles.headerActions, isRTL && styles.rowRTL]}>
            <TouchableOpacity
              testID="marketplace-header-hotline-btn"
              style={styles.headerHotlineBtn}
              onPress={handleHeaderConciergeHotline}
              activeOpacity={0.8}
              accessibilityLabel="Marketplace Concierge Hotline"
            >
              <Ionicons name="logo-whatsapp" size={17} color="#25D366" />
            </TouchableOpacity>

            <TouchableOpacity
              testID="marketplace-header-offers-btn"
              style={styles.headerActionBtn}
              onPress={() => navigation.navigate('OffersScreen')}
              accessibilityLabel="Offers & Negotiations"
            >
              <Ionicons name="chatbubble-ellipses-outline" size={20} color={COLORS.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              testID="marketplace-header-create-btn"
              style={[styles.headerCreateBtn, isRTL && styles.rowRTL]}
              onPress={() => setShowCreateModal(true)}
              accessibilityLabel="Post Listing"
            >
              <Ionicons name="add-circle" size={18} color={COLORS.accent} />
              <Text style={styles.headerCreateText}>
                {isArabic ? 'إضافة' : 'Post'}
              </Text>
            </TouchableOpacity>

            {isAdmin && (
              <TouchableOpacity
                testID="marketplace-admin-badge"
                style={styles.adminBadge}
                onPress={() => navigation.navigate('AdminModerationDashboardScreen')}
                activeOpacity={0.8}
              >
                <Ionicons name="shield-checkmark" size={16} color={COLORS.accentDark} />
                <Text style={styles.adminBadgeText}>{isArabic ? 'الإدارة' : 'Admin'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Global Search Bar */}
        <View style={[styles.searchBarContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Ionicons name="search-outline" size={20} color={COLORS.primary} />
          <TextInput
            testID="marketplace-search-input"
            style={[styles.searchInput, { textAlign: isRTL ? 'right' : 'left' }]}
            placeholder={isArabic ? 'ابحث عن خيل، معدات، ملابس، أو خدمات...' : 'Search horses, equipment, gear, services...'}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleGlobalSearch}
            placeholderTextColor={COLORS.textLight}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              testID="marketplace-search-clear-btn"
              onPress={() => setSearchQuery('')}
              style={styles.clearBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle" size={18} color={COLORS.textLight} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            testID="marketplace-search-submit-btn"
            style={styles.searchSubmitBtn}
            onPress={handleGlobalSearch}
            activeOpacity={0.8}
          >
            <Ionicons name={isRTL ? 'arrow-back' : 'arrow-forward'} size={18} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        {/* Search Domain Scope Selector */}
        <View style={[styles.scopeBar, isRTL && styles.rowRTL]}>
          <TouchableOpacity
            testID="marketplace-scope-horses"
            style={[styles.scopeChip, activeModule === 'horses' && styles.activeScopeChip]}
            onPress={() => setActiveModule('horses')}
          >
            <Text style={[styles.scopeChipText, activeModule === 'horses' && styles.activeScopeChipText]}>
              {isArabic ? 'سوق الخيل' : 'Horse Market'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="marketplace-scope-equipment"
            style={[styles.scopeChip, activeModule === 'equipment' && styles.activeScopeChip]}
            onPress={() => setActiveModule('equipment')}
          >
            <Text style={[styles.scopeChipText, activeModule === 'equipment' && styles.activeScopeChipText]}>
              {isArabic ? 'سوق المستلزمات' : 'Tack & Supplies'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="marketplace-scope-rider_gear"
            style={[styles.scopeChip, activeModule === 'rider_gear' && styles.activeScopeChip]}
            onPress={() => setActiveModule('rider_gear')}
          >
            <Text style={[styles.scopeChipText, activeModule === 'rider_gear' && styles.activeScopeChipText]}>
              {isArabic ? 'أزياء الفارس' : 'Rider Apparel'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="marketplace-scope-services"
            style={[styles.scopeChip, activeModule === 'services' && styles.activeScopeChip]}
            onPress={() => setActiveModule('services')}
          >
            <Text style={[styles.scopeChipText, activeModule === 'services' && styles.activeScopeChipText]}>
              {isArabic ? 'دليل الخدمات' : 'Equine Services'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* VIP Equine Concierge Banner */}
        <View style={styles.conciergeBanner}>
          <View style={[styles.conciergeHeader, isRTL && styles.rowRTL]}>
            <View style={styles.conciergeIconBadge}>
              <Ionicons name="chatbubbles" size={20} color={COLORS.accent} />
            </View>
            <View style={styles.conciergeTexts}>
              <Text style={[styles.conciergeTitle, isRTL && styles.textRTL]}>
                {t('conciergeBannerTitle')}
              </Text>
              <Text style={[styles.conciergeDesc, isRTL && styles.textRTL]}>
                {t('conciergeBannerDesc')}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            testID="marketplace-concierge-chat-btn"
            style={[styles.conciergeActionBtn, isRTL && styles.rowRTL]}
            onPress={handleConciergeChat}
            activeOpacity={0.85}
          >
            <Ionicons name="logo-whatsapp" size={18} color={COLORS.white} />
            <Text style={styles.conciergeActionText}>{t('chatWithConcierge')}</Text>
          </TouchableOpacity>
        </View>

        {/* Module Navigation Grid */}
        <View style={styles.moduleGrid}>
          {MODULES.map((m) => {
            const isSelected = activeModule === m.id;
            return (
              <TouchableOpacity
                key={m.id}
                testID={`module-card-${m.id}`}
                style={[styles.moduleCard, isSelected && styles.activeModuleCard]}
                activeOpacity={0.82}
                onPress={() => {
                  setActiveModule(m.id);
                  navigation.navigate(m.screen);
                }}
              >
                <View style={[styles.moduleIconContainer, isSelected && styles.activeModuleIcon]}>
                  {m.id === 'horses' ? (
                    <>
                      <BrandMark size={24} color={isSelected ? COLORS.white : COLORS.primary} />
                      <Text style={styles.srOnly}>horse</Text>
                    </>
                  ) : (
                    <Ionicons name={m.icon} size={24} color={isSelected ? COLORS.white : COLORS.primary} />
                  )}
                </View>
                <Text style={[styles.moduleTitle, isSelected && styles.activeModuleTitle]}>
                  {isArabic ? m.title_ar : m.title_en}
                </Text>
                <Text style={[styles.moduleSubtitle, isSelected && styles.activeModuleSubtitle]}>
                  {isArabic ? m.subtitle_ar : m.subtitle_en}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Quick Category Shortcuts */}
        <View style={styles.shortcutsSection}>
          <ScrollView
            horizontal
            inverted={isRTL}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.shortcutsContent}
          >
            {QUICK_SHORTCUTS.map((item) => (
              <TouchableOpacity
                key={item.id}
                testID={`shortcut-chip-${item.id}`}
                style={[styles.shortcutChip, isRTL && styles.rowRTL]}
                activeOpacity={0.8}
                onPress={() => navigation.navigate(item.screen, item.param)}
              >
                <Ionicons name={item.icon} size={15} color={COLORS.primary} />
                <Text style={styles.shortcutChipText}>{t(item.titleKey)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Featured Sections */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>
              {isArabic ? 'جاري تحميل مقتطفات السوق...' : 'Curating regional catalog...'}
            </Text>
          </View>
        ) : (
          <>
            {/* Featured Horse Equipment */}
            <View style={[styles.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.sectionTitleRow, isRTL && styles.rowRTL]}>
                <Ionicons name="shield-outline" size={18} color={COLORS.primary} />
                <Text style={styles.sectionTitle}>{isArabic ? 'معدات ومستلزمات الخيل' : 'Horse Equipment'}</Text>
              </View>
              <TouchableOpacity
                testID="see-all-equipment-btn"
                onPress={() => navigation.navigate('EquipmentListScreen')}
              >
                <Text style={styles.seeAllText}>{isArabic ? 'عرض الكل' : 'See All'}</Text>
              </TouchableOpacity>
            </View>
            {featuredEquipment.length === 0 ? (
              renderEmptyCategoryCard('equipment', 'CreateEquipmentScreen')
            ) : (
              <FlatList
                horizontal
                inverted={isRTL}
                showsHorizontalScrollIndicator={false}
                data={featuredEquipment}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => renderHorizontalCard(item, 'equipment')}
                contentContainerStyle={styles.hListContent}
              />
            )}

            {/* Featured Rider Gear */}
            <View style={[styles.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.sectionTitleRow, isRTL && styles.rowRTL]}>
                <Ionicons name="shirt-outline" size={18} color={COLORS.primary} />
                <Text style={styles.sectionTitle}>{isArabic ? 'مستلزمات وملابس الفارس' : 'Rider Apparel & Gear'}</Text>
              </View>
              <TouchableOpacity
                testID="see-all-rider-gear-btn"
                onPress={() => navigation.navigate('RiderGearListScreen')}
              >
                <Text style={styles.seeAllText}>{isArabic ? 'عرض الكل' : 'See All'}</Text>
              </TouchableOpacity>
            </View>
            {featuredRiderGear.length === 0 ? (
              renderEmptyCategoryCard('rider_gear', 'CreateRiderGearScreen')
            ) : (
              <FlatList
                horizontal
                inverted={isRTL}
                showsHorizontalScrollIndicator={false}
                data={featuredRiderGear}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => renderHorizontalCard(item, 'rider_gear')}
                contentContainerStyle={styles.hListContent}
              />
            )}

            {/* Featured Services */}
            <View style={[styles.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.sectionTitleRow, isRTL && styles.rowRTL]}>
                <Ionicons name="construct-outline" size={18} color={COLORS.primary} />
                <Text style={styles.sectionTitle}>{isArabic ? 'الخدمات والإيواء والتدريب' : 'Services & Boarding'}</Text>
              </View>
              <TouchableOpacity
                testID="see-all-services-btn"
                onPress={() => navigation.navigate('ServiceListScreen')}
              >
                <Text style={styles.seeAllText}>{isArabic ? 'عرض الكل' : 'See All'}</Text>
              </TouchableOpacity>
            </View>
            {featuredServices.length === 0 ? (
              renderEmptyCategoryCard('services', 'CreateServiceScreen')
            ) : (
              <FlatList
                horizontal
                inverted={isRTL}
                showsHorizontalScrollIndicator={false}
                data={featuredServices}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => renderHorizontalCard(item, 'services')}
                contentContainerStyle={styles.hListContent}
              />
            )}

            {/* SteedMarket Equine Trust & Assurance Pillars */}
            <View style={styles.trustSection}>
              <View style={[styles.trustSectionHeader, isRTL && styles.rowRTL]}>
                <Ionicons name="shield-checkmark" size={22} color={COLORS.accent} />
                <Text style={[styles.trustSectionTitle, isRTL && styles.textRTL]}>
                  {t('marketplaceProtectionTitle')}
                </Text>
              </View>

              <View style={styles.trustPillarsGrid}>
                <View style={[styles.trustPillarItem, isRTL && styles.rowRTL]}>
                  <View style={styles.trustPillarIconWrap}>
                    <Ionicons name="ribbon-outline" size={18} color={COLORS.primary} />
                  </View>
                  <View style={styles.trustPillarTexts}>
                    <Text style={[styles.trustPillarTitle, isRTL && styles.textRTL]}>
                      {t('trustAssuranceNetwork')}
                    </Text>
                    <Text style={[styles.trustPillarDesc, isRTL && styles.textRTL]}>
                      {t('trustAssuranceNetworkDesc')}
                    </Text>
                  </View>
                </View>

                <View style={[styles.trustPillarItem, isRTL && styles.rowRTL]}>
                  <View style={styles.trustPillarIconWrap}>
                    <Ionicons name="logo-whatsapp" size={18} color="#16a34a" />
                  </View>
                  <View style={styles.trustPillarTexts}>
                    <Text style={[styles.trustPillarTitle, isRTL && styles.textRTL]}>
                      {t('trustAssuranceDirect')}
                    </Text>
                    <Text style={[styles.trustPillarDesc, isRTL && styles.textRTL]}>
                      {t('trustAssuranceDirectDesc')}
                    </Text>
                  </View>
                </View>

                <View style={[styles.trustPillarItem, isRTL && styles.rowRTL]}>
                  <View style={styles.trustPillarIconWrap}>
                    <Ionicons name="shield-outline" size={18} color={COLORS.accentDark} />
                  </View>
                  <View style={styles.trustPillarTexts}>
                    <Text style={[styles.trustPillarTitle, isRTL && styles.textRTL]}>
                      {t('trustAssuranceInspected')}
                    </Text>
                    <Text style={[styles.trustPillarDesc, isRTL && styles.textRTL]}>
                      {t('trustAssuranceInspectedDesc')}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Certified Escrow Protection CTA */}
              <TouchableOpacity
                testID="marketplace-trust-escrow-btn"
                style={[styles.trustEscrowBtn, isRTL && styles.rowRTL]}
                onPress={handleEscrowConciergeConsultation}
                activeOpacity={0.85}
              >
                <View style={styles.trustEscrowPulseDot} />
                <Ionicons name="shield-checkmark" size={16} color="#D4AF37" />
                <Text style={styles.trustEscrowBtnText}>
                  {isArabic ? 'طلب استشارة الوساطة والضمان المالي (Escrow)' : 'Inquire for Escrow & Broker Settlement'}
                </Text>
                <Ionicons name="logo-whatsapp" size={15} color="#25D366" />
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* Floating Create Button */}
      <TouchableOpacity
        testID="marketplace-create-button"
        style={styles.fabButton}
        activeOpacity={0.85}
        onPress={() => setShowCreateModal(true)}
      >
        <Ionicons name="add" size={28} color={COLORS.white} />
      </TouchableOpacity>

      {/* Create Listing Type Selection Modal */}
      <Modal visible={showCreateModal} animationType="fade" transparent>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCreateModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeaderBrand}>
              <BrandMark size={36} />
              <Text style={styles.modalTitle}>
                {isArabic ? 'اختر قسم الإعلان الجديد' : 'Select Listing Category'}
              </Text>
              <Text style={styles.modalSubtitle}>
                {isArabic ? 'انشر إعلانك في سوق الفروسية الخليجي المعتمد' : 'Publish your listing on the Gulf equine marketplace'}
              </Text>
            </View>

            <TouchableOpacity
              testID="marketplace-create-horse-option"
              style={[styles.modalOption, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={() => {
                setShowCreateModal(false);
                navigation.navigate('CreateListingMain');
              }}
              activeOpacity={0.8}
            >
              <View style={styles.modalOptionIconCrest}>
                <BrandMark size={20} color={COLORS.primary} />
              </View>
              <View style={styles.modalOptionTextWrap}>
                <Text style={[styles.modalOptionText, isRTL && styles.textRTL]}>
                  {isArabic ? 'إضافة حصان للبيع' : 'Add a Horse Listing'}
                </Text>
                <Text style={[styles.modalOptionSubtext, isRTL && styles.textRTL]}>
                  {isArabic ? 'خيول عربية، قفز حواجز، قدرة وجمال' : 'Arabian, Showjumping, Endurance'}
                </Text>
              </View>
              <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={COLORS.accent} />
            </TouchableOpacity>

            <TouchableOpacity
              testID="marketplace-create-equipment-option"
              style={[styles.modalOption, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={() => {
                setShowCreateModal(false);
                navigation.navigate('CreateEquipmentScreen');
              }}
              activeOpacity={0.8}
            >
              <View style={styles.modalOptionIconCrest}>
                <Ionicons name="shield-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.modalOptionTextWrap}>
                <Text style={[styles.modalOptionText, isRTL && styles.textRTL]}>
                  {isArabic ? 'إضافة مستلزمات خيل' : 'Add Horse Equipment'}
                </Text>
                <Text style={[styles.modalOptionSubtext, isRTL && styles.textRTL]}>
                  {isArabic ? 'سروج، لجام، أدوات عناية ومكملات' : 'Saddles, bridles, grooming & care'}
                </Text>
              </View>
              <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={COLORS.accent} />
            </TouchableOpacity>

            <TouchableOpacity
              testID="marketplace-create-rider-gear-option"
              style={[styles.modalOption, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={() => {
                setShowCreateModal(false);
                navigation.navigate('CreateRiderGearScreen');
              }}
              activeOpacity={0.8}
            >
              <View style={styles.modalOptionIconCrest}>
                <Ionicons name="shirt-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.modalOptionTextWrap}>
                <Text style={[styles.modalOptionText, isRTL && styles.textRTL]}>
                  {isArabic ? 'إضافة مستلزمات فارس' : 'Add Rider Gear'}
                </Text>
                <Text style={[styles.modalOptionSubtext, isRTL && styles.textRTL]}>
                  {isArabic ? 'خوذ أمان، ملابس سباق، أحذية ركوب' : 'Helmets, breeches, riding boots'}
                </Text>
              </View>
              <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={COLORS.accent} />
            </TouchableOpacity>

            <TouchableOpacity
              testID="marketplace-create-service-option"
              style={[styles.modalOption, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={() => {
                setShowCreateModal(false);
                navigation.navigate('CreateServiceScreen');
              }}
              activeOpacity={0.8}
            >
              <View style={styles.modalOptionIconCrest}>
                <Ionicons name="construct-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.modalOptionTextWrap}>
                <Text style={[styles.modalOptionText, isRTL && styles.textRTL]}>
                  {isArabic ? 'إضافة خدمة جديدة' : 'Add Equestrian Service'}
                </Text>
                <Text style={[styles.modalOptionSubtext, isRTL && styles.textRTL]}>
                  {isArabic ? 'إيواء مرابط، تدريب خيل، نقل معتمد' : 'Boarding, training, equine transport'}
                </Text>
              </View>
              <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={COLORS.accent} />
            </TouchableOpacity>

            <TouchableOpacity
              testID="marketplace-create-modal-close"
              style={styles.modalCancelBtn}
              onPress={() => setShowCreateModal(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCancelText}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: 88,
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  textRTL: {
    textAlign: 'right',
  },
  header: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm + 4,
    paddingBottom: SPACING.xs,
  },
  headerBrandCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  brandIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(197, 160, 89, 0.14)',
    borderWidth: 1.5,
    borderColor: 'rgba(197, 160, 89, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerTexts: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerHotlineBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#A5D6A7',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.subtle,
  },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: 'rgba(15, 56, 38, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.subtle,
  },
  headerCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 56, 38, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.35)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: RADIUS.md,
    gap: 4,
  },
  headerCreateText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  brandSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.primary,
  },
  brandTitleRow: {
    alignSelf: 'stretch',
    justifyContent: 'flex-start',
  },
  scopeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    gap: 8,
    marginBottom: SPACING.xs,
  },
  scopeChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  activeScopeChip: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  scopeChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  activeScopeChipText: {
    color: COLORS.white,
    fontWeight: '700',
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.accent,
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    ...SHADOWS.subtle,
  },
  adminBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    marginLeft: 4,
  },
  searchBarContainer: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.sm,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.card,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 13,
    color: COLORS.text,
    marginHorizontal: 8,
  },
  clearBtn: {
    padding: 4,
    marginRight: 4,
  },
  searchSubmitBtn: {
    backgroundColor: COLORS.primary,
    width: 34,
    height: 34,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  conciergeBanner: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.accent,
    ...SHADOWS.card,
  },
  conciergeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  conciergeIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(197, 160, 89, 0.22)',
    borderWidth: 1,
    borderColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  conciergeTexts: {
    flex: 1,
  },
  conciergeTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: 2,
  },
  conciergeDesc: {
    fontSize: 12,
    color: '#E0EDE6',
    lineHeight: 16,
  },
  conciergeActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16a34a',
    borderRadius: RADIUS.md,
    paddingVertical: 9,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
    ...SHADOWS.subtle,
  },
  conciergeActionText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 6,
  },
  moduleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    marginVertical: SPACING.xs,
  },
  moduleCard: {
    width: '48%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    alignItems: 'center',
    ...SHADOWS.card,
  },
  activeModuleCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  moduleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  activeModuleIcon: {
    backgroundColor: COLORS.primary,
  },
  moduleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  activeModuleTitle: {
    color: COLORS.primary,
  },
  moduleSubtitle: {
    fontSize: 10,
    color: COLORS.textLight,
    marginTop: 2,
    textAlign: 'center',
  },
  activeModuleSubtitle: {
    color: COLORS.accentDark,
    fontWeight: '600',
  },
  shortcutsSection: {
    marginVertical: SPACING.xs,
  },
  shortcutsContent: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
  },
  shortcutChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.full,
    paddingVertical: 7,
    paddingHorizontal: 13,
    marginRight: 8,
    ...SHADOWS.subtle,
  },
  shortcutChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    marginHorizontal: 4,
  },
  sectionHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    marginTop: 18,
    marginBottom: 10,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primaryDark,
    marginHorizontal: 6,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.accentDark,
  },
  hListContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: 10,
  },
  hCard: {
    width: 175,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    marginRight: 12,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  hCardImageContainer: {
    width: '100%',
    height: 114,
    position: 'relative',
  },
  hCardImage: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.skeleton,
  },
  hCardCategoryPill: {
    position: 'absolute',
    top: 6,
    backgroundColor: 'rgba(15, 56, 38, 0.90)',
    borderRadius: RADIUS.xs,
    paddingHorizontal: 7,
    paddingVertical: 2,
    maxWidth: '85%',
  },
  pillLTR: {
    left: 6,
  },
  pillRTL: {
    right: 6,
  },
  hCardCategoryText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
  },
  hCardBody: {
    padding: 10,
  },
  hCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  hCardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  hCardMetaText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginHorizontal: 3,
  },
  hCardPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  hCardPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
  },
  brandChip: {
    backgroundColor: '#F0ECE4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  hCardBrandText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  emptyCardContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    marginHorizontal: SPACING.md,
    padding: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.accent,
    borderStyle: 'dashed',
    marginBottom: 10,
  },
  emptyCardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(197, 160, 89, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  emptyCardSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  emptyCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  emptyCardBtnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 12,
    marginLeft: 6,
  },
  trustSection: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.card,
  },
  trustSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  trustSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primaryDark,
    marginHorizontal: 8,
  },
  trustPillarsGrid: {
    gap: 12,
  },
  trustPillarItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  trustPillarIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  trustPillarTexts: {
    flex: 1,
  },
  trustPillarTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  trustPillarDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  trustEscrowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 56, 38, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.4)',
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 14,
    gap: 8,
  },
  trustEscrowPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  trustEscrowBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  fabButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    padding: 24,
  },
  modalContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 20,
    ...SHADOWS.card,
  },
  modalHeaderBrand: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.primary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 2,
  },
  modalSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  modalOption: {
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  modalOptionIconCrest: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOptionTextWrap: {
    flex: 1,
    marginHorizontal: 12,
  },
  modalOptionText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalOptionSubtext: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  modalCancelBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 4,
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  srOnly: {
    position: 'absolute',
    width: 0,
    height: 0,
    opacity: 0,
  },
});
