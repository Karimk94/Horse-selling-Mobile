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

const ROLE_OPTIONS = ['all', 'buyer', 'seller'];
const STATUS_OPTIONS = [null, 'pending', 'countered', 'accepted', 'rejected'];
const PAGE_SIZE = 20;

export default function OffersScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { t, isRTL } = useLanguage();
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
      toast.show(extractApiErrorMessage(error, t('offerLoadFailed')), { type: 'error' });
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
      toast.show(t('offerAccepted'), { type: 'success' });
    } catch (error) {
      toast.show(extractApiErrorMessage(error, t('offerAcceptFailed')), { type: 'error' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (offer) => {
    setActionLoadingId(offer.id);
    try {
      await apiService.rejectOffer(offer.id, null);
      await loadOffers(true);
      toast.show(t('offerRejected'), { type: 'success' });
    } catch (error) {
      toast.show(extractApiErrorMessage(error, t('offerRejectFailed')), { type: 'error' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCounter = async (offer) => {
    const parsed = Number(counterAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setCounterError(t('counterAmountRequired'));
      return;
    }
    setActionLoadingId(offer.id);
    try {
      await apiService.counterOffer(offer.id, parsed, null);
      setCounterOfferId(null);
      setCounterAmount('');
      setCounterError('');
      await loadOffers(true);
      toast.show(t('counterOfferSent'), { type: 'success' });
    } catch (error) {
      toast.show(extractApiErrorMessage(error, t('counterOfferFailed')), { type: 'error' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancel = async (offer) => {
    setActionLoadingId(offer.id);
    try {
      await apiService.cancelOffer(offer.id, null);
      await loadOffers(true);
      toast.show(t('offerCancelled'), { type: 'success' });
    } catch (error) {
      toast.show(extractApiErrorMessage(error, t('offerCancelFailed')), { type: 'error' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleMarkSold = async (offer) => {
    setActionLoadingId(offer.id);
    try {
      await apiService.markOfferHorseSold(offer.id);
      await loadOffers(true);
      toast.show(t('horseMarkedSold'), { type: 'success' });
    } catch (error) {
      toast.show(extractApiErrorMessage(error, t('markSoldFailed')), { type: 'error' });
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

  const openHorse = async (offer) => {
    try {
      const res = await apiService.getHorse(offer.horse_id);
      navigation.navigate('HorseDetail', { horse: res.data });
    } catch (error) {
      toast.show(extractApiErrorMessage(error, t('savedAlertOpenFailed')), { type: 'error' });
    }
  };

  const handleLoadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore) return;
    loadOffers(false);
  }, [loading, loadingMore, hasMore, loadOffers]);

  const renderOfferItem = ({ item: offer }) => (
    <View style={styles.offerCard}>
      <TouchableOpacity style={[styles.offerTop, isRTL && styles.rowRTL]} onPress={() => openHorse(offer)}>
        <Text style={[styles.horseTitle, isRTL && styles.textRTL]} numberOfLines={1}>
          {offer.horse_title || t('horse')}
        </Text>
        <View style={[styles.statusBadge, { borderColor: getStatusColor(offer.status) }]}>
          <Text style={[styles.statusText, { color: getStatusColor(offer.status) }]}>
            {t(`status_${offer.status}`)}
          </Text>
        </View>
      </TouchableOpacity>

      {needsAction(offer) && (
        <View style={[styles.actionRequiredBadge, isRTL && styles.rowRTL]}>
          <Ionicons name="alert-circle-outline" size={14} color={COLORS.warning} />
          <Text style={[styles.actionRequiredText, isRTL && styles.textRTL]}>
            {t('offerActionRequired')}
          </Text>
        </View>
      )}

      {offer.status === 'pending' && offer.buyer_id === user?.id && (
        <View style={styles.quickActionsWrap}>
          <View style={[styles.quickRow, isRTL && styles.rowRTL]}>
            <TouchableOpacity
              style={[styles.quickBtn, styles.cancelBtn]}
              onPress={() => handleCancel(offer)}
              disabled={actionLoadingId === offer.id}
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

      {offer.status === 'accepted' && offer.seller_id === user?.id && (
        <View style={styles.quickActionsWrap}>
          <View style={[styles.quickRow, isRTL && styles.rowRTL]}>
            <TouchableOpacity
              style={[styles.quickBtn, styles.markSoldBtn]}
              onPress={() => handleMarkSold(offer)}
              disabled={actionLoadingId === offer.id}
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

      <View style={[styles.metaRow, isRTL && styles.rowRTL]}>
        <Text style={[styles.metaText, isRTL && styles.textRTL]}>
          {t('amount')}: ${offer.amount?.toLocaleString()}
        </Text>
        {offer.counter_amount ? (
          <Text style={[styles.metaText, isRTL && styles.textRTL]}>
            {t('counterAmount')}: ${offer.counter_amount?.toLocaleString()}
          </Text>
        ) : null}
      </View>

      <View style={[styles.metaRow, isRTL && styles.rowRTL]}>
        <Text style={[styles.subtleText, isRTL && styles.textRTL]}>
          {role === 'seller'
            ? offer.buyer_email
            : role === 'buyer'
            ? offer.seller_email
            : `${t('roleBuyer')}: ${offer.buyer_email}`}
        </Text>
        <Text style={styles.subtleText}>
          {new Date(offer.created_at).toLocaleDateString()}
        </Text>
      </View>

      {needsAction(offer) && (
        <View style={styles.quickActionsWrap}>
          {offer.status === 'pending' && offer.seller_id === user?.id && (
            <>
              <View style={[styles.quickRow, isRTL && styles.rowRTL]}>
                <TouchableOpacity
                  style={[styles.quickBtn, styles.rejectBtn]}
                  onPress={() => handleReject(offer)}
                  disabled={actionLoadingId === offer.id}
                >
                  <Text style={styles.quickBtnText}>{t('reject')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.quickBtn, styles.counterBtn]}
                  onPress={() => {
                    setCounterOfferId(counterOfferId === offer.id ? null : offer.id);
                    setCounterAmount('');
                  }}
                  disabled={actionLoadingId === offer.id}
                >
                  <Text style={styles.quickBtnText}>{t('sendCounter')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.quickBtn, styles.acceptBtn]}
                  onPress={() => handleAccept(offer)}
                  disabled={actionLoadingId === offer.id}
                >
                  <Text style={styles.quickBtnText}>{t('accept')}</Text>
                </TouchableOpacity>
              </View>

              {counterOfferId === offer.id && (
                <View style={styles.counterWrap}>
                  <TextInput
                    style={[styles.counterInput, isRTL && styles.textRTL]}
                    placeholder={t('counterAmount')}
                    placeholderTextColor={COLORS.textLight}
                    keyboardType="numeric"
                    value={counterAmount}
                    onChangeText={(v) => { setCounterAmount(v); if (counterError) setCounterError(''); }}
                  />
                  {counterError && counterOfferId === offer.id && (
                    <Text style={[styles.errorText, isRTL && styles.textRTL]}>{counterError}</Text>
                  )}
                  <TouchableOpacity
                    style={[styles.quickBtn, styles.counterSubmitBtn]}
                    onPress={() => handleCounter(offer)}
                    disabled={actionLoadingId === offer.id}
                  >
                    {actionLoadingId === offer.id ? (
                      <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                      <Text style={styles.quickBtnText}>{t('sendCounter')}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

          {offer.status === 'countered' && offer.buyer_id === user?.id && (
            <View style={[styles.quickRow, isRTL && styles.rowRTL]}>
              <TouchableOpacity
                style={[styles.quickBtn, styles.rejectBtn]}
                onPress={() => handleReject(offer)}
                disabled={actionLoadingId === offer.id}
              >
                <Text style={styles.quickBtnText}>{t('reject')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickBtn, styles.acceptBtn]}
                onPress={() => handleAccept(offer)}
                disabled={actionLoadingId === offer.id}
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

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.header, isRTL && styles.rowRTL]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={[styles.title, isRTL && styles.textRTL]}>{t('offersInbox')}</Text>
      </View>

      <View style={styles.summaryCard}>
        <View style={[styles.summaryRow, isRTL && styles.rowRTL]}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{statusCounts.pending}</Text>
            <Text style={styles.summaryLabel}>{t('status_pending')}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{statusCounts.countered}</Text>
            <Text style={styles.summaryLabel}>{t('status_countered')}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{statusCounts.accepted}</Text>
            <Text style={styles.summaryLabel}>{t('status_accepted')}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{totalOffers}</Text>
            <Text style={styles.summaryLabel}>{t('offersTotal')}</Text>
          </View>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {ROLE_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option}
            style={[styles.filterChip, role === option && styles.filterChipActive]}
            onPress={() => setRole(option)}
          >
            <Text style={[styles.filterChipText, role === option && styles.filterChipTextActive]}>
              {roleLabel(option)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRowCompact}>
        {STATUS_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option || 'all'}
            style={[styles.filterChipCompact, statusFilter === option && styles.filterChipCompactActive]}
            onPress={() => setStatusFilter(option)}
          >
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

      <View style={styles.listWrap}>
        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.lg }} />
        ) : offers.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="pricetag-outline" size={34} color={COLORS.textLight} />
            <Text style={[styles.emptyText, isRTL && styles.textRTL]}>{t('noOffers')}</Text>
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
    paddingVertical: SPACING.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...FONTS.h2,
    color: COLORS.text,
    marginLeft: SPACING.sm,
  },
  summaryCard: {
    marginHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.card,
    padding: SPACING.md,
    ...SHADOWS.card,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryNumber: {
    ...FONTS.h3,
    color: COLORS.text,
  },
  summaryLabel: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  filterRow: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    gap: SPACING.sm,
  },
  filterRowCompact: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
    gap: SPACING.sm,
  },
  filterChip: {
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
  },
  filterChipTextActive: {
    color: COLORS.primary,
  },
  filterChipCompact: {
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
  filterChipCompactText: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  filterChipCompactTextActive: {
    color: COLORS.primary,
  },
  listWrap: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
  },
  listContent: {
    gap: SPACING.sm,
    paddingBottom: SPACING.xxl,
  },
  offerCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.card,
  },
  offerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  horseTitle: {
    ...FONTS.body,
    color: COLORS.text,
    fontWeight: '700',
    flex: 1,
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  statusText: {
    ...FONTS.caption,
    fontWeight: '700',
  },
  metaRow: {
    marginTop: SPACING.xs,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  metaText: {
    ...FONTS.bodySmall,
    color: COLORS.text,
  },
  subtleText: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    flex: 1,
  },
  actionRequiredBadge: {
    marginTop: SPACING.xs,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.warning + '18',
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  actionRequiredText: {
    ...FONTS.caption,
    color: COLORS.warning,
    fontWeight: '700',
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
    paddingVertical: SPACING.xs + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickBtnText: {
    ...FONTS.caption,
    color: COLORS.white,
    fontWeight: '700',
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
    flexDirection: 'row',
    gap: SPACING.xs,
    alignItems: 'center',
  },
  counterInput: {
    flex: 1,
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs + 2,
    color: COLORS.text,
    ...FONTS.bodySmall,
  },
  counterSubmitBtn: {
    flex: 0,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.primary,
  },
  loadingMore: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.xxl,
    gap: SPACING.xs,
  },
  emptyText: {
    ...FONTS.body,
    color: COLORS.textSecondary,
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  textRTL: {
    textAlign: 'right',
  },
});
