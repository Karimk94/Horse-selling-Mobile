import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Switch,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../config/theme';
import { useLanguage } from '../contexts/LanguageContext';
import * as apiService from '../services/api';
import { extractApiErrorMessage } from '../utils/apiErrors';
import { useToast } from '../components/ToastProvider';
import BrandMark from '../components/BrandMark';

const BUDGET_PRESETS = [
  { label: '< 25k', min: '0', max: '25000' },
  { label: '25k - 50k', min: '25000', max: '50000' },
  { label: '50k - 100k', min: '50000', max: '100000' },
  { label: '100k+', min: '100000', max: '' },
];

const QUICK_DISCIPLINES = [
  { key: 'Show Jumping', labelKey: 'disciplineShowJumping' },
  { key: 'Endurance', labelKey: 'disciplineEndurance' },
  { key: 'Dressage', labelKey: 'disciplineDressage' },
  { key: 'Racing', labelKey: 'disciplineRacing' },
  { key: 'Leisure', labelKey: 'disciplineLeisure' },
];

const POPULAR_BREEDS = [
  { key: 'Arabian', labelKey: 'breedArabian' },
  { key: 'Thoroughbred', labelKey: 'breedThoroughbred' },
  { key: 'Warmblood', labelKey: 'breedWarmblood' },
  { key: 'Andalusian', labelKey: 'breedAndalusian' },
  { key: 'Polo Pony', labelKey: 'breedPoloPony' },
  { key: 'Friesian', labelKey: 'breedFriesian' },
];

