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
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { createEquipment, uploadMedia } from '../services/api';
import { searchLocations } from '../services/locationService';
import CategoryPicker from '../components/CategoryPicker';
import { useLanguage } from '../contexts/LanguageContext';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../config/theme';
import BrandMark from '../components/BrandMark';

const STANDARD_SIZES = ['Pony', 'Cob', 'Full', 'Extra Full', 'S', 'M', 'L', 'XL'];

const CONDITION_OPTIONS = [
  { id: 'brand_new', en: 'Brand New', ar: 'جديد بالكامل', icon: 'sparkles' },
  { id: 'like_new', en: 'Like New', ar: 'شبه جديد', icon: 'ribbon-outline' },
  { id: 'pre_owned', en: 'Pre-Owned', ar: 'مستعمل ممتاز', icon: 'shield-checkmark-outline' },
];

const EMIRATES = [
  { id: 'dubai', name: 'Dubai, UAE' },
  { id: 'abu_dhabi', name: 'Abu Dhabi, UAE' },
  { id: 'sharjah', name: 'Sharjah, UAE' },
  { id: 'ajman', name: 'Ajman, UAE' },
  { id: 'al_ain', name: 'Al Ain, UAE' },
];

export default function CreateEquipmentScreen({ navigation, route, initialValues = null }) {
  const [title, setTitle] = useState(initialValues?.title || '');
  const [selectedCategory, setSelectedCategory] = useState(initialValues?.selectedCategory || null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [brand, setBrand] = useState(initialValues?.brand || '');
  const [condition, setCondition] = useState(initialValues?.condition || 'brand_new');
  const [selectedSizes, setSelectedSizes] = useState(initialValues?.selectedSizes || []);
  const [customSize, setCustomSize] = useState(initialValues?.customSize || '');
  const [price, setPrice] = useState(initialValues?.price || '');
  const [quantity, setQuantity] = useState(initialValues?.quantity || '1');
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

  // Live Strength Meter calculation
  const strengthScore = useMemo(() => {
    let score = 0;
    if (title.trim().length >= 5) score += 20;
    if (selectedCategory) score += 15;
    if (price && parseFloat(price) > 0) score += 15;
    if (brand.trim().length > 0) score += 15;
    if (locationText.trim().length > 0) score += 10;
    if (images.length >= 1) score += 15;
    if (images.length >= 3) score += 5;
    if (description.trim().length >= 20) score += 10;
    return Math.min(score, 100);
  }, [title, selectedCategory, price, brand, locationText, images, description]);

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

  const handleConciergeInquiry = () => {
    const query = isArabic
      ? 'مرحباً، أود المساعدة في تصوير وتقييم مستلزمات الخيل الخاصة بي لعرضها في سوق SteedMarket.'
      : 'Hello, I would like concierge assistance with tack valuation, authentication, and listing on SteedMarket.';
    const url = `https://wa.me/971500000000?text=${encodeURIComponent(query)}`;
    Linking.openURL(url).catch(() => {});
  };

  const handleTackSpecialistConcierge = () => {
    const text = isArabic
      ? 'مرحباً ستيد ماركت، أود استشارة خبير مستلزمات وسروج معتمد بخصوص المقاس الدقيق وملاءمة ظهر الخيل لعرض السرج في المنصة.'
      : 'Hello SteedMarket, I would like to consult a certified tack & saddle fit specialist regarding sizing measurements and gullet fit for my listing.';
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
      Alert.alert(t('error'), isArabic ? 'يرجى إدخال اسم الإعلان.' : 'Please enter title.');
      return;
    }
    if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
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
        brand: brand.trim() || null,
        condition: condition,
        sizes: selectedSizes.length > 0 ? selectedSizes : null,
        custom_size: customSize.trim() || null,
        price: parseFloat(price),
        quantity: parseInt(quantity, 10) || 1,
        location_text: locationText.trim() || null,
        latitude: latitude,
        longitude: longitude,
        description: description.trim() || null,
        image_urls:
          imageUrls.length > 0 ? imageUrls : ['https://via.placeholder.com/600x400?text=Equipment'],
      };

      await createEquipment(payload);
      Alert.alert(
        t('success'),
        isArabic ? 'تم نشر إعلان المستلزمات بنجاح!' : 'Equipment listing created successfully!',
        [{ text: t('ok'), onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.warn('[CreateEquipmentScreen] Submit error:', error);
      Alert.alert(t('error'), error.response?.data?.detail || 'Failed to create listing.');
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
              testID="create-equipment-back-button"
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
              <View testID="create-equipment-vip-badge" style={[styles.headerTagRow, isRTL && styles.rowRTL]}>
                <View style={styles.livePulseDot} />
                <Ionicons name="ribbon" size={11} color="#D4AF37" />
                <Text style={styles.headerTagText}>
                  {isArabic ? 'سوق مستلزمات الخيل المعتمد' : 'VIP VERIFIED TACK MARKET'}
                </Text>
              </View>
              <Text style={styles.headerTitle}>
                {isArabic ? 'إضافة مستلزمات خيل' : 'List Horse Equipment'}
              </Text>
              <Text style={styles.headerSubtitle}>
                {isArabic ? 'سروج، لجام، أدوات عناية وتدريب' : 'Saddles, bridles, pads, care & gear'}
              </Text>
            </View>
            <TouchableOpacity
              testID="create-equipment-header-concierge-btn"
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
              <Text style={styles.tipDesc}>{t('equipmentTipsDesc')}</Text>
            </View>
          </View>

          {/* 1-Tap Tack Specialist Sizing & Measurement Concierge */}
          <TouchableOpacity
            testID="seller-tack-specialist-btn"
            style={[styles.tackSpecialistBtn, isRTL && styles.rowRTL]}
            onPress={handleTackSpecialistConcierge}
            activeOpacity={0.85}
          >
            <Ionicons name="sparkles" size={16} color="#B45309" />
            <Text style={[styles.tackSpecialistBtnText, isRTL && styles.textRTL]}>
              {isArabic
                ? 'استشارة خبير قياسات وملاءمة السروج عبر واتساب'
                : 'Consult Tack & Saddle Fit Specialist via WhatsApp'}
            </Text>
            <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
          </TouchableOpacity>

          {/* Title */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isRTL && styles.textRTL]}>
              {isArabic ? 'عنوان الإعلان *' : 'Listing Title *'}
            </Text>
            <TextInput
              style={[styles.input, isRTL && styles.inputRTL]}
              placeholder={isArabic ? 'مثال: سرج قفز حواجز برستيج قياس 17.5' : 'e.g. Prestige Jump Saddle 17.5"'}
              placeholderTextColor={COLORS.textLight}
              value={title}
              onChangeText={setTitle}
              textAlign={isRTL ? 'right' : 'left'}
            />
          </View>

          {/* Category Selector */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isRTL && styles.textRTL]}>
              {isArabic ? 'التصنيف *' : 'Category *'}
            </Text>
            <TouchableOpacity
              style={[styles.selectorBtn, isRTL && styles.rowRTL]}
              onPress={() => setShowCategoryPicker(true)}
            >
              <Ionicons name="apps-outline" size={20} color={COLORS.primary} />
              <Text style={[styles.selectorBtnText, isRTL && styles.textRTL]}>
                {selectedCategory
                  ? isArabic
                    ? selectedCategory.name_ar
                    : selectedCategory.name_en
                  : isArabic
                  ? 'اختر التصنيف الفرعي'
                  : 'Select category'}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
            </TouchableOpacity>
          </View>

          {/* Brand */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isRTL && styles.textRTL]}>
              {isArabic ? 'الماركة / الصانع' : 'Brand / Manufacturer'}
            </Text>
            <TextInput
              style={[styles.input, isRTL && styles.inputRTL]}
              placeholder={isArabic ? 'مثال: برستيج، ديفوكو، باسيير' : 'e.g. Prestige, Devoucoux, Passier'}
              placeholderTextColor={COLORS.textLight}
              value={brand}
              onChangeText={setBrand}
              textAlign={isRTL ? 'right' : 'left'}
            />
          </View>

          {/* Condition Grading Selector */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isRTL && styles.textRTL]}>
              {isArabic ? 'حالة القطعة *' : 'Item Condition *'}
            </Text>
            <View style={[styles.conditionRow, isRTL && styles.rowRTL]}>
              {CONDITION_OPTIONS.map((c) => {
                const isSelected = condition === c.id;
                return (
                  <TouchableOpacity
                    key={c.id}
                    testID={`condition-chip-${c.id}`}
                    style={[styles.conditionChip, isSelected && styles.conditionChipActive]}
                    onPress={() => setCondition(c.id)}
                  >
                    <Ionicons
                      name={c.icon}
                      size={14}
                      color={isSelected ? COLORS.white : COLORS.accentDark}
                    />
                    <Text style={[styles.conditionChipText, isSelected && styles.conditionChipTextActive]}>
                      {isArabic ? c.ar : c.en}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Sizes */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isRTL && styles.textRTL]}>
              {isArabic ? 'المقاسات المتوفرة' : 'Available Sizes'}
            </Text>
            <View style={[styles.sizesChipsRow, isRTL && styles.rowRTL]}>
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
            <TextInput
              style={[styles.input, { marginTop: 8 }, isRTL && styles.inputRTL]}
              placeholder={isArabic ? 'مقاس مخصص (اختياري: مثلا 17.5 بوصة)' : 'Custom size (optional: e.g. 17.5" Medium Tree)'}
              placeholderTextColor={COLORS.textLight}
              value={customSize}
              onChangeText={setCustomSize}
              textAlign={isRTL ? 'right' : 'left'}
            />
          </View>

          {/* Price & Quantity */}
          <View style={[styles.rowInputs, isRTL && styles.rowRTL]}>
            <View style={[styles.inputGroup, { flex: 2, marginRight: isRTL ? 0 : 8, marginLeft: isRTL ? 8 : 0 }]}>
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

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.label, isRTL && styles.textRTL]}>
                {isArabic ? 'الكمية' : 'Qty'}
              </Text>
              <TextInput
                style={[styles.input, isRTL && styles.inputRTL]}
                placeholder="1"
                placeholderTextColor={COLORS.textLight}
                keyboardType="numeric"
                value={quantity}
                onChangeText={setQuantity}
                textAlign={isRTL ? 'right' : 'left'}
              />
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
              {isArabic ? 'الوصف والتفاصيل' : 'Description & Details'}
            </Text>
            <TextInput
              style={[styles.input, styles.textArea, isRTL && styles.inputRTL]}
              placeholder={isArabic ? 'اذكر تفاصيل الحالة وتاريخ الاستخدام...' : 'Provide details on condition, tree fit, flaws, or included extras...'}
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

          {/* SteedMarket Tack Authenticity & Escrow Shield */}
          <View style={styles.escrowShieldCard} testID="seller-tack-escrow-shield">
            <View style={[styles.escrowShieldHeader, isRTL && styles.rowRTL]}>
              <View style={styles.escrowShieldIconWrap}>
                <Ionicons name="shield-checkmark" size={20} color={COLORS.accent} />
              </View>
              <View style={styles.escrowShieldTitleCol}>
                <Text style={[styles.escrowShieldTitle, isRTL && styles.textRTL]}>
                  {isArabic ? 'حماية وضمان أصالة مستلزمات الخيل' : 'Verified Tack Seller & Authenticity Shield'}
                </Text>
                <Text style={[styles.escrowShieldSub, isRTL && styles.textRTL]}>
                  {isArabic
                    ? 'ضمان الماركات الأصلية، حماية دفع المشتري، وتسليم آمن عبر مندوب معتمد.'
                    : '100% genuine brands, secure buyer escrow payment, and insured regional courier handling.'}
                </Text>
              </View>
            </View>

            <View style={styles.escrowPillarsList}>
              <View style={[styles.escrowPillarRow, isRTL && styles.rowRTL]}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={[styles.escrowPillarText, isRTL && styles.textRTL]}>
                  {isArabic ? 'بدون أي عمولة على البيع للبوتيكات وملاك غرف المستلزمات' : '0% commission for private sellers & tack rooms'}
                </Text>
              </View>
              <View style={[styles.escrowPillarRow, isRTL && styles.rowRTL]}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={[styles.escrowPillarText, isRTL && styles.textRTL]}>
                  {isArabic ? 'عروض أسعار موثقة ومحادثات مباشرة مع المشترين المعتمدين' : 'Direct binding offers & chats from verified equestrians'}
                </Text>
              </View>
              <View style={[styles.escrowPillarRow, isRTL && styles.rowRTL]}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={[styles.escrowPillarText, isRTL && styles.textRTL]}>
                  {isArabic ? 'تنسيق الشحن السريع والتجربة في الإسطبل عند الطلب' : 'Express UAE courier delivery & stable fitting trials'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              testID="create-tack-concierge-btn"
              style={[styles.conciergeConsultBtn, isRTL && styles.rowRTL]}
              onPress={handleConciergeInquiry}
              activeOpacity={0.85}
            >
              <Ionicons name="logo-whatsapp" size={17} color="#25D366" />
              <Text style={styles.conciergeConsultBtnText}>
                {isArabic ? 'مستشار توثيق المستلزمات عبر واتساب' : 'VIP Tack Concierge on WhatsApp'}
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
                  {isArabic ? 'نشر إعلان المستلزمات' : 'Publish Equipment Listing'}
                </Text>
              </View>
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
  conditionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  conditionChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: 'rgba(15, 56, 38, 0.14)',
    gap: 6,
  },
  conditionChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  conditionChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  conditionChipTextActive: {
    color: COLORS.white,
    fontWeight: '800',
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
  tackSpecialistBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: SPACING.md,
    gap: 8,
    ...SHADOWS.subtle,
  },
  tackSpecialistBtnText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
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
  selectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: 'rgba(15, 56, 38, 0.15)',
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  selectorBtnText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    marginHorizontal: 8,
    fontWeight: '500',
  },
  sizesChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  sizeChip: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  selectedSizeChip: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  sizeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  selectedSizeChipText: {
    color: COLORS.white,
    fontWeight: '700',
  },
  rowInputs: {
    flexDirection: 'row',
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
