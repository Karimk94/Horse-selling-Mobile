import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  FlatList,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../config/theme';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import * as apiService from '../services/api';
import HORSE_BREEDS from '../data/horseBreeds';
import { extractApiErrorMessage } from '../utils/apiErrors';

const GENDERS = ['mare', 'gelding', 'stallion'];
const AGE_OPTIONS = Array.from({ length: 31 }, (_, i) => i.toString());
const HEIGHT_MIN = 10.0;
const HEIGHT_MAX = 20.0;
const HEIGHT_STEP = 0.1;

export default function CreateListingScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const { t, isRTL } = useLanguage();
  const [form, setForm] = useState({
    title: '',
    price: '',
    breed: '',
    age: '',
    gender: 'stallion',
    discipline: '',
    height: '',
    description: '',
    vet_check_available: false,
  });
  const [images, setImages] = useState([]);
  const [vetCertificate, setVetCertificate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [breedModalVisible, setBreedModalVisible] = useState(false);
  const [breedSearchQuery, setBreedSearchQuery] = useState('');
  const [ageModalVisible, setAgeModalVisible] = useState(false);
  const [heightModalVisible, setHeightModalVisible] = useState(false);
  const [heightInput, setHeightInput] = useState('');

  const filteredBreeds = useMemo(() => {
    const q = breedSearchQuery.trim().toLowerCase();
    if (!q) return HORSE_BREEDS;
    return HORSE_BREEDS.filter((breed) => breed.toLowerCase().includes(q));
  }, [breedSearchQuery]);

  const updateForm = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const openHeightPicker = () => {
    setHeightInput(form.height || '');
    setHeightModalVisible(true);
  };

  const handleHeightChange = (text) => {
    setHeightInput(text);
  };

  const handleHeightIncrement = (delta) => {
    const current = parseFloat(heightInput) || HEIGHT_MIN;
    const newValue = Math.min(HEIGHT_MAX, Math.max(HEIGHT_MIN, parseFloat((current + delta).toFixed(1))));
    setHeightInput(newValue.toFixed(1));
  };

  const confirmHeight = () => {
    const value = parseFloat(heightInput);
    if (!isNaN(value) && value >= HEIGHT_MIN && value <= HEIGHT_MAX) {
      updateForm('height', value.toFixed(1));
      setHeightModalVisible(false);
    } else {
      Alert.alert(t('invalidInput'), `${t('heightLabel')} ${t('mustBeBetween')} ${HEIGHT_MIN} ${t('and')} ${HEIGHT_MAX}`);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('permissionNeeded'), t('permissionNeededMsg'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 10 - images.length,
    });

    if (!result.canceled && result.assets) {
      setImages((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
    }
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const pickVetCertificate = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) return;
      const file = result.assets[0];
      setVetCertificate(file);
      setErrors((prev) => {
        if (!prev.vet_certificate_url) return prev;
        const next = { ...prev };
        delete next.vet_certificate_url;
        return next;
      });
    } catch {
      Alert.alert(t('error'), t('certificatePickFailed'));
    }
  };

  const clearVetCertificate = () => {
    setVetCertificate(null);
  };

  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = t('titleRequired');
    if (!form.price) errs.price = t('priceRequired');
    if (!form.breed.trim()) errs.breed = t('breedRequired');
    if (!form.age) errs.age = t('ageRequired');
    if (images.length === 0) errs.images = t('imagesRequired');
    if (!form.description.trim() || form.description.trim().length < 30) {
      errs.description = t('descriptionMinLength');
    }
    if (form.vet_check_available && !vetCertificate) {
      errs.vet_certificate_url = t('vetCertificateRequired');
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      let vetCertificateUrl = null;
      if (form.vet_check_available && vetCertificate?.uri) {
        const certData = new FormData();
        certData.append('file', {
          uri: vetCertificate.uri,
          name: vetCertificate.name || 'vet-certificate.pdf',
          type: vetCertificate.mimeType || 'application/pdf',
        });
        const certRes = await apiService.uploadMedia(certData);
        vetCertificateUrl = certRes.data?.file_url || certRes.data?.url || null;
      }

      // Upload images in parallel
      const imageUrls = (
        await Promise.all(
          images.map(async (uri) => {
            const formData = new FormData();
            const filename = uri.split('/').pop();
            formData.append('file', { uri, name: filename, type: 'image/jpeg' });
            const uploadRes = await apiService.uploadMedia(formData);
            return uploadRes.data?.file_url || uploadRes.data?.url || null;
          })
        )
      ).filter(Boolean);

      // Create listing
      const data = {
        title: form.title.trim(),
        price: parseFloat(form.price),
        breed: form.breed.trim(),
        age: parseInt(form.age),
        gender: form.gender,
        discipline: form.discipline.trim() || null,
        height: form.height ? parseFloat(form.height) : null,
        description: form.description.trim(),
        vet_check_available: form.vet_check_available,
        vet_certificate_url: vetCertificateUrl,
        image_urls: imageUrls,
      };

      await apiService.createHorse(data);
      Alert.alert(t('success'), t('listingSubmitted'), [
        { text: t('ok'), onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert(
        t('error'),
        extractApiErrorMessage(err, 'Failed to create listing. Please try again.')
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, isRTL && styles.textRTL]}>{t('sell')}</Text>
        </View>
        <View style={styles.authPrompt}>
          <View style={styles.authPromptIcon}>
            <Ionicons name="add-circle-outline" size={64} color={COLORS.textLight} />
          </View>
          <Text style={[styles.authPromptTitle, isRTL && styles.textRTL]}>{t('signInToList')}</Text>
          <Text style={[styles.authPromptSubtitle, isRTL && styles.textRTL]}>
            {t('signInToListSubtitle')}
          </Text>
          <TouchableOpacity
            style={styles.authPromptBtn}
            onPress={() => navigation.navigate('AuthStack')}
          >
            <Text style={styles.authPromptBtnText}>{t('signIn')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const renderInput = (key, labelKey, placeholder, options = {}) => (
    <View style={styles.inputGroup}>
      <Text style={[styles.label, isRTL && styles.textRTL]}>
        {t(labelKey)}
        {options.required !== false && <Text style={{ color: COLORS.error }}>{t('required')}</Text>}
      </Text>
      <TextInput
        style={[
          styles.input,
          options.multiline && styles.inputMultiline,
          errors[key] && styles.inputError,
          isRTL && styles.inputRTL,
        ]}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textLight}
        value={form[key]}
        onChangeText={(v) => updateForm(key, v)}
        keyboardType={options.keyboardType || 'default'}
        multiline={options.multiline}
        numberOfLines={options.multiline ? 4 : 1}
        textAlignVertical={options.multiline ? 'top' : 'center'}
        textAlign={isRTL ? 'right' : 'left'}
      />
      {errors[key] && <Text style={[styles.errorText, isRTL && styles.textRTL]}>{errors[key]}</Text>}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Text style={[styles.headerTitle, isRTL && styles.textRTL]}>{t('createListing')}</Text>
        <Text style={[styles.headerSubtitle, isRTL && styles.textRTL]}>{t('listYourHorse')}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Image Picker */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t('photos')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.imageRow}
          >
            {images.map((uri, index) => (
              <View key={index} style={styles.imageThumb}>
                <Image source={{ uri }} style={styles.thumbImage} />
                <TouchableOpacity
                  style={styles.removeImageBtn}
                  onPress={() => removeImage(index)}
                >
                  <Ionicons name="close" size={16} color={COLORS.white} />
                </TouchableOpacity>
              </View>
            ))}
            {images.length < 10 && (
              <TouchableOpacity style={styles.addImageBtn} onPress={pickImage}>
                <Ionicons name="camera-outline" size={28} color={COLORS.textLight} />
                <Text style={styles.addImageText}>
                  {images.length === 0 ? t('addPhotos') : `${images.length}/10`}
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
          {errors.images && <Text style={[styles.errorText, isRTL && styles.textRTL]}>{errors.images}</Text>}
        </View>

        {/* Form Fields */}
        <View style={styles.formCard}>
          {renderInput('title', 'title', t('titlePlaceholder'))}
          {renderInput('price', 'price', t('pricePlaceholder'), {
            keyboardType: 'numeric',
          })}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isRTL && styles.textRTL]}>
              {t('breedLabel')}
              <Text style={{ color: COLORS.error }}>{t('required')}</Text>
            </Text>
            <TouchableOpacity
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
              <Ionicons name="chevron-down" size={18} color={COLORS.textLight} />
            </TouchableOpacity>
            {errors.breed && <Text style={[styles.errorText, isRTL && styles.textRTL]}>{errors.breed}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isRTL && styles.textRTL]}>
              {t('ageLabel')}
              <Text style={{ color: COLORS.error }}>{t('required')}</Text>
            </Text>
            <TouchableOpacity
              style={[styles.selectorButton, errors.age && styles.inputError, isRTL && styles.rowRTL]}
              onPress={() => setAgeModalVisible(true)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.selectorButtonText,
                  !form.age && styles.selectorPlaceholder,
                  isRTL && styles.textRTL,
                ]}
              >
                {form.age || t('selectAge')}
              </Text>
              <Ionicons name="chevron-down" size={18} color={COLORS.textLight} />
            </TouchableOpacity>
            {errors.age && <Text style={[styles.errorText, isRTL && styles.textRTL]}>{errors.age}</Text>}
          </View>

          {/* Gender */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isRTL && styles.textRTL]}>{t('genderLabel')}</Text>
            <View style={[styles.genderRow, isRTL && styles.rowRTL]}>
              {GENDERS.map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[
                    styles.genderChip,
                    form.gender === g && styles.genderChipActive,
                  ]}
                  onPress={() => updateForm('gender', g)}
                >
                  <Ionicons
                    name={g === 'mare' ? 'female' : 'male'}
                    size={16}
                    color={
                      form.gender === g ? COLORS.primary : COLORS.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.genderText,
                      form.gender === g && styles.genderTextActive,
                    ]}
                  >
                    {t(g === 'mare' ? 'genderMare' : g === 'gelding' ? 'genderGelding' : 'genderStallion')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isRTL && styles.textRTL]}>{t('heightLabel')}</Text>
            <TouchableOpacity
              style={[styles.selectorButton, isRTL && styles.rowRTL]}
              onPress={openHeightPicker}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.selectorButtonText,
                  !form.height && styles.selectorPlaceholder,
                  isRTL && styles.textRTL,
                ]}
              >
                {form.height || t('selectHeight')}
              </Text>
              <Ionicons name="chevron-down" size={18} color={COLORS.textLight} />
            </TouchableOpacity>
          </View>
          {renderInput('discipline', 'disciplineLabel', t('disciplinePlaceholder'), {
            required: false,
          })}
          {renderInput(
            'description',
            'descriptionLabel',
            t('descriptionPlaceholder'),
            { multiline: true }
          )}

          {/* Vet Check */}
          <TouchableOpacity
            style={[styles.checkboxRow, isRTL && styles.rowRTL]}
            onPress={() =>
              updateForm('vet_check_available', !form.vet_check_available)
            }
          >
            <View
              style={[
                styles.checkbox,
                form.vet_check_available && styles.checkboxActive,
              ]}
            >
              {form.vet_check_available && (
                <Ionicons name="checkmark" size={14} color={COLORS.white} />
              )}
            </View>
            <Text style={[styles.checkboxText, isRTL && styles.textRTL]}>{t('vetCheckLabel')}</Text>
          </TouchableOpacity>

          {form.vet_check_available && (
            <View style={styles.certificateWrap}>
              <TouchableOpacity style={styles.certificateBtn} onPress={pickVetCertificate}>
                <Ionicons name="document-attach-outline" size={18} color={COLORS.primary} />
                <Text style={styles.certificateBtnText}>
                  {vetCertificate ? t('replaceVetCertificate') : t('uploadVetCertificate')}
                </Text>
              </TouchableOpacity>
              {vetCertificate && (
                <View style={[styles.certificateFileRow, isRTL && styles.rowRTL]}>
                  <Ionicons name="document-text-outline" size={16} color={COLORS.textSecondary} />
                  <Text style={[styles.certificateFileName, isRTL && styles.textRTL]} numberOfLines={1}>
                    {vetCertificate.name || 'certificate.pdf'}
                  </Text>
                  <TouchableOpacity onPress={clearVetCertificate}>
                    <Ionicons name="close-circle" size={18} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              )}
              {errors.vet_certificate_url && (
                <Text style={[styles.errorText, isRTL && styles.textRTL]}>{errors.vet_certificate_url}</Text>
              )}
            </View>
          )}
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Ionicons name="paper-plane-outline" size={20} color={COLORS.white} />
              <Text style={styles.submitBtnText}>{t('submitForReview')}</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Your listing will be reviewed before going live.
        </Text>

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>

      <Modal
        visible={breedModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setBreedModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setBreedModalVisible(false)} />
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
                    updateForm('breed', item);
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

      <Modal
        visible={ageModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAgeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setAgeModalVisible(false)} />
          <View style={styles.modalCardSm}>
            <View style={[styles.modalHeader, isRTL && styles.rowRTL]}>
              <Text style={[styles.modalTitle, isRTL && styles.textRTL]}>{t('selectAge')}</Text>
              <TouchableOpacity onPress={() => setAgeModalVisible(false)}>
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={AGE_OPTIONS}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.numberItem}
                  onPress={() => {
                    updateForm('age', item);
                    setAgeModalVisible(false);
                  }}
                >
                  <Text style={[styles.numberItemText, isRTL && styles.textRTL]}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={heightModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setHeightModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setHeightModalVisible(false)} />
          <View style={styles.modalCardSm}>
            <View style={[styles.modalHeader, isRTL && styles.rowRTL]}>
              <Text style={[styles.modalTitle, isRTL && styles.textRTL]}>{t('selectHeight')}</Text>
              <TouchableOpacity onPress={() => setHeightModalVisible(false)}>
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.heightPickerContainer}>
              <Text style={[styles.heightLabel, isRTL && styles.textRTL]}>
                {t('heightHint')}
              </Text>
              <View style={styles.heightRow}>
                <TouchableOpacity
                  style={styles.heightButton}
                  onPress={() => handleHeightIncrement(-0.5)}
                >
                  <Ionicons name="remove" size={24} color={COLORS.white} />
                </TouchableOpacity>
                <TextInput
                  style={[styles.heightInput, isRTL && styles.textRTL]}
                  value={heightInput}
                  onChangeText={handleHeightChange}
                  placeholder={t('selectHeight')}
                  placeholderTextColor={COLORS.textSecondary}
                  keyboardType="decimal-pad"
                  maxLength={4}
                />
                <TouchableOpacity
                  style={styles.heightButton}
                  onPress={() => handleHeightIncrement(0.5)}
                >
                  <Ionicons name="add" size={24} color={COLORS.white} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.heightRange, isRTL && styles.textRTL]}>
                {HEIGHT_MIN} m - {HEIGHT_MAX} m
              </Text>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={confirmHeight}
              >
                <Text style={[styles.confirmButtonText, isRTL && styles.textRTL]}>
                  {t('confirm')}
                </Text>
              </TouchableOpacity>
            </View>
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
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  headerTitle: {
    ...FONTS.h1,
    color: COLORS.primary,
  },
  headerSubtitle: {
    ...FONTS.bodySmall,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
  },
  section: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  imageRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  imageThumb: {
    width: 100,
    height: 100,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageBtn: {
    width: 100,
    height: 100,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  addImageText: {
    ...FONTS.caption,
    color: COLORS.textLight,
    fontSize: 10,
  },
  formCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.card,
    marginBottom: SPACING.md,
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  label: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs + 2,
  },
  input: {
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    ...FONTS.body,
    color: COLORS.text,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  inputMultiline: {
    minHeight: 100,
    paddingTop: SPACING.sm + 4,
  },
  selectorButton: {
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    borderWidth: 1.5,
    borderColor: 'transparent',
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
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    ...FONTS.bodySmall,
    color: COLORS.error,
    marginTop: SPACING.xs,
  },
  genderRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  genderChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.inputBg,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  genderChipActive: {
    backgroundColor: COLORS.primaryLight + '15',
    borderColor: COLORS.primary,
  },
  genderText: {
    ...FONTS.bodySmall,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  genderTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkboxText: {
    ...FONTS.body,
    color: COLORS.text,
  },
  certificateWrap: {
    marginTop: SPACING.sm,
  },
  certificateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight + '12',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
  },
  certificateBtnText: {
    ...FONTS.bodySmall,
    color: COLORS.primary,
    fontWeight: '700',
  },
  certificateFileRow: {
    marginTop: SPACING.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  certificateFileName: {
    flex: 1,
    ...FONTS.bodySmall,
    color: COLORS.textSecondary,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md + 2,
    borderRadius: RADIUS.md,
    ...SHADOWS.card,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    ...FONTS.button,
    color: COLORS.white,
  },
  disclaimer: {
    ...FONTS.bodySmall,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
  authPrompt: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  authPromptIcon: {
    marginBottom: SPACING.lg,
  },
  authPromptTitle: {
    ...FONTS.h3,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  authPromptSubtitle: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  authPromptBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
  authPromptBtnText: {
    ...FONTS.button,
    color: COLORS.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    maxHeight: '78%',
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.md,
  },
  modalCardSm: {
    maxHeight: '62%',
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
  numberItem: {
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  numberItemText: {
    ...FONTS.body,
    color: COLORS.text,
  },
  emptyBreedText: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
  heightPickerContainer: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
  },
  heightLabel: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  heightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  heightButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heightInput: {
    width: 100,
    height: 56,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    ...FONTS.h2,
    color: COLORS.text,
    textAlign: 'center',
  },
  heightRange: {
    ...FONTS.bodySmall,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    width: '100%',
    alignItems: 'center',
  },
  confirmButtonText: {
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
