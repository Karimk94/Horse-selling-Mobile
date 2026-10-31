import React, { useState, useMemo } from 'react';
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
  Image,
  Switch,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { createService, uploadMedia } from '../services/api';
import { searchLocations } from '../services/locationService';
import CategoryPicker from '../components/CategoryPicker';
import { useLanguage } from '../contexts/LanguageContext';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../config/theme';
import BrandMark from '../components/BrandMark';

const SERVICE_TYPES = [
  { id: 'housing_boarding', name_ar: 'إيواء الخيل والبوائك', name_en: 'Housing & Boarding', icon: 'home-outline' },
  { id: 'training_instruction', name_ar: 'التدريب والعسف', name_en: 'Training & Instruction', icon: 'trophy-outline' },
  { id: 'health_care', name_ar: 'الرعاية الصحية والبيطار', name_en: 'Health Care & Farrier', icon: 'medkit-outline' },
  { id: 'commercial_transport', name_ar: 'النقل واللوجستية', name_en: 'Commercial & Transport', icon: 'bus-outline' },
  { id: 'breeding', name_ar: 'الإنتاج والتشبية', name_en: 'Breeding Services', icon: 'heart-outline' },
  { id: 'recreation_events', name_ar: 'الفعاليات والتأجير', name_en: 'Recreation & Events', icon: 'sparkles-outline' },
];

const PRICING_TYPES = [
  { id: 'fixed', name_ar: 'سعر ثابت', name_en: 'Fixed Price', icon: 'pricetag-outline' },
  { id: 'hourly', name_ar: 'بالساعة', name_en: 'Hourly', icon: 'time-outline' },
  { id: 'daily', name_ar: 'يومي', name_en: 'Daily', icon: 'today-outline' },
  { id: 'monthly', name_ar: 'شهري', name_en: 'Monthly', icon: 'calendar-outline' },
  { id: 'per_head', name_ar: 'لكل رأس', name_en: 'Per Head', icon: 'paw-outline' },
  { id: 'inquiry', name_ar: 'بالطلب والاتفاق', name_en: 'Inquiry Only', icon: 'chatbubbles-outline' },
];

const EMIRATES = [
  { id: 'dubai', name: 'Dubai, UAE' },
  { id: 'abu_dhabi', name: 'Abu Dhabi, UAE' },
  { id: 'sharjah', name: 'Sharjah, UAE' },
  { id: 'ajman', name: 'Ajman, UAE' },
  { id: 'al_ain', name: 'Al Ain, UAE' },
];

const EXPERIENCE_OPTIONS = [
  { id: '1-3', label: '1-3 Yrs', label_ar: '١-٣ سنوات' },
  { id: '3-5', label: '3-5 Yrs', label_ar: '٣-٥ سنوات' },
  { id: '5-10', label: '5-10 Yrs', label_ar: '٥-١٠ سنوات' },
  { id: '10+', label: '10+ Yrs', label_ar: '١٠+ سنوات' },
];

