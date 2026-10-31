import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../config/theme';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './ToastProvider';
import * as apiService from '../services/api';
import BrandMark from './BrandMark';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const GENDER_OPTIONS = [
  { id: 'stallion', labelKey: 'genderStallion', fallback: 'Stallion', icon: 'male' },
  { id: 'mare', labelKey: 'genderMare', fallback: 'Mare', icon: 'female' },
  { id: 'gelding', labelKey: 'genderGelding', fallback: 'Gelding', icon: 'male-outline' },
];

const UAE_EMIRATES = [
  { id: 'Dubai', en: 'Dubai', ar: 'دبي' },
  { id: 'Abu Dhabi', en: 'Abu Dhabi', ar: 'أبوظبي' },
  { id: 'Sharjah', en: 'Sharjah', ar: 'الشارقة' },
  { id: 'Ajman', en: 'Ajman', ar: 'عجمان' },
  { id: 'Al Ain', en: 'Al Ain', ar: 'العين' },
  { id: 'Ras Al Khaimah', en: 'Ras Al Khaimah', ar: 'رأس الخيمة' },
  { id: 'Fujairah', en: 'Fujairah', ar: 'الفجيرة' },
  { id: 'Umm Al Quwain', en: 'Umm Al Quwain', ar: 'أم القيوين' },
];

const POPULAR_BREEDS = [
  'Arabian',
  'Thoroughbred',
  'Anglo-Arabian',
  'Warmblood',
  'Andalusian',
  'Friesian',
];

const DISCIPLINE_PRESETS = [
  { id: 'Show Jumping', labelKey: 'disciplineShowJumping', fallback: 'Show Jumping' },
  { id: 'Endurance', labelKey: 'disciplineEndurance', fallback: 'Endurance' },
  { id: 'Dressage', labelKey: 'disciplineDressage', fallback: 'Dressage' },
  { id: 'Racing', labelKey: 'disciplineRacing', fallback: 'Racing' },
  { id: 'Beauty / Halter', labelKey: 'disciplineHalter', fallback: 'Beauty / Halter' },
  { id: 'Polo', labelKey: 'disciplinePolo', fallback: 'Polo' },
  { id: 'Leisure', labelKey: 'disciplineLeisure', fallback: 'Leisure' },
];

const BUDGET_PRESETS = [
  { label: '< 25k', min: '', max: '25000' },
  { label: '25k - 50k', min: '25000', max: '50000' },
  { label: '50k - 100k', min: '50000', max: '100000' },
  { label: '100k - 250k', min: '100000', max: '250000' },
  { label: '250k+', min: '250000', max: '' },
];

const AGE_BRACKETS = [
  { id: 'young', label: '< 4 yrs', min: '', max: '3' },
  { id: 'prime', label: '4 - 8 yrs', min: '4', max: '8' },
  { id: 'experienced', label: '9 - 14 yrs', min: '9', max: '14' },
  { id: 'senior', label: '15+ yrs', min: '15', max: '' },
];

