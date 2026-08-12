import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORY_SEED } from '../data/categorySeed';

/**
 * CategoryPicker Component
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
      <View style={styles.categoryCard}>
        <TouchableOpacity
          style={[styles.parentHeader, isSelected && styles.selectedHeader]}
          onPress={() => {
            if (hasChildren) {
              toggleExpand(item.slug);
            } else {
              handleSelect(item);
            }
          }}
          activeOpacity={0.7}
        >
          <View style={styles.parentLeft}>
            <Ionicons
              name={item.icon_name || 'folder-outline'}
              size={22}
              color={isSelected ? '#2563eb' : '#475569'}
              style={styles.icon}
            />
            <Text style={[styles.parentTitle, isSelected && styles.selectedTitle]}>
              {isArabic ? item.name_ar : item.name_en}
            </Text>
          </View>

          <View style={styles.parentRight}>
            {hasChildren && (
              <TouchableOpacity
                onPress={() => toggleExpand(item.slug)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={isExpanded ? 'chevron-down-outline' : 'chevron-forward-outline'}
                  size={20}
                  color="#64748b"
                />
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>

        {/* Sub-categories */}
        {hasChildren && isExpanded && (
          <View style={styles.childrenContainer}>
            {item.children.map((child) => {
              const childSelected = selectedSlug === child.slug;
              return (
                <TouchableOpacity
                  key={child.slug}
                  style={[styles.childRow, childSelected && styles.selectedChildRow]}
                  onPress={() => handleSelect(child)}
                >
                  <Ionicons
                    name={child.icon_name || 'return-down-forward-outline'}
                    size={16}
                    color={childSelected ? '#2563eb' : '#94a3b8'}
                    style={styles.childIcon}
                  />
                  <Text style={[styles.childTitle, childSelected && styles.selectedChildTitle]}>
                    {isArabic ? child.name_ar : child.name_en}
                  </Text>

                  {childSelected && (
                    <Ionicons name="checkmark-circle" size={18} color="#2563eb" />
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
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {isArabic ? 'اختر التصنيف' : 'Select Category'}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close-outline" size={26} color="#0f172a" />
          </TouchableOpacity>
        </View>

        {/* Search Input */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color="#94a3b8" />
          <TextInput
            style={[styles.searchInput, { textAlign: isArabic ? 'right' : 'left' }]}
            placeholder={isArabic ? 'بحث في التصنيفات...' : 'Search categories...'}
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

        {/* Module Switcher Tabs (if not pre-filtered) */}
        {!moduleFilter && (
          <View style={styles.tabsRow}>
            <TouchableOpacity
              style={[styles.tab, activeModule === 'equipment' && styles.activeTab]}
              onPress={() => setActiveModule('equipment')}
            >
              <Text
                style={[styles.tabText, activeModule === 'equipment' && styles.activeTabText]}
              >
                {isArabic ? 'مستلزمات الخيل' : 'Equipment'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeModule === 'rider_gear' && styles.activeTab]}
              onPress={() => setActiveModule('rider_gear')}
            >
              <Text
                style={[styles.tabText, activeModule === 'rider_gear' && styles.activeTabText]}
              >
                {isArabic ? 'مستلزمات الفارس' : 'Rider Gear'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeModule === 'services' && styles.activeTab]}
              onPress={() => setActiveModule('services')}
            >
              <Text
                style={[styles.tabText, activeModule === 'services' && styles.activeTabText]}
              >
                {isArabic ? 'الخدمات' : 'Services'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* List */}
        <FlatList
          data={categoriesToDisplay}
          keyExtractor={(item) => item.slug}
          renderItem={renderCategoryItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="search-discontent-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyText}>
                {isArabic ? 'لا توجد تصنيفات مطابقة' : 'No matching categories found'}
              </Text>
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
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  closeBtn: {
    padding: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  searchInput: {
    flex: 1,
    marginHorizontal: 8,
    fontSize: 15,
    color: '#0f172a',
  },
  tabsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#e2e8f0',
    borderRadius: 10,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  activeTabText: {
    color: '#2563eb',
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  categoryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  parentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  selectedHeader: {
    backgroundColor: '#eff6ff',
  },
  parentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: 10,
  },
  parentTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  selectedTitle: {
    color: '#2563eb',
    fontWeight: '700',
  },
  parentRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  childrenContainer: {
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingVertical: 4,
  },
  childRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  selectedChildRow: {
    backgroundColor: '#dbeafe',
  },
  childIcon: {
    marginRight: 8,
  },
  childTitle: {
    fontSize: 14,
    color: '#475569',
    flex: 1,
  },
  selectedChildTitle: {
    color: '#1d4ed8',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#94a3b8',
  },
});
