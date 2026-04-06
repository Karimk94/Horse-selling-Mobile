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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../config/theme';
import { useLanguage } from '../contexts/LanguageContext';
import * as apiService from '../services/api';
import HORSE_BREEDS from '../data/horseBreeds';
import { extractApiErrorMessage } from '../utils/apiErrors';

export default function AdminEditHorseScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { t, isRTL } = useLanguage();
  const { horse } = route.params;

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [breedModalVisible, setBreedModalVisible] = useState(false);
  const [breedSearchQuery, setBreedSearchQuery] = useState('');
  const [form, setForm] = useState({
    title: horse?.title || '',
    price: horse?.price != null ? String(horse.price) : '',
    breed: horse?.breed || '',
    age: horse?.age != null ? String(horse.age) : '',
    discipline: horse?.discipline || '',
    height: horse?.height != null ? String(horse.height) : '',
    description: horse?.description || '',
  });

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

    setSaving(true);
    try {
      await apiService.updateHorse(horse.id, {
        title: form.title.trim(),
        price: Number(form.price),
        breed: form.breed.trim(),
        age: Number(form.age),
        discipline: form.discipline.trim() || null,
        height: form.height.trim() ? Number(form.height) : null,
        description: form.description.trim() || null,
      });
      Alert.alert(t('success'), t('adminHorseUpdated'), [
        { text: t('ok'), onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert(t('error'), extractApiErrorMessage(err, t('adminActionFailed')));
    } finally {
      setSaving(false);
    }
  };

  const renderInput = (key, label, options = {}) => (
    <View style={styles.field}>
      <Text style={[styles.label, isRTL && styles.textRTL]}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          options.multiline && styles.inputMultiline,
          errors[key] && styles.inputError,
          isRTL && styles.inputRTL,
        ]}
        value={form[key]}
        onChangeText={(v) => update(key, v)}
        keyboardType={options.keyboardType || 'default'}
        placeholderTextColor={COLORS.textLight}
        multiline={!!options.multiline}
        textAlignVertical={options.multiline ? 'top' : 'center'}
        textAlign={isRTL ? 'right' : 'left'}
      />
      {errors[key] && <Text style={[styles.errorText, isRTL && styles.textRTL]}>{errors[key]}</Text>}
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <View style={[styles.header, isRTL && styles.rowRTL]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isRTL && styles.textRTL]}>{t('adminEditHorse')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {renderInput('title', t('title'))}
        {renderInput('price', t('priceLabel'), { keyboardType: 'numeric' })}
        <View style={styles.field}>
          <Text style={[styles.label, isRTL && styles.textRTL]}>{t('breed')}</Text>
          <TouchableOpacity
            style={[styles.selectorButton, errors.breed && styles.inputError, isRTL && styles.rowRTL]}
            onPress={() => setBreedModalVisible(true)}
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
            <Ionicons name="chevron-down" size={18} color={COLORS.textLight} />
          </TouchableOpacity>
          {errors.breed && <Text style={[styles.errorText, isRTL && styles.textRTL]}>{errors.breed}</Text>}
        </View>
        {renderInput('age', t('age'), { keyboardType: 'numeric' })}
        {renderInput('discipline', t('discipline'))}
        {renderInput('height', t('height'), { keyboardType: 'numeric' })}
        {renderInput('description', t('description'), { multiline: true })}

        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.saveBtnText}>{t('save')}</Text>}
        </TouchableOpacity>
      </ScrollView>

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
              <TouchableOpacity onPress={() => setBreedModalVisible(false)}>
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <View style={[styles.searchWrap, isRTL && styles.rowRTL]}>
              <Ionicons name="search-outline" size={18} color={COLORS.textLight} />
              <TextInput
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
                  style={styles.breedItem}
                  onPress={() => {
                    update('breed', item);
                    setBreedModalVisible(false);
                    setBreedSearchQuery('');
                  }}
                >
                  <Text style={[styles.breedItemText, isRTL && styles.textRTL]}>{item}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={[styles.emptyBreedText, isRTL && styles.textRTL]}>{t('noBreedFound')}</Text>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.soft,
  },
  headerTitle: { ...FONTS.h2, color: COLORS.primary },
  content: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  field: { marginBottom: SPACING.md },
  label: { ...FONTS.caption, color: COLORS.textSecondary, marginBottom: SPACING.xs },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    ...FONTS.body,
    color: COLORS.text,
  },
  selectorButton: {
    backgroundColor: COLORS.surface,
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
  inputMultiline: { minHeight: 110 },
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    ...FONTS.caption,
    color: COLORS.error,
    marginTop: SPACING.xs,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    marginTop: SPACING.sm,
  },
  saveBtnText: { ...FONTS.button, color: COLORS.white },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '78%',
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.md,
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
    paddingVertical: SPACING.sm,
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
  rowRTL: { flexDirection: 'row-reverse' },
  textRTL: { textAlign: 'right', writingDirection: 'rtl' },
  inputRTL: { textAlign: 'right', writingDirection: 'rtl' },
});
