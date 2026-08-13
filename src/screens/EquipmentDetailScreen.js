import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getEquipmentDetail } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

const { width } = Dimensions.get('window');

export default function EquipmentDetailScreen({ route, navigation }) {
  const { equipmentId } = route.params || {};
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const { language: currentLanguage, t, isRTL } = useLanguage();
  const isArabic = currentLanguage === 'ar';

  useEffect(() => {
    async function loadDetail() {
      if (!equipmentId) return;
      try {
        const response = await getEquipmentDetail(equipmentId);
        setItem(response.data);
      } catch (error) {
        Alert.alert(t('error'), isArabic ? 'فشل تحميل تفاصيل المنتج.' : 'Failed to load equipment details.');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    }
    loadDetail();
  }, [equipmentId]);

  const handleCallOwner = () => {
    const phone = item?.owner?.phone_number || item?.owner?.profile?.phone_number;
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    } else {
      Alert.alert(t('error'), isArabic ? 'رقم الهاتف غير متوفر.' : 'Phone number not available.');
    }
  };

  const handleWhatsApp = () => {
    const phone = item?.owner?.phone_number || item?.owner?.profile?.phone_number;
    if (phone) {
      const cleanPhone = phone.replace(/[^0-9+]/g, '');
      const msg = encodeURIComponent(
        isArabic
          ? `مرحباً، أود الاستفسار عن إعلانك: ${item.title}`
          : `Hello, I am inquiring about your listing: ${item.title}`
      );
      Linking.openURL(`https://wa.me/${cleanPhone}?text=${msg}`);
    } else {
      Alert.alert(t('error'), isArabic ? 'رقم الهاتف غير متوفر.' : 'Phone number not available.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </SafeAreaView>
    );
  }

  if (!item) {
    return null;
  }

  const images = item.images?.length
    ? item.images
    : [{ id: '1', image_url: 'https://via.placeholder.com/600x400?text=Equipment' }];
  const categoryName = isArabic ? item.category?.name_ar : item.category?.name_en;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Gallery Slider */}
        <View style={styles.galleryContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const slide = Math.round(e.nativeEvent.contentOffset.x / width);
              setActiveImageIndex(slide);
            }}
            scrollEventThrottle={16}
          >
            {images.map((img) => (
              <Image
                key={img.id || img.image_url}
                source={{ uri: img.image_url }}
                style={styles.galleryImage}
                resizeMode="cover"
              />
            ))}
          </ScrollView>

          {images.length > 1 && (
            <View style={styles.pagination}>
              {images.map((_, i) => (
                <View
                  key={i}
                  style={[styles.paginationDot, i === activeImageIndex && styles.activeDot]}
                />
              ))}
            </View>
          )}

          {/* Top Bar Navigation Actions */}
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#0f172a" />
          </TouchableOpacity>
        </View>

        {/* Content Details */}
        <View style={styles.body}>
          {categoryName && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{categoryName}</Text>
            </View>
          )}

          <Text style={styles.title}>{item.title}</Text>

          {item.brand && (
            <Text style={styles.brand}>
              {isArabic ? 'العلامة التجارية: ' : 'Brand: '}
              <Text style={styles.brandBold}>{item.brand}</Text>
            </Text>
          )}

          <View style={styles.priceRow}>
            <Text style={styles.price}>{item.price.toLocaleString()} AED</Text>
            {item.quantity > 0 && (
              <View style={styles.stockBadge}>
                <Text style={styles.stockText}>
                  {isArabic ? `متوفر: ${item.quantity}` : `Stock: ${item.quantity}`}
                </Text>
              </View>
            )}
          </View>

          {/* Sizes */}
          {((item.sizes && item.sizes.length > 0) || item.custom_size) && (
            <View style={styles.sizesSection}>
              <Text style={styles.sectionTitle}>{isArabic ? 'المقاسات المتوفرة' : 'Available Sizes'}</Text>
              <View style={styles.sizesRow}>
                {item.sizes?.map((size, idx) => (
                  <View key={idx} style={styles.sizeChip}>
                    <Text style={styles.sizeChipText}>{size}</Text>
                  </View>
                ))}
                {item.custom_size && (
                  <View style={[styles.sizeChip, styles.customSizeChip]}>
                    <Text style={styles.customSizeChipText}>{item.custom_size}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Location */}
          {item.location_text && (
            <View style={styles.locationBox}>
              <Ionicons name="location" size={20} color="#2563eb" />
              <Text style={styles.locationBoxText}>{item.location_text}</Text>
            </View>
          )}

          {/* Description */}
          {item.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('description')}</Text>
              <Text style={styles.descriptionText}>{item.description}</Text>
            </View>
          )}

          {/* Seller Card */}
          <View style={styles.sellerCard}>
            <Text style={styles.sellerCardTitle}>{t('aboutSeller')}</Text>
            <Text style={styles.sellerName}>
              {item.owner?.profile?.first_name
                ? `${item.owner.profile.first_name} ${item.owner.profile.last_name || ''}`
                : item.owner?.email}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={[styles.actionBtn, styles.callBtn]} onPress={handleCallOwner}>
          <Ionicons name="call" size={20} color="#ffffff" />
          <Text style={styles.actionBtnText}>{t('callOwner')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBtn, styles.whatsappBtn]} onPress={handleWhatsApp}>
          <Ionicons name="logo-whatsapp" size={20} color="#ffffff" />
          <Text style={styles.actionBtnText}>{t('whatsapp')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 90,
  },
  galleryContainer: {
    position: 'relative',
    width: '100%',
    height: 280,
    backgroundColor: '#0f172a',
  },
  galleryImage: {
    width: width,
    height: 280,
  },
  pagination: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#ffffff',
    width: 12,
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  body: {
    padding: 20,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginBottom: 10,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563eb',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  brand: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
  },
  brandBold: {
    fontWeight: '700',
    color: '#334155',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  price: {
    fontSize: 24,
    fontWeight: '900',
    color: '#2563eb',
  },
  stockBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  stockText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  sizesSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 10,
  },
  sizesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  sizeChip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  sizeChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  customSizeChip: {
    backgroundColor: '#fef3c7',
    borderColor: '#fde047',
  },
  customSizeChipText: {
    color: '#92400e',
    fontWeight: '700',
  },
  locationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
  },
  locationBoxText: {
    fontSize: 14,
    color: '#334155',
    marginLeft: 8,
    flex: 1,
  },
  section: {
    marginBottom: 20,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#334155',
  },
  sellerCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sellerCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    elevation: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginHorizontal: 6,
  },
  callBtn: {
    backgroundColor: '#2563eb',
  },
  whatsappBtn: {
    backgroundColor: '#16a34a',
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    marginLeft: 8,
  },
});
