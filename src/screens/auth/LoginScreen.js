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
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../../config/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
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

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const closeAuthModal = () => {
    const parent = navigation.getParent();
    if (parent && parent.canGoBack()) {
      parent.goBack();
      return;
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const validate = () => {
    const errs = {};
    if (!email.trim()) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Invalid email';
    if (!password) errs.password = 'Password is required';
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
          {/* Language Toggle */}
          <TouchableOpacity style={styles.langBtn} onPress={toggleLanguage}>
            <Ionicons name="globe-outline" size={16} color={COLORS.primary} />
            <Text style={styles.langBtnText}>
              {language === 'en' ? t('switchToArabic') : t('switchToEnglish')}
            </Text>
          </TouchableOpacity>

          {/* Logo Area */}
          <View style={styles.logoArea}>
            <View style={[styles.logoRow, isRTL && styles.rowRTL]}>
              <Image
                source={require('../../../assets/logo.jpg')}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <Text style={styles.appName}>{t('appName')}</Text>
            </View>
            <Text style={[styles.tagline, isRTL && styles.textRTL]}>{t('tagline')}</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={[styles.formTitle, isRTL && styles.textRTL]}>{t('formTitleLogin')}</Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, isRTL && styles.textRTL]}>{t('email')}</Text>
              <View
                style={[styles.inputContainer, errors.email && styles.inputError, isRTL && styles.rowRTL]}
              >
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={COLORS.textLight}
                />
                <TextInput
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

            <View style={styles.inputGroup}>
              <Text style={[styles.label, isRTL && styles.textRTL]}>{t('password')}</Text>
              <View
                style={[
                  styles.inputContainer,
                  errors.password && styles.inputError,
                  isRTL && styles.rowRTL,
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={COLORS.textLight}
                />
                <TextInput
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

            {loginError ? (
              <View style={styles.loginErrorBanner}>
                <Ionicons name="alert-circle" size={18} color={COLORS.error} />
                <Text style={[styles.loginErrorText, isRTL && styles.textRTL]}>{loginError}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.loginBtnText}>{t('signIn')}</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Sign Up Link */}
          <View style={[styles.bottomLink, isRTL && styles.rowRTL]}>
            <Text style={styles.bottomLinkText}>{t('noAccount')}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.bottomLinkAction}>{t('signUp')}</Text>
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
    paddingVertical: SPACING.xxl,
  },
  content: {},
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: SPACING.xs,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryLight + '15',
    marginBottom: SPACING.md,
  },
  langBtnText: {
    ...FONTS.caption,
    color: COLORS.primary,
    fontWeight: '600',
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  logoImage: {
    width: 56,
    height: 38,
    borderRadius: 6,
  },
  appName: {
    ...FONTS.h1,
    color: COLORS.primary,
  },
  tagline: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
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
  form: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.card,
  },
  formTitle: {
    ...FONTS.h2,
    color: COLORS.text,
    marginBottom: SPACING.lg,
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  label: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs + 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: Platform.OS === 'ios' ? SPACING.md : SPACING.xs,
    gap: SPACING.sm,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  inputError: {
    borderColor: COLORS.error,
  },
  input: {
    flex: 1,
    ...FONTS.body,
    color: COLORS.text,
  },
  errorText: {
    ...FONTS.bodySmall,
    color: COLORS.error,
    marginTop: SPACING.xs,
  },
  loginBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
  },
  loginBtnDisabled: {
    opacity: 0.7,
  },
  loginBtnText: {
    ...FONTS.button,
    color: COLORS.white,
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
    marginTop: SPACING.lg,
  },
  bottomLinkText: {
    ...FONTS.body,
    color: COLORS.textSecondary,
  },
  bottomLinkAction: {
    ...FONTS.body,
    color: COLORS.primary,
    fontWeight: '600',
  },
});
