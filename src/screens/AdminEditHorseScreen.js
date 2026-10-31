import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  Modal,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BrandMark from '../components/BrandMark';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../config/theme';
import { useLanguage } from '../contexts/LanguageContext';
import * as apiService from '../services/api';
import HORSE_BREEDS from '../data/horseBreeds';
import { extractApiErrorMessage } from '../utils/apiErrors';
import { useToast } from '../components/ToastProvider';

const GENDERS = [
  { id: 'stallion', labelKey: 'genderStallion', fallback: 'Stallion', icon: 'male' },
  { id: 'mare', labelKey: 'genderMare', fallback: 'Mare', icon: 'female' },
  { id: 'gelding', labelKey: 'genderGelding', fallback: 'Gelding', icon: 'male-outline' },
];

const POPULAR_DISCIPLINES = [
  'Show Jumping',
  'Dressage',
  'Endurance',
  'Flat Racing',
  'Show Horse',
  'Eventing',
  'Polo',
  'Leisure',
];

const UAE_EMIRATES = [
  'Dubai',
  'Abu Dhabi',
  'Sharjah',
  'Ajman',
  'Al Ain',
  'Ras Al Khaimah',
  'Fujairah',
];

export default function AdminEditHorseScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { t, isRTL, language } = useLanguage();
  const isArabic = language === 'ar';
  const horse = route?.params?.horse || {};

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [breedModalVisible, setBreedModalVisible] = useState(false);
  const [breedSearchQuery, setBreedSearchQuery] = useState('');
  const [images, setImages] = useState(
    horse?.images?.length
      ? horse.images.map((img) => img.image_url).filter(Boolean)
      : horse?.image_url
      ? [horse.image_url]
      : []
  );
  const [form, setForm] = useState({
    title: horse?.title || '',
    price: horse?.price != null ? String(horse.price) : '',
    breed: horse?.breed || '',
    age: horse?.age != null ? String(horse.age) : '',
    gender: horse?.gender || 'stallion',
    discipline: horse?.discipline || '',
    height: horse?.height != null ? String(horse.height) : '',
    location_text: horse?.location_text || '',
    description: horse?.description || '',
    vet_check_available: !!horse?.vet_check_available,
  });
  const toast = useToast();

  const handleHorseRegistrarHotline = () => {
    const isArabic = isRTL;
    const text = isArabic
      ? 'مرحباً، أود التواصل مع مسؤول سجل الخيل المعتمد بخصوص تعديل بيانات وسجل خيل.'
      : 'Hello SteedMarket Equine Registrar, I need assistance regarding horse record moderation or pedigree updates.';
    try {
      const res = Linking.openURL(`https://wa.me/971500000000?text=${encodeURIComponent(text)}`);
      if (res && typeof res.catch === 'function') {
        res.catch(() => {});
      }
    } catch (e) {}
  };

  const handleRegistrarConsultation = () => {
    const isArabic = isRTL;
    const text = isArabic
      ? 'مرحباً، أود استشارة مسجل السلالات والشهادات البيطرية لتوثيق فحص الخيل.'
      : 'Hello SteedMarket Registrar, I need consultation regarding equine pedigree verification, microchip checks, or vet certificates.';
    try {
      const res = Linking.openURL(`https://wa.me/971500000000?text=${encodeURIComponent(text)}`);
      if (res && typeof res.catch === 'function') {
        res.catch(() => {});
      }
    } catch (e) {}
  };

  const update = (key, value) => {
    setForm((p) => ({ ...p, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const filteredBreeds = useMemo(() => {
    const q = breedSearchQuery.trim().toLowerCase();
    if (!q) return HORSE_BREEDS;
    return HORSE_BREEDS.filter((breed) => breed.toLowerCase().includes(q));
  }, [breedSearchQuery]);

  const validate = () => {
    const next = {};
    if (!form.title.trim()) next.title = t('titleRequired');
    if (!form.breed.trim()) next.breed = t('breedRequired');

    const price = Number(form.price);
    if (!form.price.trim()) next.price = t('priceRequired');
    else if (!Number.isFinite(price) || price <= 0) next.price = t('adminInvalidPrice');

    const age = Number(form.age);
    if (!form.age.trim()) next.age = t('ageRequired');
    else if (!Number.isFinite(age) || age < 0 || !Number.isInteger(age)) next.age = t('adminInvalidAge');

    if (form.height.trim()) {
      const height = Number(form.height);
      if (!Number.isFinite(height) || height <= 0) next.height = t('adminInvalidHeight');
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    if (images.length === 0) {
      setErrors((prev) => ({ ...prev, images: t('imagesRequired') }));
      return;
    }

    setSaving(true);
    try {
      await apiService.updateHorse(horse.id, {
        title: form.title.trim(),
        price: Number(form.price),
        breed: form.breed.trim(),
        age: Number(form.age),
        gender: form.gender,
        discipline: form.discipline.trim() || null,
        height: form.height.trim() ? Number(form.height) : null,
        location_text: form.location_text.trim() || null,
        description: form.description.trim() || null,
        vet_check_available: form.vet_check_available,
        image_urls: images,
      });
      toast.show(t('adminHorseUpdated'), { type: 'success' });
      navigation.goBack();
    } catch (err) {
      toast.show(extractApiErrorMessage(err, t('adminActionFailed')), { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const removeImageAtIndex = (indexToRemove) => {
    if (images.length <= 1) {
      setErrors((prev) => ({ ...prev, images: t('imagesRequired') }));
      return;
    }

    Alert.alert(t('deleteListing'), t('confirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('deleteListing'),
        style: 'destructive',
        onPress: () => {
          setImages((prev) => prev.filter((_, index) => index !== indexToRemove));
        },
      },
    ]);
  };

  const parsedPrice = Number(form.price);
  const formattedPricePreview =
    Number.isFinite(parsedPrice) && parsedPrice > 0
      ? parsedPrice.toLocaleString() + ' AED'
      : null;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={[styles.header, isRTL && styles.rowRTL]}>
        <View style={[styles.headerLeftWrap, isRTL && styles.rowRTL]}>
          <TouchableOpacity
            testID="admin-edit-horse-back-btn"
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={22} color={COLORS.primary} />
          </TouchableOpacity>
          <View style={styles.brandIconWrap}>
            <BrandMark size={28} />
          </View>
          <View style={styles.headerTextWrap}>
            <View style={[styles.portalBadge, isRTL && styles.rowRTL]}>
              <View style={styles.portalBadgeDot} />
              <Text style={styles.portalBadgeText}>
                {isRTL ? 'تعديل سجل وجواز الخيل المعتمد' : 'VIP EQUINE PASSPORT MODERATION'}
              </Text>
            </View>
            <Text style={[styles.headerTitle, isRTL && styles.textRTL]}>{t('adminEditHorse')}</Text>
            <Text style={[styles.headerSubtitle, isRTL && styles.textRTL]}>
              {t('adminHorseStudioSubtitle')}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          testID="admin-edit-horse-hotline-btn"
          style={styles.headerHotlineBtn}
          onPress={handleHorseRegistrarHotline}
          activeOpacity={0.8}
          accessibilityLabel="Equine Registrar WhatsApp Hotline"
        >
          <Ionicons name="logo-whatsapp" size={17} color="#25D366" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Equine Pedigree & Escrow Integrity Shield Card */}
        <View testID="admin-horse-integrity-shield" style={styles.integrityShieldCard}>
          <View style={[styles.integrityShieldHeader, isRTL && styles.rowRTL]}>
            <View style={styles.integrityShieldIconWrap}>
              <Ionicons name="shield-checkmark" size={18} color={COLORS.accentDark} />
            </View>
            <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <View style={[styles.integrityBadgeRow, isRTL && styles.rowRTL]}>
                <View style={styles.integrityPulseDot} />
                <Text style={styles.integrityBadgeText}>
                  {isRTL ? 'معايير توثيق الجياد الخليجية' : 'OFFICIAL EQUINE REGISTRATION PROTOCOL'}
                </Text>
              </View>
              <Text style={[styles.integrityShieldTitle, isRTL && styles.textRTL]}>
                {isRTL ? 'ميثاق التحقق من أنساب الخيل والسلامة البيطرية' : 'Pedigree Verification & Soundness Charter'}
              </Text>
              <Text style={[styles.integrityShieldDesc, isRTL && styles.textRTL]}>
                {isRTL
                  ? 'تدقيق معتمد لبيانات السلالة، العمر، الارتفاع، والشهادات البيطرية لضمان حقوق المشتري والبائع'
                  : 'Official oversight of WAHO bloodlines, biometric attributes, and veterinary inspection reports'}
              </Text>
            </View>
          </View>

          {/* 3 Equine Verification Pillars */}
          <View style={styles.integrityPillars}>
            <View style={[styles.integrityPillarItem, isRTL && styles.rowRTL]}>
              <View style={styles.integrityPillarIcon}>
                <Ionicons name="ribbon" size={13} color={COLORS.accentDark} />
              </View>
              <Text style={[styles.integrityPillarText, isRTL && styles.textRTL]}>
                {isRTL ? 'توثيق أنساب WAHO والمايكروتشيب المعتمد' : 'WAHO & Official Stud Book Pedigree Record'}
              </Text>
            </View>
            <View style={[styles.integrityPillarItem, isRTL && styles.rowRTL]}>
              <View style={styles.integrityPillarIcon}>
                <Ionicons name="medkit" size={13} color={COLORS.accentDark} />
              </View>
              <Text style={[styles.integrityPillarText, isRTL && styles.textRTL]}>
                {isRTL ? 'شهادة فحص سريري وبيطري موثقة' : 'Verified Veterinary Soundness & Inspection Certificate'}
              </Text>
            </View>
            <View style={[styles.integrityPillarItem, isRTL && styles.rowRTL]}>
              <View style={styles.integrityPillarIcon}>
                <Ionicons name="shield" size={13} color={COLORS.accentDark} />
              </View>
              <Text style={[styles.integrityPillarText, isRTL && styles.textRTL]}>
                {isRTL ? 'التزام عقود البيع وحساب الضمان البنكي' : 'Certified Bilateral Escrow Custody Compliance'}
              </Text>
            </View>
          </View>

          {/* 1-Tap WhatsApp Registrar consultation button */}
          <TouchableOpacity
            testID="admin-horse-registrar-consult-btn"
            style={[styles.integrityConsultBtn, isRTL && styles.rowRTL]}
            onPress={handleRegistrarConsultation}
            activeOpacity={0.85}
          >
            <Ionicons name="logo-whatsapp" size={15} color="#25D366" />
            <Text style={styles.integrityConsultBtnText}>
              {isRTL ? 'استشارة مسجل السلالات والشهادات البيطرية' : 'Consult Equine Registrar & Stud Officer'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Media Gallery Section */}
        <View style={styles.sectionCard}>
          <View style={[styles.photosHeaderRow, isRTL && styles.rowRTL]}>
            <View style={[styles.sectionTitleWrap, isRTL && styles.rowRTL]}>
              <Ionicons name="camera-outline" size={18} color={COLORS.primary} />
              <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t('photos')}</Text>
            </View>
            <View style={styles.photoCountBadge}>
              <Text style={styles.photoCountText}>{images.length}/10</Text>
            </View>
          </View>

          {images.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.photosRow, isRTL && styles.rowRTL]}
            >
              {images.map((imageUrl, index) => (
                <View key={`${imageUrl}-${index}`} style={styles.photoThumbWrap}>
                  <Image source={{ uri: imageUrl }} style={styles.photoThumb} />
                  {index === 0 && (
                    <View style={styles.coverBadge}>
                      <Text style={styles.coverBadgeText}>{isArabic ? 'الرئيسية' : 'Cover'}</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    testID={`delete-photo-${index}`}
                    style={styles.photoDeleteBtn}
                    onPress={() => removeImageAtIndex(index)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close" size={14} color={COLORS.white} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          ) : (
            <Text style={[styles.errorText, isRTL && styles.textRTL]}>{t('imagesRequired')}</Text>
          )}
          {errors.images && (
            <Text style={[styles.errorText, isRTL && styles.textRTL]}>{errors.images}</Text>
          )}
        </View>

        {/* Identity & Pedigree Section */}
        <View style={styles.sectionCard}>
          <View style={[styles.sectionHeaderRow, isRTL && styles.rowRTL]}>
            <Ionicons name="ribbon-outline" size={18} color={COLORS.primary} />
            <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
              {t('adminHorseIdentitySection')}
            </Text>
          </View>

          {/* Title */}
          <View style={styles.field}>
            <Text style={[styles.label, isRTL && styles.textRTL]}>{t('title')}</Text>
            <TextInput
              testID="input-horse-title"
              style={[styles.input, errors.title && styles.inputError, isRTL && styles.inputRTL]}
              value={form.title}
              onChangeText={(v) => update('title', v)}
              placeholder={t('titlePlaceholder')}
              placeholderTextColor={COLORS.textLight}
              textAlign={isRTL ? 'right' : 'left'}
            />
            {errors.title && (
              <Text style={[styles.errorText, isRTL && styles.textRTL]}>{errors.title}</Text>
            )}
          </View>

          {/* Breed Selector */}
          <View style={styles.field}>
            <Text style={[styles.label, isRTL && styles.textRTL]}>{t('breed')}</Text>
            <TouchableOpacity
              testID="select-breed-btn"
              style={[styles.selectorButton, errors.breed && styles.inputError, isRTL && styles.rowRTL]}
              onPress={() => setBreedModalVisible(true)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.selectorButtonText,
                  !form.breed && styles.selectorPlaceholder,
                  isRTL && styles.textRTL,
                ]}
              >
                {form.breed || t('selectBreed')}
              </Text>
              <Ionicons name="chevron-down" size={18} color={COLORS.accent} />
            </TouchableOpacity>
            {errors.breed && (
              <Text style={[styles.errorText, isRTL && styles.textRTL]}>{errors.breed}</Text>
            )}
          </View>

          {/* Gender Selector Chips */}
          <View style={styles.field}>
            <Text style={[styles.label, isRTL && styles.textRTL]}>{t('adminHorseGenderSection')}</Text>
            <View style={[styles.chipsRow, isRTL && styles.rowRTL]}>
              {GENDERS.map((g) => {
                const isSelected = form.gender === g.id;
                const label = t(g.labelKey) || g.fallback;
                return (
                  <TouchableOpacity
                    key={g.id}
                    testID={`gender-chip-${g.id}`}
                    style={[styles.genderChip, isSelected && styles.genderChipActive]}
                    onPress={() => update('gender', g.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={g.icon}
                      size={16}
                      color={isSelected ? COLORS.primary : COLORS.textSecondary}
                    />
                    <Text
                      style={[styles.genderChipText, isSelected && styles.genderChipTextActive]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Age & Height Row */}
          <View style={[styles.twoColRow, isRTL && styles.rowRTL]}>
            <View style={styles.col}>
              <Text style={[styles.label, isRTL && styles.textRTL]}>{t('age')}</Text>
              <TextInput
                testID="input-horse-age"
                style={[styles.input, errors.age && styles.inputError, isRTL && styles.inputRTL]}
                value={form.age}
                onChangeText={(v) => update('age', v)}
                keyboardType="numeric"
                placeholder="4"
                placeholderTextColor={COLORS.textLight}
                textAlign={isRTL ? 'right' : 'left'}
              />
              {errors.age && (
                <Text style={[styles.errorText, isRTL && styles.textRTL]}>{errors.age}</Text>
              )}
            </View>

            <View style={styles.col}>
              <Text style={[styles.label, isRTL && styles.textRTL]}>{t('height')}</Text>
              <TextInput
                testID="input-horse-height"
                style={[styles.input, errors.height && styles.inputError, isRTL && styles.inputRTL]}
                value={form.height}
                onChangeText={(v) => update('height', v)}
                keyboardType="numeric"
                placeholder="1.58"
                placeholderTextColor={COLORS.textLight}
                textAlign={isRTL ? 'right' : 'left'}
              />
              {errors.height && (
                <Text style={[styles.errorText, isRTL && styles.textRTL]}>{errors.height}</Text>
              )}
            </View>
          </View>

          {/* Discipline with Quick Chips */}
          <View style={styles.field}>
            <Text style={[styles.label, isRTL && styles.textRTL]}>{t('discipline')}</Text>
            <TextInput
              testID="input-horse-discipline"
              style={[styles.input, isRTL && styles.inputRTL]}
              value={form.discipline}
              onChangeText={(v) => update('discipline', v)}
              placeholder={t('disciplinePlaceholder')}
              placeholderTextColor={COLORS.textLight}
              textAlign={isRTL ? 'right' : 'left'}
            />

            <Text style={[styles.subLabel, isRTL && styles.textRTL]}>
              {t('adminHorseDisciplineQuick')}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.emiratesScrollRow, isRTL && styles.rowRTL]}
            >
              {POPULAR_DISCIPLINES.map((disc) => {
                const isSelected = form.discipline.trim().toLowerCase() === disc.toLowerCase();
                return (
                  <TouchableOpacity
                    key={disc}
                    testID={`discipline-chip-${disc.toLowerCase().replace(/\s+/g, '-')}`}
                    style={[styles.quickChip, isSelected && styles.quickChipActive]}
                    onPress={() => update('discipline', disc)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.quickChipText, isSelected && styles.quickChipTextActive]}>
                      {disc}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>

        {/* Valuation & Asking Price Section */}
        <View style={styles.sectionCard}>
          <View style={[styles.sectionHeaderRow, isRTL && styles.rowRTL]}>
            <Ionicons name="pricetag-outline" size={18} color={COLORS.primary} />
            <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
              {t('adminHorsePricingSection')}
            </Text>
            {formattedPricePreview && (
              <View style={styles.pricePreviewBadge}>
                <Text style={styles.pricePreviewText}>{formattedPricePreview}</Text>
              </View>
            )}
          </View>

          <View style={styles.field}>
            <View style={[styles.priceInputWrapper, isRTL && styles.rowRTL]}>
              <View style={styles.currencyPill}>
                <Text style={styles.currencyPillText}>AED</Text>
              </View>
              <TextInput
                testID="input-horse-price"
                style={[
                  styles.input,
                  styles.priceInput,
                  errors.price && styles.inputError,
                  isRTL && styles.inputRTL,
                ]}
                value={form.price}
                onChangeText={(v) => update('price', v)}
                keyboardType="numeric"
                placeholder="250000"
                placeholderTextColor={COLORS.textLight}
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>
            {errors.price && (
              <Text style={[styles.errorText, isRTL && styles.textRTL]}>{errors.price}</Text>
            )}
          </View>
        </View>

        {/* Stabling Location (Emirate) */}
        <View style={styles.sectionCard}>
          <View style={[styles.sectionHeaderRow, isRTL && styles.rowRTL]}>
            <Ionicons name="location-outline" size={18} color={COLORS.primary} />
            <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
              {t('adminHorseLocationSection')}
            </Text>
          </View>

          <View style={styles.field}>
            <TextInput
              testID="input-horse-location"
              style={[styles.input, isRTL && styles.inputRTL]}
              value={form.location_text}
              onChangeText={(v) => update('location_text', v)}
              placeholder="Dubai Stables, UAE"
              placeholderTextColor={COLORS.textLight}
              textAlign={isRTL ? 'right' : 'left'}
            />

            <Text style={[styles.subLabel, isRTL && styles.textRTL]}>
              {t('adminEmirateQuickSelect')}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.emiratesScrollRow, isRTL && styles.rowRTL]}
            >
              {UAE_EMIRATES.map((emirate) => {
                const isSelected = form.location_text.trim().toLowerCase() === emirate.toLowerCase();
                return (
                  <TouchableOpacity
                    key={emirate}
                    testID={`emirate-chip-${emirate.toLowerCase().replace(/\s+/g, '-')}`}
                    style={[styles.emirateChip, isSelected && styles.emirateChipActive]}
                    onPress={() => update('location_text', emirate)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="location-sharp"
                      size={12}
                      color={isSelected ? COLORS.primary : COLORS.accent}
                    />
                    <Text
                      style={[styles.emirateChipText, isSelected && styles.emirateChipTextActive]}
                    >
                      {emirate}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>

        {/* Veterinary & Health Verification Trust Card */}
        <View style={styles.sectionCard}>
          <TouchableOpacity
            testID="vet-check-toggle"
            style={[styles.verifyCard, isRTL && styles.rowRTL]}
            onPress={() => update('vet_check_available', !form.vet_check_available)}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.verifyIconWrap,
                form.vet_check_available ? styles.verifyIconWrapActive : styles.verifyIconWrapInactive,
              ]}
            >
              <Ionicons
                name={form.vet_check_available ? 'shield-checkmark' : 'shield-outline'}
                size={22}
                color={form.vet_check_available ? COLORS.primary : COLORS.textLight}
              />
            </View>

            <View style={[styles.verifyTextWrap, isRTL && styles.verifyTextWrapRTL]}>
              <Text style={[styles.verifyCardTitle, isRTL && styles.textRTL]}>
                {t('adminHorseVetCardTitle')}
              </Text>
              <Text style={[styles.verifyCardDesc, isRTL && styles.textRTL]}>
                {t('adminHorseVetCardDesc')}
              </Text>
            </View>

            <View
              style={[
                styles.toggleSwitch,
                form.vet_check_available ? styles.toggleSwitchActive : styles.toggleSwitchInactive,
              ]}
            >
              <View
                style={[
                  styles.toggleThumb,
                  form.vet_check_available ? styles.toggleThumbActive : styles.toggleThumbInactive,
                ]}
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* Detailed Description */}
        <View style={styles.sectionCard}>
          <View style={[styles.sectionHeaderRow, isRTL && styles.rowRTL]}>
            <Ionicons name="document-text-outline" size={18} color={COLORS.primary} />
            <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t('description')}</Text>
          </View>

          <TextInput
            testID="input-horse-description"
            style={[styles.input, styles.inputMultiline, isRTL && styles.inputRTL]}
            value={form.description}
            onChangeText={(v) => update('description', v)}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            placeholder={t('descriptionPlaceholder')}
            placeholderTextColor={COLORS.textLight}
            textAlign={isRTL ? 'right' : 'left'}
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          testID="admin-save-horse-btn"
          style={styles.saveBtn}
          onPress={save}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <View style={[styles.saveBtnInner, isRTL && styles.rowRTL]}>
              <Ionicons name="checkmark-sharp" size={20} color={COLORS.white} />
              <Text style={styles.saveBtnText}>{t('adminSaveHorseChanges')}</Text>
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Breed Search Modal */}
      <Modal
        visible={breedModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setBreedModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={[styles.modalHeader, isRTL && styles.rowRTL]}>
              <Text style={[styles.modalTitle, isRTL && styles.textRTL]}>{t('selectBreed')}</Text>
              <TouchableOpacity
                testID="close-breed-modal-btn"
                onPress={() => setBreedModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <View style={[styles.searchWrap, isRTL && styles.rowRTL]}>
              <Ionicons name="search-outline" size={18} color={COLORS.accent} />
              <TextInput
                testID="breed-search-input"
                style={[styles.searchInput, isRTL && styles.inputRTL]}
                value={breedSearchQuery}
                onChangeText={setBreedSearchQuery}
                placeholder={t('searchBreedPlaceholder')}
                placeholderTextColor={COLORS.textLight}
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>

            <FlatList
              data={filteredBreeds}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  testID={`breed-item-${item}`}
                  style={[styles.breedItem, isRTL && styles.rowRTL]}
                  onPress={() => {
                    update('breed', item);
                    setBreedModalVisible(false);
                    setBreedSearchQuery('');
                  }}
                >
                  <Text style={[styles.breedItemText, isRTL && styles.textRTL]}>{item}</Text>
                  {form.breed === item && (
                    <Ionicons name="checkmark" size={18} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={[styles.emptyBreedText, isRTL && styles.textRTL]}>{t('noBreedFound')}</Text>
              }
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
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
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    gap: SPACING.sm,
    ...SHADOWS.soft,
  },
  headerLeftWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  brandIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FAF8F5',
    borderWidth: 1.5,
    borderColor: 'rgba(197, 160, 89, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.card,
  },
  portalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(197, 160, 89, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
    marginBottom: 2,
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.28)',
  },
  portalBadgeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10B981',
    marginRight: 5,
  },
  portalBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.accentDark,
    letterSpacing: 0.5,
  },
  headerHotlineBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(37, 211, 102, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(37, 211, 102, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  integrityShieldCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1.5,
    borderColor: 'rgba(197, 160, 89, 0.3)',
    ...SHADOWS.small,
  },
  integrityShieldHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  integrityShieldIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(197, 160, 89, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.3)',
  },
  integrityBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  integrityPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  integrityBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.accentDark,
    letterSpacing: 0.5,
  },
  integrityShieldTitle: {
    ...FONTS.h3,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  integrityShieldDesc: {
    ...FONTS.bodySmall,
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  integrityPillars: {
    gap: 6,
    paddingVertical: SPACING.xs,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.borderLight,
    marginVertical: SPACING.xs,
  },
  integrityPillarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  integrityPillarIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(197, 160, 89, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  integrityPillarText: {
    ...FONTS.caption,
    fontSize: 11,
    color: COLORS.text,
    fontWeight: '600',
    flex: 1,
  },
  integrityConsultBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(37, 211, 102, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(37, 211, 102, 0.25)',
    paddingVertical: 9,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    marginTop: SPACING.xs,
  },
  integrityConsultBtnText: {
    ...FONTS.button,
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    ...FONTS.h2,
    color: COLORS.primary,
  },
  headerSubtitle: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  content: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.soft,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
    paddingBottom: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  sectionTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  sectionTitle: {
    ...FONTS.h3,
    color: COLORS.primary,
    fontSize: 15,
  },
  photosHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  photoCountBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.accent + '20',
  },
  photoCountText: {
    ...FONTS.caption,
    color: COLORS.accentDark,
    fontWeight: '800',
  },
  photosRow: {
    gap: SPACING.sm,
    paddingVertical: 4,
  },
  photoThumbWrap: {
    width: 96,
    height: 96,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    backgroundColor: COLORS.borderLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  photoThumb: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  coverBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  coverBadgeText: {
    ...FONTS.caption,
    color: COLORS.white,
    fontSize: 9,
    fontWeight: '800',
  },
  photoDeleteBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  field: {
    marginBottom: SPACING.md,
  },
  label: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    fontWeight: '600',
  },
  subLabel: {
    ...FONTS.caption,
    color: COLORS.textLight,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
    fontSize: 11,
  },
  input: {
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    ...FONTS.body,
    color: COLORS.text,
  },
  inputMultiline: {
    minHeight: 110,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    ...FONTS.caption,
    color: COLORS.error,
    marginTop: SPACING.xs,
  },
  selectorButton: {
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectorButtonText: {
    ...FONTS.body,
    color: COLORS.text,
    flex: 1,
  },
  selectorPlaceholder: {
    color: COLORS.textLight,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  genderChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  genderChipActive: {
    backgroundColor: COLORS.primary + '15',
    borderColor: COLORS.primary,
  },
  genderChipText: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  genderChipTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  twoColRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  col: {
    flex: 1,
  },
  emiratesScrollRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    paddingVertical: 2,
  },
  emirateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emirateChipActive: {
    backgroundColor: COLORS.primary + '15',
    borderColor: COLORS.primary,
  },
  emirateChipText: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  emirateChipTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  quickChip: {
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickChipActive: {
    backgroundColor: COLORS.accent + '25',
    borderColor: COLORS.accentDark,
  },
  quickChipText: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  quickChipTextActive: {
    color: COLORS.accentDark,
    fontWeight: '700',
  },
  pricePreviewBadge: {
    marginLeft: 'auto',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.accent + '20',
  },
  pricePreviewText: {
    ...FONTS.caption,
    color: COLORS.accentDark,
    fontWeight: '800',
  },
  priceInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  currencyPill: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary + '15',
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyPillText: {
    ...FONTS.caption,
    color: COLORS.primary,
    fontWeight: '800',
  },
  priceInput: {
    flex: 1,
    fontWeight: '700',
  },
  verifyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  verifyIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyIconWrapActive: {
    backgroundColor: COLORS.primary + '15',
  },
  verifyIconWrapInactive: {
    backgroundColor: COLORS.borderLight,
  },
  verifyTextWrap: {
    flex: 1,
  },
  verifyTextWrapRTL: {
    alignItems: 'flex-end',
  },
  verifyCardTitle: {
    ...FONTS.body,
    fontWeight: '700',
    color: COLORS.text,
  },
  verifyCardDesc: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  toggleSwitch: {
    width: 46,
    height: 26,
    borderRadius: 13,
    padding: 2,
    justifyContent: 'center',
  },
  toggleSwitchActive: {
    backgroundColor: COLORS.primary,
  },
  toggleSwitchInactive: {
    backgroundColor: COLORS.border,
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.white,
    ...SHADOWS.soft,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  toggleThumbInactive: {
    alignSelf: 'flex-start',
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.accent,
    ...SHADOWS.medium,
  },
  saveBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  saveBtnText: {
    ...FONTS.button,
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '78%',
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.md,
    ...SHADOWS.card,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  modalTitle: {
    ...FONTS.h3,
    color: COLORS.primary,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    ...FONTS.body,
    color: COLORS.text,
    paddingVertical: SPACING.sm,
  },
  breedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  breedItemText: {
    ...FONTS.body,
    color: COLORS.text,
  },
  emptyBreedText: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.md,
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
});
