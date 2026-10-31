import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  FlatList,
  ScrollView,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Animated,
  StatusBar,
  Linking,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../config/theme';
import HorseCard from '../components/HorseCard';
import FilterModal from '../components/FilterModal';
import SkeletonCard from '../components/SkeletonCard';
import EmptyState from '../components/EmptyState';
import BrandMark from '../components/BrandMark';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../components/ToastProvider';
import { extractApiErrorMessage } from '../utils/apiErrors';
import * as apiService from '../services/api';

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

const BUDGET_RANGES = [
  { id: 'all', labelKey: 'allBudgets', min: null, max: null },
  { id: 'under50k', labelKey: 'budgetUnder50k', min: null, max: 50000 },
  { id: '50k150k', labelKey: 'budget50k150k', min: 50000, max: 150000 },
  { id: '150k300k', labelKey: 'budget150k300k', min: 150000, max: 300000 },
  { id: 'over300k', labelKey: 'budgetOver300k', min: 300000, max: null },
];

const HORSE_SUGGESTIONS = ['Arabian', 'Endurance', 'Show Jumping', 'Warmblood', 'Thoroughbred', 'Dubai'];

export default function HomeScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const { t, isRTL } = useLanguage();
  const toast = useToast();
  const [savingAlert, setSavingAlert] = useState(false);

  const SORT_OPTIONS = [
    { label: t('newest'), value: 'newest' },
    { label: t('priceLowHigh'), value: 'price_asc' },
    { label: t('priceHighLow'), value: 'price_desc' },
    { label: t('ageYoung'), value: 'age_asc' },
    { label: t('ageOld'), value: 'age_desc' },
  ];

  const QUICK_DISCIPLINES = [
    { id: 'all', labelKey: 'allDisciplines', value: null },
    { id: 'show_jumping', labelKey: 'disciplineShowJumping', value: 'Show Jumping' },
    { id: 'endurance', labelKey: 'disciplineEndurance', value: 'Endurance' },
    { id: 'dressage', labelKey: 'disciplineDressage', value: 'Dressage' },
    { id: 'racing', labelKey: 'disciplineRacing', value: 'Racing' },
    { id: 'beauty_halter', labelKey: 'disciplineBeauty', value: 'Beauty / Halter' },
    { id: 'polo', labelKey: 'disciplinePolo', value: 'Polo' },
    { id: 'leisure', labelKey: 'disciplineLeisure', value: 'Leisure' },
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

  // Fast Filters
  const [selectedEmirate, setSelectedEmirate] = useState(null);
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [vetCheckOnly, setVetCheckOnly] = useState(false);
  const [verifiedSellerOnly, setVerifiedSellerOnly] = useState(false);
  const [withVideoOnly, setWithVideoOnly] = useState(false);

  useEffect(() => {
    if (route?.params) {
      if (route.params.searchQuery) {
        setSearchQuery(route.params.searchQuery);
      }
      if (
        route.params.breed ||
        route.params.discipline ||
        route.params.minPrice != null ||
        route.params.maxPrice != null
      ) {
        setFilters((prev) => ({
          ...prev,
          ...(route.params.breed ? { breed: route.params.breed } : {}),
          ...(route.params.discipline ? { discipline: route.params.discipline } : {}),
          ...(route.params.minPrice != null ? { min_price: route.params.minPrice } : {}),
          ...(route.params.maxPrice != null ? { max_price: route.params.maxPrice } : {}),
        }));
      }
      if (route.params.vetCheckOnly != null) {
        setVetCheckOnly(Boolean(route.params.vetCheckOnly));
      }
      if (route.params.verifiedSellerOnly != null) {
        setVerifiedSellerOnly(Boolean(route.params.verifiedSellerOnly));
      }
    }
  }, [route?.params]);

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

        const activeSearch = [searchQuery.trim(), selectedEmirate].filter(Boolean).join(' ');
        if (activeSearch) {
          params.q = activeSearch;
        }
        if (statusView !== 'all') {
          params.horse_status = statusView;
        }
        if (sortBy !== 'newest') {
          params.sort_by = sortBy;
        }
        if (vetCheckOnly) {
          params.vet_check_available = true;
        }
        if (verifiedSellerOnly) {
          params.verified_seller = true;
        }
        if (selectedBudget) {
          if (selectedBudget.min != null) params.min_price = selectedBudget.min;
          if (selectedBudget.max != null) params.max_price = selectedBudget.max;
        }

        const res = await apiService.getHorses(params);
        let items = res.data.horses || res.data.items || res.data || [];
        let totalCount = res.data.total ?? items.length;

        // Video filter fallback
        if (withVideoOnly) {
          items = items.filter(
            (h) => h.video_url || h.has_video || h.images?.some((img) => img.is_video || img.video_url)
          );
          totalCount = items.length;
        }

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
    [
      filters,
      searchQuery,
      selectedEmirate,
      sortBy,
      statusView,
      vetCheckOnly,
      verifiedSellerOnly,
      withVideoOnly,
      selectedBudget,
      limit,
    ]
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
      const favIds = new Set(items.map((f) => f.horse_id || f.id));
      setFavorites(favIds);
    } catch {}
  }, [isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setPage(0);
      Promise.all([fetchHorses(0), loadFavorites()]).finally(() => setLoading(false));
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

  const handleHeaderBrokerHotline = () => {
    const query = searchQuery ? `"${searchQuery}"` : '';
    const text = isRTL
      ? `مرحباً ستيد ماركت، أود استشارة وسيط خيل معتمد بخصوص ${query || 'شراء، بيع أو فحص خيل في سوق الخليج'}.`
      : `Hello SteedMarket Equine Broker, I would like certified consultation regarding horse acquisition & vetting ${query ? `matching ${query}` : ''}.`;
    const waUrl = `https://wa.me/971500000000?text=${encodeURIComponent(text)}`;
    try {
      const res = Linking.openURL(waUrl);
      if (res && typeof res.catch === 'function') {
        res.catch(() => {});
      }
    } catch (e) {}
  };

  const toggleFavorite = async (horse) => {
    if (!isAuthenticated) {
      navigation.navigate('AuthStack');
      return;
    }
    const id = horse.id;
    const isFav = favorites.has(id);
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
      setFavorites((prev) => {
        const next = new Set(prev);
        isFav ? next.add(id) : next.delete(id);
        return next;
      });
    }
  };

  const activeFastFilterCount =
    (selectedEmirate ? 1 : 0) +
    (selectedBudget ? 1 : 0) +
    (vetCheckOnly ? 1 : 0) +
    (verifiedSellerOnly ? 1 : 0) +
    (withVideoOnly ? 1 : 0);

  const activeFilterCount =
    Object.values(filters).filter((v) => v !== '' && v !== undefined && v !== null).length +
    (statusView !== 'all' ? 1 : 0) +
    activeFastFilterCount;

  const hasActiveDiscoveryConstraints =
    searchQuery.trim().length > 0 || activeFilterCount > 0;

  const clearDiscoveryConstraints = () => {
    setSearchQuery('');
    setFilters({});
    setSelectedEmirate(null);
    setSelectedBudget(null);
    setVetCheckOnly(false);
    setVerifiedSellerOnly(false);
    setWithVideoOnly(false);
    setStatusView('all');
    setSortBy('newest');
    setPage(0);
    setLoading(true);
    fetchHorses(0).finally(() => setLoading(false));
  };

  const handleSaveEmptySearchAlert = async () => {
    if (!isAuthenticated) {
      toast?.show?.(
        t('signInToSaveAlert') ||
          (isRTL ? 'يرجى تسجيل الدخول لحفظ التنبيهات' : 'Please sign in to save alerts'),
        { type: 'warning' }
      );
      return;
    }
    setSavingAlert(true);
    try {
      const activeConstraints = [
        searchQuery.trim(),
        selectedEmirate,
        filters.breed,
        filters.discipline,
      ].filter(Boolean);
      await apiService.createSavedSearch({
        name: `Alert: ${activeConstraints.join(' • ') || 'Custom Search'}`,
        breed: filters.breed || undefined,
        discipline: filters.discipline || undefined,
        min_price: selectedBudget?.min ?? filters.min_price ?? undefined,
        max_price: selectedBudget?.max ?? filters.max_price ?? undefined,
        vet_check_available: vetCheckOnly || undefined,
        verified_seller: verifiedSellerOnly || undefined,
      });
      toast?.show?.(
        t('searchAlertSaved') ||
          (isRTL ? 'تم حفظ منبه البحث بنجاح' : 'Search alert saved successfully'),
        { type: 'success' }
      );
    } catch (err) {
      toast?.show?.(
        extractApiErrorMessage(err, t('failedToSaveAlert') || 'Failed to save alert'),
        { type: 'error' }
      );
    } finally {
      setSavingAlert(false);
    }
  };

  const renderHeader = () => (
    <View style={styles.listHeader}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, isRTL && styles.rowRTL]}>
          <Ionicons name="search" size={20} color={COLORS.primary} />
          <TextInput
            testID="horse-search-input"
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
              testID="horse-search-clear-btn"
              style={styles.searchClearBtn}
              onPress={() => {
                setSearchQuery('');
                setPage(0);
                setLoading(true);
                fetchHorses(0).finally(() => setLoading(false));
              }}
            >
              <Ionicons name="close-circle" size={18} color={COLORS.textLight} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            testID="horse-search-submit-btn"
            style={styles.searchSubmitBtn}
            onPress={handleSearch}
          >
            <Ionicons
              name={isRTL ? 'arrow-back' : 'arrow-forward'}
              size={16}
              color={COLORS.white}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Regional Emirates Filter Bar */}
      <View style={styles.scrollSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.horizontalChipsScroll, isRTL && styles.rowRTL]}
        >
          {EMIRATES.map((em) => {
            const isSelected = (!selectedEmirate && em.id === 'all') || selectedEmirate === em.value;
            return (
              <TouchableOpacity
                key={em.id}
                style={[styles.chip, isSelected && styles.chipActive]}
                onPress={() => {
                  setSelectedEmirate(em.value);
                  setPage(0);
                  setLoading(true);
                }}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                  {t(em.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* SteedMarket Elite Trust Fast Filters (Vet Check, Verified Seller, Video) */}
      <View style={styles.scrollSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.horizontalChipsScroll, isRTL && styles.rowRTL]}
        >
          {/* Vet Checked */}
          <TouchableOpacity
            style={[styles.trustChip, vetCheckOnly && styles.trustChipActive]}
            onPress={() => {
              setVetCheckOnly(!vetCheckOnly);
              setPage(0);
              setLoading(true);
            }}
          >
            <Ionicons
              name="medkit"
              size={13}
              color={vetCheckOnly ? COLORS.white : COLORS.primary}
            />
            <Text style={[styles.trustChipText, vetCheckOnly && styles.trustChipTextActive]}>
              {t('filterVetChecked')}
            </Text>
          </TouchableOpacity>

          {/* Verified Breeder */}
          <TouchableOpacity
            style={[styles.trustChip, verifiedSellerOnly && styles.trustChipActive]}
            onPress={() => {
              setVerifiedSellerOnly(!verifiedSellerOnly);
              setPage(0);
              setLoading(true);
            }}
          >
            <Ionicons
              name="checkmark-circle"
              size={13}
              color={verifiedSellerOnly ? COLORS.white : COLORS.accent}
            />
            <Text style={[styles.trustChipText, verifiedSellerOnly && styles.trustChipTextActive]}>
              {t('filterVerifiedSeller')}
            </Text>
          </TouchableOpacity>

          {/* With Video */}
          <TouchableOpacity
            style={[styles.trustChip, withVideoOnly && styles.trustChipActive]}
            onPress={() => {
              setWithVideoOnly(!withVideoOnly);
              setPage(0);
              setLoading(true);
            }}
          >
            <Ionicons
              name="play"
              size={13}
              color={withVideoOnly ? COLORS.white : COLORS.primary}
            />
            <Text style={[styles.trustChipText, withVideoOnly && styles.trustChipTextActive]}>
              {t('filterHasVideo')}
            </Text>
          </TouchableOpacity>

          {/* Budget Brackets */}
          {BUDGET_RANGES.map((b) => {
            const isSelected = (!selectedBudget && b.id === 'all') || selectedBudget?.id === b.id;
            return (
              <TouchableOpacity
                key={b.id}
                style={[styles.budgetChip, isSelected && styles.budgetChipActive]}
                onPress={() => {
                  setSelectedBudget(b.id === 'all' ? null : b);
                  setPage(0);
                  setLoading(true);
                }}
              >
                <Text style={[styles.budgetChipText, isSelected && styles.budgetChipTextActive]}>
                  {t(b.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Quick Discipline Filter Pills */}
      <View style={styles.disciplineScrollWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.disciplineScroll, isRTL && styles.rowRTL]}
        >
          {QUICK_DISCIPLINES.map((item) => {
            const isSelected =
              (!filters.discipline && item.id === 'all') ||
              filters.discipline === item.value;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.disciplineChip, isSelected && styles.disciplineChipActive]}
                onPress={() => {
                  const nextFilters = { ...filters };
                  if (item.value) {
                    nextFilters.discipline = item.value;
                  } else {
                    delete nextFilters.discipline;
                  }
                  setFilters(nextFilters);
                  setPage(0);
                  setLoading(true);
                  fetchHorses(0).finally(() => setLoading(false));
                }}
              >
                <Text
                  style={[
                    styles.disciplineChipText,
                    isSelected && styles.disciplineChipTextActive,
                  ]}
                >
                  {t(item.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Filter & Sort Row */}
      <View style={[styles.actionRow, isRTL && styles.rowRTL]}>
        <TouchableOpacity
          style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons
            name="options-outline"
            size={16}
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

        {/* Status view: all / active / sold */}
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
            size={16}
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
            size={16}
            color={statusView === 'sold' ? COLORS.primary : COLORS.textSecondary}
          />
          <Text style={[styles.filterBtnText, statusView === 'sold' && styles.filterBtnTextActive]}>
            {t('soldOnly')}
          </Text>
        </TouchableOpacity>

        {/* Sort trigger */}
        <TouchableOpacity
          style={[styles.sortBtn, isRTL && styles.rowRTL]}
          onPress={() => setShowSort(!showSort)}
        >
          <Ionicons name="swap-vertical" size={16} color={COLORS.textSecondary} />
          <Text style={styles.sortBtnText}>
            {SORT_OPTIONS.find((s) => s.value === sortBy)?.label}
          </Text>
          <Ionicons
            name={showSort ? 'chevron-up' : 'chevron-down'}
            size={13}
            color={COLORS.textLight}
          />
        </TouchableOpacity>

        {/* Clear chip if active constraints */}
        {hasActiveDiscoveryConstraints && (
          <TouchableOpacity style={styles.clearChip} onPress={clearDiscoveryConstraints}>
            <Ionicons name="refresh-outline" size={13} color={COLORS.error} />
            <Text style={styles.clearChipText}>{t('clear') || 'Clear'}</Text>
          </TouchableOpacity>
        )}
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

      {/* VIP Veterinary Escrow & Title Guarantee Ribbon */}
      <TouchableOpacity
        testID="horse-escrow-banner"
        style={[styles.escrowBanner, isRTL && styles.rowRTL]}
        onPress={handleHeaderBrokerHotline}
        activeOpacity={0.88}
      >
        <View style={styles.escrowBannerPulse} />
        <Ionicons name="shield-checkmark" size={14} color="#D4AF37" />
        <Text style={[styles.escrowBannerText, isRTL && styles.textRTL]}>
          {isRTL
            ? 'جميع صفقات الخيل مؤمنة بحساب الضمان المالي المعتمد والفحص البيطري الرسمي'
            : 'Certified Equine Escrow & Official Vet Inspection secured for every transaction'}
        </Text>
        <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={14} color="#8C6D23" />
      </TouchableOpacity>

      {/* Results count banner */}
      <View style={[styles.resultsHeaderRow, isRTL && styles.rowRTL]}>
        <Text style={[styles.resultsCount, isRTL && styles.textRTL]} testID="horse-results-count">
          {total} {total === 1 ? (isRTL ? 'خيل' : 'Horse') : t('horses')}
        </Text>
        <View style={[styles.resultsRightWrap, isRTL && styles.rowRTL]}>
          {activeFilterCount > 0 && (
            <View style={styles.activeFilterCountTag} testID="horse-active-filters-tag">
              <Text style={styles.activeFilterCountText}>
                {activeFilterCount} {isRTL ? 'معايير نشطة' : 'active filters'}
              </Text>
            </View>
          )}
          {hasActiveDiscoveryConstraints && (
            <TouchableOpacity
              testID="horse-clear-filters-chip"
              style={[styles.clearChip, isRTL && styles.rowRTL]}
              onPress={clearDiscoveryConstraints}
            >
              <Ionicons name="refresh-outline" size={12} color={COLORS.error} />
              <Text style={styles.clearChipText}>{t('clear') || 'Clear'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={[styles.topBar, isRTL && styles.rowRTL]}>
          <TouchableOpacity
            testID="horse-list-back-button"
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={COLORS.text} />
          </TouchableOpacity>

          <BrandMark size={30} />

          <View style={[styles.titleColumn, isRTL && styles.titleColumnRTL]}>
            <View testID="horse-vip-badge" style={[styles.vipBadge, isRTL && styles.rowRTL]}>
              <Ionicons name="ribbon" size={11} color={COLORS.accentDark} />
              <View style={styles.vipPulseDot} />
              <Text style={styles.vipBadgeText}>
                {isRTL ? 'بورصة الخيل المعتمدة في الخليج' : 'VIP GULF EQUINE EXCHANGE'}
              </Text>
            </View>
            <Text style={[styles.topBarTitle, isRTL && styles.textRTL]}>{t('horses')}</Text>
            <Text style={[styles.topBarSubtitle, isRTL && styles.textRTL]}>
              {total} {isRTL ? 'خيل مسجل في الخليج' : 'registered horses in the Gulf'}
            </Text>
          </View>

          <View style={[styles.headerActions, isRTL && styles.rowRTL]}>
            <TouchableOpacity
              testID="horse-header-hotline-btn"
              style={styles.headerHotlineBtn}
              onPress={handleHeaderBrokerHotline}
              activeOpacity={0.8}
              accessibilityLabel="Equine Broker WhatsApp Hotline"
            >
              <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
            </TouchableOpacity>

            <TouchableOpacity
              testID="horse-header-filter-btn"
              style={[styles.headerActionBtn, activeFilterCount > 0 && styles.headerActionBtnActive]}
              onPress={() => setShowFilters(true)}
            >
              <Ionicons
                name="options-outline"
                size={20}
                color={activeFilterCount > 0 ? COLORS.primary : COLORS.textSecondary}
              />
              {activeFilterCount > 0 && (
                <View style={styles.headerFilterBadge} testID="horse-header-filter-badge">
                  <Text style={styles.headerFilterBadgeText}>{activeFilterCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              testID="horse-list-create-button"
              style={[styles.headerCreateBtn, isRTL && styles.rowRTL]}
              onPress={() => navigation.navigate('CreateListing')}
            >
              <Ionicons name="add" size={18} color={COLORS.white} />
              <Text style={styles.headerCreateBtnText}>{t('sell') || (isRTL ? 'إعلان جديد' : 'List')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {loading && horses.length === 0 ? (
        <FlatList
          data={Array(8).fill(null)}
          scrollEnabled={false}
          keyExtractor={(_, i) => `skeleton-${i}`}
          renderItem={() => <SkeletonCard />}
          ListHeaderComponent={renderHeader()}
        />
      ) : fetchError ? (
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: COLORS.error }]}>{t('errorLoadingHorses')}</Text>
          <TouchableOpacity
            onPress={() => {
              setLoading(true);
              fetchHorses(0).finally(() => setLoading(false));
            }}
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
          ListHeaderComponent={renderHeader()}
          ListEmptyComponent={
            <View style={styles.emptyStateWrap}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="search-outline" size={36} color={COLORS.accent} />
              </View>
              <Text style={styles.emptyTitleText}>{t('noHorses')}</Text>
              <Text style={styles.emptySubtitleText}>
                {hasActiveDiscoveryConstraints
                  ? t('noHorsesWithFilters')
                  : t('noHorsesSubtitle')}
              </Text>

              {/* Suggestions chips */}
              <View style={styles.suggestionsContainer}>
                <Text style={styles.suggestionsTitle}>{t('popularBreedsSuggestions')}</Text>
                <View style={styles.suggestionChipsWrap}>
                  {HORSE_SUGGESTIONS.map((term) => (
                    <TouchableOpacity
                      key={term}
                      style={styles.suggestionChip}
                      onPress={() => {
                        setSearchQuery(term);
                        setPage(0);
                        setLoading(true);
                      }}
                    >
                      <Ionicons name="sparkles" size={11} color={COLORS.accent} />
                      <Text style={styles.suggestionChipText}>{term}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {hasActiveDiscoveryConstraints && (
                <View style={styles.emptyAlertCard}>
                  <View style={[styles.emptyAlertHeader, isRTL && styles.rowRTL]}>
                    <Ionicons name="notifications-outline" size={20} color={COLORS.accentDark} />
                    <View style={[styles.emptyAlertTextWrap, isRTL && styles.emptyAlertTextWrapRTL]}>
                      <Text style={[styles.emptyAlertTitle, isRTL && styles.textRTL]}>
                        {t('conciergeAlertTitle') || (isRTL ? 'منبه الخيول المخصص' : 'Custom Equine Search Alert')}
                      </Text>
                      <Text style={[styles.emptyAlertSub, isRTL && styles.textRTL]}>
                        {t('conciergeAlertSub') || (isRTL ? 'سنقوم بإشعارك فور إدراج أي خيل يطابق هذه المواصفات' : 'We will notify you immediately once a horse matching these criteria is listed')}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    testID="horse-empty-save-alert-btn"
                    style={[styles.emptySaveAlertBtn, isRTL && styles.rowRTL]}
                    activeOpacity={0.85}
                    onPress={handleSaveEmptySearchAlert}
                    disabled={savingAlert}
                  >
                    {savingAlert ? (
                      <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                      <>
                        <Ionicons name="bookmark-outline" size={16} color={COLORS.white} />
                        <Text style={styles.emptySaveAlertBtnText}>
                          {t('saveSearchAlert') || (isRTL ? 'حفظ تنبيه البحث' : 'Save Search Alert')}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* 1-Tap VIP Concierge Broker Sourcing */}
              <TouchableOpacity
                testID="horse-empty-concierge-btn"
                style={[styles.emptyConciergeBtn, isRTL && styles.rowRTL]}
                onPress={handleHeaderBrokerHotline}
                activeOpacity={0.85}
              >
                <Ionicons name="logo-whatsapp" size={17} color="#25D366" />
                <Text style={styles.emptyConciergeBtnText}>
                  {isRTL
                    ? 'طلب وساطة مخصصة للبحث عن خيل عبر واتساب'
                    : 'Request Bespoke Horse Sourcing via WhatsApp'}
                </Text>
              </TouchableOpacity>

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
  },
  backBtn: {
    marginRight: 10,
    padding: 4,
  },
  titleColumn: {
    flex: 1,
    marginHorizontal: 8,
  },
  titleColumnRTL: {
    alignItems: 'flex-end',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerActionBtnActive: {
    backgroundColor: 'rgba(15, 56, 38, 0.08)',
    borderColor: COLORS.primary,
  },
  headerFilterBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: COLORS.accentDark,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerFilterBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.white,
  },
  headerCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    ...SHADOWS.sm,
  },
  headerCreateBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  topBarTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.primary,
  },
  topBarSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginTop: 1,
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
  listContent: {
    paddingBottom: SPACING.xxl,
  },
  listHeader: {
    paddingBottom: SPACING.xs,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    marginBottom: 6,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(15, 56, 38, 0.12)',
    ...SHADOWS.soft,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    marginHorizontal: 8,
  },
  searchClearBtn: {
    padding: 4,
  },
  searchSubmitBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  scrollSection: {
    marginBottom: 6,
  },
  horizontalChipsScroll: {
    paddingHorizontal: 16,
    gap: 6,
  },
  chip: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  trustChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(15, 56, 38, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(15, 56, 38, 0.15)',
    gap: 4,
  },
  trustChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  trustChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  trustChipTextActive: {
    color: COLORS.white,
  },
  budgetChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  budgetChipActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  budgetChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  budgetChipTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  disciplineScrollWrap: {
    marginBottom: 6,
  },
  disciplineScroll: {
    paddingHorizontal: 16,
    gap: 6,
  },
  disciplineChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  disciplineChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  disciplineChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  disciplineChipTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    marginBottom: 6,
    gap: 6,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterBtnActive: {
    backgroundColor: 'rgba(15, 56, 38, 0.08)',
    borderColor: COLORS.primary,
  },
  filterBtnText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  filterBtnTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sortBtnText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
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
  sortDropdown: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 4,
    ...SHADOWS.card,
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  sortOptionActive: {
    backgroundColor: 'rgba(15, 56, 38, 0.05)',
  },
  sortOptionText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  sortOptionTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  resultsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  resultsCount: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  resultsRightWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeFilterCountTag: {
    backgroundColor: 'rgba(15, 56, 38, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  activeFilterCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  emptyStateWrap: {
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(197, 160, 89, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitleText: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 6,
  },
  emptySubtitleText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  suggestionsContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  suggestionsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  suggestionChipsWrap: {
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
    gap: 4,
  },
  suggestionChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  clearFiltersBtn: {
    marginTop: 6,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingHorizontal: 20,
    paddingVertical: 10,
    ...SHADOWS.sm,
  },
  clearFiltersBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
  },
  emptyAlertCard: {
    width: '100%',
    backgroundColor: '#FAF5EA',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#E8DCBF',
    padding: 14,
    marginBottom: 16,
    ...SHADOWS.soft,
  },
  emptyAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  emptyAlertTextWrap: {
    flex: 1,
  },
  emptyAlertTextWrapRTL: {
    alignItems: 'flex-end',
  },
  emptyAlertTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.accentDark,
  },
  emptyAlertSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  emptySaveAlertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.accentDark,
    borderRadius: RADIUS.full,
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  emptySaveAlertBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
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
  headerHotlineBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#A5D6A7',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.subtle,
  },
  escrowBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(197, 160, 89, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.28)',
    borderRadius: RADIUS.md,
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 6,
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
  emptyConciergeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#A5D6A7',
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 10,
    gap: 8,
    width: '100%',
  },
  emptyConciergeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1B5E20',
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
