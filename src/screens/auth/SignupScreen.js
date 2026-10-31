import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../../config/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import BrandMark from '../../components/BrandMark';
import { extractApiErrorMessage } from '../../utils/apiErrors';
import { useToast } from '../../components/ToastProvider';

const EMIRATES = [
  'Dubai',
  'Abu Dhabi',
  'Sharjah',
  'Ajman',
  'Al Ain',
  'Ras Al Khaimah',
  'Fujairah',
];

export default function SignupScreen({ navigation }) {
  const { signUp } = useAuth();
  const { t, isRTL, toggleLanguage, language } = useLanguage();

  const ROLES = [
    {
      value: 'buyer',
      labelKey: 'roleBuyer',
      descKey: 'roleBuyerDesc',
      icon: 'cart-outline',
    },
    {
      value: 'seller',
      labelKey: 'roleSeller',
      descKey: 'roleSellerDesc',
      icon: 'pricetag-outline',
    },
    {
      value: 'both',
      labelKey: 'roleBoth',
      descKey: 'roleBothDesc',
      icon: 'swap-horizontal-outline',
    },
  ];

  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    location: '',
    role: 'buyer',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [signupError, setSignupError] = useState('');
  const toast = useToast();

  const handleConciergeInquiry = () => {
    const isArabic = language === 'ar';
    const text = isArabic
      ? 'مرحباً، أود المساعدة في إكمال تسجيل عضويتي في منصة ستيد ماركت.'
      : 'Hello SteedMarket Concierge, I need assistance registering my equestrian membership on SteedMarket.';
    try {
      const res = Linking.openURL(`https://wa.me/971500000000?text=${encodeURIComponent(text)}`);
      if (res && typeof res.catch === 'function') {
        res.catch(() => {});
      }
    } catch (e) {}
  };

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const closeAuthModal = () => {
    const parent = navigation?.getParent && navigation.getParent();
    if (parent && parent.canGoBack()) {
      parent.goBack();
      return;
    }
    if (navigation && navigation.canGoBack && navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validate = () => {
    const errs = {};
    if (!form.email.trim()) errs.email = t('emailRequired') || 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = t('emailInvalid') || 'Invalid email';
    if (!form.password) errs.password = t('passwordRequired') || 'Password is required';
    else if (form.password.length < 8) errs.password = t('passwordMin') || 'Min 8 characters';
    if (form.password !== form.confirmPassword)
      errs.confirmPassword = t('passwordsMismatch') || 'Passwords do not match';
    if (!form.first_name.trim()) errs.first_name = t('firstNameRequired') || 'First name is required';
    if (!form.phone_number.trim()) errs.phone_number = t('phoneRequired') || 'Phone number is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSignup = async () => {
    if (!validate()) return;
    setSignupError('');
    setLoading(true);
    try {
      const { confirmPassword, ...data } = form;
      await signUp({ ...data, language });
      try { toast.show(t('accountCreatedMsg'), { type: 'success' }); } catch {}
      closeAuthModal();
    } catch (err) {
      const msg = extractApiErrorMessage(err, t('signupFailed') || 'Signup failed');
      setSignupError(msg);
      try { toast.show(msg, { type: 'error' }); } catch {}
    } finally {
      setLoading(false);
    }
  };

  const isPasswordLengthOk = form.password.length >= 8;
  const isPasswordMatch =
    form.confirmPassword.length > 0 && form.password === form.confirmPassword;
  const isPasswordMismatch =
    form.confirmPassword.length > 0 && form.password !== form.confirmPassword;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          style={[
            styles.content,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Top Bar Navigation */}
          <View style={[styles.topBar, isRTL && styles.rowRTL]}>
            <View style={[styles.navLeftRow, isRTL && styles.rowRTL]}>
              <TouchableOpacity
                testID="signup-back-button"
                style={styles.circleBtn}
                onPress={() => navigation.goBack()}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isRTL ? 'arrow-forward' : 'arrow-back'}
                  size={20}
                  color={COLORS.text}
                />
              </TouchableOpacity>

              <TouchableOpacity
                testID="auth-close-button"
                accessibilityLabel={t('authCloseBtn') || 'Close'}
                style={styles.circleBtn}
                onPress={closeAuthModal}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.topBarActions, isRTL && styles.rowRTL]}>
              <TouchableOpacity
                style={[styles.langBtn, isRTL && styles.rowRTL]}
                onPress={toggleLanguage}
                activeOpacity={0.8}
              >
                <Ionicons name="globe-outline" size={15} color={COLORS.primary} />
                <Text style={styles.langBtnText}>
                  {language === 'en' ? t('switchToArabic') : t('switchToEnglish')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                testID="signup-concierge-support-btn"
                style={styles.conciergeHeaderBtn}
                onPress={handleConciergeInquiry}
                activeOpacity={0.8}
                accessibilityLabel="WhatsApp Concierge"
              >
                <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.brandRow}>
              <BrandMark size={38} />
              <Text style={styles.appName}>{t('appName')}</Text>
            </View>
            <View style={styles.portalBadge}>
              <View style={styles.portalBadgeDot} />
              <Text style={styles.portalBadgeText}>
                {language === 'ar' ? 'تسجيل عضوية الخيل والنخبة المعتمدة' : 'VIP EQUESTRIAN REGISTRATION & PASSPORT'}
              </Text>
            </View>
            <Text style={[styles.headerTitle, isRTL && styles.textRTL]}>
              {t('createAccount')}
            </Text>
            <Text style={[styles.headerSubtitle, isRTL && styles.textRTL]}>
              {t('joinTagline')}
            </Text>
          </View>

          {/* Main Form */}
          <View style={styles.formCard}>
            {/* Role Selection */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, isRTL && styles.textRTL]}>
                {t('role')}
                <Text style={styles.requiredStar}> *</Text>
              </Text>
              <View style={styles.roleColumn}>
                {ROLES.map((r) => {
                  const isSelected = form.role === r.value;
                  return (
                    <TouchableOpacity
                      key={r.value}
                      testID={`role-chip-${r.value}`}
                      style={[
                        styles.roleCard,
                        isSelected && styles.roleCardActive,
                        isRTL && styles.rowRTL,
                      ]}
                      onPress={() => updateForm('role', r.value)}
                      activeOpacity={0.8}
                    >
                      <View
                        style={[
                          styles.roleIconBox,
                          isSelected && styles.roleIconBoxActive,
                        ]}
                      >
                        <Ionicons
                          name={r.icon}
                          size={20}
                          color={isSelected ? COLORS.white : COLORS.primary}
                        />
                      </View>
                      <View style={[styles.roleTextBox, isRTL && styles.alignRight]}>
                        <Text
                          style={[
                            styles.roleTitle,
                            isSelected && styles.roleTitleActive,
                            isRTL && styles.textRTL,
                          ]}
                        >
                          {t(r.labelKey)}
                        </Text>
                        <Text
                          style={[
                            styles.roleDesc,
                            isSelected && styles.roleDescActive,
                            isRTL && styles.textRTL,
                          ]}
                          numberOfLines={2}
                        >
                          {t(r.descKey)}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.radioCircle,
                          isSelected && styles.radioCircleActive,
                        ]}
                      >
                        {isSelected && (
                          <Ionicons name="checkmark" size={13} color={COLORS.white} />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Name Fields */}
            <View style={[styles.row, isRTL && styles.rowRTL]}>
              <View style={{ flex: 1 }}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, isRTL && styles.textRTL]}>
                    {t('firstName')}
                    <Text style={styles.requiredStar}> *</Text>
                  </Text>
                  <View
                    style={[
                      styles.inputContainer,
                      errors.first_name && styles.inputError,
                      isRTL && styles.rowRTL,
                    ]}
                  >
                    <Ionicons
                      name="person-outline"
                      size={18}
                      color={errors.first_name ? COLORS.error : COLORS.primary}
                    />
                    <TextInput
                      testID="signup-firstname-input"
                      style={[styles.input, isRTL && styles.inputRTL]}
                      placeholder={t('firstName')}
                      placeholderTextColor={COLORS.textLight}
                      value={form.first_name}
                      onChangeText={(v) => { updateForm('first_name', v); setSignupError(''); }}
                      autoCapitalize="words"
                      autoCorrect={false}
                      textAlign={isRTL ? 'right' : 'left'}
                    />
                  </View>
                  {errors.first_name && (
                    <Text style={[styles.errorText, isRTL && styles.textRTL]}>
                      {errors.first_name}
                    </Text>
                  )}
                </View>
              </View>

              <View style={{ flex: 1 }}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, isRTL && styles.textRTL]}>
                    {t('lastName')}
                  </Text>
                  <View style={[styles.inputContainer, isRTL && styles.rowRTL]}>
                    <Ionicons name="person-outline" size={18} color={COLORS.textLight} />
                    <TextInput
                      testID="signup-lastname-input"
                      style={[styles.input, isRTL && styles.inputRTL]}
                      placeholder={t('lastName')}
                      placeholderTextColor={COLORS.textLight}
                      value={form.last_name}
                      onChangeText={(v) => { updateForm('last_name', v); setSignupError(''); }}
                      autoCapitalize="words"
                      autoCorrect={false}
                      textAlign={isRTL ? 'right' : 'left'}
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* Email Field */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, isRTL && styles.textRTL]}>
                {t('email')}
                <Text style={styles.requiredStar}> *</Text>
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  errors.email && styles.inputError,
                  isRTL && styles.rowRTL,
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={errors.email ? COLORS.error : COLORS.primary}
                />
                <TextInput
                  testID="signup-email-input"
                  style={[styles.input, isRTL && styles.inputRTL]}
                  placeholder={t('emailPlaceholder')}
                  placeholderTextColor={COLORS.textLight}
                  value={form.email}
                  onChangeText={(v) => { updateForm('email', v); setSignupError(''); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  textAlign={isRTL ? 'right' : 'left'}
                />
              </View>
              {errors.email && (
                <Text style={[styles.errorText, isRTL && styles.textRTL]}>{errors.email}</Text>
              )}
            </View>

            {/* Phone Field */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, isRTL && styles.textRTL]}>
                {t('phoneNumber')}
                <Text style={styles.requiredStar}> *</Text>
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  errors.phone_number && styles.inputError,
                  isRTL && styles.rowRTL,
                ]}
              >
                <Ionicons
                  name="call-outline"
                  size={18}
                  color={errors.phone_number ? COLORS.error : COLORS.primary}
                />
                <TextInput
                  testID="signup-phone-input"
                  style={[styles.input, isRTL && styles.inputRTL]}
                  placeholder="+971 50 123 4567"
                  placeholderTextColor={COLORS.textLight}
                  value={form.phone_number}
                  onChangeText={(v) => { updateForm('phone_number', v); setSignupError(''); }}
                  keyboardType="phone-pad"
                  autoCorrect={false}
                  textAlign={isRTL ? 'right' : 'left'}
                />
              </View>
              {errors.phone_number && (
                <Text style={[styles.errorText, isRTL && styles.textRTL]}>
                  {errors.phone_number}
                </Text>
              )}
            </View>

            {/* Location & UAE Emirates Selector */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, isRTL && styles.textRTL]}>
                {t('location')}
              </Text>
              <View style={[styles.inputContainer, isRTL && styles.rowRTL]}>
                <Ionicons name="location-outline" size={18} color={COLORS.primary} />
                <TextInput
                  testID="signup-location-input"
                  style={[styles.input, isRTL && styles.inputRTL]}
                  placeholder={t('selectEmirateLocation') || 'Select Emirate / City'}
                  placeholderTextColor={COLORS.textLight}
                  value={form.location}
                  onChangeText={(v) => { updateForm('location', v); setSignupError(''); }}
                  autoCapitalize="words"
                  autoCorrect={false}
                  textAlign={isRTL ? 'right' : 'left'}
                />
              </View>

              {/* Emirates Quick Chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.emiratesScroll}
              >
                {EMIRATES.map((em) => {
                  const isChipActive = form.location.toLowerCase().includes(em.toLowerCase());
                  return (
                    <TouchableOpacity
                      key={em}
                      testID={`emirate-chip-${em.replace(/\s+/g, '-').toLowerCase()}`}
                      style={[
                        styles.emirateChip,
                        isChipActive && styles.emirateChipActive,
                      ]}
                      onPress={() => updateForm('location', em)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.emirateChipText,
                          isChipActive && styles.emirateChipTextActive,
                        ]}
                      >
                        {em}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <View style={[styles.labelWithHint, isRTL && styles.rowRTL]}>
                <Text style={[styles.label, isRTL && styles.textRTL]}>
                  {t('password')}
                  <Text style={styles.requiredStar}> *</Text>
                </Text>
                {isPasswordLengthOk && (
                  <View style={[styles.statusPill, isRTL && styles.rowRTL]}>
                    <Ionicons name="checkmark-circle" size={13} color={COLORS.success} />
                    <Text style={styles.statusPillText}>{t('passwordLengthOk')}</Text>
                  </View>
                )}
              </View>
              <View
                style={[
                  styles.inputContainer,
                  errors.password && styles.inputError,
                  isRTL && styles.rowRTL,
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={errors.password ? COLORS.error : COLORS.primary}
                />
                <TextInput
                  testID="signup-password-input"
                  style={[styles.input, isRTL && styles.inputRTL]}
                  placeholder={t('passwordPlaceholder')}
                  placeholderTextColor={COLORS.textLight}
                  value={form.password}
                  onChangeText={(v) => { updateForm('password', v); setSignupError(''); }}
                  secureTextEntry={!showPassword}
                  textAlign={isRTL ? 'right' : 'left'}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={COLORS.textLight}
                  />
                </TouchableOpacity>
              </View>
              {errors.password && (
                <Text style={[styles.errorText, isRTL && styles.textRTL]}>{errors.password}</Text>
              )}
            </View>

            {/* Confirm Password Field */}
            <View style={styles.inputGroup}>
              <View style={[styles.labelWithHint, isRTL && styles.rowRTL]}>
                <Text style={[styles.label, isRTL && styles.textRTL]}>
                  {t('confirmPassword')}
                  <Text style={styles.requiredStar}> *</Text>
                </Text>
                {isPasswordMatch && (
                  <View style={[styles.statusPill, isRTL && styles.rowRTL]}>
                    <Ionicons name="checkmark-circle" size={13} color={COLORS.success} />
                    <Text style={styles.statusPillText}>{t('passwordMatchOk')}</Text>
                  </View>
                )}
                {isPasswordMismatch && (
                  <View style={[styles.warningPill, isRTL && styles.rowRTL]}>
                    <Ionicons name="alert-circle" size={13} color={COLORS.warning} />
                    <Text style={styles.warningPillText}>{t('passwordMismatchWarn')}</Text>
                  </View>
                )}
              </View>
              <View
                style={[
                  styles.inputContainer,
                  errors.confirmPassword && styles.inputError,
                  isRTL && styles.rowRTL,
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={errors.confirmPassword ? COLORS.error : COLORS.primary}
                />
                <TextInput
                  testID="signup-confirm-password-input"
                  style={[styles.input, isRTL && styles.inputRTL]}
                  placeholder={t('confirmPassword')}
                  placeholderTextColor={COLORS.textLight}
                  value={form.confirmPassword}
                  onChangeText={(v) => { updateForm('confirmPassword', v); setSignupError(''); }}
                  secureTextEntry={!showConfirmPassword}
                  textAlign={isRTL ? 'right' : 'left'}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={COLORS.textLight}
                  />
                </TouchableOpacity>
              </View>
              {errors.confirmPassword && (
                <Text style={[styles.errorText, isRTL && styles.textRTL]}>
                  {errors.confirmPassword}
                </Text>
              )}
            </View>

            {/* Error Banner */}
            {signupError ? (
              <View style={[styles.signupErrorBanner, isRTL && styles.rowRTL]}>
                <Ionicons name="alert-circle" size={18} color={COLORS.error} />
                <Text style={[styles.signupErrorText, isRTL && styles.textRTL]}>{signupError}</Text>
              </View>
            ) : null}

            {/* Submit Button */}
            <TouchableOpacity
              testID="signup-submit-button"
              style={[styles.signupBtn, loading && styles.signupBtnDisabled]}
              onPress={handleSignup}
              disabled={loading}
              activeOpacity={0.88}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <View style={[styles.signupBtnContent, isRTL && styles.rowRTL]}>
                  <Text style={styles.signupBtnText}>{t('createAccount')}</Text>
                  <Ionicons
                    name={isRTL ? 'arrow-back' : 'arrow-forward'}
                    size={18}
                    color={COLORS.white}
                  />
                </View>
              )}
            </TouchableOpacity>

            {/* Bottom Sign In Link */}
            <View style={[styles.bottomLink, isRTL && styles.rowRTL]}>
              <Text style={styles.bottomLinkText}>{t('alreadyHaveAccount')}</Text>
              <TouchableOpacity
                testID="navigate-signin-button"
                onPress={() => navigation.goBack()}
                activeOpacity={0.8}
              >
                <Text style={styles.bottomLinkAction}>{t('signIn')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* SteedMarket Verified Equestrian Trust Shield */}
          <View testID="signup-trust-shield" style={styles.trustShieldCard}>
            <View style={[styles.trustShieldHeader, isRTL && styles.rowRTL]}>
              <View style={styles.trustShieldIconWrap}>
                <Ionicons name="shield-checkmark" size={18} color={COLORS.accentDark} />
              </View>
              <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text style={[styles.trustShieldTitle, isRTL && styles.textRTL]}>
                  {language === 'ar' ? 'ميثاق الثقة والأمان للفروسية' : 'Verified Equestrian Trust Charter'}
                </Text>
                <Text style={[styles.trustShieldDesc, isRTL && styles.textRTL]}>
                  {language === 'ar'
                    ? 'تسجيل رسمي معتمد يمنحك صلاحية تقديم العروض الملزمة، البيع المباشر، وحجز الخدمات'
                    : 'Certified equestrian onboarding granting access to formal bidding, direct listings, and escrow services'}
                </Text>
              </View>
            </View>

            {/* 3 Onboarding Trust Pillars */}
            <View style={styles.trustPillars}>
              <View style={[styles.trustItem, isRTL && styles.rowRTL]}>
                <View style={styles.trustIconWrap}>
                  <Ionicons name="checkmark-circle" size={13} color={COLORS.accentDark} />
                </View>
                <Text style={[styles.trustText, isRTL && styles.textRTL]}>
                  {language === 'ar' ? 'تسجيل مجاني للمشترين والمربين المعتمدين' : 'Free Verified Buyer & Breeder Access'}
                </Text>
              </View>
              <View style={[styles.trustItem, isRTL && styles.rowRTL]}>
                <View style={styles.trustIconWrap}>
                  <Ionicons name="pricetag" size={13} color={COLORS.accentDark} />
                </View>
                <Text style={[styles.trustText, isRTL && styles.textRTL]}>
                  {language === 'ar' ? 'صفر عمولة خفية وتواصل مباشر مع الملاك' : '0% Hidden Commission on Direct Deals'}
                </Text>
              </View>
              <View style={[styles.trustItem, isRTL && styles.rowRTL]}>
                <View style={styles.trustIconWrap}>
                  <Ionicons name="shield-checkmark" size={13} color={COLORS.accentDark} />
                </View>
                <Text style={[styles.trustText, isRTL && styles.textRTL]}>
                  {t('authTrustUae')} • {t('authTrustEncrypted')}
                </Text>
              </View>
            </View>

            {/* 1-Tap Onboarding Concierge Action */}
            <TouchableOpacity
              testID="signup-concierge-btn"
              style={[styles.shieldConciergeBtn, isRTL && styles.rowRTL]}
              onPress={handleConciergeInquiry}
              activeOpacity={0.85}
            >
              <Ionicons name="logo-whatsapp" size={15} color="#25D366" />
              <Text style={styles.shieldConciergeBtnText}>
                {language === 'ar' ? 'استشارة مستشار التسجيل والعضوية' : 'Consult Membership Concierge'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  content: {},
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  navLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs + 2,
  },
  circleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.soft,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: 6,
    paddingHorizontal: SPACING.sm + 2,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryLight + '15',
    borderWidth: 1,
    borderColor: COLORS.primaryLight + '30',
  },
  langBtnText: {
    ...FONTS.caption,
    color: COLORS.primary,
    fontWeight: '700',
  },
  header: {
    marginBottom: SPACING.md,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  appName: {
    ...FONTS.h2,
    color: COLORS.primary,
    fontWeight: '800',
  },
  headerTitle: {
    ...FONTS.h1,
    color: COLORS.text,
    fontWeight: '800',
  },
  headerSubtitle: {
    ...FONTS.bodySmall,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  formCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.card,
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  label: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    fontWeight: '600',
  },
  labelWithHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.success + '15',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    marginBottom: SPACING.xs,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.success,
  },
  warningPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.warning + '15',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    marginBottom: SPACING.xs,
  },
  warningPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.warning,
  },
  requiredStar: {
    color: COLORS.error,
  },
  roleColumn: {
    gap: SPACING.xs + 2,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.inputBg,
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
    gap: SPACING.sm,
  },
  roleCardActive: {
    backgroundColor: COLORS.primaryLight + '12',
    borderColor: COLORS.primary,
  },
  roleIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  roleIconBoxActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  roleTextBox: {
    flex: 1,
  },
  alignRight: {
    alignItems: 'flex-end',
  },
  roleTitle: {
    ...FONTS.bodySmall,
    color: COLORS.text,
    fontWeight: '700',
  },
  roleTitleActive: {
    color: COLORS.primary,
  },
  roleDesc: {
    ...FONTS.caption,
    color: COLORS.textLight,
    fontSize: 11,
    marginTop: 1,
    lineHeight: 14,
  },
  roleDescActive: {
    color: COLORS.textSecondary,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.textLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: Platform.OS === 'ios' ? SPACING.md - 2 : SPACING.xs,
    gap: SPACING.sm,
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
  },
  inputError: {
    borderColor: COLORS.error,
    backgroundColor: COLORS.error + '08',
  },
  input: {
    flex: 1,
    ...FONTS.body,
    color: COLORS.text,
    fontSize: 14,
  },
  errorText: {
    ...FONTS.bodySmall,
    color: COLORS.error,
    marginTop: 4,
    fontSize: 12,
  },
  emiratesScroll: {
    paddingTop: SPACING.xs + 2,
    gap: SPACING.xs,
  },
  emirateChip: {
    paddingHorizontal: SPACING.sm + 4,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  emirateChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  emirateChipText: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    fontWeight: '600',
    fontSize: 11,
  },
  emirateChipTextActive: {
    color: COLORS.white,
  },
  signupBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.xs,
    ...SHADOWS.button,
  },
  signupBtnDisabled: {
    opacity: 0.7,
  },
  signupBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  signupBtnText: {
    ...FONTS.button,
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 16,
  },
  signupErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.error + '12',
    borderWidth: 1,
    borderColor: COLORS.error + '30',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  signupErrorText: {
    ...FONTS.bodySmall,
    color: COLORS.error,
    flex: 1,
  },
  bottomLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  bottomLinkText: {
    ...FONTS.bodySmall,
    color: COLORS.textSecondary,
  },
  bottomLinkAction: {
    ...FONTS.bodySmall,
    color: COLORS.primary,
    fontWeight: '700',
    marginLeft: 4,
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  conciergeHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FAF5EA',
    borderWidth: 1,
    borderColor: 'rgba(37, 211, 102, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.subtle,
  },
  portalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FAF5EA',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.4)',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: RADIUS.full,
    marginBottom: 4,
  },
  portalBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  portalBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: COLORS.accentDark,
    letterSpacing: 0.5,
  },
  trustShieldCard: {
    marginTop: SPACING.lg,
    backgroundColor: '#FAF8F5',
    borderWidth: 1.5,
    borderColor: '#E8DCBF',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.card,
  },
  trustShieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  trustShieldIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FAF5EA',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustShieldTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: COLORS.primary,
  },
  trustShieldDesc: {
    fontSize: 10.5,
    color: COLORS.textSecondary,
    lineHeight: 15,
    marginTop: 1,
  },
  trustPillars: {
    marginTop: 4,
    gap: 6,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  trustIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FAF5EA',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.3)',
  },
  trustText: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    fontSize: 11.5,
    fontWeight: '600',
  },
  shieldConciergeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FAF5EA',
    borderWidth: 1.2,
    borderColor: 'rgba(37, 211, 102, 0.45)',
    borderRadius: RADIUS.md,
    paddingVertical: 8,
    paddingHorizontal: SPACING.sm,
    marginTop: SPACING.sm,
    ...SHADOWS.subtle,
  },
  shieldConciergeBtnText: {
    color: '#075E54',
    fontWeight: '800',
    fontSize: 12,
  },
  trustFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.lg,
  },
  trustFooterText: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    fontSize: 12,
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
