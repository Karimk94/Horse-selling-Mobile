import React, { useMemo, useState, useEffect } from 'react';
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
  Image,
  Modal,
  FlatList,
  Pressable,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../config/theme';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import * as apiService from '../services/api';
import { useToast } from '../components/ToastProvider';
import HORSE_BREEDS from '../data/horseBreeds';
import { extractApiErrorMessage } from '../utils/apiErrors';
import { searchLocations } from '../services/locationService';
import BrandMark from '../components/BrandMark';

const GENDERS = [
  { id: 'stallion', labelKey: 'genderStallion', fallback: 'Stallion', icon: 'male' },
  { id: 'mare', labelKey: 'genderMare', fallback: 'Mare', icon: 'female' },
  { id: 'gelding', labelKey: 'genderGelding', fallback: 'Gelding', icon: 'male-outline' },
];

const POPULAR_DISCIPLINES = [
  { id: 'Show Jumping', en: 'Show Jumping', ar: 'قفز حواجز' },
  { id: 'Dressage', en: 'Dressage', ar: 'ترويض' },
  { id: 'Endurance', en: 'Endurance', ar: 'قدرة وتحمل' },
  { id: 'Flat Racing', en: 'Flat Racing', ar: 'سباق سرعة' },
  { id: 'Beauty / Halter', en: 'Beauty / Halter', ar: 'عروض جمال' },
  { id: 'Polo', en: 'Polo', ar: 'بولو' },
  { id: 'Leisure', en: 'Leisure', ar: 'ركوب ترفيهي' },
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

const AGE_OPTIONS = Array.from({ length: 31 }, (_, i) => i.toString());
const HEIGHT_MIN = 10.0;
const HEIGHT_MAX = 20.0;

const WIZARD_STEPS = [
  { id: 1, labelKey: 'sellerStepMedia', icon: 'camera-outline' },
  { id: 2, labelKey: 'sellerStepIdentity', icon: 'ribbon-outline' },
  { id: 3, labelKey: 'sellerStepHealth', icon: 'shield-checkmark-outline' },
  { id: 4, labelKey: 'sellerStepPricing', icon: 'pricetag-outline' },
];

export default function CreateListingScreen({
  navigation,
  initialStep = 1,
  initialForm = null,
  initialImages = null,
}) {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const { t, isRTL, language } = useLanguage();
  const isArabic = language === 'ar';
  const toast = useToast();

  const [currentStep, setCurrentStep] = useState(initialStep);
  const [form, setForm] = useState(
    initialForm || {
      title: '',
      price: '',
      breed: '',
      age: '',
      gender: 'stallion',
      discipline: '',
      height: '',
      description: '',
      vet_check_available: false,
    }
  );
  const [images, setImages] = useState(initialImages || []);
  const [vetCertificate, setVetCertificate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [breedModalVisible, setBreedModalVisible] = useState(false);
  const [breedSearchQuery, setBreedSearchQuery] = useState('');
  const [ageModalVisible, setAgeModalVisible] = useState(false);

  const handleListingConciergeInquiry = () => {
    const query = isArabic
      ? 'مرحباً، أود المساعدة في تصوير وتوثيق وفحص خيلي لعرضها في سوق SteedMarket النخبة.'
      : 'Hello, I would like concierge assistance with horse photography, vetting passport verification, and listing on SteedMarket.';
    const url = `https://wa.me/971500000000?text=${encodeURIComponent(query)}`;
    Linking.openURL(url).catch(() => {});
  };

  const handlePhotographerConcierge = () => {
    const text = isArabic
      ? 'مرحباً ستيد ماركت، أود حجز مصور فوتوغرافي معتمد لتصوير زوايا القوام وفيديو حركة الخيل لعرضها في المنصة.'
      : 'Hello SteedMarket, I would like to book a certified equine photographer for conformation photos and movement video.';
    const waUrl = `https://wa.me/971500000000?text=${encodeURIComponent(text)}`;
    try {
      const res = Linking.openURL(waUrl);
      if (res && typeof res.catch === 'function') {
        res.catch(() => {});
      }
    } catch (e) {}
  };

  const handleVetProtocolConcierge = () => {
    const text = isArabic
      ? 'مرحباً ستيد ماركت، أود الاستفسار عن متطلبات الفحص البيطري المعتمد (PPE) وشهادة الجواز والشريحة الإلكترونية لإرفاقها بإعلان الخيل.'
      : 'Hello SteedMarket, I would like guidance on official pre-purchase vet exam (PPE) requirements, passport certification, and microchip verification for my listing.';
    const waUrl = `https://wa.me/971500000000?text=${encodeURIComponent(text)}`;
    try {
      const res = Linking.openURL(waUrl);
      if (res && typeof res.catch === 'function') {
        res.catch(() => {});
      }
    } catch (e) {}
  };
  const [heightModalVisible, setHeightModalVisible] = useState(false);
  const [heightInput, setHeightInput] = useState('');

  // Location
  const [locationText, setLocationText] = useState('');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [locationResults, setLocationResults] = useState([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);

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
      setErrors((prev) => ({
        ...prev,
        height: `${t('heightLabel')} ${t('mustBeBetween')} ${HEIGHT_MIN} ${t('and')} ${HEIGHT_MAX}`,
      }));
    }
  };

  const handleLocationSearch = async (text) => {
    setLocationText(text);
    setLatitude(null);
    setLongitude(null);
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

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      toast.show(t('permissionNeededMsg'), { type: 'error' });
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
      if (newUris.length > 0) {
        setImages((prev) => [...prev, ...newUris]);
        setErrors((prev) => {
          if (!prev.images) return prev;
          const next = { ...prev };
          delete next.images;
          return next;
        });
      }
    }
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setErrors((prev) => {
      if (!prev.images) return prev;
      const next = { ...prev };
      delete next.images;
      return next;
    });
  };

  useEffect(() => {
    if (images.length > 0 && errors.images) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.images;
        return next;
      });
    }
  }, [images, errors.images]);

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
      toast.show(t('certificatePickFailed'), { type: 'error' });
    }
  };

  const clearVetCertificate = () => {
    setVetCertificate(null);
  };

  // Listing Strength Calculation
  const listingStrength = useMemo(() => {
    let score = 0;
    if (images.length >= 1) score += 20;
    if (images.length >= 4) score += 15;
    if (form.title.trim() && form.breed.trim() && form.age.trim()) score += 25;
    if (form.height && form.discipline.trim()) score += 10;
    if (form.vet_check_available && vetCertificate) score += 15;
    if (form.description.trim().length >= 50) score += 15;
    return Math.min(score, 100);
  }, [images, form, vetCertificate]);

  const strengthBadge = useMemo(() => {
    if (listingStrength >= 80) {
      return {
        label: t('strengthElite'),
        color: COLORS.success,
        bg: COLORS.successLight,
      };
    }
    if (listingStrength >= 50) {
      return {
        label: t('strengthStrong'),
        color: COLORS.accentDark,
        bg: COLORS.goldBadge,
      };
    }
    return {
      label: t('strengthBasic'),
      color: COLORS.textSecondary,
      bg: COLORS.borderLight,
    };
  }, [listingStrength, t]);

  const validateStep = (step) => {
    const errs = {};
    if (step === 1) {
      if (images.length === 0) errs.images = t('imagesRequired');
    } else if (step === 2) {
      if (!form.title.trim()) errs.title = t('titleRequired');
      if (!form.breed.trim()) errs.breed = t('breedRequired');
      const age = Number(form.age);
      if (!form.age.trim()) errs.age = t('ageRequired');
      else if (!Number.isFinite(age) || age < 0 || !Number.isInteger(age)) {
        errs.age = t('adminInvalidAge');
      }
      if (form.height.trim()) {
        const height = Number(form.height);
        if (!Number.isFinite(height) || height <= 0) {
          errs.height = t('adminInvalidHeight');
        }
      }
    } else if (step === 3) {
      if (!form.description.trim() || form.description.trim().length < 30) {
        errs.description = t('descriptionMinLength');
      }
      if (form.vet_check_available && !vetCertificate) {
        errs.vet_certificate_url = t('vetCertificateRequired');
      }
    } else if (step === 4) {
      const price = Number(form.price);
      if (!form.price.trim()) errs.price = t('priceRequired');
      else if (!Number.isFinite(price) || price <= 0) {
        errs.price = t('adminInvalidPrice');
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNextStep = () => {
    if (!validateStep(currentStep)) return;
    setErrors({});
    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };

  const handlePrevStep = () => {
    setErrors({});
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const validateAll = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = t('titleRequired');

    const price = Number(form.price);
    if (!form.price.trim()) errs.price = t('priceRequired');
    else if (!Number.isFinite(price) || price <= 0) errs.price = t('adminInvalidPrice');

    if (!form.breed.trim()) errs.breed = t('breedRequired');

    const age = Number(form.age);
    if (!form.age.trim()) errs.age = t('ageRequired');
    else if (!Number.isFinite(age) || age < 0 || !Number.isInteger(age)) errs.age = t('adminInvalidAge');

    if (form.height.trim()) {
      const height = Number(form.height);
      if (!Number.isFinite(height) || height <= 0) errs.height = t('adminInvalidHeight');
    }

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
    if (!validateAll()) {
      if (images.length === 0) setCurrentStep(1);
      else if (!form.title.trim() || !form.breed.trim() || !form.age.trim()) setCurrentStep(2);
      else if (!form.description.trim() || form.description.trim().length < 30 || (form.vet_check_available && !vetCertificate)) {
        setCurrentStep(3);
      } else {
        setCurrentStep(4);
      }
      return;
    }

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
        location_text: locationText.trim() || null,
        latitude: latitude,
        longitude: longitude,
        image_urls: imageUrls,
      };

      await apiService.createHorse(data);
      toast.show(t('listingSubmitted'), { type: 'success' });
      navigation.goBack();
    } catch (err) {
      toast.show(extractApiErrorMessage(err, 'Failed to create listing. Please try again.'), {
        type: 'error',
      });
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

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Top Header */}
      <View style={styles.header}>
        <View style={[styles.headerRow, isRTL && styles.rowRTL]}>
          <TouchableOpacity
            style={styles.backBtn}
            testID="create-listing-back-btn"
            onPress={() => (currentStep > 1 ? handlePrevStep() : navigation.goBack())}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={22} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.brandMarkPill}>
            <BrandMark size={24} color={COLORS.accent} />
          </View>
          <View style={styles.headerTextWrap}>
            <View testID="create-listing-vip-badge" style={[styles.headerTagRow, isRTL && styles.rowRTL]}>
              <View style={styles.livePulseDot} />
              <Ionicons name="ribbon" size={11} color="#D4AF37" />
              <Text style={styles.headerTagText}>
                {isArabic ? 'توثيق وعرض الخيول النخبة' : 'VIP HORSE PASSPORT'}
              </Text>
            </View>
            <Text style={[styles.headerTitle, isRTL && styles.textRTL]}>{t('createListing')}</Text>
            <Text style={[styles.headerSubtitle, isRTL && styles.textRTL]}>
              {t(WIZARD_STEPS.find((s) => s.id === currentStep)?.labelKey || 'listYourHorse')}
            </Text>
          </View>
          <View style={[styles.headerActionsWrap, isRTL && styles.rowRTL]}>
            <TouchableOpacity
              testID="create-listing-header-concierge-btn"
              style={styles.headerConciergeBtn}
              onPress={handleListingConciergeInquiry}
              accessibilityRole="button"
              accessibilityLabel="WhatsApp Concierge"
            >
              <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
            </TouchableOpacity>
            <View style={[styles.stepCounterBadge, isRTL && styles.stepCounterBadgeRTL]} testID="step-counter-badge">
              <Text style={styles.stepCounterText}>{currentStep} / 4</Text>
            </View>
          </View>
        </View>

        {/* 4-Step Progress Bar Indicator */}
        <View style={[styles.wizardStepsBar, isRTL && styles.rowRTL]}>
          {WIZARD_STEPS.map((step) => {
            const isCompleted = step.id < currentStep;
            const isCurrent = step.id === currentStep;
            return (
              <TouchableOpacity
                key={step.id}
                testID={`wizard-step-${step.id}`}
                activeOpacity={0.8}
                onPress={() => {
                  if (step.id < currentStep || validateStep(currentStep)) {
                    setCurrentStep(step.id);
                  }
                }}
                style={[
                  styles.wizardStepTab,
                  isCurrent && styles.wizardStepTabCurrent,
                  isCompleted && styles.wizardStepTabCompleted,
                ]}
              >
                <View
                  style={[
                    styles.stepCircle,
                    isCurrent && styles.stepCircleCurrent,
                    isCompleted && styles.stepCircleCompleted,
                  ]}
                >
                  {isCompleted ? (
                    <Ionicons name="checkmark" size={14} color={COLORS.white} />
                  ) : (
                    <Text
                      style={[
                        styles.stepCircleNum,
                        isCurrent && styles.stepCircleNumCurrent,
                      ]}
                    >
                      {step.id}
                    </Text>
                  )}
                </View>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.wizardStepLabel,
                    isCurrent && styles.wizardStepLabelCurrent,
                    isCompleted && styles.wizardStepLabelCompleted,
                  ]}
                >
                  {t(step.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 20) + 90 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* STEP 1: Media & Angles */}
        {currentStep === 1 && (
          <View style={styles.stepContainer} testID="step-1-container">
            {/* Conformation Shooting Guide Pill */}
            <View style={styles.guideCard}>
              <View style={[styles.guideHeader, isRTL && styles.rowRTL]}>
                <Ionicons name="sparkles" size={18} color={COLORS.accentDark} />
                <Text style={[styles.guideTitle, isRTL && styles.textRTL]}>
                  {t('conformationGuide')}
                </Text>
              </View>
              <Text style={[styles.guideSubtitle, isRTL && styles.textRTL]}>
                {t('conformationGuideTip')}
              </Text>
              <View style={[styles.guidePillsRow, isRTL && styles.rowRTL]}>
                <View style={styles.guideAnglePill}>
                  <Text style={styles.guideAnglePillText}>{isArabic ? '1. وضع جانبي كامل' : '1. Profile View'}</Text>
                </View>
                <View style={styles.guideAnglePill}>
                  <Text style={styles.guideAnglePillText}>{isArabic ? '2. القوائم والحوافر' : '2. Legs & Hooves'}</Text>
                </View>
                <View style={styles.guideAnglePill}>
                  <Text style={styles.guideAnglePillText}>{isArabic ? '3. الرأس والحركة' : '3. Head & Gait'}</Text>
                </View>
              </View>
            </View>

            {/* 1-Tap Professional Equine Conformation Photography Concierge */}
            <TouchableOpacity
              testID="seller-media-concierge-btn"
              style={[styles.mediaConciergeBtn, isRTL && styles.rowRTL]}
              onPress={handlePhotographerConcierge}
              activeOpacity={0.85}
            >
              <Ionicons name="camera-reverse-outline" size={18} color="#15803D" />
              <Text style={[styles.mediaConciergeBtnText, isRTL && styles.textRTL]}>
                {isArabic
                  ? 'حجز مصور فوتوغرافي معتمد لتصوير قوام وحركة الخيل عبر واتساب'
                  : 'Book Certified Equine Conformation Photographer via WhatsApp'}
              </Text>
              <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
            </TouchableOpacity>

            {/* Media Uploader Grid */}
            <View style={styles.formCard}>
              <View style={[styles.sectionTitleRow, isRTL && styles.rowRTL]}>
                <Text style={[styles.cardTitle, isRTL && styles.textRTL]}>{t('photos')}</Text>
                <Text style={styles.imageCounterText}>{images.length}/10</Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[styles.imageRow, isRTL && styles.rowRTL]}
              >
                {images.map((uri, index) => (
                  <View key={index} style={styles.imageThumb}>
                    <Image source={{ uri }} style={styles.thumbImage} />
                    {index === 0 && (
                      <View style={styles.mainBadge}>
                        <Text style={styles.mainBadgeText}>{isArabic ? 'الرئيسية' : 'Cover'}</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      testID={`photo-remove-btn-${index}`}
                      style={styles.removeImageBtn}
                      onPress={() => removeImage(index)}
                    >
                      <Ionicons name="close" size={16} color={COLORS.white} />
                    </TouchableOpacity>
                  </View>
                ))}
                {images.length < 10 && (
                  <TouchableOpacity
                    testID="photo-add-btn"
                    style={styles.addImageBtn}
                    onPress={pickImage}
                  >
                    <Ionicons name="camera-outline" size={30} color={COLORS.primary} />
                    <Text style={styles.addImageText}>{t('addPhotos')}</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
              {errors.images && (
                <Text style={[styles.errorText, isRTL && styles.textRTL]}>{errors.images}</Text>
              )}
            </View>
          </View>
        )}

        {/* STEP 2: Identity, Breed & Pedigree */}
        {currentStep === 2 && (
          <View style={styles.stepContainer} testID="step-2-container">
            <View style={styles.formCard}>
              {/* Title Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, isRTL && styles.textRTL]}>
                  {t('title')}
                  <Text style={{ color: COLORS.error }}>{t('required')}</Text>
                </Text>
                <TextInput
                  testID="horse-title-input"
                  style={[
                    styles.input,
                    errors.title && styles.inputError,
                    isRTL && styles.inputRTL,
                  ]}
                  placeholder={t('titlePlaceholder')}
                  placeholderTextColor={COLORS.textLight}
                  value={form.title}
                  onChangeText={(v) => updateForm('title', v)}
                  textAlign={isRTL ? 'right' : 'left'}
                />
                {errors.title && (
                  <Text style={[styles.errorText, isRTL && styles.textRTL]}>{errors.title}</Text>
                )}
              </View>

              {/* Breed Selector */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, isRTL && styles.textRTL]}>
                  {t('breedLabel')}
                  <Text style={{ color: COLORS.error }}>{t('required')}</Text>
                </Text>
                <TouchableOpacity
                  testID="horse-breed-picker"
                  style={[
                    styles.selectorButton,
                    errors.breed && styles.inputError,
                    isRTL && styles.rowRTL,
                  ]}
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
                {errors.breed && (
                  <Text style={[styles.errorText, isRTL && styles.textRTL]}>{errors.breed}</Text>
                )}
              </View>

              {/* Age Selector */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, isRTL && styles.textRTL]}>
                  {t('ageLabel')}
                  <Text style={{ color: COLORS.error }}>{t('required')}</Text>
                </Text>
                <TouchableOpacity
                  testID="horse-age-picker"
                  style={[
                    styles.selectorButton,
                    errors.age && styles.inputError,
                    isRTL && styles.rowRTL,
                  ]}
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
                {errors.age && (
                  <Text style={[styles.errorText, isRTL && styles.textRTL]}>{errors.age}</Text>
                )}
              </View>

              {/* Gender Chips */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, isRTL && styles.textRTL]}>{t('genderLabel')}</Text>
                <View style={[styles.genderRow, isRTL && styles.rowRTL]}>
                  {GENDERS.map((g) => (
                    <TouchableOpacity
                      key={g.id}
                      testID={`gender-${g.id}`}
                      style={[
                        styles.genderChip,
                        form.gender === g.id && styles.genderChipActive,
                      ]}
                      onPress={() => updateForm('gender', g.id)}
                    >
                      <Ionicons
                        name={g.icon}
                        size={16}
                        color={form.gender === g.id ? COLORS.primary : COLORS.textSecondary}
                      />
                      <Text
                        style={[
                          styles.genderText,
                          form.gender === g.id && styles.genderTextActive,
                        ]}
                      >
                        {t(g.labelKey) || g.fallback}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Height Selector */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, isRTL && styles.textRTL]}>{t('heightLabel')}</Text>
                <TouchableOpacity
                  testID="horse-height-picker"
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
                    {form.height ? `${form.height} m` : t('selectHeight')}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={COLORS.textLight} />
                </TouchableOpacity>
                {errors.height && (
                  <Text style={[styles.errorText, isRTL && styles.textRTL]}>{errors.height}</Text>
                )}
              </View>

              {/* Discipline with Quick Shortcut Chips */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, isRTL && styles.textRTL]}>
                  {t('disciplineLabel')}
                </Text>
                <View style={[styles.disciplineChipsWrap, isRTL && styles.rowRTL]}>
                  {POPULAR_DISCIPLINES.map((d) => {
                    const isSelected = form.discipline === d.id || form.discipline === (isArabic ? d.ar : d.en);
                    return (
                      <TouchableOpacity
                        key={d.id}
                        testID={`discipline-chip-${d.id}`}
                        style={[
                          styles.disciplineChip,
                          isSelected && styles.disciplineChipActive,
                        ]}
                        onPress={() => updateForm('discipline', isSelected ? '' : (isArabic ? d.ar : d.en))}
                      >
                        <Text
                          style={[
                            styles.disciplineChipText,
                            isSelected && styles.disciplineChipTextActive,
                          ]}
                        >
                          {isArabic ? d.ar : d.en}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TextInput
                  testID="horse-discipline-input"
                  style={[styles.input, { marginTop: SPACING.xs }, isRTL && styles.inputRTL]}
                  placeholder={t('disciplinePlaceholder')}
                  placeholderTextColor={COLORS.textLight}
                  value={form.discipline}
                  onChangeText={(v) => updateForm('discipline', v)}
                  textAlign={isRTL ? 'right' : 'left'}
                />
              </View>
            </View>
          </View>
        )}

        {/* STEP 3: Health, Passport & Vetting */}
        {currentStep === 3 && (
          <View style={styles.stepContainer} testID="step-3-container">
            {/* Equine Health & Trust Shield Card with 1-Tap Vet Consultation */}
            <TouchableOpacity
              testID="seller-health-vet-protocol-banner"
              style={styles.trustBannerCard}
              onPress={handleVetProtocolConcierge}
              activeOpacity={0.88}
            >
              <View style={[styles.trustBannerHeader, isRTL && styles.rowRTL]}>
                <Ionicons name="shield-checkmark" size={20} color={COLORS.accentDark} />
                <Text style={[styles.trustBannerTitle, isRTL && styles.textRTL]}>
                  {isArabic ? 'درع الثقة البيطرية من SteedMarket' : 'SteedMarket Equine Trust Shield'}
                </Text>
                <Ionicons name="logo-whatsapp" size={16} color="#25D366" style={{ marginLeft: isRTL ? undefined : 'auto', marginRight: isRTL ? 'auto' : undefined }} />
              </View>
              <Text style={[styles.trustBannerDesc, isRTL && styles.textRTL]}>
                {isArabic
                  ? 'الخيول المرفقة بشهادات فحص بيطري معتمدة وجوازات سفر رسمية تحظى بأولوية الظهور في نتائج البحث وثقة المشترين في الخليج.'
                  : 'Horses with official veterinary inspection certificates and verified passports receive premier discovery status and highest buyer trust across the GCC.'}
              </Text>
            </TouchableOpacity>

            <View style={styles.formCard}>
              <View style={[styles.sectionTitleRow, isRTL && styles.rowRTL]}>
                <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.primary} />
                <Text style={[styles.cardTitle, isRTL && styles.textRTL]}>
                  {t('sellerStepHealth')}
                </Text>
              </View>

              {/* Vet Check Available Toggle */}
              <TouchableOpacity
                testID="vet-check-toggle"
                style={[styles.checkboxRow, isRTL && styles.rowRTL]}
                onPress={() => updateForm('vet_check_available', !form.vet_check_available)}
                activeOpacity={0.8}
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
                <View style={styles.checkboxTextWrap}>
                  <Text style={[styles.checkboxText, isRTL && styles.textRTL]}>
                    {t('vetCheckLabel')}
                  </Text>
                  <Text style={[styles.checkboxSubtext, isRTL && styles.textRTL]}>
                    {isArabic
                      ? 'إرفاق شهادة الفحص البيطري الرسمية يزيد من ثقة المشترين بنسبة 95%'
                      : 'Attaching an official vet check PDF increases buyer confidence by 95%'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Certificate Uploader */}
              {form.vet_check_available && (
                <View style={styles.certificateWrap}>
                  <TouchableOpacity
                    testID="upload-vet-cert-btn"
                    style={styles.certificateBtn}
                    onPress={pickVetCertificate}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="document-attach-outline" size={20} color={COLORS.primary} />
                    <Text style={styles.certificateBtnText}>
                      {vetCertificate ? t('replaceVetCertificate') : t('uploadVetCertificate')}
                    </Text>
                  </TouchableOpacity>
                  {vetCertificate && (
                    <View style={[styles.certificateFileRow, isRTL && styles.rowRTL]}>
                      <Ionicons name="document-text-outline" size={18} color={COLORS.primary} />
                      <Text
                        style={[styles.certificateFileName, isRTL && styles.textRTL]}
                        numberOfLines={1}
                      >
                        {vetCertificate.name || 'vet-certificate.pdf'}
                      </Text>
                      <TouchableOpacity
                        testID="clear-vet-cert-btn"
                        onPress={clearVetCertificate}
                      >
                        <Ionicons name="close-circle" size={20} color={COLORS.error} />
                      </TouchableOpacity>
                    </View>
                  )}
                  {errors.vet_certificate_url && (
                    <Text style={[styles.errorText, isRTL && styles.textRTL]}>
                      {errors.vet_certificate_url}
                    </Text>
                  )}
                </View>
              )}

              {/* Detailed Description */}
              <View style={styles.descriptionHeaderRow}>
                <Text style={[styles.label, isRTL && styles.textRTL]}>
                  {t('descriptionLabel')}
                  <Text style={{ color: COLORS.error }}>{t('required')}</Text>
                </Text>
                <Text
                  testID="horse-desc-counter"
                  style={[
                    styles.charCounter,
                    form.description.trim().length >= 30 && styles.charCounterSuccess,
                  ]}
                >
                  {form.description.trim().length} / 30 min
                </Text>
              </View>

              <TextInput
                testID="horse-desc-input"
                style={[
                  styles.input,
                  styles.inputMultiline,
                  errors.description && styles.inputError,
                  isRTL && styles.inputRTL,
                ]}
                placeholder={t('descriptionPlaceholder')}
                placeholderTextColor={COLORS.textLight}
                value={form.description}
                onChangeText={(v) => updateForm('description', v)}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                textAlign={isRTL ? 'right' : 'left'}
              />
              {errors.description && (
                <Text style={[styles.errorText, isRTL && styles.textRTL]}>
                  {errors.description}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* STEP 4: Pricing, Location & Strength Meter */}
        {currentStep === 4 && (
          <View style={styles.stepContainer} testID="step-4-container">
            {/* Live Listing Strength Meter */}
            <View style={styles.strengthCard}>
              <View style={[styles.strengthHeader, isRTL && styles.rowRTL]}>
                <View style={[styles.strengthTitleRow, isRTL && styles.rowRTL]}>
                  <Ionicons name="shield-checkmark" size={18} color={COLORS.accentDark} />
                  <Text style={[styles.strengthTitle, isRTL && styles.textRTL]}>
                    {t('listingStrength')}
                  </Text>
                </View>
                <View style={[styles.strengthBadge, { backgroundColor: strengthBadge.bg }]}>
                  <Text style={[styles.strengthBadgeText, { color: strengthBadge.color }]}>
                    {strengthBadge.label} ({listingStrength}%)
                  </Text>
                </View>
              </View>

              <View style={styles.strengthTrack}>
                <View
                  style={[
                    styles.strengthFill,
                    {
                      width: `${listingStrength}%`,
                      backgroundColor:
                        listingStrength >= 80
                          ? COLORS.success
                          : listingStrength >= 50
                          ? COLORS.accentDark
                          : COLORS.primaryLight,
                    },
                  ]}
                />
              </View>

              <View style={styles.checklistWrap}>
                <View style={[styles.checklistItem, isRTL && styles.rowRTL]}>
                  <Ionicons
                    name={images.length >= 1 ? 'checkmark-circle' : 'ellipse-outline'}
                    size={16}
                    color={images.length >= 1 ? COLORS.success : COLORS.textLight}
                  />
                  <Text style={[styles.checklistText, isRTL && styles.textRTL]}>
                    {isArabic ? 'صور واضحة للقوام (تم إضافة ' + images.length + ')' : `Conformation Media (${images.length} added)`}
                  </Text>
                </View>

                <View style={[styles.checklistItem, isRTL && styles.rowRTL]}>
                  <Ionicons
                    name={
                      form.title && form.breed && form.age ? 'checkmark-circle' : 'ellipse-outline'
                    }
                    size={16}
                    color={
                      form.title && form.breed && form.age ? COLORS.success : COLORS.textLight
                    }
                  />
                  <Text style={[styles.checklistText, isRTL && styles.textRTL]}>
                    {isArabic ? 'بيانات السلالة والعمر والتخصص' : 'Breed, Age & Discipline details'}
                  </Text>
                </View>

                <View style={[styles.checklistItem, isRTL && styles.rowRTL]}>
                  <Ionicons
                    name={
                      form.vet_check_available && vetCertificate
                        ? 'checkmark-circle'
                        : 'ellipse-outline'
                    }
                    size={16}
                    color={
                      form.vet_check_available && vetCertificate
                        ? COLORS.success
                        : COLORS.textLight
                    }
                  />
                  <Text style={[styles.checklistText, isRTL && styles.textRTL]}>
                    {isArabic ? 'شهادة الفحص البيطري الرسمية' : 'Official Veterinary Certificate PDF'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Pricing Card */}
            <View style={styles.formCard}>
              <View style={styles.inputGroup}>
                <View style={[styles.priceHeaderRow, isRTL && styles.rowRTL]}>
                  <Text style={[styles.label, isRTL && styles.textRTL]}>
                    {t('priceAedLabel')}
                    <Text style={{ color: COLORS.error }}>{t('required')}</Text>
                  </Text>
                  {Boolean(form.price && Number(form.price) > 0) && (
                    <View style={styles.pricePreviewBadge} testID="price-preview-badge">
                      <Ionicons name="pricetag" size={12} color={COLORS.accentDark} />
                      <Text style={styles.pricePreviewBadgeText}>
                        {Number(form.price).toLocaleString()} AED
                      </Text>
                    </View>
                  )}
                </View>
                <TextInput
                  testID="horse-price-input"
                  style={[
                    styles.input,
                    styles.priceInput,
                    errors.price && styles.inputError,
                    isRTL && styles.inputRTL,
                  ]}
                  placeholder={t('pricePlaceholder')}
                  placeholderTextColor={COLORS.textLight}
                  value={form.price}
                  onChangeText={(v) => updateForm('price', v)}
                  keyboardType="numeric"
                  textAlign={isRTL ? 'right' : 'left'}
                />
                {errors.price && (
                  <Text style={[styles.errorText, isRTL && styles.textRTL]}>{errors.price}</Text>
                )}
              </View>

              {/* UAE Emirates Quick Location Bar */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, isRTL && styles.textRTL]}>
                  {isArabic ? 'إمارة الإسطبل / الموقع السريع' : 'Emirate Stabling / Quick Region'}
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={[styles.emiratesScrollRow, isRTL && styles.rowRTL]}
                >
                  {UAE_EMIRATES.map((e) => {
                    const isSelected = locationText.toLowerCase().includes(e.id.toLowerCase());
                    return (
                      <TouchableOpacity
                        key={e.id}
                        testID={`emirate-chip-${e.id}`}
                        style={[
                          styles.emirateChip,
                          isSelected && styles.emirateChipActive,
                        ]}
                        onPress={() => {
                          const chosenLoc = isArabic ? `${e.ar}، الإمارات` : `${e.en}, UAE`;
                          setLocationText(chosenLoc);
                          setLocationResults([]);
                        }}
                      >
                        <Ionicons
                          name="location"
                          size={13}
                          color={isSelected ? COLORS.white : COLORS.accentDark}
                        />
                        <Text
                          style={[
                            styles.emirateChipText,
                            isSelected && styles.emirateChipTextActive,
                          ]}
                        >
                          {isArabic ? e.ar : e.en}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Location Autocomplete */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, isRTL && styles.textRTL]}>
                  {t('locationLabel')}
                </Text>
                <View style={styles.locationInputWrapper}>
                  <Ionicons
                    name="location-outline"
                    size={20}
                    color={COLORS.textLight}
                    style={styles.locIcon}
                  />
                  <TextInput
                    testID="horse-location-input"
                    style={[
                      styles.input,
                      { flex: 1, borderColor: 'transparent' },
                      isRTL && styles.inputRTL,
                    ]}
                    placeholder={t('searchLocationPlaceholder')}
                    placeholderTextColor={COLORS.textLight}
                    value={locationText}
                    onChangeText={handleLocationSearch}
                    textAlign={isRTL ? 'right' : 'left'}
                  />
                  {isSearchingLocation && (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  )}
                </View>
                {locationResults.length > 0 && (
                  <View style={styles.autocompleteDropdown}>
                    {locationResults.map((loc, i) => (
                      <TouchableOpacity
                        key={i}
                        testID={`location-suggestion-${i}`}
                        style={styles.autocompleteRow}
                        onPress={() => handleSelectLocation(loc)}
                      >
                        <Ionicons name="pin-outline" size={16} color={COLORS.primary} />
                        <Text
                          style={[styles.autocompleteText, isRTL && styles.textRTL]}
                          numberOfLines={1}
                        >
                          {loc.display_name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>

            {/* SteedMarket Verified Horse Escrow & Buyer Protection Shield */}
            <View style={styles.escrowShieldCard} testID="seller-horse-escrow-shield">
              <View style={[styles.escrowShieldHeader, isRTL && styles.rowRTL]}>
                <View style={styles.escrowShieldIconWrap}>
                  <Ionicons name="shield-checkmark" size={20} color={COLORS.accent} />
                </View>
                <View style={styles.escrowShieldTitleCol}>
                  <Text style={[styles.escrowShieldTitle, isRTL && styles.textRTL]}>
                    {isArabic ? 'حماية وضمان مبيعات الخيول المعتمدة' : 'Verified Horse Seller & Escrow Shield'}
                  </Text>
                  <Text style={[styles.escrowShieldSub, isRTL && styles.textRTL]}>
                    {isArabic
                      ? 'توثيق رسمي وحماية كاملة للبائع والمشتري مع تسوية آمنة لدفعة الحجز.'
                      : 'Official pedigree vetting, buyer escrow protection, and binding deposit protocol.'}
                  </Text>
                </View>
              </View>

              <View style={styles.escrowPillarsList}>
                <View style={[styles.escrowPillarRow, isRTL && styles.rowRTL]}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={[styles.escrowPillarText, isRTL && styles.textRTL]}>
                    {isArabic ? 'بدون أي عمولة على البيع للملاك والمرابط الخاصة' : '0% commission for private owners & breeding studs'}
                  </Text>
                </View>
                <View style={[styles.escrowPillarRow, isRTL && styles.rowRTL]}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={[styles.escrowPillarText, isRTL && styles.textRTL]}>
                    {isArabic ? 'عروض شراء رسمية ومفاوضات موثقة عبر بوابة العروض' : 'Binding offers & vetted buyer leads through Offers cockpit'}
                  </Text>
                </View>
                <View style={[styles.escrowPillarRow, isRTL && styles.rowRTL]}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={[styles.escrowPillarText, isRTL && styles.textRTL]}>
                    {isArabic ? 'تنسيق الفحص البيطري والنقل المعتمد داخل وخارج الدولة' : 'Coordinated veterinary inspection & GCC equine courier transport'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                testID="create-horse-concierge-btn"
                style={[styles.conciergeConsultBtn, isRTL && styles.rowRTL]}
                onPress={handleListingConciergeInquiry}
                activeOpacity={0.85}
              >
                <Ionicons name="logo-whatsapp" size={17} color="#25D366" />
                <Text style={styles.conciergeConsultBtnText}>
                  {isArabic ? 'مستشار توثيق ونشر الخيول عبر واتساب' : 'VIP Stud & Listing Concierge on WhatsApp'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Final Listing Review Summary Card */}
            <View style={styles.reviewCard}>
              <Text style={[styles.reviewHeaderTitle, isRTL && styles.textRTL]}>
                {t('summaryReview')}
              </Text>
              <View style={[styles.reviewRow, isRTL && styles.rowRTL]}>
                {images[0] ? (
                  <Image source={{ uri: images[0] }} style={styles.reviewThumb} />
                ) : (
                  <View style={[styles.reviewThumb, styles.reviewThumbPlaceholder]}>
                    <Ionicons name="image-outline" size={24} color={COLORS.textLight} />
                  </View>
                )}
                <View style={styles.reviewDetails}>
                  <Text style={[styles.reviewTitle, isRTL && styles.textRTL]} numberOfLines={1}>
                    {form.title || (isArabic ? 'عنوان الإعلان' : 'Listing Title')}
                  </Text>
                  <Text style={[styles.reviewPrice, isRTL && styles.textRTL]}>
                    {form.price ? `${Number(form.price).toLocaleString()} AED` : 'POA'}
                  </Text>
                  <Text style={[styles.reviewSub, isRTL && styles.textRTL]}>
                    {form.breed || 'Breed'} • {form.age ? `${form.age} yrs` : 'Age'} •{' '}
                    {t(
                      form.gender === 'mare'
                        ? 'genderMare'
                        : form.gender === 'gelding'
                        ? 'genderGelding'
                        : 'genderStallion'
                    )}
                  </Text>
                  {Boolean(locationText) && (
                    <Text style={[styles.reviewLoc, isRTL && styles.textRTL]} numberOfLines={1}>
                      📍 {locationText}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky Bottom Navigation Bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, SPACING.sm) }, isRTL && styles.rowRTL]}>
        {currentStep > 1 ? (
          <TouchableOpacity
            testID="create-listing-step-back"
            style={styles.bottomBackBtn}
            onPress={handlePrevStep}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isRTL ? 'chevron-forward' : 'chevron-back'}
              size={18}
              color={COLORS.primary}
            />
            <Text style={styles.bottomBackBtnText}>{t('stepBack')}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            testID="create-listing-step-back"
            style={styles.bottomBackBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={styles.bottomBackBtnText}>{t('cancel')}</Text>
          </TouchableOpacity>
        )}

        {currentStep < 4 ? (
          <TouchableOpacity
            testID="create-listing-step-next"
            style={styles.bottomNextBtn}
            onPress={handleNextStep}
            activeOpacity={0.85}
          >
            <Text style={styles.bottomNextBtnText}>{t('stepNext')}</Text>
            <Ionicons
              name={isRTL ? 'chevron-back' : 'chevron-forward'}
              size={18}
              color={COLORS.white}
            />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            testID="create-listing-submit-btn"
            style={[styles.bottomSubmitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="paper-plane-outline" size={18} color={COLORS.white} />
                <Text style={styles.bottomSubmitBtnText}>{t('submitForReview')}</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Breed Search Modal */}
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
                <Text style={[styles.emptyBreedText, isRTL && styles.textRTL]}>
                  {t('noBreedFound')}
                </Text>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Age Modal */}
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
                  testID={`age-item-${item}`}
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

      {/* Height Stepper Modal */}
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
              <Text style={[styles.heightLabel, isRTL && styles.textRTL]}>{t('heightHint')}</Text>
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
              <TouchableOpacity style={styles.confirmButton} onPress={confirmHeight}>
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
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    marginRight: SPACING.sm,
    padding: 6,
  },
  brandMarkContainer: {
    marginRight: SPACING.sm,
  },
  brandMarkPill: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderWidth: 1.5,
    borderColor: 'rgba(197, 160, 89, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
    ...SHADOWS.small,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  headerTagText: {
    ...FONTS.caption,
    fontSize: 9,
    fontWeight: '900',
    color: COLORS.accent,
    letterSpacing: 0.8,
  },
  headerTitle: {
    ...FONTS.h2,
    color: COLORS.primary,
  },
  headerSubtitle: {
    ...FONTS.bodySmall,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  headerActionsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerConciergeBtn: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#C8E6C9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCounterBadge: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.accent,
  },
  stepCounterBadgeRTL: {
    marginRight: SPACING.sm,
  },
  stepCounterText: {
    ...FONTS.caption,
    fontWeight: '700',
    color: COLORS.accentDark,
  },
  wizardStepsBar: {
    flexDirection: 'row',
    marginTop: SPACING.md,
    gap: SPACING.xs,
  },
  wizardStepTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.inputBg,
  },
  wizardStepTabCurrent: {
    backgroundColor: COLORS.primaryLight + '15',
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  wizardStepTabCompleted: {
    backgroundColor: COLORS.surface,
  },
  stepCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleCurrent: {
    backgroundColor: COLORS.primary,
  },
  stepCircleCompleted: {
    backgroundColor: COLORS.success,
  },
  stepCircleNum: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  stepCircleNumCurrent: {
    color: COLORS.white,
  },
  wizardStepLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  wizardStepLabelCurrent: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  wizardStepLabelCompleted: {
    color: COLORS.textSecondary,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
  },
  stepContainer: {
    gap: SPACING.md,
  },
  guideCard: {
    backgroundColor: '#FAF5EA',
    borderWidth: 1,
    borderColor: '#E8DCBF',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  guideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  guideTitle: {
    ...FONTS.bodySmall,
    fontWeight: '700',
    color: COLORS.accentDark,
  },
  guideSubtitle: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  guidePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  guideAnglePill: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#E8DCBF',
  },
  guideAnglePillText: {
    fontSize: 11,
    color: COLORS.accentDark,
    fontWeight: '600',
  },
  mediaConciergeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 6,
    gap: 8,
    ...SHADOWS.subtle,
  },
  mediaConciergeBtnText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  formCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.card,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  cardTitle: {
    ...FONTS.h3,
    color: COLORS.primary,
  },
  imageCounterText: {
    ...FONTS.caption,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  imageRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  imageThumb: {
    width: 105,
    height: 105,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  mainBadge: {
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
  mainBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.white,
  },
  removeImageBtn: {
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
  addImageBtn: {
    width: 105,
    height: 105,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.primaryLight + '50',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.primaryLight + '08',
  },
  addImageText: {
    ...FONTS.caption,
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '600',
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
  priceInput: {
    ...FONTS.h2,
    color: COLORS.primary,
  },
  priceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs + 2,
  },
  pricePreviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FAF5EA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#E8DCBF',
  },
  pricePreviewBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accentDark,
  },
  inputMultiline: {
    minHeight: 110,
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
  disciplineChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  disciplineChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  disciplineChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  disciplineChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  disciplineChipTextActive: {
    color: COLORS.white,
  },
  trustBannerCard: {
    backgroundColor: '#FAF5EA',
    borderWidth: 1,
    borderColor: '#E8DCBF',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  trustBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  trustBannerTitle: {
    ...FONTS.bodySmall,
    fontWeight: '700',
    color: COLORS.accentDark,
  },
  trustBannerDesc: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkboxTextWrap: {
    flex: 1,
  },
  checkboxText: {
    ...FONTS.body,
    fontWeight: '600',
    color: COLORS.text,
  },
  checkboxSubtext: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  certificateWrap: {
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
  },
  certificateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight + '12',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm + 2,
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
    backgroundColor: COLORS.inputBg,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  certificateFileName: {
    flex: 1,
    ...FONTS.bodySmall,
    color: COLORS.text,
  },
  descriptionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  charCounter: {
    ...FONTS.caption,
    color: COLORS.textLight,
  },
  charCounterSuccess: {
    color: COLORS.success,
    fontWeight: '600',
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
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emirateChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  emirateChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  emirateChipTextActive: {
    color: COLORS.white,
  },
  locationInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  locIcon: {
    marginRight: 4,
  },
  autocompleteDropdown: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    marginTop: 4,
    maxHeight: 180,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  autocompleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.inputBg,
    gap: SPACING.xs,
  },
  autocompleteText: {
    ...FONTS.bodySmall,
    color: COLORS.text,
    flex: 1,
  },
  strengthCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.card,
  },
  strengthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  strengthTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  strengthTitle: {
    ...FONTS.bodySmall,
    fontWeight: '700',
    color: COLORS.primary,
  },
  strengthBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  strengthBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  strengthTrack: {
    height: 8,
    backgroundColor: COLORS.borderLight,
    borderRadius: 4,
    marginTop: SPACING.sm,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 4,
  },
  checklistWrap: {
    marginTop: SPACING.sm,
    gap: 6,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  checklistText: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
  },
  guaranteeCard: {
    backgroundColor: COLORS.primary + '0A',
    borderWidth: 1,
    borderColor: COLORS.primary + '20',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  guaranteeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  guaranteeTitle: {
    ...FONTS.bodySmall,
    fontWeight: '700',
    color: COLORS.primary,
  },
  guaranteeText: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  reviewCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.soft,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  reviewHeaderTitle: {
    ...FONTS.caption,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  reviewRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    alignItems: 'center',
  },
  reviewThumb: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.md,
  },
  reviewThumbPlaceholder: {
    backgroundColor: COLORS.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewDetails: {
    flex: 1,
  },
  reviewTitle: {
    ...FONTS.h3,
    color: COLORS.primary,
  },
  reviewPrice: {
    ...FONTS.body,
    fontWeight: '700',
    color: COLORS.price,
    marginTop: 2,
  },
  reviewSub: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  reviewLoc: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    ...SHADOWS.cardHover,
    elevation: 8,
  },
  bottomBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: SPACING.md,
  },
  bottomBackBtnText: {
    ...FONTS.button,
    color: COLORS.primary,
    fontWeight: '600',
  },
  bottomNextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.full,
    ...SHADOWS.soft,
  },
  bottomNextBtnText: {
    ...FONTS.button,
    color: COLORS.white,
    fontWeight: '700',
  },
  bottomSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.full,
    ...SHADOWS.soft,
  },
  bottomSubmitBtnText: {
    ...FONTS.button,
    color: COLORS.white,
    fontWeight: '700',
  },
  submitBtnDisabled: {
    opacity: 0.7,
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
  escrowShieldCard: {
    backgroundColor: '#0F1E2E',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.45)',
    gap: SPACING.sm + 2,
    ...SHADOWS.card,
  },
  escrowShieldHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  escrowShieldIconWrap: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  escrowShieldTitleCol: {
    flex: 1,
  },
  escrowShieldTitle: {
    ...FONTS.h3,
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.white,
  },
  escrowShieldSub: {
    ...FONTS.bodySmall,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
    lineHeight: 18,
  },
  escrowPillarsList: {
    gap: 6,
    paddingVertical: 2,
  },
  escrowPillarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  escrowPillarText: {
    ...FONTS.bodySmall,
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    flex: 1,
  },
  conciergeConsultBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#25D366',
    borderRadius: RADIUS.full,
    paddingVertical: 9,
    paddingHorizontal: SPACING.md,
    marginTop: 4,
    ...SHADOWS.small,
  },
  conciergeConsultBtnText: {
    ...FONTS.button,
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 13,
  },
});
