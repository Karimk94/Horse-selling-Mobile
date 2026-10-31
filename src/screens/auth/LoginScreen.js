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
import { useToast } from '../../components/ToastProvider';

export default function LoginScreen({ navigation }) {
  const { signIn } = useAuth();
  const { t, isRTL, toggleLanguage, language } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [loginError, setLoginError] = useState('');
  const toast = useToast();

  const handleConciergeInquiry = () => {
    const isArabic = language === 'ar';
    const text = isArabic
      ? 'مرحباً، أود الحصول على مساعدة بخصوص تسجيل الدخول أو الانضمام إلى ستيد ماركت.'
      : 'Hello SteedMarket Concierge, I need assistance logging in or joining the equestrian marketplace.';
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

  const validate = () => {
    const errs = {};
    if (!email.trim()) errs.email = t('emailRequired') || 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = t('emailInvalid') || 'Invalid email';
    if (!password) errs.password = t('passwordRequired') || 'Password is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoginError('');
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      closeAuthModal();
    } catch (err) {
      const msg =
        err.response?.data?.detail || t('loginFailed') || 'Login failed. Please try again.';
      setLoginError(msg);
      try { toast.show(msg, { type: 'error' }); } catch {}
    } finally {
      setLoading(false);
    }
  };

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
          {/* Top Bar with Dismiss and Language Switcher */}
          <View style={[styles.topBar, isRTL && styles.rowRTL]}>
            <TouchableOpacity
              testID="auth-close-button"
              accessibilityLabel={t('authCloseBtn') || 'Close'}
              style={styles.closeBtn}
              onPress={closeAuthModal}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>

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
                testID="login-concierge-support-btn"
                style={styles.conciergeHeaderBtn}
                onPress={handleConciergeInquiry}
                activeOpacity={0.8}
                accessibilityLabel="WhatsApp Concierge"
              >
                <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Luxury Brand Area */}
          <View style={styles.brandHero}>
            <View style={styles.brandBadge}>
              <BrandMark size={52} />
            </View>
            <View style={styles.portalBadge}>
              <View style={styles.portalBadgeDot} />
              <Text style={styles.portalBadgeText}>
                {language === 'ar' ? 'بوابة النخبة والفروسية الخليجية' : 'VIP EQUESTRIAN MEMBER ACCESS'}
              </Text>
            </View>
            <Text style={styles.appName}>{t('appName')}</Text>
            <Text style={[styles.clubTitle, isRTL && styles.textRTL]}>
              {t('authWelcomeTitle')}
            </Text>
            <Text style={[styles.clubSubtitle, isRTL && styles.textRTL]}>
              {t('authSubtitleLogin')}
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            <Text style={[styles.formHeader, isRTL && styles.textRTL]}>
              {t('formTitleLogin')}
            </Text>

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
                  size={19}
                  color={errors.email ? COLORS.error : COLORS.primary}
                />
                <TextInput
                  testID="login-email-input"
                  style={[styles.input, isRTL && styles.inputRTL]}
                  placeholder={t('emailPlaceholder')}
                  placeholderTextColor={COLORS.textLight}
                  value={email}
                  onChangeText={(v) => { setEmail(v); setLoginError(''); }}
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

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, isRTL && styles.textRTL]}>
                {t('password')}
                <Text style={styles.requiredStar}> *</Text>
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  errors.password && styles.inputError,
                  isRTL && styles.rowRTL,
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={19}
                  color={errors.password ? COLORS.error : COLORS.primary}
                />
                <TextInput
                  testID="login-password-input"
                  style={[styles.input, isRTL && styles.inputRTL]}
                  placeholder={t('passwordPlaceholder')}
                  placeholderTextColor={COLORS.textLight}
                  value={password}
                  onChangeText={(v) => { setPassword(v); setLoginError(''); }}
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

            {/* Error Banner */}
            {loginError ? (
              <View style={[styles.loginErrorBanner, isRTL && styles.rowRTL]}>
                <Ionicons name="alert-circle" size={18} color={COLORS.error} />
                <Text style={[styles.loginErrorText, isRTL && styles.textRTL]}>{loginError}</Text>
              </View>
            ) : null}

            {/* Sign In Button */}
            <TouchableOpacity
              testID="login-submit-button"
              style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.88}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <View style={[styles.loginBtnContent, isRTL && styles.rowRTL]}>
                  <Text style={styles.loginBtnText}>{t('signIn')}</Text>
                  <Ionicons
                    name={isRTL ? 'arrow-back' : 'arrow-forward'}
                    size={18}
                    color={COLORS.white}
                  />
                </View>
              )}
            </TouchableOpacity>

            {/* Sign Up Link */}
            <View style={[styles.bottomLink, isRTL && styles.rowRTL]}>
              <Text style={styles.bottomLinkText}>{t('noAccount')}</Text>
              <TouchableOpacity
                testID="navigate-signup-button"
                onPress={() => navigation.navigate('Signup')}
                activeOpacity={0.8}
              >
                <Text style={styles.bottomLinkAction}>{t('signUp')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* VIP Member Protection & Escrow Guarantee Shield */}
          <View testID="login-trust-shield" style={styles.trustShieldCard}>
            <View style={[styles.trustShieldHeader, isRTL && styles.rowRTL]}>
              <View style={styles.trustShieldIconWrap}>
                <Ionicons name="shield-checkmark" size={18} color={COLORS.accentDark} />
              </View>
              <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text style={[styles.trustShieldTitle, isRTL && styles.textRTL]}>
                  {language === 'ar' ? 'حماية العضوية والوساطة المصرفية' : 'Verified Membership & Escrow Custody'}
                </Text>
                <Text style={[styles.trustShieldDesc, isRTL && styles.textRTL]}>
                  {language === 'ar'
                    ? 'منصة رسمية لحماية الصفقات وعقود البيع المعتمدة مع توثيق السلالات'
                    : 'Bank-grade transaction security, certified pedigree tracking, and bilateral contracts'}
                </Text>
              </View>
            </View>

            {/* 3 Trust Pillars */}
            <View style={styles.trustPillars}>
              <View style={[styles.trustItem, isRTL && styles.rowRTL]}>
                <View style={styles.trustIconWrap}>
                  <Ionicons name="shield-checkmark" size={13} color={COLORS.accentDark} />
                </View>
                <Text style={[styles.trustText, isRTL && styles.textRTL]}>
                  {t('authTrustUae')}
                </Text>
              </View>
              <View style={[styles.trustItem, isRTL && styles.rowRTL]}>
                <View style={styles.trustIconWrap}>
                  <Ionicons name="lock-closed" size={13} color={COLORS.accentDark} />
                </View>
                <Text style={[styles.trustText, isRTL && styles.textRTL]}>
                  {t('authTrustEncrypted')}
                </Text>
              </View>
              <View style={[styles.trustItem, isRTL && styles.rowRTL]}>
                <View style={styles.trustIconWrap}>
                  <Ionicons name="sparkles" size={13} color={COLORS.accentDark} />
                </View>
                <Text style={[styles.trustText, isRTL && styles.textRTL]}>
                  {t('authTrustInstant')}
                </Text>
              </View>
            </View>

            {/* 1-Tap Concierge Action */}
            <TouchableOpacity
              testID="login-concierge-btn"
              style={[styles.shieldConciergeBtn, isRTL && styles.rowRTL]}
              onPress={handleConciergeInquiry}
              activeOpacity={0.85}
            >
              <Ionicons name="logo-whatsapp" size={15} color="#25D366" />
              <Text style={styles.shieldConciergeBtnText}>
                {language === 'ar' ? 'استشارة المساعد الخاص للتسجيل والدخول' : 'VIP Member Concierge Assistance'}
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
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
  },
  content: {},
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  closeBtn: {
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
    marginBottom: 6,
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
  brandHero: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  brandBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
    ...SHADOWS.card,
    borderWidth: 1.5,
    borderColor: COLORS.secondary + '40',
  },
  appName: {
    ...FONTS.h1,
    color: COLORS.primary,
    letterSpacing: 0.5,
    fontWeight: '800',
    textAlign: 'center',
  },
  clubTitle: {
    ...FONTS.bodySmall,
    color: COLORS.secondaryDark,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  clubSubtitle: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
    paddingHorizontal: SPACING.md,
    lineHeight: 18,
  },
  formCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.card,
  },
  formHeader: {
    ...FONTS.h2,
    color: COLORS.text,
    marginBottom: SPACING.md,
    fontWeight: '700',
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
  requiredStar: {
    color: COLORS.error,
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
    fontSize: 15,
  },
  errorText: {
    ...FONTS.bodySmall,
    color: COLORS.error,
    marginTop: 4,
  },
  loginBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.xs,
    ...SHADOWS.button,
  },
  loginBtnDisabled: {
    opacity: 0.7,
  },
  loginBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  loginBtnText: {
    ...FONTS.button,
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 16,
  },
  loginErrorBanner: {
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
  loginErrorText: {
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
