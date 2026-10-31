import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  ScrollView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../config/theme';
import HorseCard from '../components/HorseCard';
import EmptyState from '../components/EmptyState';
import BrandMark from '../components/BrandMark';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import * as apiService from '../services/api';

const STABLE_CATEGORIES = [
  { id: 'horses', labelKey: 'tabHorses', icon: 'paw-outline' },
  { id: 'equipment', labelKey: 'tabEquipment', icon: 'shield-outline' },
  { id: 'rider_gear', labelKey: 'tabRiderGear', icon: 'shirt-outline' },
  { id: 'services', labelKey: 'tabServices', icon: 'construct-outline' },
];

export default function FavoritesScreen({ navigation, initialFavorites = null }) {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const { t, isRTL, language } = useLanguage();
  const isArabic = language === 'ar';

  const [activeCategory, setActiveCategory] = useState('horses');
  const [favorites, setFavorites] = useState(initialFavorites || []);
  const [favoriteIds, setFavoriteIds] = useState(
    new Set((initialFavorites || []).map((f) => f.horse_id || f.id))
  );
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFavorites = useCallback(async () => {
    if (!isAuthenticated) {
      setFavorites([]);
      setFavoriteIds(new Set());
      setLoading(false);
      return;
    }
    setLoading(true);
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
      setFavorites(items);
      setFavoriteIds(new Set(items.map((f) => f.horse_id || f.id)));
    } catch (err) {
      console.log('Error fetching favorites:', err.message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      fetchFavorites();
    }, [fetchFavorites])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFavorites();
    setRefreshing(false);
  };

  const removeFavorite = async (horse) => {
    const id = horse.id || horse.horse_id;
    setFavorites((prev) => prev.filter((f) => (f.id || f.horse_id) !== id));
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    try {
      await apiService.removeFavorite(id);
    } catch {
      fetchFavorites();
    }
  };

  const handleBrowseTarget = (screenName) => {
    try {
      navigation.navigate(screenName);
    } catch {
      navigation.navigate('Browse', { screen: screenName });
    }
  };

  const handleShareStableWhatsApp = () => {
    const text = isArabic
      ? `مرحباً، تفضل بالاطلاع على خيولي المفضلة في إسطبلي على ستيد ماركت (${favorites.length} خيول مسجلة): https://steedmarket.com/stable`
      : `Hello, take a look at my curated stable of saved horses on SteedMarket (${favorites.length} horses tracked): https://steedmarket.com/stable`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    Linking.openURL(url).catch(() => {});
  };

  const handleConciergeAssistance = () => {
    const text = isArabic
      ? 'مرحباً مستشار ستيد ماركت، أبحث عن خيل أو سلالة محددة لإضافتها إلى إسطبلي.'
      : 'Hello SteedMarket Concierge, I am searching for a specific horse or pedigree for my stable.';
    const url = `https://wa.me/971500000000?text=${encodeURIComponent(text)}`;
    Linking.openURL(url).catch(() => {});
  };

  if (!isAuthenticated) {
    return (
      <View testID="unauth-view" style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

        {/* Executive Header */}
        <View style={[styles.header, isRTL && styles.headerRTL]}>
          <View style={[styles.headerBrandRow, isRTL && styles.headerBrandRowRTL]}>
            <View style={styles.brandIconWrapper}>
              <BrandMark size={28} />
            </View>
            <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <View
                testID="stable-unauth-vip-badge"
                style={[styles.portalBadge, isRTL && styles.portalBadgeRTL]}
              >
                <Ionicons name="ribbon" size={11} color={COLORS.accentDark} />
                <View style={styles.portalBadgeDot} />
                <Text style={styles.portalBadgeText}>
                  {isArabic ? 'إسطبل المقتنيات الخاصة' : 'PRIVATE STABLE & SANCTUARY'}
                </Text>
              </View>
              <Text style={[styles.headerTitle, isRTL && styles.textRTL]}>{t('stable')}</Text>
              <Text style={[styles.headerSubtitle, isRTL && styles.textRTL]}>{t('savedHorses')}</Text>
            </View>
          </View>

          <TouchableOpacity
            testID="favorites-unauth-header-concierge-btn"
            style={[styles.headerExploreBtn, styles.headerConciergeBtn]}
            activeOpacity={0.8}
            onPress={handleConciergeAssistance}
          >
            <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.unauthContent} showsVerticalScrollIndicator={false}>
          <View testID="unauthCard" style={styles.unauthCard}>
            <View style={styles.unauthIconCrest}>
              <BrandMark size={38} />
            </View>
            <Text style={[styles.unauthTitle, isRTL && styles.textRTL]}>
              {t('signInToViewStable')}
            </Text>
            <Text style={[styles.unauthSubtitle, isRTL && styles.textRTL]}>
              {t('signInToViewStableSubtitle')}
            </Text>

            {/* Member Privileges */}
            <View style={styles.perksList}>
              <View style={[styles.perkItem, isRTL && styles.perkItemRTL]}>
                <View style={styles.perkBullet}>
                  <Ionicons name="bookmark" size={14} color={COLORS.accentDark} />
                </View>
                <Text style={[styles.perkText, isRTL && styles.textRTL]}>
                  {isArabic
                    ? 'حفظ وتتبع أفضل الخيول العربية الأصيلة والمعدات'
                    : 'Bookmark favorite Arabian purebreds and equipment'}
                </Text>
              </View>

              <View style={[styles.perkItem, isRTL && styles.perkItemRTL]}>
                <View style={styles.perkBullet}>
                  <Ionicons name="trending-down" size={14} color={COLORS.accentDark} />
                </View>
                <Text style={[styles.perkText, isRTL && styles.textRTL]}>
                  {isArabic
                    ? 'إشعارات فورية عند تحديث الأسعار أو توفر عروض جديدة'
                    : 'Instant notifications on price drops and new offers'}
                </Text>
              </View>

              <View style={[styles.perkItem, isRTL && styles.perkItemRTL]}>
                <View style={styles.perkBullet}>
                  <Ionicons name="chatbubbles" size={14} color={COLORS.accentDark} />
                </View>
                <Text style={[styles.perkText, isRTL && styles.textRTL]}>
                  {isArabic
                    ? 'مفاوضات مباشرة وتواصل آمن وسريع مع الملاك'
                    : 'Direct negotiations and verified chat with breeders'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              testID="unauth-signin-btn"
              style={styles.signInBtn}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('AuthStack')}
            >
              <Ionicons name="log-in-outline" size={20} color={COLORS.white} />
              <Text style={styles.signInBtnText}>{t('signIn')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              testID="unauth-concierge-btn"
              style={[styles.conciergeOutlineBtn, isRTL && styles.rowRTL]}
              activeOpacity={0.82}
              onPress={handleConciergeAssistance}
            >
              <Ionicons name="logo-whatsapp" size={16} color="#10B981" />
              <Text style={styles.conciergeOutlineBtnText}>
                {isArabic ? 'استشارة مستشار الخيل عبر واتساب' : 'VIP Equestrian Concierge Inquiries'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  const renderCategoryContent = () => {
    if (activeCategory === 'horses') {
      if (loading) {
        return (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>
              {isArabic ? 'جاري فتح الإسطبل...' : 'Loading your private stable...'}
            </Text>
          </View>
        );
      }
      return (
        <FlatList
          data={favorites}
          keyExtractor={(item) => (item.id || item.horse_id)?.toString()}
          ListHeaderComponent={
            favorites.length > 0 ? (
              <View testID="stable-portfolio-card" style={styles.portfolioCard}>
                <View style={[styles.portfolioHeaderRow, isRTL && styles.rowRTL]}>
                  <View style={styles.portfolioIconWrap}>
                    <Ionicons name="shield-checkmark" size={18} color={COLORS.accent} />
                  </View>
                  <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                    <Text style={[styles.portfolioTitle, isRTL && styles.textRTL]}>
                      {isArabic ? 'المحفظة الاستثمارية للإسطبل' : 'Private Stable Portfolio'}
                    </Text>
                    <Text style={[styles.portfolioSubtitle, isRTL && styles.textRTL]}>
                      {isArabic
                        ? `${favorites.length} خيول مسجلة تحت المتابعة المباشرة وتنبيهات الأسعار`
                        : `${favorites.length} curated horses under active price & vetting surveillance`}
                    </Text>
                  </View>
                </View>

                {/* 3 Stud & Sanctuary Trust Pillars */}
                <View style={[styles.portfolioPillarsRow, isRTL && styles.rowRTL]}>
                  <View style={[styles.portfolioPillarBadge, isRTL && styles.rowRTL]}>
                    <Ionicons name="shield-checkmark" size={11} color={COLORS.accent} />
                    <Text style={styles.portfolioPillarText}>
                      {isArabic ? 'تتبع أنساب WAHO المعتمدة' : 'WAHO Pedigree Tracking'}
                    </Text>
                  </View>
                  <View style={[styles.portfolioPillarBadge, isRTL && styles.rowRTL]}>
                    <Ionicons name="shield-checkmark" size={11} color={COLORS.accent} />
                    <Text style={styles.portfolioPillarText}>
                      {isArabic ? 'مراقبة التقييم والأسعار' : 'Live Price Surveillance'}
                    </Text>
                  </View>
                  <View style={[styles.portfolioPillarBadge, isRTL && styles.rowRTL]}>
                    <Ionicons name="shield-checkmark" size={11} color={COLORS.accent} />
                    <Text style={styles.portfolioPillarText}>
                      {isArabic ? 'أولوية الصفقات الخاصة' : 'Priority Off-Market Access'}
                    </Text>
                  </View>
                </View>

                <View style={[styles.portfolioActionsRow, isRTL && styles.rowRTL]}>
                  <TouchableOpacity
                    testID="stable-share-whatsapp-btn"
                    style={[styles.portfolioActionBtn, isRTL && styles.rowRTL]}
                    activeOpacity={0.82}
                    onPress={handleShareStableWhatsApp}
                  >
                    <Ionicons name="logo-whatsapp" size={15} color="#25D366" />
                    <Text style={styles.portfolioActionBtnText}>
                      {isArabic ? 'مشاركة الإسطبل' : 'Share Stable'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    testID="stable-portfolio-concierge-btn"
                    style={[styles.portfolioActionBtn, styles.portfolioConciergeBtn, isRTL && styles.rowRTL]}
                    activeOpacity={0.82}
                    onPress={handleConciergeAssistance}
                  >
                    <Ionicons name="sparkles" size={13} color={COLORS.accentDark} />
                    <Text style={styles.portfolioConciergeBtnText}>
                      {isArabic ? 'استشارة الخبير' : 'Stud Concierge'}
                    </Text>
                  </TouchableOpacity>

                  <View style={[styles.portfolioStatusPill, isRTL && styles.rowRTL]}>
                    <View style={styles.statusDotLive} />
                    <Text style={styles.statusDotText}>
                      {isArabic ? 'تنبيهات الأسعار نشطة' : 'Price Alerts Active'}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const horse = item.horse || item;
            return (
              <HorseCard
                horse={horse}
                onPress={() =>
                  navigation.navigate('HorseDetail', { horse })
                }
                onFavorite={() => removeFavorite(horse)}
                isFavorited={true}
              />
            );
          }}
          ListEmptyComponent={
            <View testID="empty-horses-container" style={styles.emptyContainer}>
              <View style={styles.emptyCrestWrapper}>
                <BrandMark size={36} />
              </View>
              <EmptyState
                icon="heart-outline"
                title={t('noFavorites')}
                subtitle={t('noFavoritesSubtitle')}
              />

              {/* Curated Suggestion Chips */}
              <View style={styles.suggestionChipsWrap}>
                <Text style={styles.suggestionTitle}>
                  {isArabic ? 'سلالات وتصنيفات مميزة للاستكشاف:' : 'Suggested Bloodlines to Explore:'}
                </Text>
                <View style={[styles.chipsRow, isRTL && styles.chipsRowRTL]}>
                  {['Arabian Purebreds', 'Showjumping', 'Endurance'].map((term) => (
                    <TouchableOpacity
                      key={term}
                      testID={`stable-chip-${term}`}
                      style={styles.suggestionChip}
                      onPress={() => handleBrowseTarget('HomeMain')}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="sparkles" size={11} color={COLORS.accentDark} />
                      <Text style={styles.suggestionChipText}>{term}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.emptyActionRow}>
                <TouchableOpacity
                  testID="empty-browse-horses-btn"
                  style={styles.browseCtaBtn}
                  activeOpacity={0.85}
                  onPress={() => handleBrowseTarget('HomeMain')}
                >
                  <Ionicons name="compass-outline" size={17} color={COLORS.white} />
                  <Text style={styles.browseCtaBtnText}>{t('tabBrowse')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  testID="empty-stable-concierge-btn"
                  style={styles.conciergeEmptyBtn}
                  activeOpacity={0.85}
                  onPress={handleConciergeAssistance}
                >
                  <Ionicons name="logo-whatsapp" size={16} color="#10B981" />
                  <Text style={styles.conciergeEmptyBtnText}>
                    {isArabic ? 'طلب بحث عبر المستشار' : 'Concierge Horse Search'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      );
    }

    if (activeCategory === 'equipment') {
      return (
        <View testID="empty-equipment-container" style={styles.emptyCategoryWrap}>
          <View style={styles.emptyCrestWrapper}>
            <Ionicons name="shield-outline" size={32} color={COLORS.accentDark} />
          </View>
          <EmptyState
            icon="shield-outline"
            title={t('noSavedEquipment')}
            subtitle={t('noSavedEquipmentSubtitle')}
          />
          <TouchableOpacity
            testID="empty-browse-equipment-btn"
            style={styles.browseCtaBtn}
            activeOpacity={0.85}
            onPress={() => handleBrowseTarget('EquipmentListScreen')}
          >
            <Ionicons name="shield-outline" size={17} color={COLORS.white} />
            <Text style={styles.browseCtaBtnText}>{t('browseEquipment')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="empty-equipment-concierge-btn"
            style={[styles.emptySecondaryConciergeBtn, isRTL && styles.rowRTL]}
            activeOpacity={0.85}
            onPress={handleConciergeAssistance}
          >
            <Ionicons name="logo-whatsapp" size={15} color="#10B981" />
            <Text style={styles.emptySecondaryConciergeBtnText}>
              {isArabic ? 'طلب توفير مستلزمات مخصصة' : 'Custom Tack & Gear Request'}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (activeCategory === 'rider_gear') {
      return (
        <View testID="empty-rider-gear-container" style={styles.emptyCategoryWrap}>
          <View style={styles.emptyCrestWrapper}>
            <Ionicons name="shirt-outline" size={32} color={COLORS.accentDark} />
          </View>
          <EmptyState
            icon="shirt-outline"
            title={t('noSavedRiderGear')}
            subtitle={t('noSavedRiderGearSubtitle')}
          />
          <TouchableOpacity
            testID="empty-browse-rider-gear-btn"
            style={styles.browseCtaBtn}
            activeOpacity={0.85}
            onPress={() => handleBrowseTarget('RiderGearListScreen')}
          >
            <Ionicons name="shirt-outline" size={17} color={COLORS.white} />
            <Text style={styles.browseCtaBtnText}>{t('browseRiderGear')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="empty-rider-gear-concierge-btn"
            style={[styles.emptySecondaryConciergeBtn, isRTL && styles.rowRTL]}
            activeOpacity={0.85}
            onPress={handleConciergeAssistance}
          >
            <Ionicons name="logo-whatsapp" size={15} color="#10B981" />
            <Text style={styles.emptySecondaryConciergeBtnText}>
              {isArabic ? 'طلب أزياء ومعدات مخصصة' : 'Custom Attire Request'}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (activeCategory === 'services') {
      return (
        <View testID="empty-services-container" style={styles.emptyCategoryWrap}>
          <View style={styles.emptyCrestWrapper}>
            <Ionicons name="construct-outline" size={32} color={COLORS.accentDark} />
          </View>
          <EmptyState
            icon="construct-outline"
            title={t('noSavedServices')}
            subtitle={t('noSavedServicesSubtitle')}
          />
          <TouchableOpacity
            testID="empty-browse-services-btn"
            style={styles.browseCtaBtn}
            activeOpacity={0.85}
            onPress={() => handleBrowseTarget('ServiceListScreen')}
          >
            <Ionicons name="construct-outline" size={17} color={COLORS.white} />
            <Text style={styles.browseCtaBtnText}>{t('browseServices')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="empty-services-concierge-btn"
            style={[styles.emptySecondaryConciergeBtn, isRTL && styles.rowRTL]}
            activeOpacity={0.85}
            onPress={handleConciergeAssistance}
          >
            <Ionicons name="logo-whatsapp" size={15} color="#10B981" />
            <Text style={styles.emptySecondaryConciergeBtnText}>
              {isArabic ? 'حجز خدمة أو مدرب خاص' : 'Book Private Equine Service'}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* Executive Header */}
      <View testID="favorites-header" style={[styles.header, isRTL && styles.headerRTL]}>
        <View style={[styles.headerBrandRow, isRTL && styles.headerBrandRowRTL]}>
          <View style={styles.brandIconWrapper}>
            <BrandMark size={28} />
          </View>
          <View style={[styles.headerTitleWrap, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <View
              testID="stable-vip-badge"
              style={[styles.portalBadge, isRTL && styles.portalBadgeRTL]}
            >
              <Ionicons name="ribbon" size={11} color={COLORS.accentDark} />
              <View style={styles.portalBadgeDot} />
              <Text style={styles.portalBadgeText}>
                {isArabic ? 'إسطبل المقتنيات الخاصة' : 'PRIVATE STABLE & SANCTUARY'}
              </Text>
            </View>
            <Text style={[styles.headerTitle, isRTL && styles.textRTL]}>{t('stable')}</Text>
            <Text style={[styles.headerSubtitle, isRTL && styles.textRTL]}>
              {activeCategory === 'horses'
                ? t('savedCount', favorites.length)
                : t(STABLE_CATEGORIES.find((c) => c.id === activeCategory)?.labelKey || 'stable')}
            </Text>
          </View>
        </View>

        <View style={[styles.headerActionsRight, isRTL && styles.rowRTL]}>
          {activeCategory === 'horses' && favorites.length > 0 && (
            <View testID="favorites-header-count-badge" style={styles.headerCountBadge}>
              <Ionicons name="bookmark" size={12} color={COLORS.accent} />
              <Text style={styles.headerCountText}>{favorites.length}</Text>
            </View>
          )}

          <TouchableOpacity
            testID="favorites-header-explore-btn"
            style={styles.headerExploreBtn}
            activeOpacity={0.8}
            onPress={() => handleBrowseTarget('MarketplaceHomeScreen')}
          >
            <Ionicons name="grid-outline" size={15} color={COLORS.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            testID="favorites-header-concierge-btn"
            style={[styles.headerExploreBtn, styles.headerConciergeBtn]}
            activeOpacity={0.8}
            onPress={handleConciergeAssistance}
          >
            <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Multi-Category Segmented Tabs */}
      <View style={styles.categoryBarContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.categoryTabsScroll, isRTL && styles.tabsScrollRTL]}
        >
          {STABLE_CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                testID={`stable-tab-${cat.id}`}
                activeOpacity={0.8}
                onPress={() => setActiveCategory(cat.id)}
                style={[
                  styles.categoryPill,
                  isActive && styles.categoryPillActive,
                ]}
              >
                <Ionicons
                  name={cat.icon}
                  size={14}
                  color={isActive ? COLORS.white : COLORS.textSecondary}
                  style={isRTL ? styles.iconRTL : styles.iconLTR}
                />
                <Text
                  style={[
                    styles.categoryPillText,
                    isActive && styles.categoryPillTextActive,
                  ]}
                >
                  {t(cat.labelKey)}
                </Text>
                {cat.id === 'horses' && favorites.length > 0 && (
                  <View
                    style={[
                      styles.categoryBadge,
                      isActive && styles.categoryBadgeActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryBadgeText,
                        isActive && styles.categoryBadgeTextActive,
                      ]}
                    >
                      {favorites.length}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {renderCategoryContent()}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm + 4,
    paddingBottom: SPACING.xs + 4,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    ...SHADOWS.subtle,
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  headerBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm + 2,
    flex: 1,
  },
  headerBrandRowRTL: {
    flexDirection: 'row-reverse',
  },
  brandIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(197, 160, 89, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.subtle,
  },
  portalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FAF5EA',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.4)',
    paddingVertical: 1.5,
    paddingHorizontal: 7,
    borderRadius: RADIUS.full,
    marginBottom: 3,
  },
  portalBadgeRTL: {
    flexDirection: 'row-reverse',
  },
  portalBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  portalBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: COLORS.accentDark,
    letterSpacing: 0.5,
  },
  headerTitleWrap: {
    justifyContent: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.primary,
  },
  headerSubtitle: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  headerActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  headerCountText: {
    color: COLORS.white,
    fontSize: 11.5,
    fontWeight: '800',
  },
  headerExploreBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FAF5EA',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textRTL: {
    textAlign: 'right',
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  unauthContent: {
    padding: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  unauthCard: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.card,
  },
  unauthIconCrest: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FAF5EA',
    borderWidth: 1.5,
    borderColor: 'rgba(197, 160, 89, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  unauthTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 6,
  },
  unauthSubtitle: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: SPACING.md,
  },
  perksList: {
    width: '100%',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: 10,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  perkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  perkItemRTL: {
    flexDirection: 'row-reverse',
  },
  perkBullet: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FAF5EA',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  perkText: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '500',
    flex: 1,
    lineHeight: 16,
  },
  signInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 13,
    ...SHADOWS.subtle,
  },
  signInBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  conciergeOutlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 10,
    paddingVertical: 8,
  },
  conciergeOutlineBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
  },
  categoryBarContainer: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    paddingVertical: 8,
  },
  categoryTabsScroll: {
    paddingHorizontal: SPACING.md,
    gap: 8,
    flexDirection: 'row',
  },
  tabsScrollRTL: {
    flexDirection: 'row-reverse',
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.full,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  categoryPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.accent,
  },
  iconLTR: {
    marginRight: 6,
  },
  iconRTL: {
    marginLeft: 6,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  categoryPillTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  categoryBadge: {
    backgroundColor: 'rgba(197, 160, 89, 0.25)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 6,
  },
  categoryBadgeActive: {
    backgroundColor: COLORS.accent,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
  },
  categoryBadgeTextActive: {
    color: COLORS.white,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl + 20,
  },
  portfolioCard: {
    backgroundColor: '#0F1E2E',
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(197, 160, 89, 0.45)',
    ...SHADOWS.subtle,
  },
  portfolioHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  portfolioIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(197, 160, 89, 0.2)',
    borderWidth: 1,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  portfolioTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.white,
  },
  portfolioSubtitle: {
    fontSize: 10.5,
    color: 'rgba(255, 255, 255, 0.72)',
    marginTop: 1,
  },
  portfolioPillarsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(197, 160, 89, 0.25)',
    paddingTop: 8,
  },
  portfolioPillarBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.35)',
    borderRadius: RADIUS.full,
    paddingVertical: 2.5,
    paddingHorizontal: 8,
  },
  portfolioPillarText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#E8DCBF',
  },
  portfolioActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 9,
    gap: 6,
  },
  portfolioActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.3)',
    borderRadius: RADIUS.sm,
    paddingVertical: 5,
    paddingHorizontal: 9,
  },
  portfolioActionBtnText: {
    color: COLORS.white,
    fontSize: 10.5,
    fontWeight: '700',
  },
  portfolioConciergeBtn: {
    backgroundColor: '#FAF5EA',
    borderColor: 'rgba(197, 160, 89, 0.45)',
  },
  portfolioConciergeBtnText: {
    color: COLORS.accentDark,
    fontSize: 10.5,
    fontWeight: '800',
  },
  portfolioStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusDotLive: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  statusDotText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.78)',
    fontWeight: '600',
  },
  headerConciergeBtn: {
    backgroundColor: '#FAF5EA',
    borderColor: 'rgba(37, 211, 102, 0.4)',
  },
  emptySecondaryConciergeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FAF5EA',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.4)',
    borderRadius: RADIUS.full,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 10,
    ...SHADOWS.subtle,
  },
  emptySecondaryConciergeBtnText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 24,
    paddingBottom: 40,
  },
  emptyCrestWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FAF5EA',
    borderWidth: 1.5,
    borderColor: 'rgba(197, 160, 89, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  suggestionChipsWrap: {
    width: '100%',
    marginVertical: 14,
    alignItems: 'center',
  },
  suggestionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  chipsRowRTL: {
    flexDirection: 'row-reverse',
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FAF5EA',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.35)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: RADIUS.full,
  },
  suggestionChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accentDark,
  },
  emptyActionRow: {
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  browseCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingVertical: 10,
    paddingHorizontal: 22,
    ...SHADOWS.subtle,
  },
  browseCtaBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  conciergeEmptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FAF5EA',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.4)',
    borderRadius: RADIUS.full,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  conciergeEmptyBtnText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCategoryWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: 36,
    paddingBottom: 40,
  },
});
