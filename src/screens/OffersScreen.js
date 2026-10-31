import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../config/theme';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import * as apiService from '../services/api';
import { extractApiErrorMessage } from '../utils/apiErrors';
import { useToast } from '../components/ToastProvider';
import BrandMark from '../components/BrandMark';

const ROLE_OPTIONS = ['all', 'buyer', 'seller'];
const STATUS_OPTIONS = [null, 'pending', 'countered', 'accepted', 'rejected'];
const PAGE_SIZE = 20;

export default function OffersScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { t, isRTL, language } = useLanguage();
  const isArabic = language === 'ar';
  const { user } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [offers, setOffers] = useState([]);
  const [totalOffers, setTotalOffers] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [role, setRole] = useState('all');
  const [statusFilter, setStatusFilter] = useState(null);
  const [counterOfferId, setCounterOfferId] = useState(null);
  const [counterAmount, setCounterAmount] = useState('');
  const [counterError, setCounterError] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const loadOffers = useCallback(async (reset = true, silent = false) => {
    if (reset && !silent) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    try {
      const currentSkip = reset ? 0 : offers.length;
      const res = await apiService.getMyOffers(role, statusFilter, currentSkip, PAGE_SIZE);
      const incomingOffers = res.data?.offers || [];
      const incomingTotal = res.data?.total ?? incomingOffers.length;
      setTotalOffers(incomingTotal);
      setHasMore(Boolean(res.data?.has_more));
      setOffers((prev) => (reset ? incomingOffers : [...prev, ...incomingOffers]));
    } catch (error) {
      toast?.show?.(extractApiErrorMessage(error, t('offerLoadFailed')), { type: 'error' });
      if (reset) {
        setOffers([]);
        setTotalOffers(0);
        setHasMore(false);
      }
    } finally {
      if (reset && !silent) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  }, [role, statusFilter, t, offers.length]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadOffers(true, true);
    } finally {
      setRefreshing(false);
    }
  }, [loadOffers]);

  useFocusEffect(
    useCallback(() => {
      loadOffers(true);
    }, [loadOffers])
  );

  useEffect(() => {
    loadOffers(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, statusFilter]);

  const needsAction = (offer) => {
    if (!user?.id) return false;
    if (offer.status === 'pending' && offer.seller_id === user.id) return true;
    if (offer.status === 'countered' && offer.buyer_id === user.id) return true;
    return false;
  };

  const handleAccept = async (offer) => {
    setActionLoadingId(offer.id);
    try {
      await apiService.acceptOffer(offer.id, null);
      await loadOffers(true);
      Alert.alert('success', t('offerAccepted'));
      toast?.show?.(t('offerAccepted'), { type: 'success' });
    } catch (error) {
      const msg = extractApiErrorMessage(error, t('offerAcceptFailed'));
      Alert.alert('error', msg);
      toast?.show?.(msg, { type: 'error' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (offer) => {
    setActionLoadingId(offer.id);
    try {
      await apiService.rejectOffer(offer.id, null);
      await loadOffers(true);
      Alert.alert('success', t('offerRejected'));
      toast?.show?.(t('offerRejected'), { type: 'success' });
    } catch (error) {
      const msg = extractApiErrorMessage(error, t('offerRejectFailed'));
      Alert.alert('error', msg);
      toast?.show?.(msg, { type: 'error' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCounter = async (offer) => {
    const parsed = Number(counterAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setCounterError(t('counterAmountRequired'));
      Alert.alert('error', t('counterAmountRequired'));
      return;
    }
    setActionLoadingId(offer.id);
    try {
      await apiService.counterOffer(offer.id, parsed, null);
      setCounterOfferId(null);
      setCounterAmount('');
      setCounterError('');
      await loadOffers(true);
      Alert.alert('success', t('counterOfferSent'));
      toast?.show?.(t('counterOfferSent'), { type: 'success' });
    } catch (error) {
      const msg = extractApiErrorMessage(error, t('counterOfferFailed'));
      Alert.alert('error', msg);
      toast?.show?.(msg, { type: 'error' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancel = async (offer) => {
    setActionLoadingId(offer.id);
    try {
      await apiService.cancelOffer(offer.id, null);
      await loadOffers(true);
      Alert.alert('success', t('offerCancelled'));
      toast?.show?.(t('offerCancelled'), { type: 'success' });
    } catch (error) {
      const msg = extractApiErrorMessage(error, t('offerCancelFailed'));
      Alert.alert('error', msg);
      toast?.show?.(msg, { type: 'error' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleMarkSold = async (offer) => {
    setActionLoadingId(offer.id);
    try {
      await apiService.markOfferHorseSold(offer.id);
      await loadOffers(true);
      Alert.alert('success', t('horseMarkedSold'));
      toast?.show?.(t('horseMarkedSold'), { type: 'success' });
    } catch (error) {
      const msg = extractApiErrorMessage(error, t('markSoldFailed'));
      Alert.alert('error', msg);
      toast?.show?.(msg, { type: 'error' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const statusCounts = useMemo(() => {
    return {
      pending: offers.filter((o) => o.status === 'pending').length,
      countered: offers.filter((o) => o.status === 'countered').length,
      accepted: offers.filter((o) => o.status === 'accepted').length,
      rejected: offers.filter((o) => o.status === 'rejected').length,
    };
  }, [offers]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return COLORS.warning;
      case 'countered':
        return COLORS.info;
      case 'accepted':
        return COLORS.success;
      case 'rejected':
        return COLORS.error;
      default:
        return COLORS.textSecondary;
    }
  };

  const roleLabel = (value) => {
    if (value === 'buyer') return t('roleBuyer');
    if (value === 'seller') return t('roleSeller');
    return t('offersAllRoles');
  };

  const openOfferWhatsApp = (offer) => {
    const amount = (offer.counter_amount || offer.amount || '').toLocaleString();
    const msg = typeof t('offerWhatsAppMessage') === 'function'
      ? t('offerWhatsAppMessage')(offer.horse_title || 'Horse', offer.id?.slice(0, 8), amount)
      : `Regarding SteedMarket offer for ${offer.horse_title} (${amount} AED)`;
    const url = `whatsapp://send?text=${encodeURIComponent(msg)}`;
    Linking.openURL(url).catch(() => {
      toast?.show ? toast.show('WhatsApp is not installed on this device', { type: 'error' }) : null;
    });
  };

  const openHorse = async (offer) => {
    try {
      const res = await apiService.getHorse(offer.horse_id);
      navigation.navigate('HorseDetail', { horse: res.data });
    } catch (error) {
      toast?.show?.(extractApiErrorMessage(error, t('savedAlertOpenFailed')), { type: 'error' });
    }
  };

  const handleEscrowConciergeWhatsApp = () => {
    const text = isArabic
      ? 'مرحباً، أود استشارة مستشار الصفقات والضمان في ستيد ماركت بخصوص المفاوضات والعروض.'
      : 'Hello SteedMarket Concierge, I need assistance regarding an offer negotiation or escrow process.';
    const url = `https://wa.me/971500000000?text=${encodeURIComponent(text)}`;
    Linking.openURL(url).catch(() => {});
  };

  const handleLoadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore) return;
    loadOffers(false);
  }, [loading, loadingMore, hasMore, loadOffers]);

  const renderOfferItem = ({ item: offer }) => {
    const isPending = offer.status === 'pending';
    const isCountered = offer.status === 'countered';
    const isAccepted = offer.status === 'accepted';
    const isActionRequired = needsAction(offer);

    return (
      <View style={styles.offerCard}>
        <TouchableOpacity
          testID={`offer-horse-link-${offer.id}`}
          style={[styles.offerTop, isRTL && styles.rowRTL]}
          onPress={() => openHorse(offer)}
          activeOpacity={0.8}
        >
          <View style={[styles.offerHorseRow, isRTL && styles.rowRTL]}>
            <View style={styles.horseIconWrap}>
              <Ionicons name="paw" size={16} color={COLORS.primary} />
            </View>
            <Text style={[styles.horseTitle, isRTL && styles.textRTL]} numberOfLines={1}>
              {offer.horse_title || t('horse')}
            </Text>
          </View>

          <View style={[styles.statusBadge, { borderColor: getStatusColor(offer.status), backgroundColor: getStatusColor(offer.status) + '14' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(offer.status) }]}>
              {t(`status_${offer.status}`)}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Action Required Advisory Banner */}
        {isActionRequired && (
          <View style={[styles.actionBannerCard, isRTL && styles.rowRTL]}>
            <Ionicons name="sparkles" size={15} color={COLORS.warning} />
            <Text style={[styles.actionBannerText, isRTL && styles.textRTL]}>
              {isPending && offer.seller_id === user?.id
                ? t('offerStatusPendingActionSeller') || t('offerActionRequired')
                : isCountered && offer.buyer_id === user?.id
                ? t('offerStatusCounteredActionBuyer') || t('offerActionRequired')
                : t('offerActionRequired')}
            </Text>
          </View>
        )}

        {/* Deal Closed Official Agreement Banner */}
        {isAccepted && (
          <View style={[styles.dealClosedCard, isRTL && styles.rowRTL]}>
            <Ionicons name="checkmark-done-circle" size={16} color={COLORS.success} />
            <Text style={[styles.dealClosedText, isRTL && styles.textRTL]}>
              {t('offerDealClosedBanner')}
            </Text>
          </View>
        )}

        {/* Financial Metadata Row */}
        <View style={[styles.financialRow, isRTL && styles.rowRTL]}>
          <View style={styles.amountPill}>
            <Text style={styles.amountPillLabel}>{t('amount')}</Text>
            <Text style={styles.amountPillValue}>
              {offer.amount?.toLocaleString()} {t('currencyAed')}
            </Text>
          </View>

          {offer.counter_amount ? (
            <View style={[styles.amountPill, styles.counterAmountPill]}>
              <Text style={styles.counterAmountPillLabel}>{t('counterAmount')}</Text>
              <Text style={styles.counterAmountPillValue}>
                {offer.counter_amount?.toLocaleString()} {t('currencyAed')}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Counterparty & Date Row */}
        <View style={[styles.metaRow, isRTL && styles.rowRTL]}>
          <View style={[styles.partyInfoWrap, isRTL && styles.rowRTL]}>
            <Ionicons name="person-circle-outline" size={14} color={COLORS.textSecondary} />
            <Text style={[styles.subtleText, isRTL && styles.textRTL]} numberOfLines={1}>
              {role === 'seller'
                ? offer.buyer_email
                : role === 'buyer'
                ? offer.seller_email
                : `${t('roleBuyer')}: ${offer.buyer_email}`}
            </Text>
          </View>
          <View style={[styles.dateInfoWrap, isRTL && styles.rowRTL]}>
            <Ionicons name="time-outline" size={12} color={COLORS.textSecondary} />
            <Text style={styles.subtleText}>
              {new Date(offer.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* WhatsApp Consultation for Active Negotiations */}
        {(isAccepted || isCountered || isPending) && (
          <TouchableOpacity
            testID={`offer-whatsapp-button-${offer.id}`}
            style={[styles.whatsappInquiryBtn, isRTL && styles.rowRTL]}
            onPress={() => openOfferWhatsApp(offer)}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-whatsapp" size={15} color="#25D366" />
            <Text style={styles.whatsappInquiryBtnText}>{t('offerWhatsAppInquiry')}</Text>
          </TouchableOpacity>
        )}

        {/* Buyer Pending Action (Cancel) */}
        {isPending && offer.buyer_id === user?.id && (
          <View style={styles.quickActionsWrap}>
            <View style={[styles.quickRow, isRTL && styles.rowRTL]}>
              <TouchableOpacity
                testID={`offer-cancel-btn-${offer.id}`}
                style={[styles.quickBtn, styles.cancelBtn]}
                onPress={() => handleCancel(offer)}
                disabled={actionLoadingId === offer.id}
                activeOpacity={0.85}
              >
                {actionLoadingId === offer.id ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.quickBtnText}>{t('cancelOffer')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Seller Accepted Action (Mark Sold) */}
        {isAccepted && offer.seller_id === user?.id && (
          <View style={styles.quickActionsWrap}>
            <View style={[styles.quickRow, isRTL && styles.rowRTL]}>
              <TouchableOpacity
                testID={`offer-mark-sold-btn-${offer.id}`}
                style={[styles.quickBtn, styles.markSoldBtn]}
                onPress={() => handleMarkSold(offer)}
                disabled={actionLoadingId === offer.id}
                activeOpacity={0.85}
              >
                {actionLoadingId === offer.id ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.quickBtnText}>{t('markSold')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Action Required: Seller (Pending) & Buyer (Countered) */}
        {isActionRequired && (
          <View style={styles.quickActionsWrap}>
            {isPending && offer.seller_id === user?.id && (
              <>
                <View style={[styles.quickRow, isRTL && styles.rowRTL]}>
                  <TouchableOpacity
                    testID={`offer-reject-btn-${offer.id}`}
                    style={[styles.quickBtn, styles.rejectBtn]}
                    onPress={() => handleReject(offer)}
                    disabled={actionLoadingId === offer.id}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.quickBtnText}>{t('reject')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    testID={`offer-counter-toggle-btn-${offer.id}`}
                    style={[styles.quickBtn, styles.counterBtn]}
                    onPress={() => {
                      setCounterOfferId(counterOfferId === offer.id ? null : offer.id);
                      setCounterAmount('');
                    }}
                    disabled={actionLoadingId === offer.id}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.quickBtnText}>{t('sendCounter')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    testID={`offer-accept-btn-${offer.id}`}
                    style={[styles.quickBtn, styles.acceptBtn]}
                    onPress={() => handleAccept(offer)}
                    disabled={actionLoadingId === offer.id}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.quickBtnText}>{t('accept')}</Text>
                  </TouchableOpacity>
                </View>

                {counterOfferId === offer.id && (
                  <View style={styles.counterWrap}>
                    {/* Smart Calculation Chips */}
                    <Text style={[styles.counterChipsHeader, isRTL && styles.textRTL]}>
                      {t('counterQuickChipsLabel')}
                    </Text>
                    <View style={[styles.counterChipsRow, isRTL && styles.rowRTL]}>
                      {[
                        { key: 'plus5', label: t('counterQuickPlus5') || '+5%', calc: (amt) => Math.round(amt * 1.05) },
                        { key: 'plus10', label: t('counterQuickPlus10') || '+10%', calc: (amt) => Math.round(amt * 1.10) },
                        { key: 'plus15', label: t('counterQuickPlus15') || '+15%', calc: (amt) => Math.round(amt * 1.15) },
                        { key: 'round5k', label: t('counterQuickRound5k') || 'Round 5k', calc: (amt) => Math.ceil(amt / 5000) * 5000 },
                      ].map((chip) => {
                        const calculated =
                          typeof offer.amount === 'number' && offer.amount > 0 ? chip.calc(offer.amount) : null;
                        return (
                          <TouchableOpacity
                            key={chip.key}
                            testID={`counter-chip-${chip.key}`}
                            style={styles.calcChip}
                            onPress={() => {
                              if (calculated != null) {
                                setCounterAmount(String(calculated));
                                if (counterError) setCounterError('');
                              }
                            }}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.calcChipText}>{chip.label}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <View style={[styles.counterInputRow, isRTL && styles.rowRTL]}>
                      <TextInput
                        style={[styles.counterInput, isRTL && styles.textRTL]}
                        placeholder={t('counterAmount')}
                        placeholderTextColor={COLORS.textLight}
                        keyboardType="numeric"
                        value={counterAmount}
                        onChangeText={(v) => { setCounterAmount(v); if (counterError) setCounterError(''); }}
                      />
                      <TouchableOpacity
                        testID={`offer-counter-submit-btn-${offer.id}`}
                        style={[styles.quickBtn, styles.counterSubmitBtn]}
                        onPress={() => handleCounter(offer)}
                        disabled={actionLoadingId === offer.id}
                        activeOpacity={0.85}
                      >
                        {actionLoadingId === offer.id ? (
                          <ActivityIndicator size="small" color={COLORS.white} />
                        ) : (
                          <Text style={styles.quickBtnText}>{t('sendCounter')}</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                    {counterError && counterOfferId === offer.id && (
                      <Text style={[styles.errorText, isRTL && styles.textRTL]}>{counterError}</Text>
                    )}
                  </View>
                )}
              </>
            )}

            {isCountered && offer.buyer_id === user?.id && (
              <View style={[styles.quickRow, isRTL && styles.rowRTL]}>
                <TouchableOpacity
                  style={[styles.quickBtn, styles.rejectBtn]}
                  onPress={() => handleReject(offer)}
                  disabled={actionLoadingId === offer.id}
                  activeOpacity={0.85}
                >
                  <Text style={styles.quickBtnText}>{t('reject')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.quickBtn, styles.acceptBtn]}
                  onPress={() => handleAccept(offer)}
                  disabled={actionLoadingId === offer.id}
                  activeOpacity={0.85}
                >
                  {actionLoadingId === offer.id ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <Text style={styles.quickBtnText}>{t('accept')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Executive Header */}
      <View style={[styles.header, isRTL && styles.rowRTL]}>
        <TouchableOpacity
          testID="offers-back-button"
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={22} color={COLORS.text} />
        </TouchableOpacity>

        <View style={styles.brandIconWrapper}>
          <BrandMark size={26} />
        </View>

        <View style={[styles.headerTitleWrap, isRTL && styles.headerTitleWrapRTL]}>
          <View
            testID="offers-cockpit-vip-badge"
            style={[styles.portalBadge, isRTL && styles.portalBadgeRTL]}
          >
            <Ionicons name="ribbon" size={11} color={COLORS.accentDark} />
            <View style={styles.portalBadgeDot} />
            <Text style={styles.portalBadgeText}>
              {isArabic ? 'غرفة المفاوضات والضمان المالي المعتمد' : 'OFFICIAL ESCROW & OFFERS COCKPIT'}
            </Text>
          </View>
          <Text style={[styles.title, isRTL && styles.textRTL]}>{t('offersInbox')}</Text>
          <Text style={[styles.headerSubtitle, isRTL && styles.textRTL]}>
            {totalOffers} {isRTL ? 'عروض قيد التفاوض' : 'active negotiations'}
          </Text>
        </View>

        <View style={[styles.headerRightActions, isRTL && styles.rowRTL]}>
          <TouchableOpacity
            testID="offers-header-refresh-btn"
            style={styles.headerIconBtn}
            onPress={handleRefresh}
            disabled={refreshing}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh-outline" size={18} color={COLORS.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            testID="offers-header-concierge-btn"
            style={styles.headerIconBtn}
            onPress={handleEscrowConciergeWhatsApp}
            activeOpacity={0.8}
          >
            <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.accentDark} />
          </TouchableOpacity>
        </View>
      </View>

      {/* KPI Negotiation Telemetry Cockpit */}
      <View style={styles.summaryCard}>
        <View style={[styles.telemetryTitleRow, isRTL && styles.rowRTL]}>
          <Ionicons name="stats-chart" size={13} color={COLORS.accentDark} />
          <Text style={styles.telemetryTitleText}>
            {isArabic ? 'مؤشرات الصفقات والمفاوضات' : 'NEGOTIATION TELEMETRY COCKPIT'}
          </Text>
        </View>

        <View style={[styles.summaryRow, isRTL && styles.rowRTL]}>
          <View style={styles.summaryItem} testID="offers-summary-pending">
            <View style={[styles.summaryIndicator, { backgroundColor: COLORS.warning }]} />
            <Text style={styles.summaryNumber}>{statusCounts.pending}</Text>
            <Text style={styles.summaryLabel}>{t('status_pending')}</Text>
          </View>
          <View style={styles.summaryItem} testID="offers-summary-countered">
            <View style={[styles.summaryIndicator, { backgroundColor: COLORS.info }]} />
            <Text style={styles.summaryNumber}>{statusCounts.countered}</Text>
            <Text style={styles.summaryLabel}>{t('status_countered')}</Text>
          </View>
          <View style={styles.summaryItem} testID="offers-summary-accepted">
            <View style={[styles.summaryIndicator, { backgroundColor: COLORS.success }]} />
            <Text style={styles.summaryNumber}>{statusCounts.accepted}</Text>
            <Text style={styles.summaryLabel}>{t('status_accepted')}</Text>
          </View>
          <View style={styles.summaryItem} testID="offers-summary-total">
            <View style={[styles.summaryIndicator, { backgroundColor: COLORS.accentDark }]} />
            <Text style={styles.summaryNumber}>{totalOffers}</Text>
            <Text style={styles.summaryLabel}>{t('offersTotal')}</Text>
          </View>
        </View>
      </View>

      {/* Role Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.filterRow, isRTL && styles.rowRTL]}
      >
        {ROLE_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option}
            testID={`offers-role-${option}`}
            style={[styles.filterChip, role === option && styles.filterChipActive]}
            onPress={() => setRole(option)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={
                option === 'buyer'
                  ? 'bag-check-outline'
                  : option === 'seller'
                  ? 'storefront-outline'
                  : 'options-outline'
              }
              size={14}
              color={role === option ? COLORS.primary : COLORS.textSecondary}
              style={{ marginRight: isRTL ? 0 : 5, marginLeft: isRTL ? 5 : 0 }}
            />
            <Text style={[styles.filterChipText, role === option && styles.filterChipTextActive]}>
              {roleLabel(option)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Status Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.filterRowCompact, isRTL && styles.rowRTL]}
      >
        {STATUS_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option || 'all'}
            testID={`offers-status-${option || 'all'}`}
            style={[styles.filterChipCompact, statusFilter === option && styles.filterChipCompactActive]}
            onPress={() => setStatusFilter(option)}
            activeOpacity={0.8}
          >
            {option ? (
              <View
                style={[
                  styles.statusFilterDot,
                  { backgroundColor: getStatusColor(option) },
                ]}
              />
            ) : null}
            <Text
              style={[
                styles.filterChipCompactText,
                statusFilter === option && styles.filterChipCompactTextActive,
              ]}
            >
              {option ? t(`status_${option}`) : t('offersAllStatuses')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Offer List */}
      <View style={styles.listWrap}>
        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.lg }} />
        ) : offers.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconCircle}>
              <BrandMark size={38} />
            </View>
            <Text style={[styles.emptyTitle, isRTL && styles.textRTL]}>{t('noOffers')}</Text>
            <Text style={[styles.emptyText, isRTL && styles.textRTL]}>
              {isArabic
                ? 'لا توجد عروض أسعار مطابقة حالياً. يمكنك تصفح الخيول المتاحة وتقديم عرض سعر مباشر للبائع.'
                : 'No price offers currently match your filter. You can browse registered horses and make an offer.'}
            </Text>
            <TouchableOpacity
              testID="offers-empty-browse-btn"
              style={[styles.emptyBrowseBtn, isRTL && styles.rowRTL]}
              onPress={() => navigation.navigate('HomeMain')}
              activeOpacity={0.85}
            >
              <Ionicons name="compass-outline" size={17} color={COLORS.white} />
              <Text style={styles.emptyBrowseBtnText}>
                {t('browseHorses') || (isArabic ? 'استكشف الخيل' : 'Browse Horses')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="offers-empty-concierge-btn"
              style={[styles.emptyConciergeBtn, isRTL && styles.rowRTL]}
              onPress={handleEscrowConciergeWhatsApp}
              activeOpacity={0.85}
            >
              <Ionicons name="logo-whatsapp" size={16} color="#10B981" />
              <Text style={styles.emptyConciergeBtnText}>
                {isArabic ? 'مستشار الصفقات والوساطة المباشرة' : 'Steed Concierge Negotiation Desk'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={offers}
            keyExtractor={(item) => item.id}
            renderItem={renderOfferItem}
            contentContainerStyle={styles.listContent}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.35}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            ListHeaderComponent={
              <View testID="offers-settlement-shield" style={styles.escrowNoticeCard}>
                <View style={[styles.escrowNoticeHeader, isRTL && styles.rowRTL]}>
                  <View style={styles.escrowShieldIconWrap}>
                    <Ionicons name="shield-checkmark" size={18} color={COLORS.accentDark} />
                  </View>
                  <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                    <View style={[styles.shieldBadgeRow, isRTL && styles.shieldBadgeRowRTL]}>
                      <View style={styles.shieldPulseDot} />
                      <Text style={styles.shieldBadgeText}>
                        {isArabic ? 'نظام الوساطة والضمان المالي المعتمد' : 'OFFICIAL EQUINE ESCROW & SETTLEMENT'}
                      </Text>
                    </View>
                    <Text style={[styles.escrowNoticeTitle, isRTL && styles.textRTL]}>
                      {t('offerNextStepsTitle')}
                    </Text>
                    <Text style={[styles.escrowNoticeDesc, isRTL && styles.textRTL]}>
                      {t('offerNextStepsDesc')}
                    </Text>
                  </View>
                </View>

                {/* Escrow Reassurance Micro-Badges / 3 Trust Pillars */}
                <View style={[styles.escrowPillarsRow, isRTL && styles.rowRTL]}>
                  <View style={[styles.escrowPillarBadge, isRTL && styles.rowRTL]}>
                    <Ionicons name="shield-checkmark" size={12} color={COLORS.accentDark} />
                    <Text style={styles.escrowPillarText}>
                      {isArabic ? 'فحص بيطري سريري PPE مستقل' : 'Independent Vet PPE'}
                    </Text>
                  </View>
                  <View style={[styles.escrowPillarBadge, isRTL && styles.rowRTL]}>
                    <Ionicons name="shield-checkmark" size={12} color={COLORS.accentDark} />
                    <Text style={styles.escrowPillarText}>
                      {isArabic ? 'حجز الضمان بحساب بنكي مخصص' : 'Bank-Secured Escrow'}
                    </Text>
                  </View>
                  <View style={[styles.escrowPillarBadge, isRTL && styles.rowRTL]}>
                    <Ionicons name="shield-checkmark" size={12} color={COLORS.accentDark} />
                    <Text style={styles.escrowPillarText}>
                      {isArabic ? 'توثيق الشريحة والجواز والملكية' : 'Microchip & Passport Transfer'}
                    </Text>
                  </View>
                </View>

                {/* Escrow Concierge WhatsApp Action */}
                <TouchableOpacity
                  testID="offers-escrow-concierge-btn"
                  style={[styles.shieldConciergeBtn, isRTL && styles.rowRTL]}
                  onPress={handleEscrowConciergeWhatsApp}
                  activeOpacity={0.85}
                >
                  <Ionicons name="logo-whatsapp" size={15} color="#25D366" />
                  <Text style={styles.shieldConciergeBtnText}>
                    {isArabic ? 'استشارة مسؤول الضمان والصفقات' : 'Consult Escrow & Settlement Officer'}
                  </Text>
                </TouchableOpacity>
              </View>
            }
            ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color={COLORS.primary} style={styles.loadingMore} /> : null}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
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
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm + 4,
    paddingBottom: SPACING.sm,
    gap: SPACING.xs,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    ...SHADOWS.subtle,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandIconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(197, 160, 89, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.subtle,
  },
  headerTitleWrap: {
    flex: 1,
    marginLeft: SPACING.xs,
  },
  headerTitleWrapRTL: {
    alignItems: 'flex-end',
    marginLeft: 0,
    marginRight: SPACING.xs,
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
  headerSubtitle: {
    fontSize: 11.5,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FAF5EA',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.35)',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  summaryCard: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm + 2,
    borderRadius: RADIUS.lg,
    backgroundColor: '#FAF7F0',
    padding: SPACING.md,
    borderWidth: 1.5,
    borderColor: '#E8DCBF',
    ...SHADOWS.card,
  },
  telemetryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 10,
  },
  telemetryTitleText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.accentDark,
    letterSpacing: 0.7,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: -2,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: SPACING.xs + 3,
    paddingHorizontal: 4,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.22)',
    marginHorizontal: 2.5,
    ...SHADOWS.subtle,
  },
  summaryIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  summaryNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  summaryLabel: {
    fontSize: 9.5,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  filterRow: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm + 2,
    gap: SPACING.sm,
  },
  filterRowCompact: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xs + 2,
    paddingBottom: SPACING.xs,
    gap: SPACING.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.surface,
  },
  filterChipActive: {
    backgroundColor: COLORS.primaryLight + '20',
    borderColor: COLORS.primary,
  },
  filterChipText: {
    ...FONTS.bodySmall,
    color: COLORS.textSecondary,
    fontWeight: '600',
    fontSize: 12,
  },
  filterChipTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  filterChipCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.surface,
  },
  filterChipCompactActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight + '14',
  },
  statusFilterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  filterChipCompactText: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  filterChipCompactTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  listWrap: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xs,
  },
  listContent: {
    gap: SPACING.sm,
    paddingBottom: SPACING.xxl + 20,
  },
  offerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.card,
  },
  offerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  offerHorseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  horseIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  horseTitle: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '800',
    flex: 1,
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2.5,
  },
  statusText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  financialRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: SPACING.xs + 4,
  },
  amountPill: {
    flex: 1,
    backgroundColor: '#FAF5EA',
    borderWidth: 1,
    borderColor: '#E8DCBF',
    borderRadius: RADIUS.md,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  amountPillLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: COLORS.accentDark,
    textTransform: 'uppercase',
  },
  amountPillValue: {
    fontSize: 13.5,
    fontWeight: '800',
    color: COLORS.primary,
    marginTop: 1,
  },
  counterAmountPill: {
    backgroundColor: '#EBF3FA',
    borderColor: '#BDD7EE',
  },
  counterAmountPillLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#2563EB',
    textTransform: 'uppercase',
  },
  counterAmountPillValue: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#1E40AF',
    marginTop: 1,
  },
  metaRow: {
    marginTop: SPACING.xs + 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  partyInfoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  dateInfoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  subtleText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  actionBannerCard: {
    marginTop: SPACING.xs + 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.warning + '16',
    borderWidth: 1,
    borderColor: COLORS.warning + '40',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs + 2,
  },
  actionBannerText: {
    color: COLORS.warning,
    fontWeight: '700',
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
  },
  dealClosedCard: {
    marginTop: SPACING.xs + 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.success + '15',
    borderWidth: 1,
    borderColor: COLORS.success + '40',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs + 2,
  },
  dealClosedText: {
    color: COLORS.success,
    fontWeight: '700',
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
  },
  whatsappInquiryBtn: {
    marginTop: SPACING.xs + 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#25D36615',
    borderWidth: 1,
    borderColor: '#25D36640',
    borderRadius: RADIUS.md,
    paddingVertical: 7,
    paddingHorizontal: SPACING.sm,
  },
  whatsappInquiryBtnText: {
    color: '#075E54',
    fontWeight: '700',
    fontSize: 11.5,
  },
  quickActionsWrap: {
    marginTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingTop: SPACING.sm,
  },
  quickRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  quickBtn: {
    flex: 1,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.xs + 3,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.subtle,
  },
  quickBtnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 12,
  },
  rejectBtn: {
    backgroundColor: COLORS.error,
  },
  counterBtn: {
    backgroundColor: COLORS.warning,
  },
  acceptBtn: {
    backgroundColor: COLORS.success,
  },
  cancelBtn: {
    backgroundColor: COLORS.textSecondary,
  },
  markSoldBtn: {
    backgroundColor: COLORS.primary,
  },
  counterWrap: {
    marginTop: SPACING.sm,
    padding: SPACING.xs + 4,
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  counterChipsHeader: {
    color: COLORS.textSecondary,
    fontWeight: '700',
    fontSize: 10.5,
    marginBottom: 5,
  },
  counterChipsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  calcChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    backgroundColor: '#FAF5EA',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.4)',
  },
  calcChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accentDark,
  },
  counterInputRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    alignItems: 'center',
  },
  counterInput: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs + 2,
    color: COLORS.text,
    fontSize: 13,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  counterSubmitBtn: {
    flex: 0,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.primary,
  },
  errorText: {
    fontSize: 11,
    color: COLORS.error,
    marginTop: 4,
  },
  loadingMore: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.xs,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FAF5EA',
    borderWidth: 1.5,
    borderColor: '#E8DCBF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyBrowseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    marginTop: SPACING.md,
    ...SHADOWS.subtle,
  },
  emptyBrowseBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
  },
  emptyConciergeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FAF5EA',
    borderWidth: 1.2,
    borderColor: 'rgba(37, 211, 102, 0.45)',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: RADIUS.full,
    marginTop: SPACING.xs + 2,
    ...SHADOWS.subtle,
  },
  emptyConciergeBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#075E54',
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  textRTL: {
    textAlign: 'right',
  },
  escrowNoticeCard: {
    backgroundColor: '#FAF8F5',
    borderWidth: 1.5,
    borderColor: '#E8DCBF',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.card,
  },
  escrowNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  escrowShieldIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
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
    marginBottom: 4,
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
  escrowNoticeTitle: {
    fontWeight: '800',
    color: COLORS.primary,
    fontSize: 12.5,
  },
  escrowNoticeDesc: {
    color: COLORS.textSecondary,
    fontSize: 10.5,
    lineHeight: 15,
    marginTop: 1,
  },
  escrowPillarsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(197, 160, 89, 0.2)',
    paddingTop: 8,
    marginTop: 2,
  },
  escrowPillarBadge: {
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
  escrowPillarText: {
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
});
