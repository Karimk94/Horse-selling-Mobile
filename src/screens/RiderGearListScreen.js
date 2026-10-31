import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getRiderGearList } from '../services/api';
import { getCurrentDeviceLocation } from '../services/locationService';
import CategoryPicker from '../components/CategoryPicker';
import BrandMark from '../components/BrandMark';
import { useLanguage } from '../contexts/LanguageContext';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../config/theme';

const EMIRATES = [
  { id: 'all', labelKey: 'allEmirates', value: null },
  { id: 'dubai', labelKey: 'emirateDubai', value: 'Dubai' },
  { id: 'abu_dhabi', labelKey: 'emirateAbuDhabi', value: 'Abu Dhabi' },
  { id: 'sharjah', labelKey: 'emirateSharjah', value: 'Sharjah' },
  { id: 'ajman', labelKey: 'emirateAjman', value: 'Ajman' },
  { id: 'al_ain', labelKey: 'emirateAlAin', value: 'Al Ain' },
  { id: 'ras_al_khaimah', labelKey: 'emirateRasAlKhaimah', value: 'Ras Al Khaimah' },
  { id: 'fujairah', labelKey: 'emirateFujairah', value: 'Fujairah' },
  { id: 'umm_al_quwain', labelKey: 'emirateUmmAlQuwain', value: 'Umm Al Quwain' },
];

const EMIRATE_LABELS = {
  allEmirates: { en: 'All Emirates', ar: 'جميع الإمارات' },
  emirateDubai: { en: 'Dubai', ar: 'دبي' },
  emirateAbuDhabi: { en: 'Abu Dhabi', ar: 'أبوظبي' },
  emirateSharjah: { en: 'Sharjah', ar: 'الشارقة' },
  emirateAjman: { en: 'Ajman', ar: 'عجمان' },
  emirateAlAin: { en: 'Al Ain', ar: 'العين' },
  emirateRasAlKhaimah: { en: 'Ras Al Khaimah', ar: 'رأس الخيمة' },
  emirateFujairah: { en: 'Fujairah', ar: 'الفجيرة' },
  emirateUmmAlQuwain: { en: 'Umm Al Quwain', ar: 'أم القيوين' },
};

const SUGGESTIONS = ['Samshield', 'Helmet', 'Boots', 'Cavalleria', 'Breeches', 'Air Vest'];

const SORT_OPTIONS = [
  { id: 'newest', labelKey: 'sortNewest' },
  { id: 'price_asc', labelKey: 'sortPriceAsc' },
  { id: 'price_desc', labelKey: 'sortPriceDesc' },
];

const GENDER_TABS = [
  { id: 'all', labelEn: 'All', labelAr: 'الكل' },
  { id: 'female', labelEn: 'Women', labelAr: 'نسائي' },
  { id: 'male', labelEn: 'Men', labelAr: 'رجالي' },
  { id: 'unisex', labelEn: 'Unisex', labelAr: 'للجنسين' },
];