export default function CreateServiceScreen({ navigation, route, initialValues = null }) {
  const [title, setTitle] = useState(initialValues?.title || '');
  const [selectedCategory, setSelectedCategory] = useState(initialValues?.selectedCategory || null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [serviceType, setServiceType] = useState(initialValues?.serviceType || 'housing_boarding');
  const [pricingType, setPricingType] = useState(initialValues?.pricingType || 'fixed');
  const [price, setPrice] = useState(initialValues?.price || '');
  const [emergency24_7, setEmergency24_7] = useState(initialValues?.emergency24_7 || false);
  const [experienceYears, setExperienceYears] = useState(initialValues?.experienceYears || '3-5');
  const [description, setDescription] = useState(initialValues?.description || '');

  // Location Autocomplete
  const [locationText, setLocationText] = useState('');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [locationResults, setLocationResults] = useState([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);

  const [images, setImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const { language: currentLanguage, t, isRTL } = useLanguage();
  const isArabic = currentLanguage === 'ar';

  const strengthScore = useMemo(() => {
    let score = 0;
    if (title.trim().length >= 5) score += 20;
    if (serviceType) score += 15;
    if (pricingType === 'inquiry' || (price && parseFloat(price) > 0)) score += 15;
    if (emergency24_7) score += 10;
    if (locationText.trim().length > 0) score += 10;
    if (images.length >= 1) score += 15;
    if (images.length >= 3) score += 5;
    if (description.trim().length >= 20) score += 10;
    return Math.min(score, 100);
  }, [title, serviceType, pricingType, price, emergency24_7, locationText, images, description]);

  const getStrengthLabel = (score) => {
    if (score >= 80) return t('strengthGreat');
    if (score >= 50) return t('strengthGood');
    return t('strengthPoor');
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        isArabic ? 'إذن مطلوب' : 'Permission Required',
        isArabic ? 'يرجى السماح بالوصول إلى الصور.' : 'Please allow access to your photos.'
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 10 - images.length,
    });
    if (!result.canceled && result.assets) {
      const newUris = result.assets.map((a) => a.uri).filter(Boolean);
      if (newUris.length > 0) setImages((prev) => [...prev, ...newUris]);
    }
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
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

  const handleConciergeInquiry = () => {
    const query = isArabic
      ? 'مرحباً، أود استشارة فريق SteedMarket بشأن توثيق ونشر خدمة الفروسية الخاصة بي (إيواء، تدريب، أو نقل).'
      : 'Hello, I would like concierge assistance with equine service verification, stabling inspection, or trainer accreditation on SteedMarket.';
    const url = `https://wa.me/971500000000?text=${encodeURIComponent(query)}`;
    Linking.openURL(url).catch(() => {});
  };

  const handleLicensingConcierge = () => {
    const text = isArabic
      ? 'مرحباً ستيد ماركت، أود استشارة أخصائي اعتماد وتوثيق التراخيص الرسمية وتصاريح نقل الخيل والإيواء المعتمد لنشر الخدمة في المنصة.'
      : 'Hello SteedMarket, I would like to consult an equine compliance specialist regarding licensing, EEF accreditation, and transit permits for my service listing.';
    const waUrl = `https://wa.me/971500000000?text=${encodeURIComponent(text)}`;
    try {
      const res = Linking.openURL(waUrl);
      if (res && typeof res.catch === 'function') {
        res.catch(() => {});
      }
    } catch (e) {}
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
      let imageUrls = [];
      if (images.length > 0) {
        imageUrls = (
          await Promise.all(
            images.map(async (uri) => {
              const formData = new FormData();
              const filename = uri.split('/').pop();
              formData.append('file', { uri, name: filename, type: 'image/jpeg' });
              const res = await uploadMedia(formData);
              return res.data?.file_url || res.data?.url || null;
            })
          )
        ).filter(Boolean);
      }

      const payload = {
        title: title.trim(),
        category_id: selectedCategory?.id || null,
        service_type: serviceType,
        pricing_type: pricingType,
        price: pricingType === 'inquiry' ? null : parseFloat(price),
        emergency_24_7: emergency24_7,
        experience_years: parseInt(experienceYears, 10) || 5,
        location_text: locationText.trim() || null,
        latitude: latitude,
        longitude: longitude,
        description: description.trim() || null,
        image_urls:
          imageUrls.length > 0 ? imageUrls : ['https://via.placeholder.com/600x400?text=Service'],
      };

      await createService(payload);
      Alert.alert(
        t('success'),
        isArabic ? 'تم نشر خدمة الفروسية بنجاح!' : 'Equine service listing created successfully!',
        [{ text: t('ok'), onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.warn('[CreateServiceScreen] Submit error:', error);
      Alert.alert(t('error'), error.response?.data?.detail || 'Failed to create service listing.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Top Header */}
        <View style={styles.header}>
          <View style={[styles.headerTopRow, isRTL && styles.rowRTL]}>
            <TouchableOpacity
              testID="create-service-back-button"
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={22} color={COLORS.text} />
            </TouchableOpacity>
            <View style={styles.brandMarkPill}>
              <BrandMark size={22} color={COLORS.accent} />
            </View>
            <View style={styles.headerTitleWrap}>
              <View testID="create-service-vip-badge" style={[styles.headerTagRow, isRTL && styles.rowRTL]}>
                <View style={styles.livePulseDot} />
                <Ionicons name="ribbon" size={11} color="#D4AF37" />
                <Text style={styles.headerTagText}>
                  {isArabic ? 'توثيق وعرض خدمات الفروسية المعتمدة' : 'VIP EQUINE SERVICE PASSPORT'}
                </Text>
              </View>
              <Text style={styles.headerTitle}>
                {isArabic ? 'تقديم خدمة فروسية' : 'Offer Equine Service'}
              </Text>
              <Text style={styles.headerSubtitle}>
                {isArabic ? 'إيواء، نقل خيل، تدريب، وبيطرة' : 'Stabling, transport, training & veterinary'}
              </Text>
            </View>
            <TouchableOpacity
              testID="create-service-header-concierge-btn"
              style={styles.headerConciergeBtn}
              onPress={handleConciergeInquiry}
              accessibilityRole="button"
              accessibilityLabel="WhatsApp Concierge"
            >
              <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Live Strength Meter */}
          <View style={styles.strengthCard}>
            <View style={[styles.strengthHeader, isRTL && styles.rowRTL]}>
              <View style={[styles.strengthTitleRow, isRTL && styles.rowRTL]}>
                <Ionicons name="sparkles" size={16} color={COLORS.accent} />
                <Text style={styles.strengthTitleText}>{t('listingStrengthScore')}</Text>
              </View>
              <Text style={styles.strengthBadgeText}>{strengthScore}% • {getStrengthLabel(strengthScore)}</Text>
            </View>
            <View style={styles.strengthBarBg}>
              <View style={[styles.strengthBarFill, { width: `${strengthScore}%` }]} />
            </View>
          </View>

          {/* Seller Guidelines Advice Card */}
          <View style={styles.tipsCard}>
            <Ionicons name="shield-checkmark" size={20} color={COLORS.primary} style={styles.tipIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.tipTitle}>{t('sellerTipsTitle')}</Text>
              <Text style={styles.tipDesc}>{t('serviceTipsDesc')}</Text>
            </View>
          </View>

          {/* 1-Tap Equine Service Accreditation & Licensing Concierge */}
          <TouchableOpacity
            testID="seller-service-licensing-btn"
            style={[styles.licensingSpecialistBtn, isRTL && styles.rowRTL]}
            onPress={handleLicensingConcierge}
            activeOpacity={0.85}
          >
            <Ionicons name="ribbon" size={16} color="#1E40AF" />
            <Text style={[styles.licensingSpecialistBtnText, isRTL && styles.textRTL]}>
              {isArabic
                ? 'استشارة اعتماد وتوثيق التراخيص البيطرية وخدمات النقل عبر واتساب'
                : 'Consult Equine Licensing, EEF & Transit Accreditation via WhatsApp'}
            </Text>
            <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
          </TouchableOpacity>

          {/* Service Title */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isRTL && styles.textRTL]}>
              {isArabic ? 'عنوان الخدمة *' : 'Service Title *'}
            </Text>
            <TextInput
              style={[styles.input, isRTL && styles.inputRTL]}
              placeholder={isArabic ? 'مثال: إيواء خيل VIP مكيف مع تدريب يومي' : 'e.g. VIP Air-Conditioned Horse Boarding & Care'}
              placeholderTextColor={COLORS.textLight}
              value={title}
              onChangeText={setTitle}
              textAlign={isRTL ? 'right' : 'left'}
            />
          </View>

          {/* Service Type */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isRTL && styles.textRTL]}>
              {isArabic ? 'نوع الخدمة *' : 'Service Type *'}
            </Text>
            <View style={[styles.chipsWrap, isRTL && styles.rowRTL]}>
              {SERVICE_TYPES.map((type) => {
                const isSelected = serviceType === type.id;
                return (
                  <TouchableOpacity
                    key={type.id}
                    testID={`service-type-chip-${type.id}`}
                    style={[styles.typeChip, isSelected && styles.typeChipActive, isRTL && styles.rowRTL]}
                    onPress={() => setServiceType(type.id)}
                  >
                    <Ionicons
                      name={type.icon}
                      size={14}
                      color={isSelected ? COLORS.white : COLORS.primary}
                    />
                    <Text style={[styles.typeChipText, isSelected && styles.typeChipTextActive]}>
                      {isArabic ? type.name_ar : type.name_en}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* 24/7 Emergency Toggle */}
          <View style={styles.emergencyCard}>
            <View style={styles.emergencyTextWrap}>
              <View style={[styles.emergencyTitleRow, isRTL && styles.rowRTL]}>
                <Ionicons name="flash" size={16} color={COLORS.accent} />
                <Text style={styles.emergencyTitle}>{t('emergencyToggleLabel')}</Text>
              </View>
              <Text style={styles.emergencySub}>{t('emergencyToggleSub')}</Text>
            </View>
            <Switch
              value={emergency24_7}
              onValueChange={setEmergency24_7}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={emergency24_7 ? COLORS.accent : COLORS.white}
            />
          </View>

          {/* Pricing Model */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isRTL && styles.textRTL]}>
              {isArabic ? 'طريقة التسعير' : 'Pricing Model'}
            </Text>
            <View style={[styles.chipsWrap, isRTL && styles.rowRTL]}>
              {PRICING_TYPES.map((p) => {
                const isSelected = pricingType === p.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    testID={`pricing-chip-${p.id}`}
                    style={[styles.pricingChip, isSelected && styles.pricingChipActive, isRTL && styles.rowRTL]}
                    onPress={() => setPricingType(p.id)}
                  >
                    <Ionicons
                      name={p.icon}
                      size={13}
                      color={isSelected ? COLORS.white : COLORS.accentDark}
                    />
                    <Text style={[styles.pricingChipText, isSelected && styles.pricingChipTextActive]}>
                      {isArabic ? p.name_ar : p.name_en}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Price (if not inquiry) */}
          {pricingType !== 'inquiry' && (
            <View style={styles.inputGroup}>
              <Text style={[styles.label, isRTL && styles.textRTL]}>
                {isArabic ? 'السعر (د.إ) *' : 'Price (AED) *'}
              </Text>
              <TextInput
                style={[styles.input, isRTL && styles.inputRTL]}
                placeholder="0"
                placeholderTextColor={COLORS.textLight}
                keyboardType="numeric"
                value={price}
                onChangeText={setPrice}
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>
          )}

          {/* Experience Years */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isRTL && styles.textRTL]}>
              {t('experienceLabel')}
            </Text>
            <View style={[styles.chipsWrap, isRTL && styles.rowRTL]}>
              {EXPERIENCE_OPTIONS.map((exp) => {
                const isSelected = experienceYears === exp.id;
                return (
                  <TouchableOpacity
                    key={exp.id}
                    testID={`exp-chip-${exp.id}`}
                    style={[styles.expChip, isSelected && styles.expChipActive]}
                    onPress={() => setExperienceYears(exp.id)}
                  >
                    <Text style={[styles.expChipText, isSelected && styles.expChipTextActive]}>
                      {isArabic ? exp.label_ar : exp.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Location Autocomplete & Quick Emirates */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isRTL && styles.textRTL]}>
              {isArabic ? 'الموقع / الإمارة' : 'Location / Emirate'}
            </Text>
            {/* Quick Emirates Chips */}
            <View style={[styles.emiratesQuickRow, isRTL && styles.rowRTL]}>
              {EMIRATES.map((em) => (
                <TouchableOpacity
                  key={em.id}
                  style={[styles.emirateQuickChip, locationText === em.name && styles.emirateQuickChipActive]}
                  onPress={() => setLocationText(em.name)}
                >
                  <Text style={[styles.emirateQuickChipText, locationText === em.name && styles.emirateQuickChipTextActive]}>
                    {em.name.split(',')[0]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.locationInputWrapper}>
              <Ionicons name="location-outline" size={18} color={COLORS.primary} style={styles.locIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }, isRTL && styles.inputRTL]}
                placeholder={isArabic ? 'ابحث عن مدينة أو منطقة...' : 'Search city or area...'}
                placeholderTextColor={COLORS.textLight}
                value={locationText}
                onChangeText={handleLocationSearch}
                textAlign={isRTL ? 'right' : 'left'}
              />
              {isSearchingLocation && <ActivityIndicator size="small" color={COLORS.primary} style={{ marginLeft: 6 }} />}
            </View>

            {locationResults.length > 0 && (
              <View style={styles.autocompleteDropdown}>
                {locationResults.map((loc, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.autocompleteRow}
                    onPress={() => handleSelectLocation(loc)}
                  >
                    <Ionicons name="navigate-outline" size={16} color={COLORS.primary} />
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
            <Text style={[styles.label, isRTL && styles.textRTL]}>
              {isArabic ? 'تفاصيل ومزايا الخدمة' : 'Service Details & Amenities'}
            </Text>
            <TextInput
              style={[styles.input, styles.textArea, isRTL && styles.inputRTL]}
              placeholder={isArabic ? 'اذكر المرافق المتاحة، شروط الحجز، وأوقات الزيارة...' : 'Describe stabling facilities, climate control, feeding schedule, or equipment...'}
              placeholderTextColor={COLORS.textLight}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlign={isRTL ? 'right' : 'left'}
            />
          </View>

          {/* Image Upload Gallery */}
          <View style={styles.inputGroup}>
            <View style={[styles.photoHeaderRow, isRTL && styles.rowRTL]}>
              <Text style={[styles.label, isRTL && styles.textRTL]}>
                {isArabic ? 'صور المعاينة' : 'Listing Photos'}
              </Text>
              <Text style={styles.photoCountText}>{images.length}/10 {t('photosCount')}</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageRow}>
              {images.map((uri, index) => (
                <View key={index} style={styles.imageThumb}>
                  <Image source={{ uri }} style={styles.thumbImage} />
                  <TouchableOpacity
                    style={styles.removeImageBtn}
                    onPress={() => removeImage(index)}
                  >
                    <Ionicons name="close" size={14} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              ))}

              {images.length < 10 && (
                <TouchableOpacity style={styles.addImageBtn} onPress={pickImage}>
                  <Ionicons name="camera-outline" size={26} color={COLORS.primary} />
                  <Text style={styles.addImageText}>{isArabic ? '+ صورة' : '+ Add Photo'}</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>

          {/* SteedMarket Certified Equine Service & Provider Trust Shield */}
          <View style={styles.escrowShieldCard} testID="seller-service-escrow-shield">
            <View style={[styles.escrowShieldHeader, isRTL && styles.rowRTL]}>
              <View style={styles.escrowShieldIconWrap}>
                <Ionicons name="shield-checkmark" size={20} color={COLORS.accent} />
              </View>
              <View style={styles.escrowShieldTitleCol}>
                <Text style={[styles.escrowShieldTitle, isRTL && styles.textRTL]}>
                  {isArabic ? 'ضمان واعتماد خدمات ومرافق الفروسية' : 'Verified Equine Service Provider Shield'}
                </Text>
                <Text style={[styles.escrowShieldSub, isRTL && styles.textRTL]}>
                  {isArabic
                    ? 'توثيق تراخيص الإسطبلات والمدربين، حماية حجوزات الملاك، وتواصل مباشر وموثق.'
                    : 'Verified stabling, veterinary & trainer credentials, transparent client booking, and 0% private provider commission.'}
                </Text>
              </View>
            </View>

            <View style={styles.escrowPillarsList}>
              <View style={[styles.escrowPillarRow, isRTL && styles.rowRTL]}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={[styles.escrowPillarText, isRTL && styles.textRTL]}>
                  {isArabic ? 'بدون أي عمولة نشر للإسطبلات والمدربين المعتمدين' : '0% listing commission for certified stables & trainers'}
                </Text>
              </View>
              <View style={[styles.escrowPillarRow, isRTL && styles.rowRTL]}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={[styles.escrowPillarText, isRTL && styles.textRTL]}>
                  {isArabic ? 'تواصل مباشر مع ملاك الخيل وتأكيد حجوزات موثقة' : 'Direct equine client inquiries & verified booking requests'}
                </Text>
              </View>
              <View style={[styles.escrowPillarRow, isRTL && styles.rowRTL]}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={[styles.escrowPillarText, isRTL && styles.textRTL]}>
                  {isArabic ? 'شارة التحقق والاعتماد لمنشآت الفروسية المرخصة' : 'Official verification badge for licensed UAE/GCC facilities'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              testID="create-service-concierge-btn"
              style={[styles.conciergeConsultBtn, isRTL && styles.rowRTL]}
              onPress={handleConciergeInquiry}
              activeOpacity={0.85}
            >
              <Ionicons name="logo-whatsapp" size={17} color="#25D366" />
              <Text style={styles.conciergeConsultBtnText}>
                {isArabic ? 'مستشار توثيق واعتماد الخدمات عبر واتساب' : 'VIP Service Concierge on WhatsApp'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            disabled={submitting}
            onPress={handleSubmit}
            activeOpacity={0.88}
          >
            {submitting ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <View style={[styles.btnRow, isRTL && styles.rowRTL]}>
                <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.white} />
                <Text style={styles.submitBtnText}>
                  {isArabic ? 'نشر خدمة الفروسية' : 'Publish Equine Service'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    ...SHADOWS.sm,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    marginRight: 10,
    padding: 4,
  },
  brandMarkPill: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(197, 160, 89, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  headerTagText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: COLORS.accent,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  headerConciergeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(37, 211, 102, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(37, 211, 102, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  escrowShieldCard: {
    backgroundColor: 'rgba(15, 56, 38, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.35)',
    borderRadius: RADIUS.lg,
    padding: 16,
    marginTop: 6,
    marginBottom: 14,
    ...SHADOWS.card,
  },
  escrowShieldHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  escrowShieldIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(197, 160, 89, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  escrowShieldTitleCol: {
    flex: 1,
  },
  escrowShieldTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 2,
  },
  escrowShieldSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  escrowPillarsList: {
    gap: 8,
    marginBottom: 14,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(15, 56, 38, 0.08)',
  },
  escrowPillarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  escrowPillarText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text,
  },
  conciergeConsultBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(37, 211, 102, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(37, 211, 102, 0.35)',
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  conciergeConsultBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D7B3E',
  },
  licensingSpecialistBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: SPACING.md,
    gap: 8,
    ...SHADOWS.subtle,
  },
  licensingSpecialistBtnText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#1E40AF',
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  textRTL: {
    textAlign: 'right',
  },
  inputRTL: {
    textAlign: 'right',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  strengthCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(15, 56, 38, 0.1)',
    ...SHADOWS.card,
  },
  strengthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  strengthTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  strengthTitleText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  strengthBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  strengthBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(15, 56, 38, 0.08)',
    overflow: 'hidden',
  },
  strengthBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: COLORS.accent,
  },
  tipsCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 56, 38, 0.05)',
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(15, 56, 38, 0.12)',
    gap: 10,
  },
  tipIcon: {
    marginTop: 2,
  },
  tipTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 2,
  },
  tipDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: 'rgba(15, 56, 38, 0.15)',
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  typeChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  typeChipTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  emergencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(197, 160, 89, 0.1)',
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.25)',
  },
  emergencyTextWrap: {
    flex: 1,
    marginRight: 10,
  },
  emergencyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  emergencyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  emergencySub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  pricingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pricingChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  pricingChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  pricingChipTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  expChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  expChipActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  expChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  expChipTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  emiratesQuickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  emirateQuickChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(15, 56, 38, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(15, 56, 38, 0.12)',
  },
  emirateQuickChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  emirateQuickChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  emirateQuickChipTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  locationInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: 'rgba(15, 56, 38, 0.15)',
    borderRadius: RADIUS.md,
    paddingHorizontal: 10,
  },
  locIcon: {
    marginRight: 6,
  },
  autocompleteDropdown: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    marginTop: 4,
    maxHeight: 160,
    ...SHADOWS.md,
  },
  autocompleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    gap: 6,
  },
  autocompleteText: {
    fontSize: 12,
    color: COLORS.text,
    flex: 1,
  },
  photoHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  photoCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  imageRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 6,
  },
  imageThumb: {
    width: 84,
    height: 84,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageBtn: {
    width: 84,
    height: 84,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(197, 160, 89, 0.08)',
    gap: 4,
  },
  addImageText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    ...SHADOWS.md,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
});
