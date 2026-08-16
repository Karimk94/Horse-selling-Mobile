import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { createEquipment } from '../services/api';
import { searchLocations } from '../services/locationService';
import CategoryPicker from '../components/CategoryPicker';
import { useLanguage } from '../contexts/LanguageContext';

const STANDARD_SIZES = ['Pony', 'Cob', 'Full', 'Extra Full', 'S', 'M', 'L', 'XL'];

export default function CreateEquipmentScreen({ navigation, route }) {
  const [title, setTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [brand, setBrand] = useState('');
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [customSize, setCustomSize] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [description, setDescription] = useState('');

  // Location Autocomplete
  const [locationText, setLocationText] = useState('');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [locationResults, setLocationResults] = useState([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const { language: currentLanguage, t, isRTL } = useLanguage();
  const isArabic = currentLanguage === 'ar';

  const toggleSize = (size) => {
    if (selectedSizes.includes(size)) {
      setSelectedSizes(selectedSizes.filter((s) => s !== size));
    } else {
      setSelectedSizes([...selectedSizes, size]);
    }
  };

  const handleLocationSearch = async (text) => {
    setLocationText(text);
    if (text.trim().length < 2) {
      setLocationResults([]);
      return;
    }
    setIsSearchingLocation(true);
    const results = await searchLocations(text);
    setLocationResults(results);
    setIsSearchingLocation(false);
  };

  const handleSelectLocation = (loc) => {
    setLocationText(loc.display_name);
    setLatitude(loc.lat);
    setLongitude(loc.lon);
    setLocationResults([]);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert(t('error'), isArabic ? 'يرجى إدخال اسم الإعلان.' : 'Please enter title.');
      return;
    }
    if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      Alert.alert(t('error'), isArabic ? 'يرجى إدخال سعر صحيح (بالدرهم).' : 'Please enter a valid price in AED.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        category_id: selectedCategory?.id || null,
        brand: brand.trim() || null,
        sizes: selectedSizes.length > 0 ? selectedSizes : null,
        custom_size: customSize.trim() || null,
        price: parseFloat(price),
        quantity: parseInt(quantity, 10) || 1,
        location_text: locationText.trim() || null,
        latitude: latitude,
        longitude: longitude,
        description: description.trim() || null,
        image_urls: ['https://via.placeholder.com/600x400?text=Equipment'],
      };

      await createEquipment(payload);
      Alert.alert(
        t('success'),
        isArabic
          ? 'تم إنشاء إعلان مستلزمات الخيل بنجاح، وهو قيد المراجعة.'
          : 'Equipment listing created successfully and is under review.',
        [{ text: t('ok'), onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert(
        t('error'),
        error?.response?.data?.detail ||
          (isArabic ? 'فشل إنشاء الإعلان.' : 'Failed to create listing.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isArabic ? 'إضافة مستلزمات خيل جديدة' : 'Add Horse Equipment Listing'}
          </Text>
        </View>

        {/* Title */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{isArabic ? 'اسم المنتج / الإعلان *' : 'Listing Title *'}</Text>
          <TextInput
            style={[styles.input, { textAlign: isArabic ? 'right' : 'left' }]}
            placeholder={isArabic ? 'مثال: سرج قفز حواجز جلد طبيعي' : 'e.g. Leather Jumping Saddle'}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* Category Picker Selector */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('categories')}</Text>
          <TouchableOpacity
            style={styles.selectorBtn}
            onPress={() => setShowCategoryPicker(true)}
          >
            <Ionicons name="folder-outline" size={20} color="#2563eb" />
            <Text style={styles.selectorBtnText}>
              {selectedCategory
                ? isArabic
                  ? selectedCategory.name_ar
                  : selectedCategory.name_en
                : t('selectCategory')}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Brand */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{isArabic ? 'العلامة التجارية (الماركة)' : 'Brand'}</Text>
          <TextInput
            style={[styles.input, { textAlign: isArabic ? 'right' : 'left' }]}
            placeholder={isArabic ? 'مثال: Stubben, Prestige' : 'e.g. Stubben, Prestige'}
            value={brand}
            onChangeText={setBrand}
          />
        </View>

        {/* Sizes Multi-Select */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{isArabic ? 'المقاسات المتاحة' : 'Standard Sizes'}</Text>
          <View style={styles.sizesChipsRow}>
            {STANDARD_SIZES.map((size) => {
              const isSelected = selectedSizes.includes(size);
              return (
                <TouchableOpacity
                  key={size}
                  style={[styles.sizeChip, isSelected && styles.selectedSizeChip]}
                  onPress={() => toggleSize(size)}
                >
                  <Text style={[styles.sizeChipText, isSelected && styles.selectedSizeChipText]}>
                    {size}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Custom Size Override */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{isArabic ? 'مقاس مخصص آخر' : 'Custom Size (Optional)'}</Text>
          <TextInput
            style={[styles.input, { textAlign: isArabic ? 'right' : 'left' }]}
            placeholder={isArabic ? 'مثال: 125 سم أو 42' : 'e.g. 125 cm or 42'}
            value={customSize}
            onChangeText={setCustomSize}
          />
        </View>

        {/* Price & Quantity */}
        <View style={styles.rowInputs}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>{isArabic ? 'السعر (بالدرهم AED) *' : 'Price (AED) *'}</Text>
            <TextInput
              style={[styles.input, { textAlign: isArabic ? 'right' : 'left' }]}
              placeholder="0.00"
              keyboardType="decimal-pad"
              value={price}
              onChangeText={setPrice}
            />
          </View>

          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.label}>{isArabic ? 'الكمية المتوفرة' : 'Quantity'}</Text>
            <TextInput
              style={[styles.input, { textAlign: isArabic ? 'right' : 'left' }]}
              placeholder="1"
              keyboardType="number-pad"
              value={quantity}
              onChangeText={setQuantity}
            />
          </View>
        </View>

        {/* Location Autocomplete */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{isArabic ? 'الموقع' : 'Location'}</Text>
          <View style={styles.locationInputWrapper}>
            <Ionicons name="location-outline" size={20} color="#64748b" style={styles.locIcon} />
            <TextInput
              style={[styles.input, { flex: 1, textAlign: isArabic ? 'right' : 'left' }]}
              placeholder={t('searchLocationPlaceholder')}
              value={locationText}
              onChangeText={handleLocationSearch}
            />
            {isSearchingLocation && <ActivityIndicator size="small" color="#2563eb" />}
          </View>

          {/* Autocomplete Results Dropdown */}
          {locationResults.length > 0 && (
            <View style={styles.autocompleteDropdown}>
              {locationResults.map((loc, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.autocompleteRow}
                  onPress={() => handleSelectLocation(loc)}
                >
                  <Ionicons name="pin-outline" size={16} color="#2563eb" />
                  <Text style={styles.autocompleteText} numberOfLines={1}>
                    {loc.display_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('description')}</Text>
          <TextInput
            style={[styles.input, styles.textArea, { textAlign: isArabic ? 'right' : 'left' }]}
            placeholder={isArabic ? 'اكتب وصفاً تفصيلياً للمنتج وحالته...' : 'Detailed product description...'}
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={styles.submitBtn}
          disabled={submitting}
          onPress={handleSubmit}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.submitBtnText}>
              {isArabic ? 'نشر الإعلان' : 'Publish Listing'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Category Picker Modal */}
      <CategoryPicker
        visible={showCategoryPicker}
        moduleFilter="equipment"
        currentLanguage={currentLanguage}
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
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backBtn: {
    marginRight: 12,
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0f172a',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  selectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectorBtnText: {
    flex: 1,
    fontSize: 15,
    color: '#334155',
    marginHorizontal: 8,
  },
  sizesChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  sizeChip: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  selectedSizeChip: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  sizeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  selectedSizeChipText: {
    color: '#ffffff',
  },
  rowInputs: {
    flexDirection: 'row',
  },
  locationInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locIcon: {
    marginRight: 6,
  },
  autocompleteDropdown: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    marginTop: 4,
    maxHeight: 180,
    elevation: 3,
  },
  autocompleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  autocompleteText: {
    fontSize: 13,
    color: '#334155',
    marginLeft: 6,
    flex: 1,
  },
  submitBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});