export default function SavedAlertsScreen({ navigation, initialAlerts = null, initialInbox = null }) {
  const insets = useSafeAreaInsets();
  const { t, isRTL } = useLanguage();

  const [loading, setLoading] = useState(!initialAlerts && !initialInbox);
  const [saving, setSaving] = useState(false);
  const [alerts, setAlerts] = useState(initialAlerts || []);
  const [inbox, setInbox] = useState(initialInbox || []);
  const [activeScope, setActiveScope] = useState('horses');
  const [isFormExpanded, setIsFormExpanded] = useState(true);
  const [form, setForm] = useState({
    name: '',
    breed: '',
    min_price: '',
    max_price: '',
    discipline: '',
    vet_check_available: false,
    verified_seller: false,
  });
  const [errors, setErrors] = useState({});
  const toast = useToast();

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const [savedRes, inboxRes] = await Promise.all([
        apiService.getSavedSearches(),
        apiService.getSavedSearchAlerts(),
      ]);
      setAlerts(savedRes.data || []);
      setInbox(inboxRes.data || []);
    } catch (error) {
      toast?.show?.(extractApiErrorMessage(error, t('savedAlertLoadFailed')), { type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      loadAlerts();
    }, [loadAlerts])
  );

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSelectBreed = (breedKey) => {
    if (form.breed === breedKey) {
      updateForm('breed', '');
    } else {
      updateForm('breed', breedKey);
    }
  };

  const createAlert = async () => {
    const next = {};
    if (!form.name.trim()) next.name = t('savedAlertNameRequired');
    // Validate numeric price inputs before sending to backend
    const minPriceRaw = form.min_price?.toString().trim();
    const maxPriceRaw = form.max_price?.toString().trim();
    let minPrice = null;
    let maxPrice = null;

    if (minPriceRaw) {
      const parsed = Number(minPriceRaw);
      if (!Number.isFinite(parsed) || parsed < 0) {
        next.min_price = t('adminInvalidPrice');
      }
      minPrice = parsed;
    }

    if (maxPriceRaw) {
      const parsed = Number(maxPriceRaw);
      if (!Number.isFinite(parsed) || parsed < 0) {
        next.max_price = t('adminInvalidPrice');
      }
      maxPrice = parsed;
    }
    if (minPrice != null && maxPrice != null && minPrice > maxPrice) {
      next.min_price = t('minMustBeLessOrEqualMax') || 'Min must be less than or equal to Max';
    }

    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }

    setSaving(true);
    try {
      await apiService.createSavedSearch({
        name: form.name.trim(),
        breed: form.breed.trim() || null,
        discipline: form.discipline.trim() || null,
        min_price: minPrice != null ? minPrice : null,
        max_price: maxPrice != null ? maxPrice : null,
        vet_check_available: form.vet_check_available || null,
        verified_seller: form.verified_seller || null,
      });

      setForm({
        name: '',
        breed: '',
        min_price: '',
        max_price: '',
        discipline: '',
        vet_check_available: false,
        verified_seller: false,
      });
      setErrors({});
      await loadAlerts();
      toast?.show?.(t('savedAlertCreated'), { type: 'success' });
    } catch (error) {
      toast?.show?.(extractApiErrorMessage(error, t('savedAlertCreateFailed')), { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const removeAlert = async (id) => {
    try {
      await apiService.deleteSavedSearch(id);
      await loadAlerts();
    } catch (error) {
      toast?.show?.(extractApiErrorMessage(error, t('savedAlertDeleteFailed')), { type: 'error' });
    }
  };

  const markAlertRead = async (id) => {
    try {
      await apiService.markSavedSearchAlertRead(id);
      await loadAlerts();
    } catch (error) {
      toast?.show?.(extractApiErrorMessage(error, t('savedAlertMarkReadFailed')), { type: 'error' });
    }
  };

  const openAlertHorse = async (item) => {
    try {
      if (!item.is_read) {
        await apiService.markSavedSearchAlertRead(item.id);
      }
      const res = await apiService.getHorse(item.horse_id);
      await loadAlerts();
      navigation.navigate('HorseDetail', { horse: res.data });
    } catch (error) {
      toast?.show?.(extractApiErrorMessage(error, t('savedAlertOpenFailed')), { type: 'error' });
    }
  };

  const markAllRead = async () => {
    try {
      await apiService.markAllSavedSearchAlertsRead();
      await loadAlerts();
    } catch (error) {
      toast?.show?.(extractApiErrorMessage(error, t('savedAlertMarkReadFailed')), { type: 'error' });
    }
  };

  const handleSearchLiveMatches = (alert) => {
    const searchParams = {
      breed: alert.breed || undefined,
      discipline: alert.discipline || undefined,
      minPrice: alert.min_price != null ? alert.min_price : undefined,
      maxPrice: alert.max_price != null ? alert.max_price : undefined,
      vetCheckOnly: Boolean(alert.vet_check_available),
      verifiedSellerOnly: Boolean(alert.verified_seller),
    };
    try {
      navigation.navigate('Browse', {
        screen: 'HomeMain',
        params: searchParams,
      });
    } catch {
      navigation.navigate('HomeMain', searchParams);
    }
  };

  const handleConciergeInquiry = () => {
    const query = isRTL
      ? 'مرحباً، أود الاستفسار عن خدمة البحث الخاص والرادار وتنبيهات الخيول لدى SteedMarket.'
      : 'Hello, I would like to inquire about VIP Equine Sourcing, market radar, and custom alerts at SteedMarket.';
    const url = `https://wa.me/971500000000?text=${encodeURIComponent(query)}`;
    Linking.openURL(url).catch(() => {});
  };

  const handleScoutInquiry = () => {
    const query = isRTL
      ? 'مرحباً، أبحث عن سلالة أو مواصفات خاصة عبر خدمة المستكشف الخاص لدى SteedMarket.'
      : 'Hello, I am seeking a bespoke pedigree or specific lineage through your VIP Pedigree Scout service.';
    const url = `https://wa.me/971500000000?text=${encodeURIComponent(query)}`;
    Linking.openURL(url).catch(() => {});
  };

  const unreadCount = inbox.filter((item) => !item.is_read).length;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Luxury Brand Crest & Navigation Header */}
      <View style={[styles.header, isRTL && styles.rowRTL]}>
        <View style={[styles.headerLeftWrap, isRTL && styles.rowRTL]}>
          <TouchableOpacity
            testID="alerts-back-button"
            onPress={() => navigation.goBack()}
            style={styles.headerIconBtn}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={20} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.brandMarkPill}>
            <BrandMark size={24} color={COLORS.accent} />
          </View>
          <View style={styles.headerTitles}>
            <View
              testID="saved-alerts-vip-badge"
              style={[styles.headerTagRow, isRTL && styles.rowRTL]}
            >
              <Ionicons name="ribbon" size={11} color={COLORS.accentDark} />
              <View style={styles.livePulseDot} />
              <Text style={styles.headerTagText}>
                {isRTL ? 'رادار وبحث السلالات النخبة' : 'VIP EQUINE SEARCH RADAR'}
              </Text>
            </View>
            <Text style={[styles.title, isRTL && styles.textRTL]}>{t('savedAlerts')}</Text>
          </View>
        </View>

        <View style={[styles.headerRightActions, isRTL && styles.rowRTL]}>
          <TouchableOpacity
            testID="alerts-header-refresh-btn"
            style={styles.headerIconBtn}
            onPress={loadAlerts}
            accessibilityRole="button"
            accessibilityLabel="Refresh Alerts"
          >
            <Ionicons name="refresh-outline" size={19} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity
            testID="saved-alerts-header-concierge-btn"
            style={[styles.headerIconBtn, styles.headerConciergeBtn]}
            onPress={handleConciergeInquiry}
            accessibilityRole="button"
            accessibilityLabel="WhatsApp Concierge"
          >
            <View testID="alerts-header-concierge-btn">
              <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* VIP Equine Match Concierge Hero Card & Telemetry Cockpit */}
        <View style={styles.conciergeCard}>
          <View style={[styles.conciergeHeader, isRTL && styles.rowRTL]}>
            <View style={styles.conciergeIconBadge}>
              <Ionicons name="sparkles" size={18} color={COLORS.accent} />
            </View>
            <View style={styles.conciergeTitleCol}>
              <Text style={[styles.conciergeTitle, isRTL && styles.textRTL]}>
                {t('alertConciergeTitle')}
              </Text>
              <Text style={[styles.conciergeSubtitle, isRTL && styles.textRTL]}>
                {t('alertConciergeDesc')}
              </Text>
            </View>
          </View>

          <View style={[styles.conciergeStatsRow, isRTL && styles.rowRTL]}>
            <View style={styles.conciergeStatPill} testID="alerts-metric-active-agents">
              <View style={styles.pulseDot} />
              <Text style={styles.conciergeStatText}>
                {alerts.length} {t('activeAlertAgents')}
              </Text>
            </View>
            {unreadCount > 0 && (
              <View style={[styles.conciergeStatPill, styles.conciergeStatPillGold]} testID="alerts-metric-unread-matches">
                <Ionicons name="notifications" size={12} color={COLORS.accent} />
                <Text style={styles.conciergeStatTextGold}>
                  {unreadCount} {t('newMatchesFound')}
                </Text>
              </View>
            )}
            <View style={styles.conciergeStatPill} testID="alerts-metric-total-matches">
              <Ionicons name="flash-outline" size={12} color={COLORS.white} />
              <Text style={styles.conciergeStatText}>
                {inbox.length} {isRTL ? 'إجمالي التطابقات' : 'Total Captured'}
              </Text>
            </View>
            <View style={[styles.conciergeStatPill, styles.conciergeStatPillEmerald]} testID="alerts-metric-radar-status">
              <View style={styles.pulseDot} />
              <Text style={styles.conciergeStatTextEmerald}>
                {isRTL ? 'رادار حي 24/7' : '24/7 Live Radar'}
              </Text>
            </View>
          </View>
        </View>

        {/* Radar Domain Scope Segmented Bar */}
        <View style={[styles.domainBar, isRTL && styles.rowRTL]}>
          <TouchableOpacity
            testID="alerts-scope-horses"
            style={[styles.domainChip, activeScope === 'horses' && styles.domainChipActive]}
            onPress={() => setActiveScope('horses')}
          >
            <Text style={[styles.domainChipText, activeScope === 'horses' && styles.domainChipTextActive]}>
              🐎 {isRTL ? 'الخيول' : 'Horses'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="alerts-scope-equipment"
            style={[styles.domainChip, activeScope === 'equipment' && styles.domainChipActive]}
            onPress={() => {
              setActiveScope('equipment');
              try { navigation.navigate('EquipmentList'); } catch {}
            }}
          >
            <Text style={[styles.domainChipText, activeScope === 'equipment' && styles.domainChipTextActive]}>
              🛡️ {isRTL ? 'المستلزمات' : 'Equipment'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="alerts-scope-rider_gear"
            style={[styles.domainChip, activeScope === 'rider_gear' && styles.domainChipActive]}
            onPress={() => {
              setActiveScope('rider_gear');
              try { navigation.navigate('RiderGearList'); } catch {}
            }}
          >
            <Text style={[styles.domainChipText, activeScope === 'rider_gear' && styles.domainChipTextActive]}>
              👔 {isRTL ? 'الأزياء' : 'Rider Gear'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="alerts-scope-services"
            style={[styles.domainChip, activeScope === 'services' && styles.domainChipActive]}
            onPress={() => {
              setActiveScope('services');
              try { navigation.navigate('ServiceList'); } catch {}
            }}
          >
            <Text style={[styles.domainChipText, activeScope === 'services' && styles.domainChipTextActive]}>
              🔧 {isRTL ? 'الخدمات' : 'Services'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Create Saved Alert Studio Card */}
        <View style={styles.card}>
          <View style={[styles.cardHeaderRow, isRTL && styles.rowRTL]}>
            <View style={[styles.cardTitleWrap, isRTL && styles.rowRTL]}>
              <Ionicons name="options-outline" size={20} color={COLORS.primary} style={styles.sectionHeaderIcon} />
              <Text style={[styles.sectionTitle, isRTL && styles.textRTL, { marginBottom: 0 }]}>
                {t('createSavedAlert')}
              </Text>
            </View>
            <TouchableOpacity
              testID="toggle-alert-form"
              style={[styles.toggleBtn, isRTL && styles.rowRTL]}
              onPress={() => setIsFormExpanded((prev) => !prev)}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <Text style={styles.toggleBtnText}>
                {isFormExpanded ? t('hideAlertForm') : t('createNewAlertToggle')}
              </Text>
              <Ionicons
                name={isFormExpanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={COLORS.primary}
              />
            </TouchableOpacity>
          </View>

          {isFormExpanded && (
            <View style={styles.formContainer}>
              <TextInput
                style={[styles.input, isRTL && styles.inputRTL]}
                placeholder={t('savedAlertName')}
                placeholderTextColor={COLORS.textLight}
                value={form.name}
                onChangeText={(v) => {
                  updateForm('name', v);
                  if (errors.name) setErrors((e) => { const n = { ...e }; delete n.name; return n; });
                }}
                textAlign={isRTL ? 'right' : 'left'}
              />
              {errors.name && <Text style={[styles.errorText, isRTL && styles.textRTL]}>{errors.name}</Text>}

              {/* Popular Breeds Fast Chips */}
              <Text style={[styles.fieldLabel, isRTL && styles.textRTL]}>
                {t('quickBreedChipsLabel')}
              </Text>
              <View style={[styles.presetRow, isRTL && styles.rowRTL]}>
                {POPULAR_BREEDS.map((b) => {
                  const isSelected = form.breed === b.key;
                  return (
                    <TouchableOpacity
                      key={b.key}
                      testID={`breed-chip-${b.key.toLowerCase().replace(/\s+/g, '-')}`}
                      style={[styles.presetChip, isSelected && styles.presetChipActive]}
                      onPress={() => handleSelectBreed(b.key)}
                    >
                      <Text style={[styles.presetChipText, isSelected && styles.presetChipTextActive]}>
                        🐎 {t(b.labelKey)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TextInput
                style={[styles.input, isRTL && styles.inputRTL]}
                placeholder={t('breedFilterPlaceholder')}
                placeholderTextColor={COLORS.textLight}
                value={form.breed}
                onChangeText={(v) => updateForm('breed', v)}
                textAlign={isRTL ? 'right' : 'left'}
              />

              {/* Quick Discipline Presets */}
              <Text style={[styles.fieldLabel, isRTL && styles.textRTL]}>{t('quickDisciplinePresets')}</Text>
              <View style={[styles.presetRow, isRTL && styles.rowRTL]}>
                {QUICK_DISCIPLINES.map((d) => {
                  const isSelected = form.discipline === d.key;
                  return (
                    <TouchableOpacity
                      key={d.key}
                      style={[styles.presetChip, isSelected && styles.presetChipActive]}
                      onPress={() => updateForm('discipline', isSelected ? '' : d.key)}
                    >
                      <Text style={[styles.presetChipText, isSelected && styles.presetChipTextActive]}>
                        {t(d.labelKey)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Quick Budget Presets in AED */}
              <Text style={[styles.fieldLabel, isRTL && styles.textRTL]}>
                {t('budgetPresets')} ({t('currencyAed')})
              </Text>
              <View style={[styles.presetRow, isRTL && styles.rowRTL]}>
                {BUDGET_PRESETS.map((b) => {
                  const isSelected = form.min_price?.toString() === b.min && form.max_price?.toString() === b.max;
                  return (
                    <TouchableOpacity
                      key={b.label}
                      style={[styles.presetChip, isSelected && styles.presetChipActive]}
                      onPress={() => {
                        if (isSelected) {
                          updateForm('min_price', '');
                          updateForm('max_price', '');
                        } else {
                          updateForm('min_price', b.min);
                          updateForm('max_price', b.max);
                        }
                      }}
                    >
                      <Text style={[styles.presetChipText, isSelected && styles.presetChipTextActive]}>
                        {b.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={[styles.row, isRTL && styles.rowRTL]}>
                <TextInput
                  style={[styles.input, styles.halfInput, isRTL && styles.inputRTL]}
                  placeholder={`${t('min')} (${t('currencyAed')})`}
                  placeholderTextColor={COLORS.textLight}
                  value={form.min_price}
                  onChangeText={(v) => {
                    updateForm('min_price', v);
                    if (errors.min_price) setErrors((e) => { const n = { ...e }; delete n.min_price; return n; });
                  }}
                  keyboardType="numeric"
                  textAlign={isRTL ? 'right' : 'left'}
                />
                <TextInput
                  style={[styles.input, styles.halfInput, isRTL && styles.inputRTL]}
                  placeholder={`${t('max')} (${t('currencyAed')})`}
                  placeholderTextColor={COLORS.textLight}
                  value={form.max_price}
                  onChangeText={(v) => {
                    updateForm('max_price', v);
                    if (errors.max_price) setErrors((e) => { const n = { ...e }; delete n.max_price; return n; });
                  }}
                  keyboardType="numeric"
                  textAlign={isRTL ? 'right' : 'left'}
                />
              </View>
              {(errors.min_price || errors.max_price) && (
                <Text style={[styles.errorText, isRTL && styles.textRTL]}>{errors.min_price || errors.max_price}</Text>
              )}

              <View style={[styles.switchRow, isRTL && styles.rowRTL]}>
                <Text style={[styles.switchLabel, isRTL && styles.textRTL]}>{t('vetCheckedOnly')}</Text>
                <Switch
                  value={form.vet_check_available}
                  onValueChange={(v) => updateForm('vet_check_available', v)}
                  trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
                  thumbColor={form.vet_check_available ? COLORS.primary : COLORS.textLight}
                />
              </View>

              <View style={[styles.switchRow, isRTL && styles.rowRTL]}>
                <Text style={[styles.switchLabel, isRTL && styles.textRTL]}>{t('verifiedSellersOnly')}</Text>
                <Switch
                  value={form.verified_seller}
                  onValueChange={(v) => updateForm('verified_seller', v)}
                  trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
                  thumbColor={form.verified_seller ? COLORS.primary : COLORS.textLight}
                />
              </View>

              <TouchableOpacity style={styles.createBtn} onPress={createAlert} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.createBtnText}>{t('createAlert')}</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Alerts Inbox */}
        <View style={styles.card}>
          <View style={styles.inboxHeader}>
            <View style={[styles.inboxHeaderTitleRow, isRTL && styles.rowRTL]}>
              <Ionicons name="mail-unread-outline" size={20} color={COLORS.primary} style={styles.sectionHeaderIcon} />
              <Text style={[styles.sectionTitle, isRTL && styles.textRTL, { marginBottom: 0 }]}>{t('alertsInbox')}</Text>
              {unreadCount > 0 && (
                <View style={styles.unreadCountBadge}>
                  <Text style={styles.unreadCountBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </View>
            {unreadCount > 0 && (
              <TouchableOpacity onPress={markAllRead}>
                <Text style={styles.markAllReadText}>{t('markAllRead')}</Text>
              </TouchableOpacity>
            )}
          </View>
          {loading ? (
            <ActivityIndicator style={{ marginTop: SPACING.md }} color={COLORS.primary} />
          ) : inbox.length === 0 ? (
            <View style={styles.emptyContainer} testID="alerts-inbox-empty">
              <View style={styles.emptyIconCircle}>
                <Ionicons name="mail-outline" size={30} color={COLORS.primary} />
              </View>
              <Text style={[styles.emptyText, isRTL && styles.textRTL]}>{t('noInboxAlerts')}</Text>
              <TouchableOpacity
                testID="alerts-empty-browse-btn"
                style={[styles.emptyActionBtn, isRTL && styles.rowRTL]}
                onPress={() => {
                  try {
                    navigation.navigate('Browse', { screen: 'HomeMain' });
                  } catch {
                    navigation.navigate('HomeMain');
                  }
                }}
              >
                <Ionicons name="compass-outline" size={15} color={COLORS.white} />
                <Text style={styles.emptyActionBtnText}>
                  {isRTL ? 'استكشف الخيول المتوفرة' : 'Browse Available Horses'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            inbox.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.inboxItem, !item.is_read && styles.inboxItemUnread, isRTL && styles.rowRTL]}
                onPress={() => openAlertHorse(item)}
                activeOpacity={0.8}
              >
                <View style={[styles.inboxIconWrap, !item.is_read && styles.inboxIconWrapUnread]}>
                  <Ionicons
                    name={item.is_read ? 'checkmark-circle-outline' : 'notifications'}
                    size={20}
                    color={item.is_read ? COLORS.textLight : COLORS.accent}
                  />
                </View>
                <View style={styles.alertTextWrap}>
                  <View style={[styles.inboxTitleRow, isRTL && styles.rowRTL]}>
                    <Text style={[styles.alertName, !item.is_read && styles.alertNameUnread, isRTL && styles.textRTL]}>
                      {item.title}
                    </Text>
                    {!item.is_read && (
                      <View style={styles.newBadge}>
                        <Text style={styles.newBadgeText}>NEW</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.alertMeta, isRTL && styles.textRTL]}>{item.message}</Text>
                  <View style={[styles.viewListingRow, isRTL && styles.rowRTL]}>
                    <Text style={styles.viewListingText}>{t('viewHorseListing')}</Text>
                    <Ionicons
                      name={isRTL ? 'arrow-back' : 'arrow-forward'}
                      size={12}
                      color={COLORS.primary}
                      style={{ marginHorizontal: 4 }}
                    />
                  </View>
                </View>
                <Ionicons
                  name={isRTL ? 'chevron-back' : 'chevron-forward'}
                  size={16}
                  color={COLORS.textLight}
                />
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* My Saved Alerts */}
        <View style={styles.card}>
          <View style={[styles.cardTitleWrap, isRTL && styles.rowRTL]}>
            <Ionicons name="notifications-outline" size={20} color={COLORS.primary} style={styles.sectionHeaderIcon} />
            <Text style={[styles.sectionTitle, isRTL && styles.textRTL, { marginBottom: 0 }]}>{t('mySavedAlerts')}</Text>
          </View>
          {loading ? (
            <ActivityIndicator style={{ marginTop: SPACING.md }} color={COLORS.primary} />
          ) : alerts.length === 0 ? (
            <View style={styles.emptyContainer} testID="alerts-saved-empty">
              <View style={styles.emptyIconCircle}>
                <Ionicons name="notifications-outline" size={30} color={COLORS.primary} />
              </View>
              <Text style={[styles.emptyText, isRTL && styles.textRTL]}>{t('noSavedAlerts')}</Text>
              <TouchableOpacity
                testID="alerts-empty-create-btn"
                style={[styles.emptyActionBtn, isRTL && styles.rowRTL]}
                onPress={() => setIsFormExpanded(true)}
              >
                <Ionicons name="add-circle-outline" size={15} color={COLORS.white} />
                <Text style={styles.emptyActionBtnText}>
                  {isRTL ? 'تفعيل تنبيه جديد' : 'Activate New Alert'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="saved-alerts-empty-concierge-btn"
                style={[styles.emptyConciergeBtn, isRTL && styles.rowRTL]}
                onPress={handleScoutInquiry}
                activeOpacity={0.85}
              >
                <Ionicons name="logo-whatsapp" size={15} color="#10B981" />
                <Text style={styles.emptyConciergeBtnText}>
                  {isRTL ? 'طلب وساطة وبحث خاص لسلالة نادرة' : 'VIP Bespoke Sourcing Concierge'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            alerts.map((alert) => {
              const priceLabel =
                alert.min_price != null && alert.max_price != null
                  ? `${alert.min_price.toLocaleString()} - ${alert.max_price.toLocaleString()} ${t('currencyAed')}`
                  : alert.min_price != null
                  ? `> ${alert.min_price.toLocaleString()} ${t('currencyAed')}`
                  : alert.max_price != null
                  ? `< ${alert.max_price.toLocaleString()} ${t('currencyAed')}`
                  : null;

              return (
                <View key={alert.id} style={styles.alertCard}>
                  <View style={[styles.alertCardHeader, isRTL && styles.rowRTL]}>
                    <View style={styles.alertTextWrap}>
                      <Text style={[styles.alertName, isRTL && styles.textRTL]}>{alert.name}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.trashBtn}
                      onPress={() => removeAlert(alert.id)}
                      accessibilityRole="button"
                      accessibilityLabel="Delete Alert"
                    >
                      <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>

                  <View style={[styles.alertPillsRow, isRTL && styles.rowRTL]}>
                    {alert.breed ? (
                      <View style={styles.alertPill}>
                        <Text style={styles.alertPillText}>🐎 {alert.breed}</Text>
                      </View>
                    ) : null}
                    {alert.discipline ? (
                      <View style={styles.alertPill}>
                        <Text style={styles.alertPillText}>🏆 {alert.discipline}</Text>
                      </View>
                    ) : null}
                    {priceLabel ? (
                      <View style={styles.alertPill}>
                        <Text style={styles.alertPillText}>💰 {priceLabel}</Text>
                      </View>
                    ) : null}
                    {alert.vet_check_available ? (
                      <View style={[styles.alertPill, styles.alertPillGreen]}>
                        <Text style={styles.alertPillTextGreen}>🩺 {t('vetChecked')}</Text>
                      </View>
                    ) : null}
                    {alert.verified_seller ? (
                      <View style={[styles.alertPill, styles.alertPillGreen]}>
                        <Text style={styles.alertPillTextGreen}>✅ {t('verified')}</Text>
                      </View>
                    ) : null}
                  </View>

                  <TouchableOpacity
                    testID={`run-search-${alert.id}`}
                    style={[styles.searchMatchesBtn, isRTL && styles.rowRTL]}
                    onPress={() => handleSearchLiveMatches(alert)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                  >
                    <Ionicons name="search" size={14} color={COLORS.primary} style={styles.searchMatchesIcon} />
                    <Text style={styles.searchMatchesBtnText}>{t('runSearchNow')}</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>

        {/* VIP Equine Sourcing & Pedigree Scout Card */}
        <View style={styles.scoutCard} testID="alerts-scout-card">
          <View style={[styles.scoutHeader, isRTL && styles.rowRTL]}>
            <View style={styles.scoutIconWrap}>
              <Ionicons name="shield-checkmark" size={22} color={COLORS.accent} />
            </View>
            <View style={styles.scoutTitleWrap}>
              <Text style={[styles.scoutTitle, isRTL && styles.textRTL]}>
                {isRTL ? 'خدمة المستكشف والبحث الخاص' : 'VIP Pedigree Scout & Sourcing'}
              </Text>
              <Text style={[styles.scoutDesc, isRTL && styles.textRTL]}>
                {isRTL
                  ? 'تبحث عن سلالة نادرة أو مواصفات خاصة؟ دَع مستشاري SteedMarket يبحثون لك في كبرى المرابط الخاصة والإسطبلات المغلقة.'
                  : 'Looking for a rare pedigree or bespoke lineage? Let SteedMarket equestrian scouts locate private off-market horses for you.'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            testID="alerts-scout-whatsapp-btn"
            style={[styles.scoutWhatsappBtn, isRTL && styles.rowRTL]}
            onPress={handleScoutInquiry}
            activeOpacity={0.85}
          >
            <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
            <Text style={styles.scoutWhatsappBtnText}>
              {isRTL ? 'تواصل مع مستشار البحث الخاص' : 'Chat with VIP Pedigree Scout'}
            </Text>
          </TouchableOpacity>
        </View>
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
    paddingVertical: SPACING.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    backgroundColor: COLORS.card,
  },
  headerLeftWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
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
    ...SHADOWS.small,
  },
  headerTitles: {
    flex: 1,
    marginLeft: SPACING.xs,
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
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs + 2,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerConciergeBtn: {
    backgroundColor: '#E8F5E9',
    borderColor: '#C8E6C9',
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...FONTS.h3,
    color: COLORS.text,
    fontWeight: '800',
    marginTop: 1,
  },
  domainBar: {
    flexDirection: 'row',
    gap: SPACING.xs,
    paddingVertical: 2,
  },
  domainChip: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },
  domainChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.accent,
  },
  domainChipText: {
    ...FONTS.caption,
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text,
  },
  domainChipTextActive: {
    color: COLORS.white,
    fontWeight: '800',
  },
  content: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  // VIP Equine Match Concierge Hero Card
  conciergeCard: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.accent + '40',
    ...SHADOWS.card,
  },
  conciergeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  conciergeIconBadge: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.accent + '55',
  },
  conciergeTitleCol: {
    flex: 1,
  },
  conciergeTitle: {
    ...FONTS.h3,
    color: COLORS.white,
    fontWeight: '800',
  },
  conciergeSubtitle: {
    ...FONTS.bodySmall,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 3,
    lineHeight: 18,
  },
  conciergeStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.sm + 4,
  },
  conciergeStatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    gap: 6,
  },
  conciergeStatPillGold: {
    backgroundColor: COLORS.accent + '25',
    borderWidth: 1,
    borderColor: COLORS.accent + '50',
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  conciergeStatText: {
    ...FONTS.caption,
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 11,
  },
  conciergeStatTextGold: {
    ...FONTS.caption,
    color: COLORS.accent,
    fontWeight: '800',
    fontSize: 11,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.card,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  cardTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionHeaderIcon: {
    marginRight: 6,
  },
  sectionTitle: {
    ...FONTS.h3,
    color: COLORS.text,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary + '10',
    borderWidth: 1,
    borderColor: COLORS.primary + '20',
    gap: 4,
  },
  toggleBtnText: {
    ...FONTS.caption,
    color: COLORS.primary,
    fontWeight: '700',
  },
  formContainer: {
    marginTop: SPACING.sm,
  },
  inboxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  markAllReadText: {
    ...FONTS.bodySmall,
    color: COLORS.primary,
    fontWeight: '700',
  },
  inboxItem: {
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
  },
  inboxItemUnread: {
    borderColor: COLORS.primary + '40',
    backgroundColor: COLORS.primaryLight + '0C',
  },
  inboxIconWrap: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: '#FAF8F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  inboxIconWrapUnread: {
    backgroundColor: COLORS.accent + '20',
  },
  inboxTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  newBadge: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  newBadgeText: {
    ...FONTS.caption,
    fontSize: 9,
    fontWeight: '900',
    color: COLORS.white,
  },
  viewListingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  viewListingText: {
    ...FONTS.caption,
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 11,
  },
  input: {
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    color: COLORS.text,
    ...FONTS.body,
    marginTop: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  halfInput: {
    flex: 1,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  switchLabel: {
    ...FONTS.body,
    color: COLORS.text,
  },
  createBtn: {
    marginTop: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm + 4,
    ...SHADOWS.card,
  },
  createBtnText: {
    ...FONTS.button,
    color: COLORS.white,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.xs,
  },
  emptyText: {
    ...FONTS.body,
    color: COLORS.textSecondary,
  },
  // Saved Alert Card Architecture
  alertCard: {
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.md,
    padding: SPACING.sm + 2,
    backgroundColor: COLORS.surface,
  },
  alertCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  alertTextWrap: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  alertName: {
    ...FONTS.body,
    fontWeight: '700',
    color: COLORS.text,
  },
  alertNameUnread: {
    fontWeight: '800',
    color: COLORS.primary,
  },
  alertMeta: {
    ...FONTS.bodySmall,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  searchMatchesBtn: {
    marginTop: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary + '2E',
    backgroundColor: COLORS.primary + '0A',
  },
  searchMatchesIcon: {
    marginRight: 6,
  },
  searchMatchesBtnText: {
    ...FONTS.caption,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
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
  fieldLabel: {
    ...FONTS.caption,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: SPACING.sm + 2,
    marginBottom: 4,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EBE7E0',
  },
  presetChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  presetChipText: {
    ...FONTS.caption,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  presetChipTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  inboxHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs + 2,
  },
  unreadCountBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  unreadCountBadgeText: {
    ...FONTS.caption,
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
  },
  alertPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  alertPill: {
    backgroundColor: '#FAF8F5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#EBE7E0',
  },
  alertPillText: {
    ...FONTS.caption,
    fontSize: 11,
    color: COLORS.text,
    fontWeight: '600',
  },
  alertPillGreen: {
    backgroundColor: '#E8F5E9',
    borderColor: '#C8E6C9',
  },
  alertPillTextGreen: {
    ...FONTS.caption,
    fontSize: 11,
    color: '#2E7D32',
    fontWeight: '700',
  },
  trashBtn: {
    padding: SPACING.xs + 2,
  },
  errorText: {
    ...FONTS.caption,
    color: COLORS.error,
    marginTop: 4,
  },
  conciergeStatPillEmerald: {
    backgroundColor: '#10B98125',
    borderWidth: 1,
    borderColor: '#10B98160',
  },
  conciergeStatTextEmerald: {
    ...FONTS.caption,
    color: '#10B981',
    fontWeight: '800',
    fontSize: 11,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primaryLight + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyActionBtn: {
    marginTop: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    ...SHADOWS.small,
  },
  emptyActionBtnText: {
    ...FONTS.caption,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  emptyConciergeBtn: {
    marginTop: SPACING.xs + 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: '#FAF5EA',
    borderWidth: 1.2,
    borderColor: 'rgba(37, 211, 102, 0.45)',
    ...SHADOWS.subtle,
  },
  emptyConciergeBtnText: {
    ...FONTS.caption,
    fontSize: 12,
    fontWeight: '800',
    color: '#075E54',
  },
  scoutCard: {
    backgroundColor: '#0F1E2E',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.4)',
    gap: SPACING.sm + 2,
    ...SHADOWS.card,
  },
  scoutHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  scoutIconWrap: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoutTitleWrap: {
    flex: 1,
  },
  scoutTitle: {
    ...FONTS.h3,
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.white,
  },
  scoutDesc: {
    ...FONTS.bodySmall,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 3,
    lineHeight: 18,
  },
  scoutWhatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#25D366',
    borderRadius: RADIUS.full,
    paddingVertical: 10,
    paddingHorizontal: SPACING.md,
    ...SHADOWS.small,
  },
  scoutWhatsappBtnText: {
    ...FONTS.button,
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 13,
  },
});
