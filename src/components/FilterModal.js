import React, { useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../config/theme';
import { useLanguage } from '../contexts/LanguageContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const GENDER_OPTIONS = ['mare', 'gelding', 'stallion'];

export default function FilterModal({ visible, onClose, onApply, initialFilters }) {
  const { t, isRTL } = useLanguage();
  const [filters, setFilters] = useState(initialFilters || {});
  const [errors, setErrors] = useState({});

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const handleApply = () => {
    // Validate numeric ranges (price, age) before applying
    const minPriceRaw = filters.min_price?.toString().trim();
    const maxPriceRaw = filters.max_price?.toString().trim();
    let minPrice = null;
    let maxPrice = null;

    if (minPriceRaw) {
      const parsed = Number(minPriceRaw);
      if (!Number.isFinite(parsed) || parsed < 0) {
        setErrors((e) => ({ ...e, min_price: t('adminInvalidPrice') }));
      } else {
        minPrice = parsed;
      }
    }

    if (maxPriceRaw) {
      const parsed = Number(maxPriceRaw);
      if (!Number.isFinite(parsed) || parsed < 0) {
        setErrors((e) => ({ ...e, max_price: t('adminInvalidPrice') }));
      } else {
        maxPrice = parsed;
      }
    }

    if (minPrice != null && maxPrice != null && minPrice > maxPrice) {
      setErrors((e) => ({ ...e, min_price: t('minMustBeLessOrEqualMax') || 'Min must be less than or equal to Max' }));
    }

    // Age range validation
    const minAgeRaw = filters.min_age?.toString().trim();
    const maxAgeRaw = filters.max_age?.toString().trim();
    let minAge = null;
    let maxAge = null;

    if (minAgeRaw) {
      const parsed = Number(minAgeRaw);
      if (!Number.isFinite(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
        setErrors((e) => ({ ...e, min_age: t('adminInvalidAge') }));
      } else {
        minAge = parsed;
      }
    }

    if (maxAgeRaw) {
      const parsed = Number(maxAgeRaw);
      if (!Number.isFinite(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
        setErrors((e) => ({ ...e, max_age: t('adminInvalidAge') }));
      } else {
        maxAge = parsed;
      }
    }

    if (minAge != null && maxAge != null && minAge > maxAge) {
      setErrors((e) => ({ ...e, min_age: t('minMustBeLessOrEqualMax') || 'Min must be less than or equal to Max' }));
    }

    // Remove empty/undefined values and convert validated ranges to numbers
    const cleaned = {};
    const converted = { ...filters };
    if (minPrice != null) converted.min_price = minPrice;
    if (maxPrice != null) converted.max_price = maxPrice;
    if (minAge != null) converted.min_age = minAge;
    if (maxAge != null) converted.max_age = maxAge;

    // If any errors were set during validation, abort and show them inline
    if (Object.keys(errors).length > 0) return;

    Object.entries(converted).forEach(([k, v]) => {
      if (v !== '' && v !== undefined && v !== null) cleaned[k] = v;
    });

    setErrors({});
    onApply(cleaned);
    onClose();
  };

  const activeCount = Object.values(filters).filter(
    (v) => v !== '' && v !== undefined && v !== null
  ).length;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={styles.overlayTouch} onPress={onClose} />
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={[styles.header, isRTL && styles.rowRTL]}>
            <Text style={[styles.headerTitle, isRTL && styles.textRTL]}>{t('filters')}</Text>
            {activeCount > 0 && (
              <TouchableOpacity onPress={clearFilters}>
                <Text style={styles.clearText}>{t('clearAll')}</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Breed */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t('breedFilter')}</Text>
              <TextInput
                style={[styles.input, isRTL && styles.inputRTL]}
                placeholder={t('breedFilterPlaceholder')}
                placeholderTextColor={COLORS.textLight}
                value={filters.breed || ''}
                onChangeText={(v) => updateFilter('breed', v)}
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>

            {/* Discipline */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t('disciplineFilter')}</Text>
              <TextInput
                style={[styles.input, isRTL && styles.inputRTL]}
                placeholder={t('disciplineFilterPlaceholder')}
                placeholderTextColor={COLORS.textLight}
                value={filters.discipline || ''}
                onChangeText={(v) => updateFilter('discipline', v)}
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>

            {/* Gender */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t('genderFilter')}</Text>
              <View style={[styles.chipRow, isRTL && styles.rowRTL]}>
                {GENDER_OPTIONS.map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[
                      styles.chip,
                      filters.gender === g && styles.chipActive,
                    ]}
                    onPress={() =>
                      updateFilter('gender', filters.gender === g ? '' : g)
                    }
                  >
                    <Text
                      style={[
                        styles.chipText,
                        filters.gender === g && styles.chipTextActive,
                      ]}
                    >
                      {t(g === 'mare' ? 'genderMare' : g === 'gelding' ? 'genderGelding' : 'genderStallion')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t('trustFilters')}</Text>
              <View style={[styles.chipRow, isRTL && styles.rowRTL]}>
                <TouchableOpacity
                  style={[
                    styles.chip,
                    filters.vet_check_available && styles.chipActive,
                  ]}
                  onPress={() =>
                    updateFilter(
                      'vet_check_available',
                      filters.vet_check_available ? '' : true
                    )
                  }
                >
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
                  style={[
                    styles.chip,
                    filters.verified_seller && styles.chipActive,
                  ]}
                  onPress={() =>
                    updateFilter('verified_seller', filters.verified_seller ? '' : true)
                  }
                >
                  <Text
                    style={[
                      styles.chipText,
                      filters.verified_seller && styles.chipTextActive,
                    ]}
                  >
                    {t('verifiedSellersOnly')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Price Range */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t('priceRange')}</Text>
              <View style={[styles.rangeRow, isRTL && styles.rowRTL]}>
                <TextInput
                  style={[styles.input, styles.rangeInput, isRTL && styles.inputRTL]}
                  placeholder={t('min')}
                  placeholderTextColor={COLORS.textLight}
                  keyboardType="numeric"
                  value={filters.min_price?.toString() || ''}
                  onChangeText={(v) => {
                    updateFilter('min_price', v);
                    if (errors.min_price) setErrors((e) => { const n = { ...e }; delete n.min_price; return n; });
                  }}
                  textAlign={isRTL ? 'right' : 'left'}
                />
                <Text style={styles.rangeSeparator}>–</Text>
                <TextInput
                  style={[styles.input, styles.rangeInput, isRTL && styles.inputRTL]}
                  placeholder={t('max')}
                  placeholderTextColor={COLORS.textLight}
                  keyboardType="numeric"
                  value={filters.max_price?.toString() || ''}
                  onChangeText={(v) => {
                    updateFilter('max_price', v);
                    if (errors.max_price) setErrors((e) => { const n = { ...e }; delete n.max_price; return n; });
                  }}
                  textAlign={isRTL ? 'right' : 'left'}
                />
              {(errors.min_price || errors.max_price) && (
                <Text style={[styles.errorText, isRTL && styles.textRTL]}>{errors.min_price || errors.max_price}</Text>
              )}
              </View>
            </View>

            {/* Age Range */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t('ageRange')}</Text>
              <View style={[styles.rangeRow, isRTL && styles.rowRTL]}>
                <TextInput
                  style={[styles.input, styles.rangeInput, isRTL && styles.inputRTL]}
                  placeholder={t('min')}
                  placeholderTextColor={COLORS.textLight}
                  keyboardType="numeric"
                  value={filters.min_age?.toString() || ''}
                  onChangeText={(v) => {
                    updateFilter('min_age', v);
                    if (errors.min_age) setErrors((e) => { const n = { ...e }; delete n.min_age; return n; });
                  }}
                  textAlign={isRTL ? 'right' : 'left'}
                />
                <Text style={styles.rangeSeparator}>–</Text>
                <TextInput
                  style={[styles.input, styles.rangeInput, isRTL && styles.inputRTL]}
                  placeholder={t('max')}
                  placeholderTextColor={COLORS.textLight}
                  keyboardType="numeric"
                  value={filters.max_age?.toString() || ''}
                  onChangeText={(v) => {
                    updateFilter('max_age', v);
                    if (errors.max_age) setErrors((e) => { const n = { ...e }; delete n.max_age; return n; });
                  }}
                  textAlign={isRTL ? 'right' : 'left'}
                />
              {(errors.min_age || errors.max_age) && (
                <Text style={[styles.errorText, isRTL && styles.textRTL]}>{errors.min_age || errors.max_age}</Text>
              )}
              </View>
            </View>
          </ScrollView>

          {/* Footer Buttons */}
          <View style={[styles.footer, isRTL && styles.rowRTL]}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
              <Ionicons name="checkmark" size={20} color={COLORS.white} />
              <Text style={styles.applyBtnText}>
                {t('applyFilters')}{activeCount > 0 ? ` (${activeCount})` : ''}
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
    maxHeight: SCREEN_HEIGHT * 0.85,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  handle: {
    width: 40,
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
  headerTitle: {
    ...FONTS.h2,
    color: COLORS.text,
  },
  clearText: {
    ...FONTS.body,
    color: COLORS.error,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  section: {
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  sectionTitle: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    ...FONTS.body,
    color: COLORS.text,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.inputBg,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: COLORS.primaryLight + '15',
    borderColor: COLORS.primary,
  },
  chipText: {
    ...FONTS.body,
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
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
  footer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingBottom: SPACING.xl,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    ...FONTS.button,
    color: COLORS.textSecondary,
  },
  applyBtn: {
    flex: 2,
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    ...FONTS.button,
    color: COLORS.white,
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
