import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getEquipmentList, getRiderGearList, getServicesList } from '../services/api';
import translations from '../i18n/translations';

const MODULES = [
  { id: 'horses', title_ar: 'بيع الخيول', title_en: 'Horses', icon: 'paw-outline', screen: 'HorseListScreen' },
  { id: 'equipment', title_ar: 'مستلزمات الخيل', title_en: 'Equipment', icon: 'shield-outline', screen: 'EquipmentListScreen' },
  { id: 'rider_gear', title_ar: 'مستلزمات الفارس', title_en: 'Rider Gear', icon: 'shirt-outline', screen: 'RiderGearListScreen' },
  { id: 'services', title_ar: 'الخدمات والإيواء', title_en: 'Services', icon: 'construct-outline', screen: 'ServiceListScreen' },
];

export default function MarketplaceHomeScreen({ navigation, route }) {
  const [activeModule, setActiveModule] = useState('horses');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Featured Items State
  const [featuredEquipment, setFeaturedEquipment] = useState([]);
  const [featuredRiderGear, setFeaturedRiderGear] = useState([]);
  const [featuredServices, setFeaturedServices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Listing creation modal
  const [showCreateModal, setShowCreateModal] = useState(false);

  const currentLanguage = route?.params?.language || 'ar';
  const isArabic = currentLanguage === 'ar';
  const t = (key) => translations[currentLanguage]?.[key] || translations.en?.[key] || key;

  useEffect(() => {
    async function loadHomeData() {
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
      }
    }
    loadHomeData();
  }, []);

  const handleGlobalSearch = () => {
    if (!searchQuery.trim()) return;

    if (activeModule === 'equipment') {
      navigation.navigate('EquipmentListScreen', { searchQuery: searchQuery.trim() });
    } else if (activeModule === 'rider_gear') {
      navigation.navigate('RiderGearListScreen', { searchQuery: searchQuery.trim() });
    } else if (activeModule === 'services') {
      navigation.navigate('ServiceListScreen', { searchQuery: searchQuery.trim() });
    } else {
      navigation.navigate('HorseListScreen', { searchQuery: searchQuery.trim() });
    }
  };

  const renderHorizontalCard = (item, type) => {
    const mainImage = item.images?.[0]?.image_url || 'https://via.placeholder.com/200x140?text=Listing';
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

    return (
      <TouchableOpacity
        style={styles.hCard}
        activeOpacity={0.85}
        onPress={() => navigation.navigate(detailScreen, { [paramKey]: item.id })}
      >
        <Image source={{ uri: mainImage }} style={styles.hCardImage} resizeMode="cover" />
        <View style={styles.hCardBody}>
          <Text style={styles.hCardTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.hCardPrice}>
            {item.price ? `${item.price.toLocaleString()} AED` : 'POA'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Bar */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brandSubtitle}>
              {isArabic ? 'سوق الخيل والمستلزمات الأول' : 'The Premier Equestrian Marketplace'}
            </Text>
            <Text style={styles.brandTitle}>
              {isArabic ? 'الخيل والخدمات' : 'Equestrian Hub'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.adminBadge}
            onPress={() => navigation.navigate('AdminModerationDashboardScreen')}
          >
            <Ionicons name="shield-checkmark" size={18} color="#2563eb" />
            <Text style={styles.adminBadgeText}>{isArabic ? 'الإدارة' : 'Admin'}</Text>
          </TouchableOpacity>
        </View>

        {/* Global Search Bar */}
        <View style={styles.searchBarContainer}>
          <Ionicons name="search-outline" size={20} color="#64748b" />
          <TextInput
            style={[styles.searchInput, { textAlign: isArabic ? 'right' : 'left' }]}
            placeholder={isArabic ? 'ابحث عن خيل، معدات، ملابس، أو خدمات...' : 'Search horses, equipment, gear, services...'}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleGlobalSearch}
            placeholderTextColor="#94a3b8"
          />
          <TouchableOpacity style={styles.searchSubmitBtn} onPress={handleGlobalSearch}>
            <Ionicons name="arrow-forward" size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Module Navigation Grid */}
        <View style={styles.moduleGrid}>
          {MODULES.map((m) => {
            const isSelected = activeModule === m.id;
            return (
              <TouchableOpacity
                key={m.id}
                style={[styles.moduleCard, isSelected && styles.activeModuleCard]}
                activeOpacity={0.8}
                onPress={() => {
                  setActiveModule(m.id);
                  navigation.navigate(m.screen);
                }}
              >
                <View style={[styles.moduleIconContainer, isSelected && styles.activeModuleIcon]}>
                  <Ionicons name={m.icon} size={24} color={isSelected ? '#ffffff' : '#2563eb'} />
                </View>
                <Text style={[styles.moduleTitle, isSelected && styles.activeModuleTitle]}>
                  {isArabic ? m.title_ar : m.title_en}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Featured Sections */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        ) : (
          <>
            {/* Featured Horse Equipment */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{isArabic ? 'معدات ومستلزمات الخيل' : 'Horse Equipment'}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('EquipmentListScreen')}>
                <Text style={styles.seeAllText}>{isArabic ? 'عرض الكل' : 'See All'}</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={featuredEquipment}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => renderHorizontalCard(item, 'equipment')}
              contentContainerStyle={styles.hListContent}
            />

            {/* Featured Rider Gear */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{isArabic ? 'مستلزمات وملابس الفارس' : 'Rider Apparel & Gear'}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('RiderGearListScreen')}>
                <Text style={styles.seeAllText}>{isArabic ? 'عرض الكل' : 'See All'}</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={featuredRiderGear}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => renderHorizontalCard(item, 'rider_gear')}
              contentContainerStyle={styles.hListContent}
            />

            {/* Featured Services */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{isArabic ? 'الخدمات والإيواء والتدريب' : 'Services & Boarding'}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('ServiceListScreen')}>
                <Text style={styles.seeAllText}>{isArabic ? 'عرض الكل' : 'See All'}</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={featuredServices}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => renderHorizontalCard(item, 'services')}
              contentContainerStyle={styles.hListContent}
            />
          </>
        )}
      </ScrollView>

      {/* Floating Create Button */}
      <TouchableOpacity
        style={styles.fabButton}
        activeOpacity={0.85}
        onPress={() => setShowCreateModal(true)}
      >
        <Ionicons name="add" size={28} color="#ffffff" />
      </TouchableOpacity>

      {/* Create Listing Type Selection Modal */}
      <Modal visible={showCreateModal} animationType="fade" transparent>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCreateModal(false)}
        >
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>
              {isArabic ? 'اختر قسم الإعلان الجديد' : 'Select Listing Category'}
            </Text>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                setShowCreateModal(false);
                navigation.navigate('CreateEquipmentScreen');
              }}
            >
              <Ionicons name="shield-outline" size={22} color="#2563eb" />
              <Text style={styles.modalOptionText}>
                {isArabic ? 'إضافة مستلزمات خيل' : 'Add Horse Equipment'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                setShowCreateModal(false);
                navigation.navigate('CreateRiderGearScreen');
              }}
            >
              <Ionicons name="shirt-outline" size={22} color="#2563eb" />
              <Text style={styles.modalOptionText}>
                {isArabic ? 'إضافة مستلزمات فارس' : 'Add Rider Gear'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                setShowCreateModal(false);
                navigation.navigate('CreateServiceScreen');
              }}
            >
              <Ionicons name="construct-outline" size={22} color="#2563eb" />
              <Text style={styles.modalOptionText}>
                {isArabic ? 'إضافة خدمة جديدة' : 'Add Equestrian Service'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowCreateModal(false)}>
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
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    paddingBottom: 80,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  brandSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  adminBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563eb',
    marginLeft: 4,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    marginHorizontal: 20,
    marginVertical: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    marginHorizontal: 8,
  },
  searchSubmitBtn: {
    backgroundColor: '#2563eb',
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moduleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginVertical: 12,
  },
  moduleCard: {
    width: '48%',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  activeModuleCard: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  moduleIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  activeModuleIcon: {
    backgroundColor: '#2563eb',
  },
  moduleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  activeModuleTitle: {
    color: '#2563eb',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 18,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563eb',
  },
  hListContent: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  hCard: {
    width: 160,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  hCardImage: {
    width: '100%',
    height: 110,
    backgroundColor: '#e2e8f0',
  },
  hCardBody: {
    padding: 10,
  },
  hCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  hCardPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2563eb',
  },
  loadingContainer: {
    paddingVertical: 40,
  },
  fabButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalOptionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginLeft: 12,
  },
  modalCancelBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 6,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
});
