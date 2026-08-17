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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { createService } from '../services/api';
import { searchLocations } from '../services/locationService';
import CategoryPicker from '../components/CategoryPicker';
import { useLanguage } from '../contexts/LanguageContext';

const SERVICE_TYPES = [
  { id: 'housing_boarding', name_ar: 'إيواء الخيل والبوائك', name_en: 'Housing & Boarding' },
  { id: 'training_instruction', name_ar: 'التدريب والعسف', name_en: 'Training & Instruction' },
  { id: 'health_care', name_ar: 'الرعاية الصحية والبيطار', name_en: 'Health Care & Farrier' },
  { id: 'commercial_transport', name_ar: 'النقل والوساطة', name_en: 'Commercial & Transport' },
  { id: 'breeding', name_ar: 'الإنتاج والتشبية', name_en: 'Breeding Services' },
  { id: 'recreation_events', name_ar: 'الفعاليات والتأجير', name_en: 'Recreation & Events' },
];

const PRICING_TYPES = [
  { id: 'fixed', name_ar: 'سعر ثابت', name_en: 'Fixed Price' },
  { id: 'hourly', name_ar: 'بالساعة', name_en: 'Hourly' },
  { id: 'daily', name_ar: 'يومي', name_en: 'Daily' },
  { id: 'monthly', name_ar: 'شهري', name_en: 'Monthly' },
  { id: 'per_head', name_ar: 'لكل رأس', name_en: 'Per Head' },
  { id: 'inquiry', name_ar: 'بالطلب والاتفاق', name_en: 'Inquiry Only' },
];

export default function CreateServiceScreen({ navigation, route }) {
  const [title, setTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [serviceType, setServiceType] = useState('housing_boarding');
  const [pricingType, setPricingType] = useState('fixed');
  const [price, setPrice] = useState('');
  const [availabilityCalendar, setAvailabilityCalendar] = useState('');
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
      Alert.alert(t('error'), isArabic ? 'يرجى إدخال عنوان الخدمة.' : 'Please enter service title.');
      return;
    }
    if (pricingType !== 'inquiry' && (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0)) {
      Alert.alert(t('error'), isArabic ? 'يرجى إدخال سعر صحيح (بالدرهم).' : 'Please enter a valid price in AED.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        category_id: selectedCategory?.id || null,
        service_type: serviceType,
        pricing_type: pricingType,
        price: pricingType === 'inquiry' ? null : parseFloat(price),
        location_text: locationText.trim() || null,
        latitude: latitude,
        longitude: longitude,
        availability_calendar: availabilityCalendar.trim() || null,
        description: description.trim() || null,
        image_urls: ['https://via.placeholder.com/600x400?text=Equestrian+Service'],
      };

      await createService(payload);
      Alert.alert(
        t('success'),
        isArabic
          ? 'تم إنشاء إعلان الخدمة بنجاح، وهو قيد المراجعة.'
          : 'Service listing created successfully and is under review.',
        [{ text: t('ok'), onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert(
        t('error'),
        error?.response?.data?.detail || (isArabic ? 'فشل إنشاء الخدمة.' : 'Failed to create service.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isArabic ? 'إضافة خدمة خيل جديدة' : 'Add Equestrian Service Listing'}
          </Text>
        </View>

        {/* Title */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{isArabic ? 'عنوان الخدمة *' : 'Service Title *'}</Text>
          <TextInput
            style={[styles.input, { textAlign: isArabic ? 'right' : 'left' }]}
            placeholder={isArabic ? 'مثال: تأجير بوائك خيل مجهزة بالكامل' : 'e.g. Full Service Stall Rental'}
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

        {/* Service Type Selection */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{isArabic ? 'نوع الخدمة' : 'Service Type'}</Text>
          <View style={styles.chipsRow}>
            {SERVICE_TYPES.map((st) => {
              const isSelected = serviceType === st.id;
              return (
                <TouchableOpacity
                  key={st.id}
                  style={[styles.chip, isSelected && styles.selectedChip]}
                  onPress={() => setServiceType(st.id)}
                >
                  <Text style={[styles.chipText, isSelected && styles.selectedChipText]}>
                    {isArabic ? st.name_ar : st.name_en}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Pricing Type Selection */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{isArabic ? 'نموذج التسعير' : 'Pricing Model'}</Text>
          <View style={styles.chipsRow}>
            {PRICING_TYPES.map((pt) => {
              const isSelected = pricingType === pt.id;
              return (
                <TouchableOpacity
                  key={pt.id}
                  style={[styles.chip, isSelected && styles.selectedChip]}
                  onPress={() => setPricingType(pt.id)}
                >
                  <Text style={[styles.chipText, isSelected && styles.selectedChipText]}>
                    {isArabic ? pt.name_ar : pt.name_en}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Price Input (if not inquiry) */}
        {pricingType !== 'inquiry' && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{isArabic ? 'السعر (بالدرهم AED) *' : 'Price (AED) *'}</Text>
            <TextInput
              style={[styles.input, { textAlign: isArabic ? 'right' : 'left' }]}
              placeholder="0.00"
              keyboardType="decimal-pad"
              value={price}
              onChangeText={setPrice}
            />
          </View>
        )}

        {/* Availability Calendar / Schedule */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{isArabic ? 'جدول المواعيد وأوقات العمل' : 'Working Hours / Schedule'}</Text>
          <TextInput
            style={[styles.input, { textAlign: isArabic ? 'right' : 'left' }]}
            placeholder={isArabic ? 'مثال: الأحد - الخميس من 8 صباحاً حتى 6 مساءً' : 'e.g. Sun-Thu 8:00 AM - 6:00 PM'}
            value={availabilityCalendar}
            onChangeText={setAvailabilityCalendar}
          />
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
            placeholder={isArabic ? 'تفاصيل الخدمة المقدمة والميزات والمرافق...' : 'Details about the service offered, features, and amenities...'}
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
              {isArabic ? 'نشر إعلان الخدمة' : 'Publish Service Listing'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Category Picker Modal */}
      <CategoryPicker
        visible={showCategoryPicker}
        moduleFilter="services"
        currentLanguage={currentLanguage}
        selectedSlug={selectedCategory?.slug}
        onClose={() => setShowCategoryPicker(false)}
        onSelectCategory={(cat) => setSelectedCategory(cat)}
      />
      </SafeAreaView>
    </KeyboardAvoidingView>
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
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  selectedChip: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  selectedChipText: {
    color: '#ffffff',
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
