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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getRiderGearList } from '../services/api';
import { getCurrentDeviceLocation } from '../services/locationService';
import CategoryPicker from '../components/CategoryPicker';
import { useLanguage } from '../contexts/LanguageContext';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../config/theme';

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
        if (selectedGender !== 'all') {
          params.gender = selectedGender;
        }
        if (selectedRadius && userLocation) {
          params.lat = userLocation.latitude;
          params.lon = userLocation.longitude;
          params.radius_km = selectedRadius;
        }

        const response = await getRiderGearList(params);
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
        console.warn('[RiderGearListScreen] Fetch error:', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [skip, searchQuery, selectedCategory, selectedGender, selectedRadius, userLocation]
  );

  useEffect(() => {
    fetchItems(true);
  }, [searchQuery, selectedCategory, selectedGender, selectedRadius]);

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

  const getGenderLabel = (g) => {
    if (g === 'male') return isArabic ? 'رجالي' : 'Men';
    if (g === 'female') return isArabic ? 'نسائي' : 'Women';
    return isArabic ? 'للجنسين' : 'Unisex';
  };

  const renderRiderGearCard = ({ item }) => {
    const mainImage = item.images?.[0]?.image_url || 'https://via.placeholder.com/300x200?text=Rider+Gear';
    const categoryName = isArabic ? item.category?.name_ar : item.category?.name_en;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('RiderGearDetailScreen', { riderGearId: item.id })}
      >
        <Image source={{ uri: mainImage }} style={styles.cardImage} resizeMode="cover" />

        <View style={styles.cardBody}>
          <View style={styles.cardHeaderRow}>
            {categoryName && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{categoryName}</Text>
              </View>
            )}

            <View style={styles.genderBadge}>
              <Text style={styles.genderBadgeText}>{getGenderLabel(item.gender)}</Text>
            </View>
          </View>

          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>

          {item.brand && <Text style={styles.cardBrand}>{item.brand}</Text>}

          <View style={styles.cardFooter}>
            <Text style={styles.cardPrice}>
              {item.price ? `${item.price.toLocaleString()} AED` : 'POA'}
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
            placeholder={isArabic ? 'ابحث في مستلزمات الفارس...' : 'Search rider gear...'}
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

        {/* Gender Tabs */}
        <View style={styles.genderTabsRow}>
          <TouchableOpacity
            style={[styles.genderTab, selectedGender === 'all' && styles.activeGenderTab]}
            onPress={() => setSelectedGender('all')}
          >
            <Text style={[styles.genderTabText, selectedGender === 'all' && styles.activeGenderText]}>
              {isArabic ? 'الكل' : 'All'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.genderTab, selectedGender === 'female' && styles.activeGenderTab]}
            onPress={() => setSelectedGender('female')}
          >
            <Text style={[styles.genderTabText, selectedGender === 'female' && styles.activeGenderText]}>
              {isArabic ? 'نسائي' : 'Women'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.genderTab, selectedGender === 'male' && styles.activeGenderTab]}
            onPress={() => setSelectedGender('male')}
          >
            <Text style={[styles.genderTabText, selectedGender === 'male' && styles.activeGenderText]}>
              {isArabic ? 'رجالي' : 'Men'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.genderTab, selectedGender === 'unisex' && styles.activeGenderTab]}
            onPress={() => setSelectedGender('unisex')}
          >
            <Text style={[styles.genderTabText, selectedGender === 'unisex' && styles.activeGenderText]}>
              {isArabic ? 'للجنسين' : 'Unisex'}
            </Text>
          </TouchableOpacity>
        </View>

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
          renderItem={renderRiderGearCard}
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
              <Ionicons name="shirt-outline" size={54} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>
                {isArabic ? 'لا توجد مستلزمات فارس متاحة' : 'No rider gear listings found'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {isArabic
                  ? 'حاول تعديل خيارات البحث أو الفلاتر الحالية.'
                  : 'Try adjusting your search query or filters.'}
              </Text>
            </View>
          }
        />
      )}

      {/* Floating Create Button */}
      <TouchableOpacity
        style={styles.fabButton}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('CreateRiderGearScreen')}
      >
        <Ionicons name="add" size={28} color="#ffffff" />
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
  genderTabsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: 3,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  genderTab: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeGenderTab: {
    backgroundColor: COLORS.primary,
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
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  categoryBadge: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  genderBadge: {
    backgroundColor: COLORS.badge,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  genderBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.badgeText,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  cardBrand: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  cardPrice: {
    fontSize: 17,
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
