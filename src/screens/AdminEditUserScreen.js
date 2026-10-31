import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
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
import { extractApiErrorMessage } from '../utils/apiErrors';
import { useToast } from '../components/ToastProvider';

const ROLE_OPTIONS = [
  {
    id: 'buyer',
    labelKey: 'roleBuyer',
    descKey: 'adminRoleBuyerDesc',
    icon: 'cart-outline',
  },
  {
    id: 'seller',
    labelKey: 'roleSeller',
    descKey: 'adminRoleSellerDesc',
    icon: 'storefront-outline',
  },
  {
    id: 'both',
    labelKey: 'roleBoth',
    descKey: 'adminRoleBothDesc',
    icon: 'swap-horizontal-outline',
  },
  {
    id: 'admin',
    labelKey: 'adminActorAdmin',
    fallbackLabel: 'Admin',
    descKey: 'adminRoleAdminDesc',
    icon: 'shield-checkmark-outline',
  },
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

export default function AdminEditUserScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { t, isRTL, language } = useLanguage();
  const isArabic = language === 'ar';
  const user = route?.params?.user || {};

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    first_name: user?.profile?.first_name || '',
    last_name: user?.profile?.last_name || '',
    phone_number: user?.profile?.phone_number || '',
    location: user?.profile?.location || '',
    role: user?.role || 'buyer',
    is_verified: !!user?.is_verified,
  });
  const toast = useToast();

  const handleUserComplianceHotline = () => {
    const isArabic = isRTL;
    const text = isArabic
      ? 'مرحباً، أود التواصل مع مسؤول الامتثال وهوية الأعضاء بخصوص ترقية أو تعديل حساب مستخدم.'
      : 'Hello SteedMarket Compliance Officer, I need assistance regarding member role accreditation or profile moderation.';
    try {
      const res = Linking.openURL(`https://wa.me/971500000000?text=${encodeURIComponent(text)}`);
      if (res && typeof res.catch === 'function') {
        res.catch(() => {});
      }
    } catch (e) {}
  };

  const handleAccountOfficerConsultation = () => {
    const isArabic = isRTL;
    const text = isArabic
      ? 'مرحباً، أود استشارة مسؤول الحسابات المعتمد بخصوص توثيق هوية العضو وضمان العمليات.'
      : 'Hello SteedMarket Account Officer, I need consultation regarding member verification status and KYC escrow compliance.';
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

  const toggleVerified = () => {
    if (user?.role === 'admin' && form.is_verified) {
      toast.show(t('adminCannotUnverifyAdmin'), { type: 'error' });
      return;
    }
    update('is_verified', !form.is_verified);
  };

  const save = async () => {
    const next = {};
    if (form.first_name.trim() && form.first_name.trim().length < 2) {
      next.first_name = t('adminInvalidName');
    }
    if (form.last_name.trim() && form.last_name.trim().length < 2) {
      next.last_name = t('adminInvalidName');
    }
    if (form.phone_number.trim()) {
      const validPhone = /^[0-9+()\-\s]{7,20}$/.test(form.phone_number.trim());
      if (!validPhone) next.phone_number = t('adminInvalidPhone');
    }
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }

    setSaving(true);
    try {
      await apiService.adminUpdateUser(user.id, {
        first_name: form.first_name.trim() || null,
        last_name: form.last_name.trim() || null,
        phone_number: form.phone_number.trim() || null,
        location: form.location.trim() || null,
        role: form.role,
        is_verified: form.is_verified,
      });
      toast.show(t('adminUserUpdated'), { type: 'success' });
      navigation.goBack();
    } catch (err) {
      toast.show(extractApiErrorMessage(err, t('adminActionFailed')), { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const initials = `${(form.first_name?.[0] || user?.email?.[0] || 'U').toUpperCase()}${(
    form.last_name?.[0] || ''
  ).toUpperCase()}`;

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
            testID="admin-edit-user-back-btn"
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
                {isRTL ? 'إدارة رتب وهوية أعضاء النخبة' : 'VIP MEMBER ROLES & IDENTITY'}
              </Text>
            </View>
            <Text style={[styles.headerTitle, isRTL && styles.textRTL]}>{t('adminEditUser')}</Text>
            <Text style={[styles.headerSubtitle, isRTL && styles.textRTL]}>
              {t('adminUserStudioSubtitle')}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          testID="admin-edit-user-hotline-btn"
          style={styles.headerHotlineBtn}
          onPress={handleUserComplianceHotline}
          activeOpacity={0.8}
          accessibilityLabel="User Compliance WhatsApp Hotline"
        >
          <Ionicons name="logo-whatsapp" size={17} color="#25D366" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Member Profile Overview Card */}
        <View style={styles.profileCard}>
          <View style={[styles.profileTopRow, isRTL && styles.rowRTL]}>
            <View style={styles.avatarWrap}>
              <Text style={styles.avatarText}>{initials}</Text>
              {form.is_verified && (
                <View style={styles.avatarVerifiedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
                </View>
              )}
            </View>

            <View style={[styles.profileDetails, isRTL && styles.profileDetailsRTL]}>
              <View style={[styles.emailRow, isRTL && styles.rowRTL]}>
                <Text style={[styles.emailText, isRTL && styles.textRTL]} numberOfLines={1}>
                  {user.email || 'user@example.com'}
                </Text>
              </View>

              <View style={[styles.metaPillsRow, isRTL && styles.rowRTL]}>
                <View style={styles.rolePill}>
                  <Text style={styles.rolePillText}>{form.role.toUpperCase()}</Text>
                </View>
                <View
                  style={[
                    styles.statusPill,
                    form.is_verified ? styles.statusPillVerified : styles.statusPillUnverified,
                  ]}
                >
                  <Ionicons
                    name={form.is_verified ? 'shield-checkmark' : 'shield-outline'}
                    size={11}
                    color={form.is_verified ? COLORS.primary : COLORS.textLight}
                  />
                  <Text
                    style={[
                      styles.statusPillText,
                      form.is_verified ? styles.statusPillTextVerified : styles.statusPillTextUnverified,
                    ]}
                  >
                    {form.is_verified
                      ? isArabic
                        ? 'عضو موثّق'
                        : 'Verified Member'
                      : isArabic
                      ? 'غير موثّق'
                      : 'Unverified'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Member Trust & Escrow Custody Charter Shield Card */}
        <View testID="admin-user-accreditation-shield" style={styles.accreditationShieldCard}>
          <View style={[styles.accreditationShieldHeader, isRTL && styles.rowRTL]}>
            <View style={styles.accreditationShieldIconWrap}>
              <Ionicons name="shield-checkmark" size={18} color={COLORS.accentDark} />
            </View>
            <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <View style={[styles.accreditationBadgeRow, isRTL && styles.rowRTL]}>
                <View style={styles.accreditationPulseDot} />
                <Text style={styles.accreditationBadgeText}>
                  {isRTL ? 'ميثاق الاعتماد والأمان الرقمي' : 'MEMBER IDENTITY & TRUST CHARTER'}
                </Text>
              </View>
              <Text style={[styles.accreditationShieldTitle, isRTL && styles.textRTL]}>
                {isRTL ? 'حوكمة صلاحيات الحسابات وتوثيق الأعضاء' : 'Member Accreditation & Governance Charter'}
              </Text>
              <Text style={[styles.accreditationShieldDesc, isRTL && styles.textRTL]}>
                {isRTL
                  ? 'تدقيق معتمد لبيانات الهوية، ترقية الرتب (مشتري / بائع / وسيط)، وتأمين الصفقات من الاحتيال'
                  : 'Official vetting of member credentials, role governance, and verified equestrian escrow eligibility'}
              </Text>
            </View>
          </View>

          {/* 3 Member Accreditation Pillars */}
          <View style={styles.accreditationPillars}>
            <View style={[styles.accreditationPillarItem, isRTL && styles.rowRTL]}>
              <View style={styles.accreditationPillarIcon}>
                <Ionicons name="id-card" size={13} color={COLORS.accentDark} />
              </View>
              <Text style={[styles.accreditationPillarText, isRTL && styles.textRTL]}>
                {isRTL ? 'توثيق الهوية الوطنية وجواز السفر المعتمد' : 'Emirates ID / GCC Verified Identity Vetting'}
              </Text>
            </View>
            <View style={[styles.accreditationPillarItem, isRTL && styles.rowRTL]}>
              <View style={styles.accreditationPillarIcon}>
                <Ionicons name="key" size={13} color={COLORS.accentDark} />
              </View>
              <Text style={[styles.accreditationPillarText, isRTL && styles.textRTL]}>
                {isRTL ? 'صلاحيات البيع والشراء ومكافحة الاحتيال' : 'Multi-Role Authorization & Anti-Fraud Security'}
              </Text>
            </View>
            <View style={[styles.accreditationPillarItem, isRTL && styles.rowRTL]}>
              <View style={styles.accreditationPillarIcon}>
                <Ionicons name="shield" size={13} color={COLORS.accentDark} />
              </View>
              <Text style={[styles.accreditationPillarText, isRTL && styles.textRTL]}>
                {isRTL ? 'خط تواصل مباشر مع مسؤول الحسابات' : 'Direct VIP Broker & Account Officer Hotline'}
              </Text>
            </View>
          </View>

          {/* 1-Tap WhatsApp Account Officer consultation button */}
          <TouchableOpacity
            testID="admin-user-officer-consult-btn"
            style={[styles.accreditationConsultBtn, isRTL && styles.rowRTL]}
            onPress={handleAccountOfficerConsultation}
            activeOpacity={0.85}
          >
            <Ionicons name="logo-whatsapp" size={15} color="#25D366" />
            <Text style={styles.accreditationConsultBtnText}>
              {isRTL ? 'استشارة مسؤول توثيق الهوية والامتثال' : 'Consult Member Compliance Officer'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Member Information Section */}
        <View style={styles.sectionCard}>
          <View style={[styles.sectionHeaderRow, isRTL && styles.rowRTL]}>
            <Ionicons name="person-outline" size={18} color={COLORS.primary} />
            <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
              {t('adminUserIdentity')}
            </Text>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, isRTL && styles.textRTL]}>{t('firstNameLabel')}</Text>
            <TextInput
              testID="input-first-name"
              style={[styles.input, errors.first_name && styles.inputError, isRTL && styles.inputRTL]}
              value={form.first_name}
              onChangeText={(v) => update('first_name', v)}
              placeholder={t('firstName')}
              placeholderTextColor={COLORS.textLight}
              textAlign={isRTL ? 'right' : 'left'}
            />
            {errors.first_name && (
              <Text style={[styles.errorText, isRTL && styles.textRTL]}>{errors.first_name}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, isRTL && styles.textRTL]}>{t('lastNameLabel')}</Text>
            <TextInput
              testID="input-last-name"
              style={[styles.input, errors.last_name && styles.inputError, isRTL && styles.inputRTL]}
              value={form.last_name}
              onChangeText={(v) => update('last_name', v)}
              placeholder={t('lastName')}
              placeholderTextColor={COLORS.textLight}
              textAlign={isRTL ? 'right' : 'left'}
            />
            {errors.last_name && (
              <Text style={[styles.errorText, isRTL && styles.textRTL]}>{errors.last_name}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, isRTL && styles.textRTL]}>{t('phoneLabel')}</Text>
            <TextInput
              testID="input-phone"
              style={[styles.input, errors.phone_number && styles.inputError, isRTL && styles.inputRTL]}
              value={form.phone_number}
              onChangeText={(v) => update('phone_number', v)}
              placeholder={t('phoneNumber')}
              placeholderTextColor={COLORS.textLight}
              keyboardType="phone-pad"
              textAlign={isRTL ? 'right' : 'left'}
            />
            {errors.phone_number && (
              <Text style={[styles.errorText, isRTL && styles.textRTL]}>{errors.phone_number}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, isRTL && styles.textRTL]}>{t('locationLabel')}</Text>
            <TextInput
              testID="input-location"
              style={[styles.input, isRTL && styles.inputRTL]}
              value={form.location}
              onChangeText={(v) => update('location', v)}
              placeholder={t('location')}
              placeholderTextColor={COLORS.textLight}
              textAlign={isRTL ? 'right' : 'left'}
            />

            {/* UAE Emirates Quick Select Bar */}
            <Text style={[styles.subLabel, isRTL && styles.textRTL]}>
              {t('adminEmirateQuickSelect')}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.emiratesScrollRow, isRTL && styles.rowRTL]}
            >
              {UAE_EMIRATES.map((emirate) => {
                const isSelected = form.location.trim().toLowerCase() === emirate.toLowerCase();
                return (
                  <TouchableOpacity
                    key={emirate}
                    testID={`emirate-chip-${emirate.toLowerCase().replace(/\s+/g, '-')}`}
                    style={[styles.emirateChip, isSelected && styles.emirateChipActive]}
                    onPress={() => update('location', emirate)}
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

        {/* Platform Role Cards Section */}
        <View style={styles.sectionCard}>
          <View style={[styles.sectionHeaderRow, isRTL && styles.rowRTL]}>
            <Ionicons name="shield-outline" size={18} color={COLORS.primary} />
            <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
              {t('adminUserRoleSelect')}
            </Text>
          </View>

          <View style={styles.rolesGrid}>
            {ROLE_OPTIONS.map((opt) => {
              const isSelected = form.role === opt.id;
              const title = opt.labelKey ? t(opt.labelKey) : opt.fallbackLabel;
              const desc = t(opt.descKey);

              return (
                <TouchableOpacity
                  key={opt.id}
                  testID={`role-card-${opt.id}`}
                  style={[styles.roleCard, isSelected && styles.roleCardActive]}
                  onPress={() => update('role', opt.id)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.roleCardHeader, isRTL && styles.rowRTL]}>
                    <View style={[styles.roleIconWrap, isSelected && styles.roleIconWrapActive]}>
                      <Ionicons
                        name={opt.icon}
                        size={18}
                        color={isSelected ? COLORS.primary : COLORS.textSecondary}
                      />
                    </View>
                    <View style={styles.roleCardTitleWrap}>
                      <Text
                        style={[styles.roleCardTitle, isSelected && styles.roleCardTitleActive, isRTL && styles.textRTL]}
                      >
                        {title}
                      </Text>
                    </View>
                    <Ionicons
                      name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={isSelected ? COLORS.primary : COLORS.border}
                    />
                  </View>
                  <Text style={[styles.roleCardDesc, isRTL && styles.textRTL]}>{desc}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Verification Status Card */}
        <View style={styles.sectionCard}>
          <TouchableOpacity
            testID="verify-toggle"
            style={[styles.verifyCard, isRTL && styles.rowRTL]}
            onPress={toggleVerified}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.verifyIconWrap,
                form.is_verified ? styles.verifyIconWrapActive : styles.verifyIconWrapInactive,
              ]}
            >
              <Ionicons
                name={form.is_verified ? 'shield-checkmark' : 'shield-outline'}
                size={22}
                color={form.is_verified ? COLORS.primary : COLORS.textLight}
              />
            </View>

            <View style={[styles.verifyTextWrap, isRTL && styles.verifyTextWrapRTL]}>
              <Text style={[styles.verifyCardTitle, isRTL && styles.textRTL]}>
                {t('adminVerifiedCardTitle')}
              </Text>
              <Text style={[styles.verifyCardDesc, isRTL && styles.textRTL]}>
                {t('adminVerifiedCardDesc')}
              </Text>
            </View>

            <View
              style={[
                styles.toggleSwitch,
                form.is_verified ? styles.toggleSwitchActive : styles.toggleSwitchInactive,
              ]}
            >
              <View
                style={[
                  styles.toggleThumb,
                  form.is_verified ? styles.toggleThumbActive : styles.toggleThumbInactive,
                ]}
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* Save Changes Button */}
        <TouchableOpacity
          testID="admin-save-user-btn"
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
              <Text style={styles.saveBtnText}>{t('adminSaveUserChanges')}</Text>
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>
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
  accreditationShieldCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1.5,
    borderColor: 'rgba(197, 160, 89, 0.3)',
    ...SHADOWS.small,
  },
  accreditationShieldHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  accreditationShieldIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(197, 160, 89, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.3)',
  },
  accreditationBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  accreditationPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  accreditationBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.accentDark,
    letterSpacing: 0.5,
  },
  accreditationShieldTitle: {
    ...FONTS.h3,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  accreditationShieldDesc: {
    ...FONTS.bodySmall,
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  accreditationPillars: {
    gap: 6,
    paddingVertical: SPACING.xs,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.borderLight,
    marginVertical: SPACING.xs,
  },
  accreditationPillarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  accreditationPillarIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(197, 160, 89, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accreditationPillarText: {
    ...FONTS.caption,
    fontSize: 11,
    color: COLORS.text,
    fontWeight: '600',
    flex: 1,
  },
  accreditationConsultBtn: {
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
  accreditationConsultBtnText: {
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
  profileCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.soft,
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  avatarWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  avatarText: {
    ...FONTS.h3,
    color: COLORS.white,
    fontWeight: '800',
  },
  avatarVerifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: COLORS.white,
    borderRadius: 8,
  },
  profileDetails: {
    flex: 1,
  },
  profileDetailsRTL: {
    alignItems: 'flex-end',
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emailText: {
    ...FONTS.body,
    fontWeight: '700',
    color: COLORS.text,
  },
  metaPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  rolePill: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.accent + '20',
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  rolePillText: {
    ...FONTS.caption,
    color: COLORS.accentDark,
    fontWeight: '800',
    fontSize: 10,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  statusPillVerified: {
    backgroundColor: COLORS.primary + '15',
    borderColor: COLORS.primary,
  },
  statusPillUnverified: {
    backgroundColor: COLORS.borderLight,
    borderColor: COLORS.border,
  },
  statusPillText: {
    ...FONTS.caption,
    fontSize: 10,
    fontWeight: '700',
  },
  statusPillTextVerified: {
    color: COLORS.primary,
  },
  statusPillTextUnverified: {
    color: COLORS.textLight,
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
  sectionTitle: {
    ...FONTS.h3,
    color: COLORS.primary,
    fontSize: 15,
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
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    ...FONTS.caption,
    color: COLORS.error,
    marginTop: SPACING.xs,
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
  rolesGrid: {
    gap: SPACING.sm,
  },
  roleCard: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    padding: SPACING.md,
  },
  roleCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '0A',
  },
  roleCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  roleIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  roleIconWrapActive: {
    backgroundColor: COLORS.primary + '15',
    borderColor: COLORS.primary,
  },
  roleCardTitleWrap: {
    flex: 1,
  },
  roleCardTitle: {
    ...FONTS.body,
    fontWeight: '700',
    color: COLORS.text,
  },
  roleCardTitleActive: {
    color: COLORS.primary,
  },
  roleCardDesc: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    lineHeight: 16,
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
