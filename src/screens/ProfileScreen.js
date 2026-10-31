import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../config/theme';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import HorseCard from '../components/HorseCard';
import EmptyState from '../components/EmptyState';
import BrandMark from '../components/BrandMark';
import * as apiService from '../services/api';
import { extractApiErrorMessage } from '../utils/apiErrors';
import { useToast } from '../components/ToastProvider';

const LISTING_FILTERS = [
  { id: 'all', labelKey: 'filterAll' },
  { id: 'horse', labelKey: 'filterHorses' },
  { id: 'equipment', labelKey: 'filterEquipment' },
  { id: 'rider_gear', labelKey: 'filterRiderGear' },
  { id: 'services', labelKey: 'filterServices' },
];

export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, signOut, refreshProfile } = useAuth();
  const { t, isRTL, setLanguage, language } = useLanguage();
  const isArabic = language === 'ar';
  const toast = useToast();
  const [myListings, setMyListings] = useState([]);
  const [listingFilter, setListingFilter] = useState('all');
  const [listingsPage, setListingsPage] = useState(0);
  const [listingsTotal, setListingsTotal] = useState(0);
  const [loadingListings, setLoadingListings] = useState(false);
  const [loadingMoreListings, setLoadingMoreListings] = useState(false);
  const listingsLimit = 10;
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [actionableOffers, setActionableOffers] = useState(0);

  const fetchMyListings = useCallback(async () => {
    if (!isAuthenticated || !user?.id) return;
    setLoadingListings(true);
    try {
      const [horsesRes, equipmentRes, riderGearRes, servicesRes] = await Promise.all([
        apiService.getHorses({ owner_id: user.id, skip: 0, limit: 100 }).catch(() => ({ data: [] })),
        apiService.getEquipmentList({ owner_id: user.id, skip: 0, limit: 100 }).catch(() => ({ data: { items: [] } })),
        apiService.getRiderGearList({ owner_id: user.id, skip: 0, limit: 100 }).catch(() => ({ data: { items: [] } })),
        apiService.getServicesList({ provider_id: user.id, skip: 0, limit: 100 }).catch(() => ({ data: { items: [] } })),
      ]);

      const horses = (horsesRes.data?.horses || horsesRes.data?.items || horsesRes.data || []).map(
        (h) => ({ ...h, type: 'horse' })
      );
      const equipment = (equipmentRes.data?.items || []).map((e) => ({ ...e, type: 'equipment' }));
      const riderGear = (riderGearRes.data?.items || []).map((r) => ({ ...r, type: 'rider_gear' }));
      const services = (servicesRes.data?.items || []).map((s) => ({ ...s, type: 'services' }));

      const items = [...horses, ...equipment, ...riderGear, ...services];
      setMyListings(items);
      setListingsTotal(items.length);
    } catch {
      // Fallback gracefully
    } finally {
      setLoadingListings(false);
    }
  }, [isAuthenticated, user?.id]);

  const fetchUnreadAlerts = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await apiService.getSavedSearchAlertsUnreadCount();
      setUnreadAlerts(res.data?.unread_count || 0);
    } catch {
      setUnreadAlerts(0);
    }
  }, [isAuthenticated]);

  const fetchActionableOffers = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await apiService.getActionRequiredOffersCount();
      setActionableOffers(res.data?.actionable_count || 0);
    } catch {
      setActionableOffers(0);
    }
  }, [isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      fetchMyListings();
      fetchUnreadAlerts();
      fetchActionableOffers();
    }, [fetchMyListings, fetchUnreadAlerts, fetchActionableOffers])
  );

  const handleSignOut = () => {
    Alert.alert(t('signOut'), t('signOutConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('signOut'),
        style: 'destructive',
        onPress: signOut,
      },
    ]);
  };

  const startEditing = () => {
    setEditForm({
      first_name: user?.profile?.first_name || '',
      last_name: user?.profile?.last_name || '',
      phone_number: user?.profile?.phone_number || '',
      location: user?.profile?.location || '',
    });
    setEditing(true);
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await apiService.updateProfile(editForm);
      await refreshProfile();
      setEditing(false);
    } catch (err) {
      toast.show(extractApiErrorMessage(err, 'Failed to update profile'), { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleSendVerificationCode = async () => {
    if (!user?.email) return;
    setVerifyingEmail(true);
    try {
      await apiService.sendOtp(user.email);
      setOtpSent(true);
      toast.show(t('otpSentMsg'), { type: 'success' });
    } catch (error) {
      toast.show(extractApiErrorMessage(error, t('verificationFailed')), { type: 'error' });
    } finally {
      setVerifyingEmail(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!otpCode.trim()) {
      toast.show(t('otpRequired'), { type: 'error' });
      return;
    }
    setVerifyingEmail(true);
    try {
      await apiService.verifyOtp(user.email, otpCode.trim());
      await refreshProfile();
      setOtpCode('');
      setOtpSent(false);
      toast.show(t('verificationSuccess'), { type: 'success' });
    } catch (error) {
      toast.show(extractApiErrorMessage(error, t('verificationFailed')), { type: 'error' });
    } finally {
      setVerifyingEmail(false);
    }
  };

  const handleLanguageChange = async (nextLanguage) => {
    if (language === nextLanguage) return;
    setLanguage(nextLanguage);
    try {
      await apiService.updateProfile({ language: nextLanguage });
      await refreshProfile();
    } catch (error) {
      setLanguage(language);
      toast.show(extractApiErrorMessage(error, t('languageUpdateFailed')), { type: 'error' });
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'equipment':
        return isArabic ? 'مستلزمات الخيل' : 'Equipment';
      case 'rider_gear':
        return isArabic ? 'مستلزمات الفارس' : 'Rider Gear';
      case 'services':
        return isArabic ? 'الخدمات' : 'Services';
      default:
        return '';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'approved':
        return isArabic ? 'مقبول' : 'Approved';
      case 'pending_review':
        return isArabic ? 'قيد المراجعة' : 'Pending';
      case 'rejected':
        return isArabic ? 'مرفوض' : 'Rejected';
      default:
        return '';
    }
  };

  const getDetailTarget = (type, id) => {
    switch (type) {
      case 'equipment':
        return { screen: 'EquipmentDetailScreen', params: { equipmentId: id } };
      case 'rider_gear':
        return { screen: 'RiderGearDetailScreen', params: { riderGearId: id } };
      case 'services':
        return { screen: 'ServiceDetailScreen', params: { serviceId: id } };
      default:
        return null;
    }
  };

  const handleSupportChat = () => {
    const msg = isArabic
      ? 'مرحباً، أحتاج إلى استشارة أو مساعدة بخصوص حسابي أو إعلاناتي على ستيد ماركت.'
      : 'Hello SteedMarket Concierge, I need assistance regarding my profile or listings.';
    Linking.openURL(`https://wa.me/971500000000?text=${encodeURIComponent(msg)}`).catch(() => {});
  };

  if (!isAuthenticated) {
    return (
      <View testID="profile-guest-view" style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

        {/* Executive Guest Header */}
        <View style={[styles.screenHeader, isRTL && styles.screenHeaderRTL]}>
          <View style={[styles.headerBrandRow, isRTL && styles.headerBrandRowRTL]}>
            <View style={styles.brandIconWrapper}>
              <BrandMark size={26} />
            </View>
            <View style={[styles.headerTitleWrap, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <View
                testID="profile-guest-vip-badge"
                style={[styles.portalBadge, isRTL && styles.portalBadgeRTL]}
              >
                <Ionicons name="ribbon" size={11} color={COLORS.accentDark} />
                <View style={styles.portalBadgeDot} />
                <Text style={styles.portalBadgeText}>
                  {isArabic ? 'بوابة الضيوف والزوار' : 'GUEST EQUESTRIAN ACCESS'}
                </Text>
              </View>
              <Text style={[styles.screenHeaderTitle, isRTL && styles.textRTL]}>{t('profile')}</Text>
            </View>
          </View>

          <TouchableOpacity
            testID="profile-guest-header-support-btn"
            style={styles.headerSupportBtn}
            onPress={handleSupportChat}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-whatsapp" size={17} color="#25D366" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.guestScrollContent} showsVerticalScrollIndicator={false}>
          <View testID="profile-guest-card" style={styles.guestCard}>
            <View style={styles.guestBrandMark}>
              <BrandMark size={52} color={COLORS.primary} />
            </View>
            <Text style={[styles.guestTitle, isRTL && styles.textRTL]}>
              {t('guestWelcomeTitle')}
            </Text>
            <Text style={[styles.guestSubtitle, isRTL && styles.textRTL]}>
              {t('guestWelcomeSubtitle')}
            </Text>

            <View style={styles.benefitsList}>
              <View style={[styles.benefitItem, isRTL && styles.rowRTL]}>
                <Ionicons name="star" size={17} color={COLORS.accentDark} />
                <Text style={[styles.benefitText, isRTL && styles.textRTL]}>{t('benefitStable')}</Text>
              </View>
              <View style={[styles.benefitItem, isRTL && styles.rowRTL]}>
                <Ionicons name="notifications" size={17} color={COLORS.primary} />
                <Text style={[styles.benefitText, isRTL && styles.textRTL]}>{t('benefitAlerts')}</Text>
              </View>
              <View style={[styles.benefitItem, isRTL && styles.rowRTL]}>
                <Ionicons name="pricetag" size={17} color="#16a34a" />
                <Text style={[styles.benefitText, isRTL && styles.textRTL]}>{t('benefitOffers')}</Text>
              </View>
              <View style={[styles.benefitItem, isRTL && styles.rowRTL]}>
                <Ionicons name="shield-checkmark" size={17} color={COLORS.accentDark} />
                <Text style={[styles.benefitText, isRTL && styles.textRTL]}>{t('benefitVetting')}</Text>
              </View>
            </View>

            <TouchableOpacity
              testID="guest-signin-btn"
              style={styles.guestPrimaryBtn}
              onPress={() => navigation.navigate('AuthStack')}
              activeOpacity={0.88}
            >
              <Text style={styles.guestPrimaryBtnText}>{t('signIn')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              testID="guest-signup-btn"
              style={styles.guestSecondaryBtn}
              onPress={() => navigation.navigate('AuthStack', { screen: 'Signup' })}
              activeOpacity={0.88}
            >
              <Text style={styles.guestSecondaryBtnText}>{t('createAccountBtn')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  const getFilterCount = (filterId) => {
    if (filterId === 'all') return myListings.length;
    return myListings.filter((i) => i.type === filterId).length;
  };

  const filteredListings = listingFilter === 'all'
    ? myListings
    : myListings.filter((i) => i.type === listingFilter);

  const initials = (
    (user?.profile?.first_name?.[0] || '') +
    (user?.profile?.last_name?.[0] || '')
  ).toUpperCase() || user?.email?.[0]?.toUpperCase() || '?';

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* Executive Authenticated Header */}
      <View style={[styles.screenHeader, isRTL && styles.screenHeaderRTL]}>
        <View style={[styles.headerBrandRow, isRTL && styles.headerBrandRowRTL]}>
          <View style={styles.brandIconWrapper}>
            <BrandMark size={26} />
          </View>
          <View style={[styles.headerTitleWrap, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <View
              testID="profile-vip-badge"
              style={[styles.portalBadge, isRTL && styles.portalBadgeRTL]}
            >
              <Ionicons name="ribbon" size={11} color={COLORS.accentDark} />
              <View style={styles.portalBadgeDot} />
              <Text style={styles.portalBadgeText}>
                {isArabic ? 'الملف الشخصي وعضوية النخبة' : 'VIP EQUESTRIAN PROFILE'}
              </Text>
            </View>
            <Text style={[styles.screenHeaderTitle, isRTL && styles.textRTL]}>{t('profile')}</Text>
          </View>
        </View>

        <TouchableOpacity
          testID="profile-header-support-btn"
          style={styles.headerSupportBtn}
          onPress={handleSupportChat}
          activeOpacity={0.8}
        >
          <Ionicons name="logo-whatsapp" size={17} color="#25D366" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileHeader}>
          <View style={[styles.avatarRow, isRTL && styles.rowRTL]}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={[styles.profileInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <View style={[styles.profileNameRow, isRTL && styles.rowRTL]}>
                <Text style={styles.profileName}>
                  {user?.profile?.first_name || t('userFallback')}{' '}
                  {user?.profile?.last_name || ''}
                </Text>
                {user?.is_verified && (
                  <View style={[styles.verifiedBadge, isRTL && styles.rowRTL]}>
                    <Ionicons name="checkmark-circle" size={13} color={COLORS.success} />
                    <Text style={styles.verifiedBadgeText}>{t('verified')}</Text>
                  </View>
                )}
              </View>

              <View style={[styles.memberRoleBadge, isRTL && styles.rowRTL]}>
                <Ionicons
                  name={user?.role === 'admin' ? 'shield-checkmark' : user?.role === 'seller' ? 'ribbon' : 'sparkles'}
                  size={12}
                  color={COLORS.primary}
                />
                <Text style={styles.memberRoleBadgeText}>
                  {user?.role === 'admin'
                    ? (isArabic ? 'مشرف المنصة' : 'Platform Admin')
                    : user?.role === 'seller'
                    ? (isArabic ? 'مربي / بائع معتمد' : 'Verified Seller & Breeder')
                    : t('equestrianMember')}
                </Text>
              </View>

              <Text style={styles.profileEmail}>{user?.email}</Text>

              {user?.profile?.location && (
                <View style={[styles.locationRow, isRTL && styles.rowRTL]}>
                  <Ionicons
                    name="location-outline"
                    size={13}
                    color={COLORS.accentDark}
                  />
                  <Text style={styles.locationText}>
                    {user.profile.location}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={[styles.profileActions, isRTL && styles.rowRTL]}>
            <TouchableOpacity
              testID="profile-edit-btn"
              style={styles.editBtn}
              onPress={editing ? saveProfile : startEditing}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <>
                  <Ionicons
                    name={editing ? 'checkmark' : 'create-outline'}
                    size={17}
                    color={COLORS.primary}
                  />
                  <Text style={styles.editBtnText}>
                    {editing ? t('save') : t('editProfile')}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              testID="profile-signout-btn"
              style={styles.signOutBtn}
              onPress={handleSignOut}
              activeOpacity={0.8}
            >
              <Ionicons
                name="log-out-outline"
                size={17}
                color={COLORS.error}
              />
              <Text style={styles.signOutBtnText}>{t('signOut')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Email Verification Card */}
        {!user?.is_verified && (
          <View style={[styles.verifyCard, isRTL && styles.verifyCardRTL]}>
            <View style={[styles.verifyHeaderRow, isRTL && styles.rowRTL]}>
              <Ionicons name="mail-unread-outline" size={18} color={COLORS.warning} />
              <Text style={[styles.verifyTitle, isRTL && styles.textRTL]}>{t('emailNotVerified')}</Text>
            </View>
            {!otpSent ? (
              <TouchableOpacity
                style={styles.verifyBtn}
                onPress={handleSendVerificationCode}
                disabled={verifyingEmail}
                activeOpacity={0.85}
              >
                {verifyingEmail ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.verifyBtnText}>{t('sendCode')}</Text>
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.verifyForm}>
                <Text style={[styles.verifyLabel, isRTL && styles.textRTL]}>{t('otpCode')}</Text>
                <TextInput
                  style={[styles.verifyInput, isRTL && styles.inputRTL]}
                  value={otpCode}
                  onChangeText={setOtpCode}
                  placeholder={t('otpCodePlaceholder')}
                  placeholderTextColor={COLORS.textLight}
                  keyboardType="number-pad"
                  maxLength={6}
                  textAlign={isRTL ? 'right' : 'left'}
                />
                <View style={[styles.verifyActions, isRTL && styles.rowRTL]}>
                  <TouchableOpacity
                    style={styles.verifyNowBtn}
                    onPress={handleVerifyEmail}
                    disabled={verifyingEmail}
                    activeOpacity={0.85}
                  >
                    {verifyingEmail ? (
                      <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                      <Text style={styles.verifyNowBtnText}>{t('verifyNow')}</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.resendBtn}
                    onPress={handleSendVerificationCode}
                    disabled={verifyingEmail}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.resendBtnText}>{t('sendCode')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Edit Form */}
        {editing && (
          <View style={styles.editCard}>
            <View style={styles.editField}>
              <Text style={[styles.editLabel, isRTL && styles.textRTL]}>{t('firstNameLabel')}</Text>
              <TextInput
                style={[styles.editInput, isRTL && styles.inputRTL]}
                value={editForm.first_name}
                onChangeText={(v) =>
                  setEditForm((p) => ({ ...p, first_name: v }))
                }
                placeholder={t('firstName')}
                placeholderTextColor={COLORS.textLight}
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>
            <View style={styles.editField}>
              <Text style={[styles.editLabel, isRTL && styles.textRTL]}>{t('lastNameLabel')}</Text>
              <TextInput
                style={[styles.editInput, isRTL && styles.inputRTL]}
                value={editForm.last_name}
                onChangeText={(v) =>
                  setEditForm((p) => ({ ...p, last_name: v }))
                }
                placeholder={t('lastName')}
                placeholderTextColor={COLORS.textLight}
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>
            <View style={styles.editField}>
              <Text style={[styles.editLabel, isRTL && styles.textRTL]}>{t('phoneLabel')}</Text>
              <TextInput
                style={[styles.editInput, isRTL && styles.inputRTL]}
                value={editForm.phone_number}
                onChangeText={(v) =>
                  setEditForm((p) => ({ ...p, phone_number: v }))
                }
                placeholder={t('phoneNumber')}
                placeholderTextColor={COLORS.textLight}
                keyboardType="phone-pad"
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>
            <View style={styles.editField}>
              <Text style={[styles.editLabel, isRTL && styles.textRTL]}>{t('locationLabel')}</Text>
              <TextInput
                style={[styles.editInput, isRTL && styles.inputRTL]}
                value={editForm.location}
                onChangeText={(v) =>
                  setEditForm((p) => ({ ...p, location: v }))
                }
                placeholder={t('location')}
                placeholderTextColor={COLORS.textLight}
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>
            <TouchableOpacity
              style={styles.cancelEditBtn}
              onPress={() => setEditing(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelEditText}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{myListings.length}</Text>
            <Text style={styles.statLabel}>{t('listingsCount')}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: COLORS.accentDark }]}>
              {myListings.filter((h) => h.status === 'approved').length}
            </Text>
            <Text style={styles.statLabel}>{t('activeCount')}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: COLORS.warning }]}>
              {myListings.filter((h) => h.status === 'pending_review').length}
            </Text>
            <Text style={styles.statLabel}>{t('pendingCount')}</Text>
          </View>
        </View>

        {/* Member Quick Hub Grid */}
        <View style={styles.hubGrid}>
          {/* My Stable */}
          <TouchableOpacity
            style={styles.hubCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Stable')}
          >
            <View style={[styles.hubCardIconWrap, { backgroundColor: 'rgba(15, 56, 38, 0.1)' }]}>
              <BrandMark size={20} color={COLORS.primary} />
            </View>
            <Text style={[styles.hubCardTitle, isRTL && styles.textRTL]}>{t('hubStableTitle')}</Text>
            <Text style={[styles.hubCardDesc, isRTL && styles.textRTL]} numberOfLines={2}>
              {t('hubStableDesc')}
            </Text>
          </TouchableOpacity>

          {/* Search Alerts & Matches */}
          <TouchableOpacity
            style={styles.hubCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('SavedAlerts')}
          >
            <View style={[styles.hubCardIconWrap, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
              <Ionicons name="notifications" size={20} color={COLORS.error} />
              {unreadAlerts > 0 && (
                <View style={styles.hubBadge}>
                  <Text style={styles.hubBadgeText}>{unreadAlerts > 99 ? '99+' : unreadAlerts}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.hubCardTitle, isRTL && styles.textRTL]}>{t('hubAlertsTitle')}</Text>
            <Text style={[styles.hubCardDesc, isRTL && styles.textRTL]} numberOfLines={2}>
              {t('hubAlertsDesc')}
            </Text>
          </TouchableOpacity>

          {/* Offers & Negotiations */}
          <TouchableOpacity
            style={styles.hubCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Offers')}
          >
            <View style={[styles.hubCardIconWrap, { backgroundColor: 'rgba(197, 160, 89, 0.15)' }]}>
              <Ionicons name="pricetag" size={20} color={COLORS.accentDark} />
              {actionableOffers > 0 && (
                <View style={[styles.hubBadge, { backgroundColor: COLORS.warning }]}>
                  <Text style={styles.hubBadgeText}>{actionableOffers > 99 ? '99+' : actionableOffers}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.hubCardTitle, isRTL && styles.textRTL]}>{t('hubOffersTitle')}</Text>
            <Text style={[styles.hubCardDesc, isRTL && styles.textRTL]} numberOfLines={2}>
              {t('hubOffersDesc')}
            </Text>
          </TouchableOpacity>

          {/* Seller Studio */}
          <TouchableOpacity
            style={styles.hubCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Sell')}
          >
            <View style={[styles.hubCardIconWrap, { backgroundColor: 'rgba(37, 99, 235, 0.1)' }]}>
              <Ionicons name="add-circle" size={20} color="#2563eb" />
            </View>
            <Text style={[styles.hubCardTitle, isRTL && styles.textRTL]}>{t('hubSellerTitle')}</Text>
            <Text style={[styles.hubCardDesc, isRTL && styles.textRTL]} numberOfLines={2}>
              {t('hubSellerDesc')}
            </Text>
          </TouchableOpacity>

          {/* Admin Control Cockpit (for Admin users) */}
          {user?.role === 'admin' && (
            <TouchableOpacity
              testID="hub-admin-tile"
              style={[styles.hubCard, styles.hubCardAdmin]}
              activeOpacity={0.85}
              onPress={() => {
                try {
                  navigation.navigate('Admin');
                } catch {
                  navigation.navigate('AdminMain');
                }
              }}
            >
              <View style={[styles.hubCardIconWrap, { backgroundColor: 'rgba(180, 83, 9, 0.15)' }]}>
                <Ionicons name="shield-checkmark" size={20} color={COLORS.accentDark} />
              </View>
              <Text style={[styles.hubCardTitle, isRTL && styles.textRTL]}>
                {isArabic ? 'لوحة تحكم المشرف' : 'Admin Cockpit'}
              </Text>
              <Text style={[styles.hubCardDesc, isRTL && styles.textRTL]} numberOfLines={2}>
                {isArabic ? 'إدارة المنصة والمراجعة وتدقيق العروض' : 'Platform control & moderation dashboard'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* SteedMarket VIP Equestrian Identity & Escrow Protection Shield */}
        <View testID="profile-identity-shield" style={styles.identityShieldCard}>
          <View style={[styles.identityShieldHeader, isRTL && styles.rowRTL]}>
            <View style={styles.shieldIconWrap}>
              <Ionicons name="shield-checkmark" size={18} color={COLORS.accentDark} />
            </View>
            <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <View style={[styles.shieldBadgeRow, isRTL && styles.shieldBadgeRowRTL]}>
                <View style={styles.shieldPulseDot} />
                <Text style={styles.shieldBadgeText}>
                  {isArabic ? 'توثيق الهوية والوساطة المعتمدة' : 'VERIFIED EQUESTRIAN PASSPORT'}
                </Text>
              </View>
              <Text style={[styles.identityShieldTitle, isRTL && styles.textRTL]}>
                {isArabic ? 'ضمان الصفقات وامتيازات العضوية' : 'Escrow Protection & Member Privileges'}
              </Text>
              <Text style={[styles.identityShieldDesc, isRTL && styles.textRTL]}>
                {isArabic
                  ? 'حساب موثق يتمتع بحماية الوساطة البنكية، عقود البيع الثنائية، والاستشارة البيطرية المباشرة'
                  : 'Authenticated account backed by bank-grade escrow protection, bilateral contracts, and equine advisory'}
              </Text>
            </View>
          </View>

          {/* 3 Identity Trust Pillars */}
          <View style={[styles.identityPillarsRow, isRTL && styles.rowRTL]}>
            <View style={[styles.identityPillarBadge, isRTL && styles.rowRTL]}>
              <Ionicons name="shield-checkmark" size={11} color={COLORS.accentDark} />
              <Text style={styles.identityPillarText}>
                {isArabic ? 'توثيق الشريحة والجواز' : 'Official Passport Vetting'}
              </Text>
            </View>
            <View style={[styles.identityPillarBadge, isRTL && styles.rowRTL]}>
              <Ionicons name="shield-checkmark" size={11} color={COLORS.accentDark} />
              <Text style={styles.identityPillarText}>
                {isArabic ? 'حساب ضمان بنكي مخصص' : 'Bank-Secured Escrow'}
              </Text>
            </View>
            <View style={[styles.identityPillarBadge, isRTL && styles.rowRTL]}>
              <Ionicons name="shield-checkmark" size={11} color={COLORS.accentDark} />
              <Text style={styles.identityPillarText}>
                {isArabic ? 'مستشار صفقات خيل مخصص' : 'VIP Broker Access'}
              </Text>
            </View>
          </View>

          {/* 1-Tap Concierge Consultation Button */}
          <TouchableOpacity
            testID="profile-shield-concierge-btn"
            style={[styles.shieldConciergeBtn, isRTL && styles.rowRTL]}
            activeOpacity={0.85}
            onPress={handleSupportChat}
          >
            <Ionicons name="logo-whatsapp" size={15} color="#25D366" />
            <Text style={styles.shieldConciergeBtnText}>
              {isArabic ? 'استشارة مسؤول العضوية والوساطة' : 'Consult Membership & Escrow Officer'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Settings: Language & Support */}
        <View
          testID="profile-settings-section"
          style={[styles.settingsSection, isRTL && styles.settingsSectionRTL]}
        >
          <Text style={[styles.settingsTitle, isRTL && styles.textRTL]}>{t('settings')}</Text>

          <View testID="profile-language-card" style={styles.settingsCard}>
            <View style={[styles.settingsRow, isRTL && styles.rowRTL]}>
              <Ionicons name="globe-outline" size={20} color={COLORS.primary} />
              <Text style={[styles.settingsLabel, isRTL && styles.textRTL]}>{t('language')}</Text>
            </View>
            <View testID="profile-language-options" style={styles.langToggleRow}>
              <TouchableOpacity
                style={[styles.langOption, language === 'en' && styles.langOptionActive]}
                onPress={() => handleLanguageChange('en')}
                activeOpacity={0.8}
              >
                <Text style={[styles.langOptionText, language === 'en' && styles.langOptionTextActive]}>
                  {t('languageEnglish')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.langOption, language === 'ar' && styles.langOptionActive]}
                onPress={() => handleLanguageChange('ar')}
                activeOpacity={0.8}
              >
                <Text style={[styles.langOptionText, language === 'ar' && styles.langOptionTextActive]}>
                  {t('languageArabic')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.savedAlertsCard, isRTL && styles.rowRTL]}
            onPress={() => navigation.navigate('SavedAlerts')}
            activeOpacity={0.8}
          >
            <View style={[styles.settingsRow, isRTL && styles.rowRTL]}>
              <Ionicons name="notifications-outline" size={20} color={COLORS.primary} />
              <Text style={[styles.settingsLabel, isRTL && styles.textRTL]}>{t('savedAlerts')}</Text>
              {unreadAlerts > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{unreadAlerts > 99 ? '99+' : unreadAlerts}</Text>
                </View>
              )}
            </View>
            <Ionicons
              name={isRTL ? 'chevron-back' : 'chevron-forward'}
              size={18}
              color={COLORS.textLight}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.savedAlertsCard, isRTL && styles.rowRTL]}
            onPress={() => navigation.navigate('Offers')}
            activeOpacity={0.8}
          >
            <View style={[styles.settingsRow, isRTL && styles.rowRTL]}>
              <Ionicons name="pricetag-outline" size={20} color={COLORS.primary} />
              <Text style={[styles.settingsLabel, isRTL && styles.textRTL]}>{t('offersInbox')}</Text>
              {actionableOffers > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{actionableOffers > 99 ? '99+' : actionableOffers}</Text>
                </View>
              )}
            </View>
            <Ionicons
              name={isRTL ? 'chevron-back' : 'chevron-forward'}
              size={18}
              color={COLORS.textLight}
            />
          </TouchableOpacity>

          {/* Equestrian Support & Concierge */}
          <TouchableOpacity
            style={[styles.savedAlertsCard, isRTL && styles.rowRTL]}
            onPress={handleSupportChat}
            activeOpacity={0.8}
          >
            <View style={[styles.settingsRow, isRTL && styles.rowRTL]}>
              <Ionicons name="logo-whatsapp" size={20} color="#16a34a" />
              <View>
                <Text style={[styles.settingsLabel, isRTL && styles.textRTL]}>{t('supportConciergeTitle')}</Text>
              </View>
            </View>
            <Ionicons
              name={isRTL ? 'chevron-back' : 'chevron-forward'}
              size={18}
              color={COLORS.textLight}
            />
          </TouchableOpacity>
        </View>

        {/* My Listings */}
        <View style={styles.listingsSection}>
          <View style={[styles.listingsHeaderRow, isRTL && styles.rowRTL]}>
            <Text style={[styles.listingsSectionTitle, isRTL && styles.textRTL]}>{t('myListings')}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Sell')} activeOpacity={0.8}>
              <Text style={styles.addListingQuickText}>+ {t('tabSell')}</Text>
            </TouchableOpacity>
          </View>

          {/* Horizontal Filter Pills */}
          <ScrollView
            horizontal
            inverted={isRTL}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterPillsRow}
          >
            {LISTING_FILTERS.map((f) => {
              const isSelected = listingFilter === f.id;
              const count = getFilterCount(f.id);
              return (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.filterPill, isSelected && styles.filterPillActive, isRTL && styles.rowRTL]}
                  onPress={() => setListingFilter(f.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterPillText, isSelected && styles.filterPillTextActive]}>
                    {t(f.labelKey)}
                  </Text>
                  <View style={[styles.filterPillBadge, isSelected && styles.filterPillBadgeActive]}>
                    <Text style={[styles.filterPillBadgeText, isSelected && styles.filterPillBadgeTextActive]}>
                      {count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {loadingListings ? (
            <ActivityIndicator
              size="large"
              color={COLORS.primary}
              style={{ marginTop: SPACING.lg }}
            />
          ) : myListings.length === 0 ? (
            <EmptyState
              icon="pricetag-outline"
              title={t('noListingsYet')}
              subtitle={t('noListingsSubtitle')}
            />
          ) : filteredListings.length === 0 ? (
            <EmptyState
              icon="filter-outline"
              title={t('noFilteredListings')}
              subtitle={t('noListingsSubtitle')}
            />
          ) : (
            <>
              {filteredListings.map((item) =>
                item.type === 'horse' ? (
                  <HorseCard
                    key={item.id}
                    horse={item}
                    onPress={() => navigation.navigate('HorseDetail', { horse: item })}
                    onFavorite={() => {}}
                    isFavorited={false}
                  />
                ) : (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.genericListingCard, isRTL && styles.rowRTL]}
                    activeOpacity={0.85}
                    onPress={() => {
                      const target = getDetailTarget(item.type, item.id);
                      if (target) navigation.navigate(target.screen, target.params);
                    }}
                  >
                    {item.images?.[0]?.image_url ? (
                      <Image
                        source={{ uri: item.images[0].image_url }}
                        style={styles.genericCardImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.genericCardImagePlaceholder}>
                        <Ionicons
                          name={
                            item.type === 'equipment'
                              ? 'shield-outline'
                              : item.type === 'rider_gear'
                              ? 'shirt-outline'
                              : 'construct-outline'
                          }
                          size={24}
                          color={COLORS.textLight}
                        />
                      </View>
                    )}

                    <View style={styles.genericCardContent}>
                      <View style={[styles.genericCardHeader, isRTL && styles.rowRTL]}>
                        <View style={styles.genericTypeBadge}>
                          <Text style={styles.genericTypeText}>{getTypeLabel(item.type)}</Text>
                        </View>
                        <View
                          style={[
                            styles.genericStatusBadge,
                            item.status === 'approved' && styles.statusApproved,
                            item.status === 'pending_review' && styles.statusPending,
                            item.status === 'rejected' && styles.statusRejected,
                          ]}
                        >
                          <Text style={styles.genericStatusText}>{getStatusLabel(item.status)}</Text>
                        </View>
                      </View>

                      <Text style={[styles.genericCardTitle, isRTL && styles.textRTL]} numberOfLines={2}>
                        {item.title}
                      </Text>

                      {item.location_text ? (
                        <View style={[styles.genericLocationRow, isRTL && styles.rowRTL]}>
                          <Ionicons name="location-outline" size={12} color={COLORS.textSecondary} />
                          <Text style={[styles.genericLocationText, isRTL && styles.textRTL]} numberOfLines={1}>
                            {item.location_text}
                          </Text>
                        </View>
                      ) : null}

                      {item.status === 'rejected' && !!item.rejection_reason && (
                        <View style={styles.rejectionReasonBox}>
                          <Text style={styles.rejectionReasonLabel}>
                            {t('adminRejectReason') || 'Rejection Reason'}
                          </Text>
                          <Text style={styles.rejectionReasonText} numberOfLines={2}>
                            {item.rejection_reason}
                          </Text>
                        </View>
                      )}

                      <Text style={[styles.genericCardPrice, isRTL && styles.textRTL]}>
                        {item.price ? `${item.price.toLocaleString()} ${t('currencyAed') || 'AED'}` : 'POA'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )
              )}
              {myListings.length < listingsTotal && (
                <TouchableOpacity
                  onPress={() => {
                    const nextPage = listingsPage + 1;
                    setListingsPage(nextPage);
                    fetchMyListings(nextPage, true);
                  }}
                  disabled={loadingMoreListings}
                  style={[styles.loadMoreBtn, loadingMoreListings && styles.loadMoreBtnDisabled]}
                  activeOpacity={0.8}
                >
                  {loadingMoreListings ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : (
                    <Text style={styles.loadMoreText}>{t('loadMore')}</Text>
                  )}
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        <View style={{ height: SPACING.xxl * 2 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm + 4,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    ...SHADOWS.subtle,
  },
  screenHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  headerBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm + 2,
    flex: 1,
  },
  headerBrandRowRTL: {
    flexDirection: 'row-reverse',
  },
  brandIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(197, 160, 89, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.subtle,
  },
  headerTitleWrap: {
    justifyContent: 'center',
  },
  portalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FAF5EA',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.4)',
    paddingVertical: 1.5,
    paddingHorizontal: 7,
    borderRadius: RADIUS.full,
    marginBottom: 2,
    alignSelf: 'flex-start',
  },
  portalBadgeRTL: {
    flexDirection: 'row-reverse',
    alignSelf: 'flex-end',
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
  identityShieldCard: {
    backgroundColor: '#FAF8F5',
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1.5,
    borderColor: '#E8DCBF',
    ...SHADOWS.card,
  },
  identityShieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  shieldIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FAF5EA',
    borderWidth: 1.2,
    borderColor: 'rgba(197, 160, 89, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FAF5EA',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.4)',
    paddingVertical: 1.5,
    paddingHorizontal: 7,
    borderRadius: RADIUS.full,
    marginBottom: 3,
    alignSelf: 'flex-start',
  },
  shieldBadgeRowRTL: {
    flexDirection: 'row-reverse',
    alignSelf: 'flex-end',
  },
  shieldPulseDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10B981',
  },
  shieldBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: COLORS.accentDark,
    letterSpacing: 0.5,
  },
  identityShieldTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
  },
  identityShieldDesc: {
    fontSize: 10.5,
    color: COLORS.textSecondary,
    lineHeight: 15,
    marginTop: 2,
  },
  identityPillarsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(197, 160, 89, 0.22)',
    paddingTop: 8,
    marginTop: 2,
  },
  identityPillarBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.3)',
    borderRadius: RADIUS.full,
    paddingVertical: 2.5,
    paddingHorizontal: 8,
  },
  identityPillarText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: COLORS.primary,
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
    marginTop: SPACING.xs + 4,
    ...SHADOWS.subtle,
  },
  shieldConciergeBtnText: {
    color: '#075E54',
    fontWeight: '800',
    fontSize: 12,
  },
  hubCardAdmin: {
    borderColor: 'rgba(180, 83, 9, 0.3)',
    backgroundColor: '#FFFDF9',
  },
  screenHeaderTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.primary,
  },
  headerSupportBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FAF5EA',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.35)',
  },
  profileHeader: {
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.md,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.card,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  avatar: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#FAF5EA',
    borderWidth: 2,
    borderColor: 'rgba(197, 160, 89, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.subtle,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
  },
  profileInfo: {
    flex: 1,
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    flexWrap: 'wrap',
  },
  profileName: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.success + '12',
    paddingHorizontal: SPACING.xs + 2,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  verifiedBadgeText: {
    color: COLORS.success,
    fontWeight: '700',
    fontSize: 10.5,
  },
  memberRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FAF5EA',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.35)',
    paddingHorizontal: SPACING.xs + 3,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
    marginTop: 3,
    marginBottom: 2,
  },
  memberRoleBadgeText: {
    color: COLORS.accentDark,
    fontWeight: '700',
    fontSize: 10.5,
  },
  profileEmail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  locationText: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  profileActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight + '12',
    borderWidth: 1,
    borderColor: COLORS.primaryLight + '30',
  },
  editBtnText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 12.5,
  },
  signOutBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.error + '10',
    borderWidth: 1,
    borderColor: COLORS.error + '25',
  },
  signOutBtnText: {
    color: COLORS.error,
    fontWeight: '700',
    fontSize: 12.5,
  },
  verifyCard: {
    backgroundColor: COLORS.warning + '10',
    borderWidth: 1,
    borderColor: COLORS.warning + '30',
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  verifyCardRTL: {
    alignItems: 'flex-end',
  },
  verifyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  verifyTitle: {
    ...FONTS.body,
    color: COLORS.text,
    fontWeight: '700',
  },
  verifyBtn: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.warning,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    minWidth: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyBtnText: {
    ...FONTS.bodySmall,
    color: COLORS.white,
    fontWeight: '700',
  },
  verifyForm: {
    width: '100%',
  },
  verifyLabel: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  verifyInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    ...FONTS.body,
    color: COLORS.text,
  },
  verifyActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  verifyNowBtn: {
    backgroundColor: COLORS.success,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    minWidth: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyNowBtnText: {
    ...FONTS.bodySmall,
    color: COLORS.white,
    fontWeight: '700',
  },
  resendBtn: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resendBtnText: {
    ...FONTS.bodySmall,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  editCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.card,
  },
  editField: {
    marginBottom: SPACING.md,
  },
  editLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  editInput: {
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    ...FONTS.body,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  cancelEditBtn: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  cancelEditText: {
    ...FONTS.body,
    color: COLORS.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.subtle,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 9.5,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  hubGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
  },
  hubCard: {
    width: '48%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.card,
  },
  hubCardIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  hubCardTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 2,
  },
  hubCardDesc: {
    fontSize: 10.5,
    color: COLORS.textSecondary,
    lineHeight: 14,
  },
  hubBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  hubBadgeText: {
    color: COLORS.white,
    fontSize: 9.5,
    fontWeight: '800',
  },
  settingsSection: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.lg,
  },
  settingsSectionRTL: {
    alignItems: 'stretch',
  },
  settingsTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.subtle,
  },
  savedAlertsCard: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.subtle,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 10,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  settingsLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.text,
  },
  langToggleRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  langOption: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.sm,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.inputBg,
  },
  langOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight + '15',
  },
  langOptionText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  langOptionTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  listingsSection: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.xs,
  },
  listingsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.xs,
  },
  listingsSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addListingQuickText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
  },
  filterPillsRow: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.full,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    ...SHADOWS.subtle,
  },
  filterPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginRight: 6,
  },
  filterPillTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  filterPillBadge: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  filterPillBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  filterPillBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  filterPillBadgeTextActive: {
    color: COLORS.white,
  },
  genericListingCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.card,
  },
  genericCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  genericTypeBadge: {
    backgroundColor: '#FAF5EA',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.3)',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 6,
  },
  genericTypeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accentDark,
  },
  genericStatusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: COLORS.borderLight,
  },
  statusApproved: {
    backgroundColor: '#D1FAE5',
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
  },
  statusRejected: {
    backgroundColor: '#FEE2E2',
  },
  genericStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  genericCardTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
  },
  genericCardPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
  },
  genericCardImage: {
    width: 86,
    height: 86,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.skeleton,
  },
  genericCardImagePlaceholder: {
    width: 86,
    height: 86,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genericCardContent: {
    flex: 1,
    marginLeft: 12,
  },
  genericLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 4,
  },
  genericLocationText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginHorizontal: 3,
  },
  rejectionReasonBox: {
    backgroundColor: COLORS.error + '10',
    borderWidth: 1,
    borderColor: COLORS.error + '30',
    borderRadius: RADIUS.sm,
    padding: SPACING.xs + 2,
    marginVertical: SPACING.xs,
  },
  rejectionReasonLabel: {
    ...FONTS.caption,
    color: COLORS.error,
    fontWeight: '700',
    marginBottom: 2,
  },
  rejectionReasonText: {
    ...FONTS.bodySmall,
    color: COLORS.text,
  },
  loadMoreBtn: {
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  loadMoreBtnDisabled: {
    opacity: 0.5,
  },
  loadMoreText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 13.5,
  },
  guestScrollContent: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
  },
  guestCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.card,
  },
  guestBrandMark: {
    marginBottom: SPACING.md,
  },
  guestTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  guestSubtitle: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 19,
  },
  benefitsList: {
    width: '100%',
    gap: 12,
    marginBottom: SPACING.xl,
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  benefitText: {
    fontSize: 12,
    color: COLORS.text,
    flex: 1,
  },
  guestPrimaryBtn: {
    width: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: SPACING.sm,
    ...SHADOWS.subtle,
  },
  guestPrimaryBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  guestSecondaryBtn: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  guestSecondaryBtnText: {
    color: COLORS.primary,
    fontSize: 13.5,
    fontWeight: '700',
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  textRTL: {
    textAlign: 'right',
  },
  inputRTL: {
    textAlign: 'right',
  },
});