export default function RiderGearListScreen({ navigation, route }) {
  const { language, t, isRTL } = useLanguage();
  const isArabic = language === 'ar';

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [skip, setSkip] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState(route?.params?.searchQuery || '');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [selectedGender, setSelectedGender] = useState('all'); // all, male, female, unisex
  const [selectedEmirate, setSelectedEmirate] = useState(null);
  const [selectedSort, setSelectedSort] = useState('newest');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [selectedRadius, setSelectedRadius] = useState(null);

  const fetchItems = useCallback(
    async (reset = false) => {
      const newSkip = reset ? 0 : skip;
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const params = {
          skip: newSkip,
          limit: 20,
        };

        const activeSearch = [searchQuery.trim(), selectedEmirate].filter(Boolean).join(' ');
        if (activeSearch) {
          params.q = activeSearch;
        }
        if (selectedCategory?.id) {
          params.category_id = selectedCategory.id;
        }
        if (selectedGender !== 'all') {
          params.gender = selectedGender;
        }
        if (selectedRadius && userLocation) {
          params.lat = userLocation.latitude;
          params.lon = userLocation.longitude;
          params.radius_km = selectedRadius;
        }

        const response = await getRiderGearList(params);
        let fetched = response?.data?.items || [];
        const fetchedTotal = response?.data?.total || fetched.length;

        // Client-side sort fallback
        if (selectedSort === 'price_asc') {
          fetched = [...fetched].sort((a, b) => (a.price || 0) - (b.price || 0));
        } else if (selectedSort === 'price_desc') {
          fetched = [...fetched].sort((a, b) => (b.price || 0) - (a.price || 0));
        }

        if (reset) {
          setItems(fetched);
          setSkip(fetched.length);
        } else {
          setItems((prev) => [...prev, ...fetched]);
          setSkip((prev) => prev + fetched.length);
        }
        setTotal(fetchedTotal);
      } catch (error) {
        console.warn('[RiderGearListScreen] Fetch error:', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [skip, searchQuery, selectedEmirate, selectedCategory, selectedGender, selectedRadius, selectedSort, userLocation]
  );

  useEffect(() => {
    fetchItems(true);
  }, [searchQuery, selectedEmirate, selectedCategory, selectedGender, selectedRadius, selectedSort]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchItems(true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && items.length < total) {
      fetchItems(false);
    }
  };

  const handleEnableLocation = async () => {
    const loc = await getCurrentDeviceLocation();
    if (loc) {
      setUserLocation(loc);
      setSelectedRadius(25);
    }
  };

  const handleClearAllFilters = () => {
    setSearchQuery('');
    setSelectedEmirate(null);
    setSelectedCategory(null);
    setSelectedGender('all');
    setSelectedRadius(null);
    setSelectedSort('newest');
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (selectedEmirate) count++;
    if (selectedCategory) count++;
    if (selectedGender !== 'all') count++;
    if (selectedRadius) count++;
    if (selectedSort !== 'newest') count++;
    return count;
  }, [searchQuery, selectedEmirate, selectedCategory, selectedGender, selectedRadius, selectedSort]);

  const hasActiveFilters = activeFiltersCount > 0;

  const handleHeaderApparelHotline = () => {
    const query = searchQuery ? `"${searchQuery}"` : '';
    const text = isArabic
      ? `مرحباً ستيد ماركت، أود استشارة أخصائي أزياء ومستلزمات الفارس بخصوص ${query || 'خوذات، ملابس ركوب وأحذية معتمدة'}.`
      : `Hello SteedMarket Stylist, I would like expert consultation on rider apparel & gear ${query ? `matching ${query}` : ''}.`;
    const waUrl = `https://wa.me/971500000000?text=${encodeURIComponent(text)}`;
    try {
      const res = Linking.openURL(waUrl);
      if (res && typeof res.catch === 'function') {
        res.catch(() => {});
      }
    } catch (e) {}
  };

  const getGenderLabel = (g) => {
    if (g === 'male') return isArabic ? 'رجالي' : 'Men';
    if (g === 'female') return isArabic ? 'نسائي' : 'Women';
    return isArabic ? 'للجنسين' : 'Unisex';
  };

  const handleWhatsAppConcierge = async () => {
    const query = searchQuery ? `"${searchQuery}"` : (isArabic ? 'أزياء ومستلزمات عامة' : 'General rider apparel & gear');
    const text = isArabic
      ? `مرحباً ستيد ماركت، أبحث عن مستلزمات وأزياء فروسية بمواصفات معينة: ${query}`
      : `Hello SteedMarket, I am looking for rider gear & apparel with specific criteria: ${query}`;
    const url = `whatsapp://send?text=${encodeURIComponent(text)}`;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(`https://wa.me/971500000000?text=${encodeURIComponent(text)}`);
      }
    } catch (e) {
      console.warn('Cannot open WhatsApp:', e);
    }
  };

  const renderRiderGearCard = ({ item }) => {
    const mainImage = item.images?.[0]?.image_url || 'https://via.placeholder.com/300x200?text=Rider+Gear';
    const categoryName = isArabic ? item.category?.name_ar : item.category?.name_en;
    const sizeText = item.custom_size || (Array.isArray(item.sizes) ? item.sizes.join(', ') : item.sizes);

    return (
      <TouchableOpacity
        testID={`ridergear-card-${item.id}`}
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('RiderGearDetailScreen', { riderGearId: item.id })}
      >
        <View style={styles.imageWrapper}>
          <Image source={{ uri: mainImage }} style={styles.cardImage} resizeMode="cover" />

          {/* Top badges */}
          <View style={[styles.cardBadgesRow, isRTL && styles.rowRTL]}>
            {categoryName ? (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{categoryName}</Text>
              </View>
            ) : null}

            <View style={styles.genderBadge}>
              <Text style={styles.genderBadgeText}>{getGenderLabel(item.gender)}</Text>
            </View>

            {item.brand ? (
              <View style={styles.brandBadge}>
                <Ionicons name="pricetag" size={11} color={COLORS.accent} />
                <Text style={styles.brandBadgeText}>{item.brand}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={[styles.cardTitle, isRTL && styles.textRTL]} numberOfLines={2}>
            {item.title}
          </Text>

          {item.brand ? (
            <Text style={[styles.cardBrand, isRTL && styles.textRTL]}>{item.brand}</Text>
          ) : null}

          {sizeText ? (
            <View style={[styles.sizeRow, isRTL && styles.rowRTL]}>
              <Ionicons name="resize-outline" size={12} color={COLORS.accent} />
              <Text style={styles.sizeText}>
                {isArabic ? 'المقاس:' : 'Size:'} {sizeText}
              </Text>
            </View>
          ) : null}

          <View style={[styles.cardFooter, isRTL && styles.rowRTL]}>
            <Text style={styles.cardPrice}>
              {item.price ? `${item.price.toLocaleString()} AED` : 'POA'}
            </Text>

            {item.location_text ? (
              <View style={[styles.locationContainer, isRTL && styles.rowRTL]}>
                <Ionicons name="location-sharp" size={13} color={COLORS.primary} />
                <Text style={styles.locationText} numberOfLines={1}>
                  {item.location_text}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Bar */}
      <View style={styles.headerContainer}>
        <View style={[styles.topBar, isRTL && styles.rowRTL]}>
          <TouchableOpacity
            testID="ridergear-back-button"
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go Back"
          >
            <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={COLORS.text} />
          </TouchableOpacity>

          <View style={[styles.brandIconWrapper, isRTL && { marginRight: 0, marginLeft: 10 }]}>
            <BrandMark size={28} />
          </View>

          <View style={styles.titleColumn}>
            <View testID="ridergear-vip-badge" style={[styles.vipBadge, isRTL && styles.rowRTL]}>
              <Ionicons name="ribbon" size={11} color={COLORS.accentDark} />
              <View style={styles.vipPulseDot} />
              <Text style={styles.vipBadgeText}>
                {isArabic ? 'أزياء الفارس المعتمدة' : 'HAUTE EQUESTRIAN APPAREL'}
              </Text>
            </View>
            <Text style={[styles.topBarTitle, isRTL && styles.textRTL]}>
              {isArabic ? 'مستلزمات الفارس' : 'Rider Gear'}
            </Text>
            <Text style={[styles.topBarSubtitle, isRTL && styles.textRTL]}>
              {total} {t('totalAvailable') || (isArabic ? 'متوفر' : 'available')}
            </Text>
          </View>

          <View style={[styles.headerActionsGroup, isRTL && styles.rowRTL]}>
            <TouchableOpacity
              testID="ridergear-header-hotline-btn"
              style={styles.headerHotlineBtn}
              onPress={handleHeaderApparelHotline}
              activeOpacity={0.8}
              accessibilityLabel="Rider Stylist WhatsApp Hotline"
            >
              <Ionicons name="logo-whatsapp" size={17} color="#25D366" />
            </TouchableOpacity>

            <TouchableOpacity
              testID="ridergear-header-create-button"
              style={[styles.headerCreateBtn, isRTL && styles.rowRTL]}
              onPress={() => navigation.navigate('CreateRiderGearScreen')}
            >
              <Ionicons name="add-circle" size={18} color={COLORS.accent} />
              <Text style={styles.headerCreateText}>
                {isArabic ? 'إضافة' : 'Post Gear'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchBar, isRTL && styles.rowRTL]}>
          <TouchableOpacity
            testID="ridergear-search-submit-btn"
            onPress={() => fetchItems(true)}
            style={styles.searchSubmitBtn}
          >
            <Ionicons name="search" size={18} color={COLORS.primary} />
          </TouchableOpacity>
          <TextInput
            testID="ridergear-search-input"
            style={[styles.searchInput, isRTL && styles.inputRTL]}
            placeholder={
              t('searchRiderGearPlaceholder') ||
              (isArabic ? 'ابحث في مستلزمات الفارس...' : 'Search rider gear...')
            }
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => fetchItems(true)}
            placeholderTextColor={COLORS.textLight}
            textAlign={isRTL ? 'right' : 'left'}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              testID="ridergear-search-clear-btn"
              onPress={() => setSearchQuery('')}
              style={styles.clearSearchBtn}
            >
              <Ionicons name="close-circle" size={18} color={COLORS.textLight} />
            </TouchableOpacity>
          )}
        </View>

        {/* Gender Tabs Row */}
        <View style={[styles.genderTabsRow, isRTL && styles.rowRTL]}>
          {GENDER_TABS.map((tab) => {
            const isSelected = selectedGender === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                testID={`ridergear-gender-${tab.id}`}
                style={[styles.genderTab, isSelected && styles.activeGenderTab]}
                onPress={() => setSelectedGender(tab.id)}
              >
                <Text style={[styles.genderTabText, isSelected && styles.activeGenderText]}>
                  {isArabic ? tab.labelAr : tab.labelEn}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Regional Emirates Filter Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.emiratesScroll, isRTL && styles.rowRTL]}
        >
          {EMIRATES.map((em) => {
            const isSelected = (!selectedEmirate && em.id === 'all') || selectedEmirate === em.value;
            const label = EMIRATE_LABELS[em.labelKey]
              ? (isArabic ? EMIRATE_LABELS[em.labelKey].ar : EMIRATE_LABELS[em.labelKey].en)
              : t(em.labelKey);
            return (
              <TouchableOpacity
                key={em.id}
                testID={`ridergear-emirate-${em.id}`}
                style={[styles.emirateChip, isSelected && styles.activeEmirateChip]}
                onPress={() => setSelectedEmirate(em.value)}
              >
                {isSelected && (
                  <Ionicons
                    name="location-sharp"
                    size={12}
                    color={COLORS.white}
                    style={{ marginRight: isRTL ? 0 : 4, marginLeft: isRTL ? 4 : 0 }}
                  />
                )}
                <Text style={[styles.emirateChipText, isSelected && styles.activeEmirateChipText]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Discovery Action Bar (Category, GPS, Sort, Clear) */}
        <View style={[styles.filterActionsRow, isRTL && styles.rowRTL]}>
          {/* Category Trigger */}
          <TouchableOpacity
            testID="ridergear-category-filter-btn"
            style={[styles.actionPill, selectedCategory && styles.activeActionPill]}
            onPress={() => setShowCategoryPicker(true)}
          >
            <Ionicons
              name="options-outline"
              size={15}
              color={selectedCategory ? COLORS.white : COLORS.primary}
            />
            <Text
              style={[styles.actionPillText, selectedCategory && styles.activeActionPillText]}
              numberOfLines={1}
            >
              {selectedCategory
                ? isArabic
                  ? selectedCategory.name_ar
                  : selectedCategory.name_en
                : t('allCategories')}
            </Text>
            {selectedCategory && (
              <TouchableOpacity onPress={() => setSelectedCategory(null)} style={styles.pillClose}>
                <Ionicons name="close-circle" size={14} color={COLORS.white} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          {/* GPS Radius */}
          <TouchableOpacity
            testID="ridergear-gps-filter-btn"
            style={[styles.actionPill, selectedRadius && styles.activeActionPill]}
            onPress={() => {
              if (!userLocation) {
                handleEnableLocation();
              } else if (selectedRadius === 25) {
                setSelectedRadius(50);
              } else if (selectedRadius === 50) {
                setSelectedRadius(null);
              } else {
                setSelectedRadius(25);
              }
            }}
          >
            <Ionicons
              name="navigate-outline"
              size={15}
              color={selectedRadius ? COLORS.white : COLORS.primary}
            />
            <Text style={[styles.actionPillText, selectedRadius && styles.activeActionPillText]}>
              {selectedRadius ? t('radiusKm', selectedRadius) : t('useCurrentLocation')}
            </Text>
          </TouchableOpacity>

          {/* Sort By Toggle */}
          <TouchableOpacity
            testID="ridergear-sort-filter-btn"
            style={[styles.actionPill, selectedSort !== 'newest' && styles.activeActionPill]}
            onPress={() => setShowSortMenu(!showSortMenu)}
          >
            <Ionicons
              name="swap-vertical"
              size={15}
              color={selectedSort !== 'newest' ? COLORS.white : COLORS.primary}
            />
            <Text style={[styles.actionPillText, selectedSort !== 'newest' && styles.activeActionPillText]}>
              {t(SORT_OPTIONS.find((s) => s.id === selectedSort)?.labelKey || 'sortNewest')}
            </Text>
          </TouchableOpacity>

          {/* Clear Filters Reset Chip */}
          {hasActiveFilters && (
            <TouchableOpacity
              testID="ridergear-clear-filters-chip"
              style={styles.clearChip}
              onPress={handleClearAllFilters}
            >
              <Ionicons name="refresh-outline" size={13} color={COLORS.error} />
              <Text style={styles.clearChipText}>{t('clearFiltersBtn')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* VIP Apparel Fit & Authentication Guarantee Ribbon */}
        <TouchableOpacity
          testID="ridergear-escrow-banner"
          style={[styles.escrowBanner, isRTL && styles.rowRTL]}
          onPress={handleHeaderApparelHotline}
          activeOpacity={0.88}
        >
          <View style={styles.escrowBannerPulse} />
          <Ionicons name="shield-checkmark" size={14} color="#D4AF37" />
          <Text style={[styles.escrowBannerText, isRTL && styles.textRTL]}>
            {isArabic
              ? 'ضمان الأصالة والمقاس المعتمد لجميع خوذات وسترات وأحذية الفارس'
              : 'Certified authenticity & fit assurance for all riding helmets, boots & apparel'}
          </Text>
          <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={14} color="#8C6D23" />
        </TouchableOpacity>

        {/* Results Telemetry Indicator */}
        <View style={[styles.resultsSummaryRow, isRTL && styles.rowRTL]}>
          <Text testID="ridergear-results-count" style={styles.resultsCountText}>
            {total} {isArabic ? 'منتج متوفر' : 'apparel items found'}
          </Text>
          {hasActiveFilters && (
            <View testID="ridergear-active-filters-tag" style={[styles.activeFilterGroup, isRTL && styles.rowRTL]}>
              <Ionicons name="filter" size={12} color={COLORS.accent} />
              <Text style={styles.activeFilterGroupText}>
                {isArabic ? `فلاتر مخصصة مفعلة (${activeFiltersCount})` : `Custom filters active (${activeFiltersCount})`}
              </Text>
            </View>
          )}
        </View>

        {/* Sort Menu Dropdown */}
        {showSortMenu && (
          <View style={styles.sortDropdown}>
            {SORT_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={[styles.sortOptionItem, selectedSort === opt.id && styles.sortOptionItemActive]}
                onPress={() => {
                  setSelectedSort(opt.id);
                  setShowSortMenu(false);
                }}
              >
                <Text
                  style={[
                    styles.sortOptionText,
                    selectedSort === opt.id && styles.sortOptionTextActive,
                  ]}
                >
                  {t(opt.labelKey)}
                </Text>
                {selectedSort === opt.id && (
                  <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Main Catalog Feed */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderRiderGearCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={COLORS.primary} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <BrandMark size={38} />
              </View>
              <Text style={styles.emptyTitle}>{t('emptyCatalogTitle')}</Text>
              <Text style={styles.emptySubtitle}>{t('emptyCatalogSubtitle')}</Text>

              {/* Suggestions */}
              <View style={styles.suggestionsSection}>
                <Text style={styles.suggestionsLabel}>{t('popularSuggestionsTitle')}</Text>
                <View style={styles.suggestionChips}>
                  {SUGGESTIONS.map((term) => (
                    <TouchableOpacity
                      key={term}
                      testID={`ridergear-suggestion-${term.toLowerCase().replace(/\s+/g, '-')}`}
                      style={styles.suggestionChip}
                      onPress={() => setSearchQuery(term)}
                    >
                      <Ionicons name="search-outline" size={12} color={COLORS.primary} />
                      <Text style={styles.suggestionChipText}>{term}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* VIP Haute-Equestrian Concierge Card */}
              <View style={styles.conciergeCard}>
                <View style={[styles.conciergeHeader, isRTL && styles.rowRTL]}>
                  <Ionicons name="diamond" size={16} color={COLORS.accent} />
                  <Text style={styles.conciergeTitle}>
                    {isArabic ? 'المساعد الشخصي لأزياء الفارس' : 'Haute-Equestrian Concierge'}
                  </Text>
                </View>
                <Text style={[styles.conciergeText, isRTL && styles.textRTL]}>
                  {isArabic
                    ? 'تبحث عن مقاس محدد، سترة مسابقات دولية، أو خوذة بمواصفات أمان خاصة؟ دع مستشارينا ينسقون طلبك مع متاجر الإمارات الشريكة.'
                    : 'Searching for tailored jackets, custom riding boots, or certified air vests? Let our equestrian concierge source them directly across UAE tack boutiques.'}
                </Text>
                <TouchableOpacity
                  testID="ridergear-empty-concierge-btn"
                  style={[styles.conciergeBtn, isRTL && styles.rowRTL]}
                  onPress={handleWhatsAppConcierge}
                >
                  <Ionicons name="logo-whatsapp" size={18} color={COLORS.white} />
                  <Text style={styles.conciergeBtnText}>
                    {isArabic ? 'استشارة الخبير عبر واتساب' : 'Consult Concierge on WhatsApp'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Actions */}
              <View style={styles.emptyActionsRow}>
                {hasActiveFilters && (
                  <TouchableOpacity
                    testID="ridergear-empty-clear-filters-btn"
                    style={styles.emptyResetBtn}
                    onPress={handleClearAllFilters}
                  >
                    <Text style={styles.emptyResetBtnText}>{t('clearFiltersBtn')}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  testID="ridergear-empty-post-btn"
                  style={styles.emptyPostBtn}
                  onPress={() => navigation.navigate('CreateRiderGearScreen')}
                >
                  <Ionicons name="add-circle-outline" size={18} color={COLORS.white} />
                  <Text style={styles.emptyPostBtnText}>{t('postRiderGearCTA')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          }
        />
      )}

      {/* Floating Create Rider Gear Button */}
      <TouchableOpacity
        testID="ridergear-fab-create-btn"
        style={styles.fabButton}
        activeOpacity={0.88}
        onPress={() => navigation.navigate('CreateRiderGearScreen')}
      >
        <Ionicons name="add" size={28} color={COLORS.white} />
      </TouchableOpacity>

      {/* Category Picker Modal */}
      <CategoryPicker
        visible={showCategoryPicker}
        moduleFilter="rider_gear"
        currentLanguage={language}
        selectedSlug={selectedCategory?.slug}
        onClose={() => setShowCategoryPicker(false)}
        onSelectCategory={(cat) => setSelectedCategory(cat)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerContainer: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    ...SHADOWS.sm,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  backBtn: {
    marginRight: 8,
    padding: 4,
  },
  brandIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(197, 160, 89, 0.14)',
    borderWidth: 1.5,
    borderColor: 'rgba(197, 160, 89, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  titleColumn: {
    flex: 1,
  },
  vipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF5E8',
    borderWidth: 1,
    borderColor: '#D4AF37',
    borderRadius: RADIUS.full,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    marginBottom: 2,
    alignSelf: 'flex-start',
  },
  vipPulseDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10B981',
    marginRight: 4,
  },
  vipBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#8C6D23',
    letterSpacing: 0.5,
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  topBarSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  headerActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerHotlineBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#A5D6A7',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.subtle,
  },
  headerCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(15, 56, 38, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.35)',
    gap: 4,
  },
  headerCreateText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(15, 56, 38, 0.12)',
  },
  searchSubmitBtn: {
    padding: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    marginHorizontal: 8,
  },
  clearSearchBtn: {
    padding: 4,
  },
  inputRTL: {
    textAlign: 'right',
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  textRTL: {
    textAlign: 'right',
  },
  genderTabsRow: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 6,
  },
  genderTab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  activeGenderTab: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  genderTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  activeGenderText: {
    color: COLORS.white,
    fontWeight: '700',
  },
  emiratesScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 8,
  },
  emirateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  activeEmirateChip: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  emirateChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  activeEmirateChipText: {
    color: COLORS.white,
    fontWeight: '700',
  },
  filterActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 56, 38, 0.06)',
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(15, 56, 38, 0.15)',
  },
  activeActionPill: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  actionPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 5,
    marginRight: 2,
  },
  activeActionPillText: {
    color: COLORS.white,
  },
  pillClose: {
    marginLeft: 4,
  },
  clearChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    gap: 4,
  },
  clearChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.error,
  },
  escrowBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(197, 160, 89, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.28)',
    borderRadius: RADIUS.md,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 6,
    marginBottom: 4,
    gap: 6,
  },
  escrowBannerPulse: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10B981',
  },
  escrowBannerText: {
    flex: 1,
    fontSize: 10.5,
    fontWeight: '700',
    color: '#8C6D23',
  },
  resultsSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(15, 56, 38, 0.06)',
  },
  resultsCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  activeFilterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeFilterGroupText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.accent,
  },
  sortDropdown: {
    marginTop: 8,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 4,
    ...SHADOWS.md,
  },
  sortOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  sortOptionItemActive: {
    backgroundColor: 'rgba(15, 56, 38, 0.05)',
  },
  sortOptionText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },
  sortOptionTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 90,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(15, 56, 38, 0.08)',
    ...SHADOWS.card,
  },
  imageWrapper: {
    position: 'relative',
    width: '100%',
    height: 185,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.skeleton,
  },
  cardBadgesRow: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    backgroundColor: 'rgba(15, 56, 38, 0.88)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accent,
    letterSpacing: 0.3,
  },
  genderBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    ...SHADOWS.sm,
  },
  genderBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    ...SHADOWS.sm,
  },
  brandBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text,
  },
  cardBody: {
    padding: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: 22,
    marginBottom: 4,
  },
  cardBrand: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 6,
  },
  sizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  sizeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  cardPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.2,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '55%',
    gap: 3,
  },
  locationText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerLoader: {
    paddingVertical: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 16,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FAF7F0',
    borderWidth: 1.5,
    borderColor: 'rgba(197, 160, 89, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  suggestionsSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  suggestionsLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  suggestionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: 'rgba(15, 56, 38, 0.12)',
    gap: 5,
  },
  suggestionChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  conciergeCard: {
    width: '100%',
    backgroundColor: '#FAF7F0',
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: '#E8DCBF',
    padding: 16,
    marginBottom: 20,
    ...SHADOWS.sm,
  },
  conciergeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  conciergeTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.3,
  },
  conciergeText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  conciergeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 8,
    ...SHADOWS.sm,
  },
  conciergeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
  },
  emptyActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  emptyResetBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  emptyResetBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  emptyPostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    gap: 6,
    ...SHADOWS.sm,
  },
  emptyPostBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
  },
  fabButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.md,
    elevation: 6,
  },
});
