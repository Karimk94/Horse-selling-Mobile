import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  FlatList,
  StatusBar,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../config/theme';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import HorseCard from '../components/HorseCard';
import EmptyState from '../components/EmptyState';
import * as apiService from '../services/api';
import { extractApiErrorMessage } from '../utils/apiErrors';
import { useToast } from '../components/ToastProvider';

export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, signOut, refreshProfile } = useAuth();
  const { t, isRTL, setLanguage, language } = useLanguage();
  const isArabic = language === 'ar';
  const toast = useToast();
  const [myListings, setMyListings] = useState([]);
  const [listingsPage, setListingsPage] = useState(0);
  const [listingsTotal, setListingsTotal] = useState(0);
  const [loadingListings, setLoadingListings] = useState(false);
  const [loadingMoreListings, setLoadingMoreListings] = useState(false);
  const listingsLimit = 10;
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('listings');
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
        apiService.getHorses({ owner_id: user.id, skip: 0, limit: 100 }),
        apiService.getEquipmentList({ owner_id: user.id, skip: 0, limit: 100 }),
        apiService.getRiderGearList({ owner_id: user.id, skip: 0, limit: 100 }),
        apiService.getServicesList({ owner_id: user.id, skip: 0, limit: 100 }),
      ]);

      const horses = (horsesRes.data.horses || horsesRes.data.items || horsesRes.data || []).map(
        (h) => ({ ...h, type: 'horse' })
      );
      const equipment = (equipmentRes.data?.items || []).map((e) => ({ ...e, type: 'equipment' }));
      const riderGear = (riderGearRes.data?.items || []).map((r) => ({ ...r, type: 'rider_gear' }));
      const services = (servicesRes.data?.items || []).map((s) => ({ ...s, type: 'services' }));

      const items = [...horses, ...equipment, ...riderGear, ...services];
      setMyListings(items);
      setListingsTotal(items.length);
    } catch {
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

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <View style={styles.header}>
          <Text style={[styles.headerTitle, isRTL && styles.textRTL]}>{t('profile')}</Text>
        </View>
        <View style={styles.authPrompt}>
          <View style={styles.authPromptCircle}>
            <Ionicons name="person-outline" size={48} color={COLORS.textLight} />
          </View>
          <Text style={[styles.authPromptTitle, isRTL && styles.textRTL]}>{t('signInToAccount')}</Text>
          <Text style={[styles.authPromptSubtitle, isRTL && styles.textRTL]}>
            {t('signInToAccountSubtitle')}
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

  const initials = (
    (user?.profile?.first_name?.[0] || '') +
    (user?.profile?.last_name?.[0] || '')
  ).toUpperCase() || user?.email?.[0]?.toUpperCase() || '?';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.profileInfo}>
              <View style={[styles.profileNameRow, isRTL && styles.rowRTL]}>
                <Text style={styles.profileName}>
                  {user?.profile?.first_name || t('userFallback')}{' '}
                  {user?.profile?.last_name || ''}
                </Text>
                {user?.is_verified && (
                  <View style={[styles.verifiedBadge, isRTL && styles.rowRTL]}>
                    <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                    <Text style={styles.verifiedBadgeText}>{t('verified')}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.profileEmail}>{user?.email}</Text>
              {user?.profile?.location && (
                <View style={styles.locationRow}>
                  <Ionicons
                    name="location-outline"
                    size={14}
                    color={COLORS.textLight}
                  />
                  <Text style={styles.locationText}>
                    {user.profile.location}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.profileActions}>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={editing ? saveProfile : startEditing}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <>
                  <Ionicons
                    name={editing ? 'checkmark' : 'create-outline'}
                    size={18}
                    color={COLORS.primary}
                  />
                  <Text style={styles.editBtnText}>
                    {editing ? t('save') : t('editProfile')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.signOutBtn}
              onPress={handleSignOut}
            >
              <Ionicons
                name="log-out-outline"
                size={18}
                color={COLORS.error}
              />
              <Text style={styles.signOutBtnText}>{t('signOut')}</Text>
            </TouchableOpacity>
          </View>
        </View>

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
            >
              <Text style={styles.cancelEditText}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{myListings.length}</Text>
            <Text style={styles.statLabel}>{t('listingsCount')}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {myListings.filter((h) => h.status === 'approved').length}
            </Text>
            <Text style={styles.statLabel}>{t('activeCount')}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {myListings.filter((h) => h.status === 'pending_review').length}
            </Text>
            <Text style={styles.statLabel}>{t('pendingCount')}</Text>
          </View>
        </View>

        {/* Settings: Language */}
        <View style={[styles.settingsSection, isRTL && styles.settingsSectionRTL]}>
          <Text style={[styles.settingsTitle, isRTL && styles.textRTL]}>{t('settings')}</Text>
          <View style={[styles.settingsCard, isRTL && styles.rowRTL]}>
            <View style={[styles.settingsRow, isRTL && styles.rowRTL]}>
              <Ionicons name="globe-outline" size={22} color={COLORS.primary} />
              <Text style={[styles.settingsLabel, isRTL && styles.textRTL]}>{t('language')}</Text>
            </View>
            <View style={[styles.langToggleRow, isRTL && styles.rowRTL]}>
              <TouchableOpacity
                style={[styles.langOption, language === 'en' && styles.langOptionActive]}
                onPress={() => handleLanguageChange('en')}
              >
                <Text style={[styles.langOptionText, language === 'en' && styles.langOptionTextActive]}>
                  {t('languageEnglish')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.langOption, language === 'ar' && styles.langOptionActive]}
                onPress={() => handleLanguageChange('ar')}
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
          >
            <View style={[styles.settingsRow, isRTL && styles.rowRTL]}>
              <Ionicons name="notifications-outline" size={22} color={COLORS.primary} />
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
          >
            <View style={[styles.settingsRow, isRTL && styles.rowRTL]}>
              <Ionicons name="pricetag-outline" size={22} color={COLORS.primary} />
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
        </View>

        {/* My Listings */}
        <View style={styles.listingsSection}>
          <Text style={[styles.listingsSectionTitle, isRTL && styles.textRTL]}>{t('myListings')}</Text>
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
          ) : (
            <>
              {myListings.map((item) =>
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
                    style={styles.genericListingCard}
                    activeOpacity={0.85}
                    onPress={() => {
                      const target = getDetailTarget(item.type, item.id);
                      if (target) navigation.navigate(target.screen, target.params);
                    }}
                  >
                    <View style={styles.genericCardHeader}>
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
                    <Text style={styles.genericCardTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={styles.genericCardPrice}>
                      {item.price ? `${item.price.toLocaleString()} AED` : 'POA'}
                    </Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
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
    fontWeight: '600',
    fontSize: 14,
  },
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
  profileHeader: {
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginTop: SPACING.md,
    ...SHADOWS.card,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primaryLight + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...FONTS.h2,
    color: COLORS.primary,
  },
  profileInfo: {
    flex: 1,
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  profileName: {
    ...FONTS.h3,
    color: COLORS.text,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.success + '12',
    paddingHorizontal: SPACING.xs + 2,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  verifiedBadgeText: {
    ...FONTS.caption,
    color: COLORS.success,
    fontWeight: '700',
    fontSize: 11,
  },
  profileEmail: {
    ...FONTS.bodySmall,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: 4,
  },
  locationText: {
    ...FONTS.bodySmall,
    color: COLORS.textLight,
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
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight + '12',
  },
  editBtnText: {
    ...FONTS.bodySmall,
    color: COLORS.primary,
    fontWeight: '600',
  },
  signOutBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.error + '10',
  },
  signOutBtnText: {
    ...FONTS.bodySmall,
    color: COLORS.error,
    fontWeight: '600',
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
    fontWeight: '600',
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
    ...SHADOWS.card,
  },
  editField: {
    marginBottom: SPACING.md,
  },
  editLabel: {
    ...FONTS.caption,
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
    ...SHADOWS.soft,
  },
  statNumber: {
    ...FONTS.h2,
    color: COLORS.primary,
  },
  statLabel: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  listingsSection: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.xs,
  },
  listingsSectionTitle: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  genericListingCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  genericCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  genericTypeBadge: {
    backgroundColor: COLORS.primaryLight + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  genericTypeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  genericStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
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
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  genericCardTitle: {
    ...FONTS.body,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  genericCardPrice: {
    ...FONTS.priceSm,
    color: COLORS.primary,
  },
  authPrompt: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  authPromptCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
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
  settingsSection: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.lg,
  },
  settingsSectionRTL: {
    alignItems: 'flex-end',
  },
  settingsTitle: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  settingsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...SHADOWS.soft,
  },
  savedAlertsCard: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...SHADOWS.soft,
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
    ...FONTS.caption,
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 10,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  settingsLabel: {
    ...FONTS.body,
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
    ...FONTS.bodySmall,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  langOptionTextActive: {
    color: COLORS.primary,
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
});
