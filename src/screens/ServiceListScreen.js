import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getServicesList } from '../services/api';
import { getCurrentDeviceLocation } from '../services/locationService';
import CategoryPicker from '../components/CategoryPicker';
import { useLanguage } from '../contexts/LanguageContext';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../config/theme';

const SERVICE_TYPES = [
  { id: 'all', name_ar: 'الكل', name_en: 'All' },
  { id: 'housing_boarding', name_ar: 'إيواء الخيل', name_en: 'Boarding & Stables' },
  { id: 'training_instruction', name_ar: 'التدريب والتعليم', name_en: 'Training' },
  { id: 'health_care', name_ar: 'الرعاية الصحية', name_en: 'Health Care' },
  { id: 'commercial_transport', name_ar: 'النقل واللوجستية', name_en: 'Transport' },
  { id: 'breeding', name_ar: 'الإنتاج والتشبية', name_en: 'Breeding' },
  { id: 'recreation_events', name_ar: 'الفعاليات والجولات', name_en: 'Events & Tours' },
];

export default function ServiceListScreen({ navigation, route }) {
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
  const [selectedType, setSelectedType] = useState('all');
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

        if (searchQuery.trim()) {
          params.q = searchQuery.trim();
        }
        if (selectedCategory?.id) {
          params.category_id = selectedCategory.id;
        }
        if (selectedType !== 'all') {
          params.service_type = selectedType;
        }
        if (selectedRadius && userLocation) {
          params.lat = userLocation.latitude;
          params.lon = userLocation.longitude;
          params.radius_km = selectedRadius;
        }

        const response = await getServicesList(params);
        const fetched = response.data?.items || [];
        const fetchedTotal = response.data?.total || 0;

        if (reset) {
          setItems(fetched);
          setSkip(fetched.length);
        } else {
          setItems((prev) => [...prev, ...fetched]);
          setSkip((prev) => prev + fetched.length);
        }
        setTotal(fetchedTotal);
      } catch (error) {
        console.warn('[ServiceListScreen] Fetch error:', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [skip, searchQuery, selectedCategory, selectedType, selectedRadius, userLocation]
  );

  useEffect(() => {
    fetchItems(true);
  }, [searchQuery, selectedCategory, selectedType, selectedRadius]);

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

    return `${price.toLocaleString()} ${suffix}`;
  };

  const renderServiceCard = ({ item }) => {
    const mainImage = item.images?.[0]?.image_url || 'https://via.placeholder.com/300x200?text=Equestrian+Service';
    const categoryName = isArabic ? item.category?.name_ar : item.category?.name_en;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('ServiceDetailScreen', { serviceId: item.id })}
      >
        <Image source={{ uri: mainImage }} style={styles.cardImage} resizeMode="cover" />

        <View style={styles.cardBody}>
          {categoryName && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{categoryName}</Text>
            </View>
          )}

          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>

          <View style={styles.cardFooter}>
            <Text style={styles.cardPrice}>
              {getPricingLabel(item.pricing_type, item.price)}
            </Text>

            {item.location_text && (
              <View style={styles.locationContainer}>
                <Ionicons name="location-outline" size={14} color="#64748b" />
                <Text style={styles.locationText} numberOfLines={1}>
                  {item.location_text}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Search & Header */}
      <View style={styles.headerContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color="#64748b" />
          <TextInput
            style={[styles.searchInput, { textAlign: isArabic ? 'right' : 'left' }]}
            placeholder={isArabic ? 'ابحث في الخدمات والإيواء...' : 'Search equestrian services...'}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94a3b8"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Service Type Scrollable Filter Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.serviceTypesScrollView}
          contentContainerStyle={styles.serviceTypesContent}
        >
          {SERVICE_TYPES.map((st) => {
            const isSelected = selectedType === st.id;
            return (
              <TouchableOpacity
                key={st.id}
                style={[styles.serviceTypeTab, isSelected && styles.activeServiceTypeTab]}
                onPress={() => setSelectedType(st.id)}
              >
                <Text
                  style={[
                    styles.serviceTypeText,
                    isSelected && styles.activeServiceTypeText,
                  ]}
                >
                  {isArabic ? st.name_ar : st.name_en}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Filter Chips Bar */}
        <View style={styles.filterChipsRow}>
          {/* Category Filter Button */}
          <TouchableOpacity
            style={[styles.chipButton, selectedCategory && styles.activeChipButton]}
            onPress={() => setShowCategoryPicker(true)}
          >
            <Ionicons
              name="options-outline"
              size={16}
              color={selectedCategory ? '#ffffff' : '#2563eb'}
            />
            <Text style={[styles.chipButtonText, selectedCategory && styles.activeChipText]}>
              {selectedCategory
                ? isArabic
                  ? selectedCategory.name_ar
                  : selectedCategory.name_en
                : t('allCategories')}
            </Text>
            {selectedCategory && (
              <TouchableOpacity onPress={() => setSelectedCategory(null)} style={styles.chipClose}>
                <Ionicons name="close" size={14} color="#ffffff" />
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          {/* Location GPS Radius Button */}
          <TouchableOpacity
            style={[styles.chipButton, selectedRadius && styles.activeChipButton]}
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
              size={16}
              color={selectedRadius ? '#ffffff' : '#2563eb'}
            />
            <Text style={[styles.chipButtonText, selectedRadius && styles.activeChipText]}>
              {selectedRadius ? t('radiusKm', selectedRadius) : t('useCurrentLocation')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderServiceCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#2563eb']} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color="#2563eb" />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="construct-outline" size={54} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>
                {isArabic ? 'لا توجد خدمات متاحة' : 'No service listings found'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {isArabic
                  ? 'حاول تعديل خيارات البحث أو تصفية الفئات.'
                  : 'Try adjusting your search query or category filters.'}
              </Text>
            </View>
          }
        />
      )}

      {/* Floating Create Button */}
      <TouchableOpacity
        style={styles.fabButton}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('CreateServiceScreen')}
      >
        <Ionicons name="add" size={28} color={COLORS.white} />
      </TouchableOpacity>

      {/* Category Picker Modal */}
      <CategoryPicker
        visible={showCategoryPicker}
        moduleFilter="services"
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
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    marginHorizontal: 8,
  },
  serviceTypesScroll: {
    marginBottom: 8,
  },
  serviceTypesContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceTypeTab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  activeServiceTypeTab: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  serviceTypeText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  activeServiceTypeText: {
    color: COLORS.white,
    fontWeight: '700',
  },
  filterChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  activeChipButton: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 6,
  },
  activeChipText: {
    color: COLORS.white,
  },
  chipClose: {
    marginLeft: 6,
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  cardImage: {
    width: '100%',
    height: 180,
    backgroundColor: COLORS.skeleton,
  },
  cardBody: {
    padding: 14,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 6,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  cardPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '50%',
  },
  locationText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 4,
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
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 14,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 6,
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
    elevation: 5,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
});
