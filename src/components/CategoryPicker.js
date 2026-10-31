import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  Modal,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORY_SEED } from '../data/categorySeed';
import { COLORS, SHADOWS, FONTS, RADIUS, SPACING } from '../config/theme';
import BrandMark from './BrandMark';

/**
 * CategoryPicker Component - SteedMarket Luxury Edition
 * Props:
 * - visible (boolean): Controls modal visibility
 * - onClose (function): Close modal callback
 * - onSelectCategory (function): Returns selected category object { slug, name_ar, name_en, module }
 * - moduleFilter ('equipment' | 'rider_gear' | 'services' | null): Pre-filter module
 * - currentLanguage ('ar' | 'en'): Language display preference
 * - selectedSlug (string): Currently selected category slug
 */
export default function CategoryPicker({
  visible = false,
  onClose,
  onSelectCategory,
  moduleFilter = null,
  currentLanguage = 'ar',
  selectedSlug = null,
}) {
  const [activeModule, setActiveModule] = useState(moduleFilter || 'equipment');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSlugs, setExpandedSlugs] = useState({});

  const isArabic = currentLanguage === 'ar';

  const categoriesToDisplay = useMemo(() => {
    const targetModule = moduleFilter || activeModule;
    let list = CATEGORY_SEED.filter((cat) => cat.module === targetModule);

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list
        .map((parent) => {
          const parentMatches =
            parent.name_ar.toLowerCase().includes(q) ||
            parent.name_en.toLowerCase().includes(q);

          const matchingChildren = (parent.children || []).filter(
            (child) =>
              child.name_ar.toLowerCase().includes(q) ||
              child.name_en.toLowerCase().includes(q)
          );

          if (parentMatches || matchingChildren.length > 0) {
            return {
              ...parent,
              children: parentMatches ? parent.children : matchingChildren,
            };
          }
          return null;
        })
        .filter(Boolean);
    }
    return list;
  }, [moduleFilter, activeModule, searchQuery]);

  const toggleExpand = (slug) => {
    setExpandedSlugs((prev) => ({ ...prev, [slug]: !prev[slug] }));
  };

  const handleCatalogHotline = () => {
    const text = isArabic
      ? 'مرحباً، أود الاستفسار من فريق كتالوج ستيد ماركت عن تصنيف مناسب لمنتج أو خدمة فروسية.'
      : 'Hello SteedMarket Catalog Concierge, I need assistance finding the proper category or registering a new equestrian service.';
    try {
      const res = Linking.openURL(`https://wa.me/971500000000?text=${encodeURIComponent(text)}`);
      if (res && typeof res.catch === 'function') {
        res.catch(() => {});
      }
    } catch (e) {}
  };

  const handleCustomCategoryRequest = () => {
    const queryDesc = searchQuery.trim() ? ` "${searchQuery.trim()}"` : '';
    const text = isArabic
      ? `مرحباً، أود طلب إضافة تصنيف فروسية جديد${queryDesc} إلى كتالوج ستيد ماركت.`
      : `Hello SteedMarket Catalog Concierge, I would like to request adding a custom category${queryDesc} to the platform catalog.`;
    try {
      const res = Linking.openURL(`https://wa.me/971500000000?text=${encodeURIComponent(text)}`);
      if (res && typeof res.catch === 'function') {
        res.catch(() => {});
      }
    } catch (e) {}
  };

  const handleSelect = (category) => {
    if (onSelectCategory) {
      onSelectCategory(category);
    }
    if (onClose) {
      onClose();
    }
  };

  const renderCategoryItem = ({ item }) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = !!expandedSlugs[item.slug] || searchQuery.trim().length > 0;
    const isSelected = selectedSlug === item.slug;

    return (
      <View
        testID={`category-parent-card-${item.slug}`}
        style={[styles.categoryCard, isSelected && styles.selectedCategoryCard]}
      >
        <TouchableOpacity
          testID={`category-parent-${item.slug}`}
          style={[
            styles.parentHeader,
            isArabic && styles.parentHeaderRTL,
            isSelected && styles.selectedHeader,
          ]}
          onPress={() => {
            if (hasChildren) {
              toggleExpand(item.slug);
            } else {
              handleSelect(item);
            }
          }}
          activeOpacity={0.75}
        >
          <View style={[styles.parentLeft, isArabic && styles.parentLeftRTL]}>
            <View style={[styles.iconCrest, isSelected && styles.iconCrestSelected]}>
              <Ionicons
                name={item.icon_name || 'folder-outline'}
                size={20}
                color={isSelected ? COLORS.white : COLORS.primary}
              />
            </View>
            <View style={styles.titleWrap}>
              <Text
                style={[
                  styles.parentTitle,
                  isArabic && styles.textRTL,
                  isSelected && styles.selectedTitle,
                ]}
              >
                {isArabic ? item.name_ar : item.name_en}
              </Text>
              {hasChildren && (
                <Text style={[styles.childCountTag, isArabic && styles.textRTL]}>
                  {item.children.length}{' '}
                  {isArabic
                    ? 'تصنيفات فرعية'
                    : item.children.length === 1
                    ? 'subcategory'
                    : 'subcategories'}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.parentRight}>
            {hasChildren ? (
              <TouchableOpacity
                testID={`category-toggle-${item.slug}`}
                onPress={() => toggleExpand(item.slug)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.chevronWrap}
              >
                <Ionicons
                  name={
                    isExpanded
                      ? 'chevron-down'
                      : isArabic
                      ? 'chevron-back'
                      : 'chevron-forward'
                  }
                  size={18}
                  color={isSelected ? COLORS.accentDark : COLORS.textLight}
                />
              </TouchableOpacity>
            ) : isSelected ? (
              <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
            ) : null}
          </View>
        </TouchableOpacity>

        {/* Sub-categories */}
        {hasChildren && isExpanded && (
          <View style={styles.childrenContainer}>
            {item.children.map((child, idx) => {
              const childSelected = selectedSlug === child.slug;
              const isLast = idx === item.children.length - 1;
              return (
                <TouchableOpacity
                  key={child.slug}
                  testID={`category-child-${child.slug}`}
                  style={[
                    styles.childRow,
                    isArabic && styles.childRowRTL,
                    childSelected && styles.selectedChildRow,
                    isLast && styles.lastChildRow,
                  ]}
                  onPress={() => handleSelect(child)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.childLeft, isArabic && styles.childLeftRTL]}>
                    <View
                      style={[
                        styles.childBullet,
                        childSelected && styles.childBulletSelected,
                      ]}
                    >
                      <Ionicons
                        name={child.icon_name || 'return-down-forward-outline'}
                        size={14}
                        color={childSelected ? COLORS.white : COLORS.accentDark}
                      />
                    </View>
                    <Text
                      style={[
                        styles.childTitle,
                        isArabic && styles.textRTL,
                        childSelected && styles.selectedChildTitle,
                      ]}
                    >
                      {isArabic ? child.name_ar : child.name_en}
                    </Text>
                  </View>

                  {childSelected ? (
                    <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
                  ) : (
                    <Ionicons
                      name={isArabic ? 'chevron-back' : 'chevron-forward'}
                      size={15}
                      color={COLORS.border}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal
      testID="category-picker-modal"
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={[styles.header, isArabic && styles.headerRTL]}>
          <View style={[styles.headerBrandRow, isArabic && styles.headerBrandRowRTL]}>
            <View style={styles.brandIconWrap}>
              <BrandMark size={28} />
            </View>
            <View style={styles.headerTitleWrap}>
              <View style={[styles.portalBadge, isArabic && styles.rowRTL]}>
                <View style={styles.portalBadgeDot} />
                <Text style={styles.portalBadgeText}>
                  {isArabic ? 'دليل تصنيفات الفروسية المعتمد' : 'VIP ACCREDITED EQUINE CATALOG'}
                </Text>
              </View>
              <Text style={[styles.headerTitle, isArabic && styles.textRTL]}>
                {isArabic ? 'اختر التصنيف' : 'Select Category'}
              </Text>
              <Text style={[styles.headerSubtitle, isArabic && styles.textRTL]}>
                {isArabic ? 'سوق الفروسية المعتمد' : 'Verified Equine Catalog'}
              </Text>
            </View>
          </View>
          <View style={[styles.headerActions, isArabic && styles.rowRTL]}>
            <TouchableOpacity
              testID="category-picker-hotline-btn"
              onPress={handleCatalogHotline}
              style={styles.headerHotlineBtn}
              activeOpacity={0.8}
              accessibilityLabel="Catalog Concierge Hotline"
            >
              <Ionicons name="logo-whatsapp" size={17} color="#25D366" />
            </TouchableOpacity>
            <TouchableOpacity
              testID="category-picker-close-btn"
              onPress={onClose}
              style={styles.closeBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={22} color={COLORS.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchBar, isArabic && styles.searchBarRTL]}>
          <Ionicons
            name="search-outline"
            size={18}
            color={COLORS.primary}
            style={isArabic ? styles.searchIconRTL : styles.searchIcon}
          />
          <TextInput
            testID="category-search-input"
            style={[styles.searchInput, isArabic && styles.searchInputRTL]}
            placeholder={isArabic ? 'بحث في التصنيفات...' : 'Search categories...'}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={COLORS.textLight}
            clearButtonMode="never"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              testID="category-search-clear-btn"
              onPress={() => setSearchQuery('')}
              style={styles.clearBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle" size={18} color={COLORS.textLight} />
            </TouchableOpacity>
          )}
        </View>

        {/* Module Switcher Tabs (if not pre-filtered) */}
        {!moduleFilter && (
          <View style={styles.tabsContainer}>
            <View style={[styles.tabsRow, isArabic && styles.tabsRowRTL]}>
              <TouchableOpacity
                testID="category-tab-equipment"
                style={[styles.tab, activeModule === 'equipment' && styles.activeTab]}
                onPress={() => setActiveModule('equipment')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="shield-outline"
                  size={14}
                  color={activeModule === 'equipment' ? COLORS.white : COLORS.textSecondary}
                  style={isArabic ? styles.tabIconRTL : styles.tabIcon}
                />
                <Text
                  style={[
                    styles.tabText,
                    activeModule === 'equipment' && styles.activeTabText,
                  ]}
                >
                  {isArabic ? 'مستلزمات الخيل' : 'Equipment'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                testID="category-tab-rider_gear"
                style={[styles.tab, activeModule === 'rider_gear' && styles.activeTab]}
                onPress={() => setActiveModule('rider_gear')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="person-outline"
                  size={14}
                  color={activeModule === 'rider_gear' ? COLORS.white : COLORS.textSecondary}
                  style={isArabic ? styles.tabIconRTL : styles.tabIcon}
                />
                <Text
                  style={[
                    styles.tabText,
                    activeModule === 'rider_gear' && styles.activeTabText,
                  ]}
                >
                  {isArabic ? 'مستلزمات الفارس' : 'Rider Gear'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                testID="category-tab-services"
                style={[styles.tab, activeModule === 'services' && styles.activeTab]}
                onPress={() => setActiveModule('services')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="briefcase-outline"
                  size={14}
                  color={activeModule === 'services' ? COLORS.white : COLORS.textSecondary}
                  style={isArabic ? styles.tabIconRTL : styles.tabIcon}
                />
                <Text
                  style={[
                    styles.tabText,
                    activeModule === 'services' && styles.activeTabText,
                  ]}
                >
                  {isArabic ? 'الخدمات' : 'Services'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Results Count Header */}
        <View style={[styles.countRow, isArabic && styles.countRowRTL]}>
          <Text style={[styles.countText, isArabic && styles.textRTL]}>
            {isArabic
              ? `${categoriesToDisplay.length} مجموعة تصنيفات متاحة`
              : `${categoriesToDisplay.length} category groups available`}
          </Text>
        </View>

        {/* FlatList */}
        <FlatList
          data={categoriesToDisplay}
          keyExtractor={(item) => item.slug}
          renderItem={renderCategoryItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View testID="category-catalog-shield" style={styles.catalogShieldCard}>
              <View style={[styles.shieldHeaderRow, isArabic && styles.rowRTL]}>
                <View style={styles.shieldIconWrap}>
                  <Ionicons name="shield-checkmark" size={18} color={COLORS.accentDark} />
                </View>
                <View style={{ flex: 1, alignItems: isArabic ? 'flex-end' : 'flex-start' }}>
                  <View style={[styles.shieldBadgeRow, isArabic && styles.rowRTL]}>
                    <View style={styles.shieldPulseDot} />
                    <Text style={styles.shieldBadgeText}>
                      {isArabic ? 'معايير التبويب والاعتماد الخليجي' : 'OFFICIAL GCC TAXONOMY PROTOCOL'}
                    </Text>
                  </View>
                  <Text style={[styles.shieldTitle, isArabic && styles.textRTL]}>
                    {isArabic ? 'ميثاق تصنيف وتبويب مستلزمات الخيل' : 'Equine Taxonomy & Catalog Standards'}
                  </Text>
                  <Text style={[styles.shieldDesc, isArabic && styles.textRTL]}>
                    {isArabic
                      ? 'تصنيف معياري موثق لجميع مستلزمات الخيل، عتاد الفارس، والخدمات البيطرية المعتمدة'
                      : 'Curated standard classifications for tack, rider protection gear, and vetted equine services'}
                  </Text>
                </View>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View testID="category-empty-state" style={styles.emptyContainer}>
              <View style={styles.emptyIconBadge}>
                <Ionicons name="search-outline" size={36} color={COLORS.accentDark} />
              </View>
              <Text style={styles.emptyTitle}>
                {isArabic ? 'لا توجد تصنيفات مطابقة' : 'No matching categories found'}
              </Text>
              <Text style={styles.emptyText}>
                {isArabic
                  ? 'جرب البحث بكلمات أخرى أو اختر قسماً آخر من الأعلى'
                  : 'Try searching with different terms or select another vertical above'}
              </Text>
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  style={styles.emptyResetBtn}
                  onPress={() => setSearchQuery('')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.emptyResetBtnText}>
                    {isArabic ? 'مسح البحث' : 'Clear Search'}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                testID="category-empty-concierge-btn"
                style={[styles.emptyConciergeBtn, isArabic && styles.rowRTL]}
                onPress={handleCustomCategoryRequest}
                activeOpacity={0.85}
              >
                <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
                <Text style={styles.emptyConciergeBtnText}>
                  {isArabic ? 'طلب إضافة تصنيف مخصص عبر الواتساب' : 'Request Custom Category via WhatsApp'}
                </Text>
              </TouchableOpacity>
            </View>
          }
        />
      </SafeAreaView>
    </Modal>
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
    paddingVertical: SPACING.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    backgroundColor: COLORS.surface,
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  headerBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerBrandRowRTL: {
    flexDirection: 'row-reverse',
  },
  brandIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    ...SHADOWS.subtle,
  },
  portalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3EFE6',
    borderWidth: 1,
    borderColor: '#D4AF37',
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  portalBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  portalBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0F291E',
    letterSpacing: 0.6,
  },
  headerTitleWrap: {
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs + 2,
  },
  headerHotlineBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#A5D6A7',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.subtle,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.subtle,
  },
  searchBarRTL: {
    flexDirection: 'row-reverse',
  },
  searchIcon: {
    marginRight: SPACING.xs,
  },
  searchIconRTL: {
    marginLeft: SPACING.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    textAlign: 'left',
  },
  searchInputRTL: {
    textAlign: 'right',
  },
  clearBtn: {
    padding: 4,
  },
  tabsContainer: {
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#ECE8E1',
    borderRadius: RADIUS.md,
    padding: 3,
  },
  tabsRowRTL: {
    flexDirection: 'row-reverse',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
  },
  tabIcon: {
    marginRight: 4,
  },
  tabIconRTL: {
    marginLeft: 4,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
    ...SHADOWS.subtle,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: COLORS.white,
    fontWeight: '700',
  },
  countRow: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  countRowRTL: {
    alignItems: 'flex-end',
  },
  countText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  categoryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  selectedCategoryCard: {
    borderColor: COLORS.accent,
  },
  parentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
  },
  parentHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  selectedHeader: {
    backgroundColor: COLORS.primaryLight,
  },
  parentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: SPACING.sm,
  },
  parentLeftRTL: {
    flexDirection: 'row-reverse',
  },
  iconCrest: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCrestSelected: {
    backgroundColor: COLORS.primary,
  },
  titleWrap: {
    flex: 1,
  },
  parentTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  selectedTitle: {
    color: COLORS.primary,
  },
  childCountTag: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 2,
  },
  parentRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chevronWrap: {
    padding: 6,
  },
  childrenContainer: {
    backgroundColor: '#FAF8F5',
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  childRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F0ECE4',
  },
  childRowRTL: {
    flexDirection: 'row-reverse',
  },
  lastChildRow: {
    borderBottomWidth: 0,
  },
  selectedChildRow: {
    backgroundColor: COLORS.primaryLight,
    borderBottomColor: COLORS.borderLight,
  },
  childLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: SPACING.sm,
  },
  childLeftRTL: {
    flexDirection: 'row-reverse',
  },
  childBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ECE7DF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  childBulletSelected: {
    backgroundColor: COLORS.primary,
  },
  childTitle: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
    flex: 1,
  },
  selectedChildTitle: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  textRTL: {
    textAlign: 'right',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: SPACING.lg,
  },
  emptyIconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ECE7DF',
    borderWidth: 2,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyResetBtn: {
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
  },
  emptyResetBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  catalogShieldCard: {
    backgroundColor: '#FDFBF7',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.subtle,
  },
  shieldHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  shieldIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FAF5E8',
    borderWidth: 1,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  shieldBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  shieldPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 5,
  },
  shieldBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.accentDark,
    letterSpacing: 0.5,
  },
  shieldTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  shieldDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  emptyConciergeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#81C784',
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    marginTop: SPACING.md,
  },
  emptyConciergeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1B5E20',
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
});
