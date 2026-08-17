import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Animated,
  StatusBar,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../config/theme';
import HorseCard from '../components/HorseCard';
import FilterModal from '../components/FilterModal';
import SkeletonCard from '../components/SkeletonCard';
import EmptyState from '../components/EmptyState';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import * as apiService from '../services/api';

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const { t, isRTL } = useLanguage();

  const SORT_OPTIONS = [
    { label: t('newest'), value: 'newest' },
    { label: t('priceLowHigh'), value: 'price_asc' },
    { label: t('priceHighLow'), value: 'price_desc' },
    { label: t('ageYoung'), value: 'age_asc' },
    { label: t('ageOld'), value: 'age_desc' },
  ];
  const [horses, setHorses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({});
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [statusView, setStatusView] = useState('all'); // all | approved | sold
  const [favorites, setFavorites] = useState(new Set());
  const [fetchError, setFetchError] = useState(false);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const limit = 20;

  const fetchHorses = useCallback(
    async (pageNum = 0, append = false) => {
      try {
        setFetchError(false);
        const params = {
          skip: pageNum * limit,
          limit,
          ...filters,
        };
        if (searchQuery.trim()) {
          params.breed = searchQuery.trim();
        }
        if (statusView !== 'all') {
          params.horse_status = statusView;
        }
        if (sortBy !== 'newest') {
          params.sort_by = sortBy;
        }
        const res = await apiService.getHorses(params);
        const items = res.data.horses || res.data.items || res.data || [];
        const totalCount = res.data.total ?? items.length;

        if (append) {
          setHorses((prev) => [...prev, ...items]);
        } else {
          setHorses(items);
        }
        setTotal(totalCount);
      } catch (err) {
        setFetchError(true);
      }
    },
    [filters, searchQuery, sortBy, statusView, limit]
  );

  const loadFavorites = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await apiService.getFavorites();
      const data = res.data;
      const items = Array.isArray(data)
        ? data
        : Array.isArray(data?.horses)
        ? data.horses
        : Array.isArray(data?.favorites)
        ? data.favorites
        : [];
      const favIds = new Set(
        items.map((f) => f.horse_id || f.id)
      );
      setFavorites(favIds);
    } catch {}
  }, [isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setPage(0);
      Promise.all([fetchHorses(0), loadFavorites()]).finally(() =>
        setLoading(false)
      );
    }, [fetchHorses, loadFavorites])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    setPage(0);
    await Promise.all([fetchHorses(0), loadFavorites()]);
    setRefreshing(false);
  };

  const onEndReached = async () => {
    if (loadingMore || horses.length >= total) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchHorses(nextPage, true);
    setLoadingMore(false);
  };

  const handleSearch = () => {
    setPage(0);
    setLoading(true);
    fetchHorses(0).finally(() => setLoading(false));
  };

  const handleApplyFilters = (newFilters) => {
    setFilters(newFilters);
    setPage(0);
    setLoading(true);
    setTimeout(() => {
      fetchHorses(0).finally(() => setLoading(false));
    }, 100);
  };

  const toggleFavorite = async (horse) => {
    if (!isAuthenticated) {
      navigation.navigate('AuthStack');
      return;
    }
    const id = horse.id;
    const isFav = favorites.has(id);
    // Optimistic update
    setFavorites((prev) => {
      const next = new Set(prev);
      isFav ? next.delete(id) : next.add(id);
      return next;
    });
    try {
      if (isFav) {
        await apiService.removeFavorite(id);
      } else {
        await apiService.addFavorite(id);
      }
    } catch {
      // Revert
      setFavorites((prev) => {
        const next = new Set(prev);
        isFav ? next.add(id) : next.delete(id);
        return next;
      });
    }
  };

  const activeFilterCount = Object.values(filters).filter(
    (v) => v !== '' && v !== undefined && v !== null
  ).length + (statusView !== 'all' ? 1 : 0);

  const hasActiveDiscoveryConstraints =
    searchQuery.trim().length > 0 ||
    activeFilterCount > 0;

  const clearDiscoveryConstraints = () => {
    setSearchQuery('');
    setFilters({});
    setStatusView('all');
    setSortBy('newest');
    setPage(0);
    setLoading(true);
    fetchHorses(0).finally(() => setLoading(false));
  };

  const renderHeader = () => (
    <View style={styles.listHeader}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, isRTL && styles.rowRTL]}>
          <Ionicons name="search" size={20} color={COLORS.textLight} />
          <TextInput
            style={[styles.searchInput, isRTL && styles.inputRTL]}
            placeholder={t('searchPlaceholder')}
            placeholderTextColor={COLORS.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            textAlign={isRTL ? 'right' : 'left'}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                setPage(0);
                setLoading(true);
                fetchHorses(0).finally(() => setLoading(false));
              }}
            >
              <Ionicons name="close-circle" size={20} color={COLORS.textLight} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter & Sort Row */}
      <View style={[styles.actionRow, isRTL && styles.rowRTL]}>
        <TouchableOpacity
          style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons
            name="options-outline"
            size={18}
            color={activeFilterCount > 0 ? COLORS.primary : COLORS.textSecondary}
          />
          <Text
            style={[
              styles.filterBtnText,
              activeFilterCount > 0 && styles.filterBtnTextActive,
            ]}
          >
            {t('filter')}{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterBtn, statusView === 'all' && styles.filterBtnActive]}
          onPress={() => {
            setStatusView('all');
            setPage(0);
            setLoading(true);
            fetchHorses(0).finally(() => setLoading(false));
          }}
        >
          <Ionicons
            name="layers-outline"
            size={18}
            color={statusView === 'all' ? COLORS.primary : COLORS.textSecondary}
          />
          <Text style={[styles.filterBtnText, statusView === 'all' && styles.filterBtnTextActive]}>
            {t('allStatus')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterBtn, statusView === 'approved' && styles.filterBtnActive]}
          onPress={() => {
            const next = statusView === 'approved' ? 'all' : 'approved';
            setStatusView(next);
            setPage(0);
            setLoading(true);
            fetchHorses(0).finally(() => setLoading(false));
          }}
        >
          <Ionicons
            name="checkmark-circle-outline"
            size={18}
            color={statusView === 'approved' ? COLORS.primary : COLORS.textSecondary}
          />
          <Text style={[styles.filterBtnText, statusView === 'approved' && styles.filterBtnTextActive]}>
            {t('activeOnly')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterBtn, statusView === 'sold' && styles.filterBtnActive]}
          onPress={() => {
            const next = statusView === 'sold' ? 'all' : 'sold';
            setStatusView(next);
            setPage(0);
            setLoading(true);
            fetchHorses(0).finally(() => setLoading(false));
          }}
        >
          <Ionicons
            name="checkmark-done-circle-outline"
            size={18}
            color={statusView === 'sold' ? COLORS.primary : COLORS.textSecondary}
          />
          <Text style={[styles.filterBtnText, statusView === 'sold' && styles.filterBtnTextActive]}>
            {t('soldOnly')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.sortBtn, isRTL && styles.rowRTL]}
          onPress={() => setShowSort(!showSort)}
        >
          <Ionicons name="swap-vertical" size={18} color={COLORS.textSecondary} />
          <Text style={styles.sortBtnText}>
            {SORT_OPTIONS.find((s) => s.value === sortBy)?.label}
          </Text>
          <Ionicons
            name={showSort ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={COLORS.textLight}
          />
        </TouchableOpacity>
      </View>

      {/* Sort Dropdown */}
      {showSort && (
        <View style={styles.sortDropdown}>
          {SORT_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.sortOption,
                sortBy === option.value && styles.sortOptionActive,
              ]}
              onPress={() => {
                setSortBy(option.value);
                setShowSort(false);
                setPage(0);
                setLoading(true);
                fetchHorses(0).finally(() => setLoading(false));
              }}
            >
              <Text
                style={[
                  styles.sortOptionText,
                  sortBy === option.value && styles.sortOptionTextActive,
                ]}
              >
                {option.label}
              </Text>
              {sortBy === option.value && (
                <Ionicons name="checkmark" size={18} color={COLORS.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Results count */}
      <Text style={[styles.resultsCount, isRTL && styles.textRTL]}>
        {total} {total === 1 ? (isRTL ? 'خيل' : 'Horse') : t('horses')}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <View>
            <Text style={styles.headerTitle}>{t('appName')}</Text>
            <Text style={styles.headerSubtitle}>{t('tagline')}</Text>
          </View>
      </View>

      {loading && horses.length === 0 ? (
        <FlatList
          data={Array(8).fill(null)}
          scrollEnabled={false}
          keyExtractor={(_, i) => `skeleton-${i}`}
          renderItem={() => <SkeletonCard />}
          ListHeaderComponent={renderHeader}
        />
      ) : fetchError ? (
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: COLORS.error }]}>{t('errorLoadingHorses')}</Text>
          <TouchableOpacity
            onPress={() => { setLoading(true); fetchHorses(0).finally(() => setLoading(false)); }}
            style={{ marginTop: 12, padding: 10 }}
          >
            <Text style={{ color: COLORS.primary, fontWeight: '600' }}>{t('retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={horses}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <HorseCard
              horse={item}
              onPress={() => navigation.navigate('HorseDetail', { horse: item })}
              onFavorite={toggleFavorite}
              isFavorited={favorites.has(item.id)}
            />
          )}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            <View style={styles.emptyStateWrap}>
              <EmptyState
                icon="search-outline"
                title={t('noHorses')}
                subtitle={
                  hasActiveDiscoveryConstraints
                    ? t('noHorsesWithFilters')
                    : t('noHorsesSubtitle')
                }
              />
              {hasActiveDiscoveryConstraints ? (
                <TouchableOpacity
                  style={styles.clearFiltersBtn}
                  onPress={clearDiscoveryConstraints}
                  activeOpacity={0.85}
                >
                  <Text style={styles.clearFiltersBtnText}>{t('clearFiltersAndShowAll')}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={COLORS.primary} />
              </View>
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}

      <FilterModal
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        onApply={handleApplyFilters}
        initialFilters={filters}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  logoImage: {
    width: 42,
    height: 42,
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  textRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  inputRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  headerTitle: {
    ...FONTS.h1,
    color: COLORS.primary,
  },
  headerSubtitle: {
    ...FONTS.bodySmall,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  listContent: {
    paddingBottom: SPACING.xxl,
  },
  listHeader: {
    paddingBottom: SPACING.sm,
  },
  searchContainer: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    gap: SPACING.sm,
    ...SHADOWS.soft,
  },
  searchInput: {
    flex: 1,
    ...FONTS.body,
    color: COLORS.text,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterBtnActive: {
    backgroundColor: COLORS.primaryLight + '12',
    borderColor: COLORS.primary,
  },
  filterBtnText: {
    ...FONTS.bodySmall,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  filterBtnTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sortBtnText: {
    ...FONTS.bodySmall,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  sortDropdown: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    ...SHADOWS.card,
    overflow: 'hidden',
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  sortOptionActive: {
    backgroundColor: COLORS.primaryLight + '10',
  },
  sortOptionText: {
    ...FONTS.body,
    color: COLORS.textSecondary,
  },
  sortOptionTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  resultsCount: {
    ...FONTS.bodySmall,
    color: COLORS.textLight,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    ...FONTS.body,
    color: COLORS.textSecondary,
  },
  emptyStateWrap: {
    paddingBottom: SPACING.xl,
  },
  clearFiltersBtn: {
    alignSelf: 'center',
    marginTop: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
  },
  clearFiltersBtnText: {
    ...FONTS.button,
    color: COLORS.white,
  },
  footerLoader: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
});