export default function FilterModal({ visible, onClose, onApply, initialFilters }) {
  const insets = useSafeAreaInsets();
  const { t, isRTL, language } = useLanguage();
  const isArabic = language === 'ar';
  const { isAuthenticated } = useAuth();
  const toast = useToast();

  const [filters, setFilters] = useState(initialFilters || {});
  const [errors, setErrors] = useState({});
  const [savingAlert, setSavingAlert] = useState(false);

  useEffect(() => {
    setFilters(initialFilters || {});
    setErrors({});
  }, [initialFilters, visible]);

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({});
    setErrors({});
  };

  const handleApply = () => {
    const errs = {};
    const minPriceRaw = filters.min_price?.toString().trim();
    const maxPriceRaw = filters.max_price?.toString().trim();
    let minPrice = null;
    let maxPrice = null;

    if (minPriceRaw) {
      const parsed = Number(minPriceRaw);
      if (!Number.isFinite(parsed) || parsed < 0) {
        errs.min_price = t('adminInvalidPrice');
      } else {
        minPrice = parsed;
      }
    }

    if (maxPriceRaw) {
      const parsed = Number(maxPriceRaw);
      if (!Number.isFinite(parsed) || parsed < 0) {
        errs.max_price = t('adminInvalidPrice');
      } else {
        maxPrice = parsed;
      }
    }

    if (minPrice != null && maxPrice != null && minPrice > maxPrice) {
      errs.min_price = t('minMustBeLessOrEqualMax') || 'Min must be less than or equal to Max';
    }

    // Age range validation
    const minAgeRaw = filters.min_age?.toString().trim();
    const maxAgeRaw = filters.max_age?.toString().trim();
    let minAge = null;
    let maxAge = null;

    if (minAgeRaw) {
      const parsed = Number(minAgeRaw);
      if (!Number.isFinite(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
        errs.min_age = t('adminInvalidAge');
      } else {
        minAge = parsed;
      }
    }

    if (maxAgeRaw) {
      const parsed = Number(maxAgeRaw);
      if (!Number.isFinite(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
        errs.max_age = t('adminInvalidAge');
      } else {
        maxAge = parsed;
      }
    }

    if (minAge != null && maxAge != null && minAge > maxAge) {
      errs.min_age = t('minMustBeLessOrEqualMax') || 'Min must be less than or equal to Max';
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    // Remove empty/undefined values and convert validated ranges to numbers
    const cleaned = {};
    const converted = { ...filters };
    if (minPrice != null) converted.min_price = minPrice;
    if (maxPrice != null) converted.max_price = maxPrice;
    if (minAge != null) converted.min_age = minAge;
    if (maxAge != null) converted.max_age = maxAge;

    Object.entries(converted).forEach(([k, v]) => {
      if (v !== '' && v !== undefined && v !== null && v !== false) {
        cleaned[k] = v;
      }
    });

    setErrors({});
    onApply(cleaned);
    onClose();
  };

  const handleSaveSearchAlert = async () => {
    if (!isAuthenticated) {
      toast.show(isArabic ? 'يرجى تسجيل الدخول لحفظ تنبيهات البحث' : 'Please sign in to save search alerts', {
        type: 'warning',
      });
      return;
    }

    setSavingAlert(true);
    try {
      const alertPayload = {
        name: filters.breed
          ? `${filters.breed} Alert`
          : filters.discipline
          ? `${filters.discipline} Alert`
          : 'SteedMarket Equine Alert',
        search_criteria: { ...filters },
        notification_enabled: true,
      };
      await apiService.createSavedSearch(alertPayload);
      toast.show(t('alertSavedSuccess'), { type: 'success' });
    } catch {
      toast.show(isArabic ? 'تعذر حفظ تنبيه البحث' : 'Could not save search alert', {
        type: 'error',
      });
    } finally {
      setSavingAlert(false);
    }
  };

  const handleConciergeInquiry = () => {
    const criteria = [];
    if (filters.breed) criteria.push(`Breed: ${filters.breed}`);
    if (filters.discipline) criteria.push(`Discipline: ${filters.discipline}`);
    if (filters.location || filters.q) criteria.push(`Location: ${filters.location || filters.q}`);
    if (filters.min_price || filters.max_price) criteria.push(`Budget: ${filters.min_price || 0}-${filters.max_price || '+'} AED`);
    const criteriaStr = criteria.length ? ` (${criteria.join(', ')})` : '';
    const text = isRTL
      ? `مرحباً وسيط ستيد ماركت الخاص، أود طلب بحث وتوريد خيل بمواصفات مخصصة${criteriaStr}.`
      : `Hello SteedMarket Private Broker, I would like to request bespoke equine sourcing assistance${criteriaStr}.`;
    try {
      const res = Linking.openURL(`https://wa.me/971500000000?text=${encodeURIComponent(text)}`);
      if (res && typeof res.catch === 'function') res.catch(() => {});
    } catch (e) {}
  };

  const activeCount = useMemo(() => {
    return Object.values(filters).filter(
      (v) => v !== '' && v !== undefined && v !== null && v !== false
    ).length;
  }, [filters]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={styles.overlayTouch} onPress={onClose} activeOpacity={1} />
        <View style={styles.sheet} testID="filter-modal-sheet">
          {/* Handle */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Luxury Header */}
          <View style={[styles.header, isRTL && styles.rowRTL]}>
            <View style={[styles.headerTitleWrap, isRTL && styles.rowRTL]}>
              <BrandMark size={28} />
              <Text style={[styles.headerTitle, isRTL && styles.textRTL]}>{t('filters')}</Text>
            </View>
            <View style={[styles.headerActions, isRTL && styles.rowRTL]}>
              <TouchableOpacity
                testID="filter-header-hotline-btn"
                onPress={handleConciergeInquiry}
                style={styles.headerHotlineBtn}
                accessibilityLabel="Concierge Hotline"
              >
                <Ionicons name="logo-whatsapp" size={17} color="#25D366" />
              </TouchableOpacity>
              {activeCount > 0 && (
                <TouchableOpacity
                  testID="filter-clear-all-btn"
                  onPress={clearFilters}
                  style={styles.clearBtn}
                >
                  <Text style={styles.clearText}>{t('clearAll')}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                testID="filter-close-btn"
                onPress={onClose}
                style={styles.closeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* VIP Bespoke Sourcing & Escrow Discovery Card */}
            <View style={styles.conciergeCard} testID="filter-concierge-discovery-card">
              <View style={[styles.conciergeCardHeader, isRTL && styles.rowRTL]}>
                <View style={styles.conciergePulseDot} />
                <Text style={styles.conciergeBadgeText}>
                  {isRTL ? 'خدمة البحث والتوريد الخاص' : 'VIP BESPOKE EQUINE SOURCING'}
                </Text>
              </View>
              <Text style={[styles.conciergeCardTitle, isRTL && styles.textRTL]}>
                {isRTL
                  ? 'لم تجد مواصفات خيلك المنشودة في القائمة؟'
                  : "Can't find your exact pedigree or bloodline?"}
              </Text>
              <Text style={[styles.conciergeCardDesc, isRTL && styles.textRTL]}>
                {isRTL
                  ? 'يتولى كبار وسطاء ستيد ماركت البحث لك في الإسطبلات الخاصة والمزادات الخليجية والدولية'
                  : 'SteedMarket private brokers will source directly from private GCC stables and international studs'}
              </Text>
              <TouchableOpacity
                testID="filter-concierge-hotline-btn"
                style={[styles.conciergeActionBtn, isRTL && styles.rowRTL]}
                onPress={handleConciergeInquiry}
                activeOpacity={0.85}
              >
                <Ionicons name="logo-whatsapp" size={15} color="#25D366" />
                <Text style={styles.conciergeActionBtnText}>
                  {isRTL ? 'استشارة الوسيط الخاص في واتساب' : 'Consult Private Broker on WhatsApp'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Save as Search Alert Banner (When user has active criteria) */}
            {activeCount > 0 && (
              <View style={styles.alertBanner} testID="filter-alert-banner">
                <View style={[styles.alertHeader, isRTL && styles.rowRTL]}>
                  <Ionicons name="notifications" size={18} color={COLORS.accentDark} />
                  <Text style={[styles.alertTitle, isRTL && styles.textRTL]}>
                    {t('saveSearchAlert')}
                  </Text>
                </View>
                <Text style={[styles.alertSub, isRTL && styles.textRTL]}>
                  {t('saveSearchAlertSub')}
                </Text>
                <TouchableOpacity
                  testID="filter-save-alert-btn"
                  style={[styles.saveAlertBtn, isRTL && styles.rowRTL]}
                  activeOpacity={0.8}
                  onPress={handleSaveSearchAlert}
                  disabled={savingAlert}
                >
                  {savingAlert ? (
                    <ActivityIndicator size="small" color={COLORS.accentDark} />
                  ) : (
                    <>
                      <Ionicons name="bookmark-outline" size={16} color={COLORS.accentDark} />
                      <Text style={styles.saveAlertBtnText}>{t('saveSearchAlert')}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* UAE Emirates Stabling Location Chips */}
            <View style={styles.section}>
              <View style={[styles.sectionTitleRow, isRTL && styles.rowRTL]}>
                <Ionicons name="location-outline" size={16} color={COLORS.primary} />
                <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
                  {isArabic ? 'إمارة الإسطبل' : 'Stabling Emirate / Region'}
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[styles.horizontalChipsRow, isRTL && styles.rowRTL]}
              >
                {UAE_EMIRATES.map((e) => {
                  const isSelected =
                    filters.q?.toLowerCase() === e.id.toLowerCase() ||
                    filters.location?.toLowerCase().includes(e.id.toLowerCase());
                  return (
                    <TouchableOpacity
                      key={e.id}
                      testID={`filter-emirate-${e.id}`}
                      style={[styles.chip, isSelected && styles.chipActive]}
                      onPress={() => {
                        if (isSelected) {
                          updateFilter('q', '');
                          updateFilter('location', '');
                        } else {
                          updateFilter('q', e.id);
                          updateFilter('location', e.en);
                        }
                      }}
                    >
                      <Ionicons
                        name="location"
                        size={12}
                        color={isSelected ? COLORS.white : COLORS.accentDark}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                        {isArabic ? e.ar : e.en}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Quick Budget Presets in AED */}
            <View style={styles.section}>
              <View style={[styles.sectionTitleRow, isRTL && styles.rowRTL]}>
                <Ionicons name="pricetag-outline" size={16} color={COLORS.primary} />
                <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
                  {t('budgetPresets')} ({t('currencyAed')})
                </Text>
              </View>
              <View style={[styles.chipRow, isRTL && styles.rowRTL]}>
                {BUDGET_PRESETS.map((b, idx) => {
                  const isSelected =
                    filters.min_price?.toString() === b.min &&
                    filters.max_price?.toString() === b.max;
                  return (
                    <TouchableOpacity
                      key={b.label}
                      testID={`filter-budget-${idx}`}
                      style={[styles.chip, isSelected && styles.chipActive]}
                      onPress={() => {
                        if (isSelected) {
                          updateFilter('min_price', '');
                          updateFilter('max_price', '');
                        } else {
                          updateFilter('min_price', b.min);
                          updateFilter('max_price', b.max);
                        }
                      }}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                        {b.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Price Range Manual Inputs */}
            <View style={styles.section}>
              <Text style={[styles.subLabel, isRTL && styles.textRTL]}>
                {t('priceRange')} ({t('currencyAed')})
              </Text>
              <View style={[styles.rangeRow, isRTL && styles.rowRTL]}>
                <TextInput
                  testID="filter-price-min"
                  style={[styles.input, styles.rangeInput, isRTL && styles.inputRTL]}
                  placeholder={`${t('min')} (${t('currencyAed')})`}
                  placeholderTextColor={COLORS.textLight}
                  keyboardType="numeric"
                  value={filters.min_price?.toString() || ''}
                  onChangeText={(v) => {
                    updateFilter('min_price', v);
                    if (errors.min_price) {
                      setErrors((e) => {
                        const n = { ...e };
                        delete n.min_price;
                        return n;
                      });
                    }
                  }}
                  textAlign={isRTL ? 'right' : 'left'}
                />
                <Text style={styles.rangeSeparator}>–</Text>
                <TextInput
                  testID="filter-price-max"
                  style={[styles.input, styles.rangeInput, isRTL && styles.inputRTL]}
                  placeholder={`${t('max')} (${t('currencyAed')})`}
                  placeholderTextColor={COLORS.textLight}
                  keyboardType="numeric"
                  value={filters.max_price?.toString() || ''}
                  onChangeText={(v) => {
                    updateFilter('max_price', v);
                    if (errors.max_price) {
                      setErrors((e) => {
                        const n = { ...e };
                        delete n.max_price;
                        return n;
                      });
                    }
                  }}
                  textAlign={isRTL ? 'right' : 'left'}
                />
              </View>
              {(errors.min_price || errors.max_price) && (
                <Text style={[styles.errorText, isRTL && styles.textRTL]}>
                  {errors.min_price || errors.max_price}
                </Text>
              )}
            </View>

            {/* Trust & Verification Shield Filters */}
            <View style={styles.section}>
              <View style={[styles.sectionTitleRow, isRTL && styles.rowRTL]}>
                <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.primary} />
                <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
                  {t('trustFilters') || 'Trust & Verification'}
                </Text>
              </View>
              <View style={[styles.chipRow, isRTL && styles.rowRTL]}>
                <TouchableOpacity
                  testID="filter-trust-vet"
                  style={[styles.chip, filters.vet_check_available && styles.chipActive]}
                  onPress={() =>
                    updateFilter('vet_check_available', filters.vet_check_available ? '' : true)
                  }
                >
                  <Ionicons
                    name="medical-outline"
                    size={14}
                    color={filters.vet_check_available ? COLORS.white : COLORS.primary}
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[
                      styles.chipText,
                      filters.vet_check_available && styles.chipTextActive,
                    ]}
                  >
                    {t('vetCheckedOnly')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  testID="filter-trust-verified"
                  style={[styles.chip, filters.verified_seller && styles.chipActive]}
                  onPress={() =>
                    updateFilter('verified_seller', filters.verified_seller ? '' : true)
                  }
                >
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={14}
                    color={filters.verified_seller ? COLORS.white : COLORS.primary}
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[
                      styles.chipText,
                      filters.verified_seller && styles.chipTextActive,
                    ]}
                  >
                    {t('verifiedSellersOnly')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  testID="filter-trust-video"
                  style={[styles.chip, filters.has_video && styles.chipActive]}
                  onPress={() => updateFilter('has_video', filters.has_video ? '' : true)}
                >
                  <Ionicons
                    name="videocam-outline"
                    size={14}
                    color={filters.has_video ? COLORS.white : COLORS.primary}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[styles.chipText, filters.has_video && styles.chipTextActive]}>
                    {isArabic ? 'بفيديو للحركة' : 'With Video'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Breed Quick Chips & Input */}
            <View style={styles.section}>
              <View style={[styles.sectionTitleRow, isRTL && styles.rowRTL]}>
                <Ionicons name="ribbon-outline" size={16} color={COLORS.primary} />
                <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t('breedFilter')}</Text>
              </View>
              <View style={[styles.chipRow, isRTL && styles.rowRTL]}>
                {POPULAR_BREEDS.map((b) => {
                  const isSelected = filters.breed?.toLowerCase() === b.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={b}
                      testID={`filter-breed-chip-${b}`}
                      style={[styles.chip, isSelected && styles.chipActive]}
                      onPress={() => updateFilter('breed', isSelected ? '' : b)}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                        {b}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TextInput
                testID="filter-breed-input"
                style={[styles.input, { marginTop: SPACING.sm }, isRTL && styles.inputRTL]}
                placeholder={t('breedFilterPlaceholder')}
                placeholderTextColor={COLORS.textLight}
                value={filters.breed || ''}
                onChangeText={(v) => updateFilter('breed', v)}
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>

            {/* Discipline Quick Chips & Input */}
            <View style={styles.section}>
              <View style={[styles.sectionTitleRow, isRTL && styles.rowRTL]}>
                <Ionicons name="trophy-outline" size={16} color={COLORS.primary} />
                <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
                  {t('disciplineFilter')}
                </Text>
              </View>
              <View style={[styles.chipRow, isRTL && styles.rowRTL]}>
                {DISCIPLINE_PRESETS.map((d) => {
                  const isSelected =
                    filters.discipline?.toLowerCase() === d.id.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={d.id}
                      testID={`filter-discipline-${d.id}`}
                      style={[styles.chip, isSelected && styles.chipActive]}
                      onPress={() => updateFilter('discipline', isSelected ? '' : d.id)}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                        {t(d.labelKey) || d.fallback}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TextInput
                testID="filter-discipline-input"
                style={[styles.input, { marginTop: SPACING.sm }, isRTL && styles.inputRTL]}
                placeholder={t('disciplineFilterPlaceholder')}
                placeholderTextColor={COLORS.textLight}
                value={filters.discipline || ''}
                onChangeText={(v) => updateFilter('discipline', v)}
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>

            {/* Gender Selection */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t('genderFilter')}</Text>
              <View style={[styles.chipRow, isRTL && styles.rowRTL]}>
                {GENDER_OPTIONS.map((g) => (
                  <TouchableOpacity
                    key={g.id}
                    testID={`filter-gender-${g.id}`}
                    style={[styles.chip, filters.gender === g.id && styles.chipActive]}
                    onPress={() => updateFilter('gender', filters.gender === g.id ? '' : g.id)}
                  >
                    <Ionicons
                      name={g.icon}
                      size={14}
                      color={filters.gender === g.id ? COLORS.white : COLORS.textSecondary}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[styles.chipText, filters.gender === g.id && styles.chipTextActive]}
                    >
                      {t(g.labelKey) || g.fallback}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Age Quick Brackets & Manual Range */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t('ageRange')}</Text>
              <View style={[styles.chipRow, isRTL && styles.rowRTL]}>
                {AGE_BRACKETS.map((a) => {
                  const isSelected =
                    filters.min_age?.toString() === a.min &&
                    filters.max_age?.toString() === a.max;
                  return (
                    <TouchableOpacity
                      key={a.id}
                      testID={`filter-age-bracket-${a.id}`}
                      style={[styles.chip, isSelected && styles.chipActive]}
                      onPress={() => {
                        if (isSelected) {
                          updateFilter('min_age', '');
                          updateFilter('max_age', '');
                        } else {
                          updateFilter('min_age', a.min);
                          updateFilter('max_age', a.max);
                        }
                      }}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                        {a.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={[styles.rangeRow, { marginTop: SPACING.sm }, isRTL && styles.rowRTL]}>
                <TextInput
                  testID="filter-age-min"
                  style={[styles.input, styles.rangeInput, isRTL && styles.inputRTL]}
                  placeholder={t('min')}
                  placeholderTextColor={COLORS.textLight}
                  keyboardType="numeric"
                  value={filters.min_age?.toString() || ''}
                  onChangeText={(v) => {
                    updateFilter('min_age', v);
                    if (errors.min_age) {
                      setErrors((e) => {
                        const n = { ...e };
                        delete n.min_age;
                        return n;
                      });
                    }
                  }}
                  textAlign={isRTL ? 'right' : 'left'}
                />
                <Text style={styles.rangeSeparator}>–</Text>
                <TextInput
                  testID="filter-age-max"
                  style={[styles.input, styles.rangeInput, isRTL && styles.inputRTL]}
                  placeholder={t('max')}
                  placeholderTextColor={COLORS.textLight}
                  keyboardType="numeric"
                  value={filters.max_age?.toString() || ''}
                  onChangeText={(v) => {
                    updateFilter('max_age', v);
                    if (errors.max_age) {
                      setErrors((e) => {
                        const n = { ...e };
                        delete n.max_age;
                        return n;
                      });
                    }
                  }}
                  textAlign={isRTL ? 'right' : 'left'}
                />
              </View>
              {(errors.min_age || errors.max_age) && (
                <Text style={[styles.errorText, isRTL && styles.textRTL]}>
                  {errors.min_age || errors.max_age}
                </Text>
              )}
            </View>
          </ScrollView>

          {/* Luxury Sticky Footer Action Bar */}
          <View
            style={[
              styles.footer,
              { paddingBottom: Math.max(insets.bottom, SPACING.md) },
              isRTL && styles.rowRTL,
            ]}
          >
            <TouchableOpacity
              testID="filter-cancel-btn"
              style={styles.cancelBtn}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="filter-apply-btn"
              style={styles.applyBtn}
              onPress={handleApply}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark" size={18} color={COLORS.white} />
              <Text style={styles.applyBtnText}>
                {t('applyFilters')}
                {activeCount > 0 ? ` (${activeCount})` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  overlayTouch: {
    flex: 1,
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: SCREEN_HEIGHT * 0.90,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  handle: {
    width: 44,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerTitle: {
    ...FONTS.h2,
    color: COLORS.primary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  clearBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearText: {
    ...FONTS.bodySmall,
    color: COLORS.error,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  alertBanner: {
    backgroundColor: '#FAF5EA',
    borderWidth: 1,
    borderColor: '#E8DCBF',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  alertTitle: {
    ...FONTS.bodySmall,
    fontWeight: '700',
    color: COLORS.accentDark,
  },
  alertSub: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  saveAlertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E8DCBF',
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    marginTop: SPACING.sm,
    ...SHADOWS.soft,
  },
  saveAlertBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.accentDark,
  },
  section: {
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    ...FONTS.bodySmall,
    color: COLORS.primary,
    fontWeight: '700',
  },
  subLabel: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    fontWeight: '600',
  },
  input: {
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    ...FONTS.body,
    color: COLORS.text,
  },
  horizontalChipsRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    paddingVertical: 2,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    ...FONTS.bodySmall,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  chipTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  rangeInput: {
    flex: 1,
  },
  rangeSeparator: {
    ...FONTS.body,
    color: COLORS.textLight,
  },
  errorText: {
    ...FONTS.bodySmall,
    color: COLORS.error,
    marginTop: SPACING.xs,
  },
  footer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    backgroundColor: COLORS.surface,
    ...SHADOWS.cardHover,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    ...FONTS.button,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  applyBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: 12,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    ...SHADOWS.soft,
  },
  applyBtnText: {
    ...FONTS.button,
    color: COLORS.white,
    fontWeight: '700',
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
  headerHotlineBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#25D366' + '15',
    borderWidth: 1,
    borderColor: '#25D366' + '35',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.xs,
  },
  conciergeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.accent + '40',
    ...SHADOWS.soft,
  },
  conciergeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  conciergePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  conciergeBadgeText: {
    ...FONTS.caption,
    color: COLORS.accentDark,
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  conciergeCardTitle: {
    ...FONTS.h3,
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
  },
  conciergeCardDesc: {
    ...FONTS.bodySmall,
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: SPACING.sm,
  },
  conciergeActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#25D366' + '15',
    paddingVertical: 8,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#25D366' + '40',
  },
  conciergeActionBtnText: {
    ...FONTS.caption,
    color: '#128C7E',
    fontWeight: '700',
    fontSize: 12,
  },
});

