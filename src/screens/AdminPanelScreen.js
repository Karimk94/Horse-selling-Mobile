import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../config/theme';
import { useLanguage } from '../contexts/LanguageContext';
import HorseCard from '../components/HorseCard';
import BrandMark from '../components/BrandMark';
import * as apiService from '../services/api';
import { extractApiErrorMessage } from '../utils/apiErrors';
import { useToast } from '../components/ToastProvider';

export default function AdminPanelScreen({ navigation, initialTab = 'pending' }) {
  const insets = useSafeAreaInsets();
  const { t, isRTL } = useLanguage();
  const toast = useToast();
  const PAGE_LIMIT = 20;

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [users, setUsers] = useState([]);
  const [usersPage, setUsersPage] = useState(0);
  const [usersTotal, setUsersTotal] = useState(0);
  const [allListings, setAllListings] = useState([]);
  const [allListingsPage, setAllListingsPage] = useState(0);
  const [allListingsTotal, setAllListingsTotal] = useState(0);
  const [pendingListings, setPendingListings] = useState([]);
  const [pendingListingsPage, setPendingListingsPage] = useState(0);
  const [pendingListingsTotal, setPendingListingsTotal] = useState(0);
  const [deletedListings, setDeletedListings] = useState([]);
  const [deletedListingsPage, setDeletedListingsPage] = useState(0);
  const [deletedListingsTotal, setDeletedListingsTotal] = useState(0);
  const [restoreWindowDays, setRestoreWindowDays] = useState(30);
  const [latestReviewByHorse, setLatestReviewByHorse] = useState({});
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingHorse, setRejectingHorse] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submittingReject, setSubmittingReject] = useState(false);
  const [nonHorsePendingCounts, setNonHorsePendingCounts] = useState({
    equipment: 0,
    riderGear: 0,
    services: 0,
    total: 0,
  });
  const [loadingMoreTab, setLoadingMoreTab] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [purgingExpired, setPurgingExpired] = useState(false);
  const [deletedSearchInput, setDeletedSearchInput] = useState('');
  const [deletedSearchQuery, setDeletedSearchQuery] = useState('');
  const [deletedStatusFilter, setDeletedStatusFilter] = useState('all');
  const [deletedSortBy, setDeletedSortBy] = useState('nearest_expiry');
  const [selectedDeletedListings, setSelectedDeletedListings] = useState(new Set());
  const [bulkOperationLoading, setBulkOperationLoading] = useState(false);
  const [purgeConfirmMode, setPurgeConfirmMode] = useState(null);
  const [purgeConfirmText, setPurgeConfirmText] = useState('');
  const refreshAbortControllerRef = useRef(null);
  const pendingListRef = useRef(null);
  const PURGE_KEYWORD = 'PURGE';

  const handleExecutiveHotline = () => {
    const isArabic = isRTL;
    const text = isArabic
      ? 'مرحباً، أود التواصل مع إدارة العمليات المركزية لمتابعة حالة المنصة والرقابة.'
      : 'Hello SteedMarket Operations Lead, I need assistance regarding platform operations & oversight.';
    try {
      const res = Linking.openURL(`https://wa.me/971500000000?text=${encodeURIComponent(text)}`);
      if (res && typeof res.catch === 'function') {
        res.catch(() => {});
      }
    } catch (e) {}
  };

  const handleEscrowDirectorInquiry = () => {
    const isArabic = isRTL;
    const text = isArabic
      ? 'مرحباً، أود التواصل مع مسؤول الرقابة المصرفية وحسابات الضمان بخصوص تدقيق الصفقات.'
      : 'Hello SteedMarket Escrow Director, I need to consult regarding escrow audit and transaction dispute resolution.';
    try {
      const res = Linking.openURL(`https://wa.me/971500000000?text=${encodeURIComponent(text)}`);
      if (res && typeof res.catch === 'function') {
        res.catch(() => {});
      }
    } catch (e) {}
  };

  useEffect(() => {
    const debounceId = setTimeout(() => {
      setDeletedSearchQuery(deletedSearchInput);
    }, 180);

    return () => clearTimeout(debounceId);
  }, [deletedSearchInput]);

  const toggleDeletedListingSelection = (horseId) => {
    const newSelection = new Set(selectedDeletedListings);
    if (newSelection.has(horseId)) {
      newSelection.delete(horseId);
    } else {
      newSelection.add(horseId);
    }
    setSelectedDeletedListings(newSelection);
  };

  const toggleAllDeletedListingsSelection = () => {
    if (filteredDeletedListings.length === 0) {
      return;
    }

    if (selectedDeletedListings.size === filteredDeletedListings.length) {
      setSelectedDeletedListings(new Set());
    } else {
      const allIds = new Set(filteredDeletedListings.map((h) => h.id));
      setSelectedDeletedListings(allIds);
    }
  };

  const parseListPayload = (payload, key) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.[key])) return payload[key];
    return [];
  };

  const applyDashboardPayload = useCallback((payload) => {
    if (!payload) {
      return;
    }

    const usersData = parseListPayload(payload.users, 'users');
    const listingsData = parseListPayload(payload.listings, 'listings');
    const pendingData = parseListPayload(payload.pending, 'listings');
    const deletedData = parseListPayload(payload.deleted, 'listings');
    const reviewsData = parseListPayload(payload.reviews, 'reviews');

    setUsers(usersData);
    setUsersTotal(typeof payload.users?.total === 'number' ? payload.users.total : usersData.length);
    setUsersPage(0);

    setAllListings(listingsData);
    setAllListingsTotal(typeof payload.listings?.total === 'number' ? payload.listings.total : listingsData.length);
    setAllListingsPage(0);

    setPendingListings(pendingData);
    setPendingListingsTotal(typeof payload.pending?.total === 'number' ? payload.pending.total : pendingData.length);
    setPendingListingsPage(0);

    setDeletedListings(deletedData);
    setDeletedListingsTotal(typeof payload.deleted?.total === 'number' ? payload.deleted.total : deletedData.length);
    setDeletedListingsPage(0);
    setSelectedDeletedListings(new Set());

    const fallbackRestoreWindowDays = typeof payload.deleted?.restore_window_days === 'number'
      ? payload.deleted.restore_window_days
      : 30;

    setRestoreWindowDays(fallbackRestoreWindowDays);

    const nextLatest = {};
    for (const review of reviewsData) {
      if (!review?.horse_id) continue;
      if (!nextLatest[review.horse_id]) nextLatest[review.horse_id] = review;
    }
    setLatestReviewByHorse(nextLatest);
  }, []);

  const refreshAdminData = useCallback(async ({ force = true } = {}) => {
    const previousController = refreshAbortControllerRef.current;
    if (previousController) {
      previousController.abort();
    }

    const controller = new AbortController();
    refreshAbortControllerRef.current = controller;

    try {
      const [payload, eqRes, rgRes, svRes] = await Promise.all([
        apiService.adminFetchDashboard({
          skip: 0,
          limit: PAGE_LIMIT,
          force,
          signal: controller.signal,
        }),
        typeof apiService.adminGetPendingEquipment === 'function'
          ? apiService.adminGetPendingEquipment(0, 1).catch(() => ({ data: { total: 0 } }))
          : Promise.resolve({ data: { total: 0 } }),
        typeof apiService.adminGetPendingRiderGear === 'function'
          ? apiService.adminGetPendingRiderGear(0, 1).catch(() => ({ data: { total: 0 } }))
          : Promise.resolve({ data: { total: 0 } }),
        typeof apiService.adminGetPendingServices === 'function'
          ? apiService.adminGetPendingServices(0, 1).catch(() => ({ data: { total: 0 } }))
          : Promise.resolve({ data: { total: 0 } }),
      ]);

      if (refreshAbortControllerRef.current !== controller) {
        return;
      }

      applyDashboardPayload(payload);

      const eqTotal = eqRes.data?.total ?? eqRes.data?.items?.length ?? 0;
      const rgTotal = rgRes.data?.total ?? rgRes.data?.items?.length ?? 0;
      const svTotal = svRes.data?.total ?? svRes.data?.items?.length ?? 0;
      setNonHorsePendingCounts({
        equipment: eqTotal,
        riderGear: rgTotal,
        services: svTotal,
        total: eqTotal + rgTotal + svTotal,
      });
    } catch (err) {
      const requestCanceled =
        typeof apiService.isRequestCanceled === 'function' && apiService.isRequestCanceled(err);
      if (requestCanceled) {
        return;
      }

      toast?.show?.(extractApiErrorMessage(err, t('adminLoadFailed')), { type: 'error' });
    } finally {
      if (refreshAbortControllerRef.current === controller) {
        refreshAbortControllerRef.current = null;
      }
    }
  }, [applyDashboardPayload, t]);

  const renderReviewMeta = (horseId) => {
    const review = latestReviewByHorse[horseId];
    if (!review) return null;

    const actionLabelMap = {
      approve: t('approve'),
      reject: t('reject'),
      delete: t('deleteListing'),
      restore: t('restoreListing'),
    };
    const actionLabel = actionLabelMap[review.action] || review.action;
    const when = review.created_at ? new Date(review.created_at).toLocaleString() : '';

    return (
      <View style={[styles.reviewMetaCard, isRTL && styles.reviewMetaCardRTL]}>
        <Text style={[styles.reviewMetaTitle, isRTL && styles.textRTL]}>{t('adminLastReview')}</Text>
        <Text style={[styles.reviewMetaLine, isRTL && styles.textRTL]}>
          {t('adminReviewedBy')}: {review.admin_email}
        </Text>
        <Text style={[styles.reviewMetaLine, isRTL && styles.textRTL]}>
          {t('adminReviewAction')}: {actionLabel}
        </Text>
        <Text style={[styles.reviewMetaLine, isRTL && styles.textRTL]}>
          {t('adminReviewedAt')}: {when}
        </Text>
      </View>
    );
  };

  const getDeletedMetrics = (horse) => {
    const deletedDate = horse?.deleted_at ? new Date(horse.deleted_at) : null;
    const deletedAt = deletedDate ? deletedDate.toLocaleString() : '-';
    const now = new Date();

    const hasRestoreExpiry = restoreWindowDays > 0;
    const configuredWindow = hasRestoreExpiry ? restoreWindowDays : 0;
    const expiresAtDate = deletedDate && hasRestoreExpiry
      ? new Date(deletedDate.getTime() + configuredWindow * 24 * 60 * 60 * 1000)
      : null;
    const expiresAt = expiresAtDate ? expiresAtDate.toLocaleString() : t('adminRestoreUnlimited');

    const elapsedMs = deletedDate ? now.getTime() - deletedDate.getTime() : 0;
    const elapsedDays = deletedDate ? Math.max(0, Math.floor(elapsedMs / (1000 * 60 * 60 * 24))) : 0;
    const daysRemaining = hasRestoreExpiry ? Math.max(0, configuredWindow - elapsedDays) : null;

    const isExpired = deletedDate ? hasRestoreExpiry && daysRemaining <= 0 : false;
    const isUrgent = deletedDate ? hasRestoreExpiry && daysRemaining > 0 && daysRemaining <= 3 : false;

    return {
      deletedDate,
      deletedAt,
      hasRestoreExpiry,
      configuredWindow,
      expiresAtDate,
      expiresAt,
      daysRemaining,
      isExpired,
      isUrgent,
    };
  };

  const renderDeletedMeta = (horse) => {
    const {
      deletedAt,
      hasRestoreExpiry,
      configuredWindow,
      expiresAt,
      daysRemaining,
      isExpired,
      isUrgent,
    } = getDeletedMetrics(horse);

    const statusText = isExpired
      ? t('adminRestoreExpired')
      : isUrgent
      ? t('adminRestoreUrgent')
      : !hasRestoreExpiry
      ? t('adminRestoreUnlimited')
      : t('adminRestoreActive');

    const statusStyle = isExpired
      ? styles.restoreStatusExpired
      : isUrgent
      ? styles.restoreStatusUrgent
      : styles.restoreStatusActive;

    return (
      <View style={[styles.reviewMetaCard, isRTL && styles.reviewMetaCardRTL]}>
        <Text style={[styles.deletedMetaTitle, isRTL && styles.textRTL]}>{t('adminDeletedListings')}</Text>
        <Text style={[styles.reviewMetaLine, isRTL && styles.textRTL]}>
          {t('adminDeletedAt')}: {deletedAt}
        </Text>
        <Text style={[styles.reviewMetaLine, isRTL && styles.textRTL]}>
          {t('adminRestoreWindowDays')}: {hasRestoreExpiry ? configuredWindow : t('adminRestoreUnlimited')}
        </Text>
        <Text style={[styles.reviewMetaLine, isRTL && styles.textRTL]}>
          {t('adminRestoreExpiresAt')}: {expiresAt}
        </Text>
        <Text style={[styles.reviewMetaLine, isRTL && styles.textRTL]}>
          {t('adminRestoreDaysRemaining')}: {hasRestoreExpiry ? daysRemaining : t('adminRestoreUnlimited')}
        </Text>
        <Text style={[styles.restoreStatusText, statusStyle, isRTL && styles.textRTL]}>
          {statusText}
        </Text>
      </View>
    );
  };

  const isRestoreExpired = (horse) => {
    return getDeletedMetrics(horse).isExpired;
  };

  const filteredDeletedListings = useMemo(() => {
    const q = deletedSearchQuery.trim().toLowerCase();
    let items = deletedListings
      .map((horse) => {
        const metrics = getDeletedMetrics(horse);
        const ownerName = `${horse?.owner?.profile?.first_name || ''} ${horse?.owner?.profile?.last_name || ''}`.trim();
        return {
          horse,
          metrics,
          deletedTime: horse?.deleted_at ? new Date(horse.deleted_at).getTime() : 0,
          expiryTime: metrics.expiresAtDate ? metrics.expiresAtDate.getTime() : Number.MAX_SAFE_INTEGER,
          haystack: [horse?.title, horse?.breed, horse?.owner?.email, ownerName]
            .filter(Boolean)
            .join(' ')
            .toLowerCase(),
        };
      })
      .filter((item) => {
        if (deletedStatusFilter === 'restorable' && item.metrics.isExpired) return false;
        if (deletedStatusFilter === 'urgent' && !item.metrics.isUrgent) return false;
        if (deletedStatusFilter === 'expired' && !item.metrics.isExpired) return false;
        if (!q) return true;
        return item.haystack.includes(q);
      });

    if (deletedSortBy === 'latest_deleted') {
      items = items.sort((a, b) => b.deletedTime - a.deletedTime);
    } else {
      items = items.sort((a, b) => a.expiryTime - b.expiryTime);
    }

    return items.map((item) => item.horse);
  }, [deletedListings, deletedSearchQuery, deletedStatusFilter, deletedSortBy, restoreWindowDays]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshAdminData();
    } finally {
      setRefreshing(false);
    }
  }, [refreshAdminData]);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      setLoading(true);

      const cachedSnapshot = apiService.adminGetDashboardSnapshot({ allowStale: true });
      if (cachedSnapshot) {
        applyDashboardPayload(cachedSnapshot);
        if (isMounted) {
          setLoading(false);
        }
      }

      refreshAdminData({ force: true }).finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

      return () => {
        if (refreshAbortControllerRef.current) {
          refreshAbortControllerRef.current.abort();
          refreshAbortControllerRef.current = null;
        }
        if (typeof apiService.cancelAllAdminRequests === 'function') {
          apiService.cancelAllAdminRequests();
        }
        isMounted = false;
      };
    }, [applyDashboardPayload, refreshAdminData])
  );

  const stats = useMemo(() => {
    const admins = users.filter((u) => u.role === 'admin').length;
    return {
      users: usersTotal,
      admins,
      listings: allListingsTotal,
      pending: pendingListingsTotal,
    };
  }, [users, usersTotal, allListingsTotal, pendingListingsTotal]);

  const handleApprove = async (horseId) => {
    try {
      await apiService.adminApproveListing(horseId);
      await refreshAdminData();
      toast.show(t('adminListingApproved'), { type: 'success' });
    } catch (err) {
      toast.show(extractApiErrorMessage(err, t('adminActionFailed')), { type: 'error' });
    }
  };

  const openRejectEditor = (horse) => {
    setRejectingHorse(horse);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const cancelRejectEditor = () => {
    setShowRejectModal(false);
    setRejectingHorse(null);
    setRejectReason('');
  };

  const handleRejectSubmit = async () => {
    if (!rejectingHorse) return;
    const reason = rejectReason.trim() || t('adminDefaultRejectReason');
    setSubmittingReject(true);
    try {
      await apiService.adminRejectListing(rejectingHorse.id, reason);
      cancelRejectEditor();
      await refreshAdminData();
      toast.show(t('adminListingRejected'), { type: 'success' });
    } catch (err) {
      toast.show(extractApiErrorMessage(err, t('adminActionFailed')), { type: 'error' });
    } finally {
      setSubmittingReject(false);
    }
  };

  const handleRestoreListing = async (horseId) => {
    try {
      await apiService.restoreHorseListing(horseId);
      await refreshAdminData();
      toast.show(t('listingRestored'), { type: 'success' });
    } catch (err) {
      toast.show(extractApiErrorMessage(err, t('listingRestoreFailed')), { type: 'error' });
    }
  };

  const handlePurgeExpiredDeleted = () => {
    if (restoreWindowDays <= 0) {
      toast.show(t('adminPurgeExpiredDisabled'), { type: 'error' });
      return;
    }

    setPurgeConfirmText('');
    setPurgeConfirmMode('manual');
  };

  const handleBulkRestoreSelected = () => {
    if (selectedDeletedListings.size === 0) {
      toast.show(t('adminSelectItems'), { type: 'error' });
      return;
    }

    Alert.alert(
      t('adminBulkRestore'),
      `${t('adminBulkRestoreConfirm')} ${selectedDeletedListings.size}?`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('adminBulkRestore'),
          style: 'default',
          onPress: async () => {
            setBulkOperationLoading(true);
            try {
              const horseIds = Array.from(selectedDeletedListings);
              const res = await apiService.adminBulkRestoreListings(horseIds);
              setSelectedDeletedListings(new Set());
              await refreshAdminData();
              const { restored_count = 0, expired_count = 0, already_active_count = 0 } = res.data || {};
              const message = `${t('restored')}: ${restored_count}, ${t('expired')}: ${expired_count}, ${t('active')}: ${already_active_count}`;
              toast.show(message, { type: 'success' });
            } catch (err) {
              toast.show(extractApiErrorMessage(err, t('adminActionFailed')), { type: 'error' });
            } finally {
              setBulkOperationLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleBulkPurgeSelected = () => {
    if (selectedDeletedListings.size === 0) {
      toast.show(t('adminSelectItems'), { type: 'error' });
      return;
    }

    if (restoreWindowDays <= 0) {
      toast.show(t('adminBulkPurgeDisabled'), { type: 'error' });
      return;
    }

    setPurgeConfirmText('');
    setPurgeConfirmMode('bulk');
  };

  const handleConfirmPurgeAction = async () => {
    if (purgeConfirmText.trim().toUpperCase() !== PURGE_KEYWORD) {
      Alert.alert('error', t('adminPurgeTypeInvalid'));
      toast?.show?.(t('adminPurgeTypeInvalid'), { type: 'error' });
      return;
    }

    if (purgeConfirmMode === 'manual') {
      setPurgingExpired(true);
      try {
        const res = await apiService.adminPurgeExpiredDeletedListings();
        await refreshAdminData();
        const purgedCount = typeof res.data?.purged_count === 'number' ? res.data.purged_count : 0;
        const msg = `${t('adminPurgeExpiredSuccess')}: ${purgedCount}`;
        Alert.alert('success', msg);
        toast?.show?.(msg, { type: 'success' });
      } catch (err) {
        const msg = extractApiErrorMessage(err, t('adminActionFailed'));
        Alert.alert('error', msg);
        toast?.show?.(msg, { type: 'error' });
      } finally {
        setPurgingExpired(false);
        setPurgeConfirmMode(null);
        setPurgeConfirmText('');
      }
      return;
    }

    if (purgeConfirmMode === 'bulk') {
      setBulkOperationLoading(true);
      try {
        const horseIds = Array.from(selectedDeletedListings);
        const res = await apiService.adminBulkPurgeDeletedListings(horseIds);
        setSelectedDeletedListings(new Set());
        await refreshAdminData();
        const { purged_count = 0, not_expired_count = 0 } = res.data || {};
        const message = `${t('deleted')}: ${purged_count}, ${t('notExpired')}: ${not_expired_count}`;
        Alert.alert('success', message);
        toast?.show?.(message, { type: 'success' });
      } catch (err) {
        const msg = extractApiErrorMessage(err, t('adminActionFailed'));
        Alert.alert('error', msg);
        toast?.show?.(msg, { type: 'error' });
      } finally {
        setBulkOperationLoading(false);
        setPurgeConfirmMode(null);
        setPurgeConfirmText('');
      }
    }
  };

  const toggleVerifyUser = async (user) => {
    if (user.role === 'admin' && user.is_verified) {
      toast.show(t('adminCannotUnverifyAdmin'), { type: 'error' });
      return;
    }
    try {
      await apiService.adminUpdateUser(user.id, { is_verified: !user.is_verified });
      await refreshAdminData();
    } catch (err) {
      toast.show(extractApiErrorMessage(err, t('adminActionFailed')), { type: 'error' });
    }
  };

  const promoteUser = async (user) => {
    try {
      await apiService.adminUpdateUserRole(user.id, 'admin');
      await refreshAdminData();
      toast.show(t('adminPromoted'), { type: 'success' });
    } catch (err) {
      toast.show(extractApiErrorMessage(err, t('adminActionFailed')), { type: 'error' });
    }
  };

  const hasMoreUsers = users.length < usersTotal;
  const hasMoreAllListings = allListings.length < allListingsTotal;
  const hasMorePendingListings = pendingListings.length < pendingListingsTotal;
  const hasMoreDeletedListings = deletedListings.length < deletedListingsTotal;

  const handleLoadMore = async (tabKey) => {
    if (loadingMoreTab) return;
    setLoadingMoreTab(tabKey);
    try {
      if (tabKey === 'users' && hasMoreUsers) {
        const nextPage = usersPage + 1;
        const res = await apiService.adminListUsersCancelable({
          skip: nextPage * PAGE_LIMIT,
          limit: PAGE_LIMIT,
          requestKey: 'load-more-users',
        });
        const items = parseListPayload(res.data, 'users');
        setUsers((prev) => [...prev, ...items]);
        setUsersPage(nextPage);
      }

      if (tabKey === 'listings' && hasMoreAllListings) {
        const nextPage = allListingsPage + 1;
        const res = await apiService.adminListListingsCancelable({
          skip: nextPage * PAGE_LIMIT,
          limit: PAGE_LIMIT,
          requestKey: 'load-more-listings',
        });
        const items = parseListPayload(res.data, 'listings');
        setAllListings((prev) => [...prev, ...items]);
        setAllListingsPage(nextPage);
      }

      if (tabKey === 'pending' && hasMorePendingListings) {
        const nextPage = pendingListingsPage + 1;
        const res = await apiService.adminListPendingListingsCancelable({
          skip: nextPage * PAGE_LIMIT,
          limit: PAGE_LIMIT,
          requestKey: 'load-more-pending',
        });
        const items = parseListPayload(res.data, 'listings');
        setPendingListings((prev) => [...prev, ...items]);
        setPendingListingsPage(nextPage);
      }

      if (tabKey === 'deleted' && hasMoreDeletedListings) {
        const nextPage = deletedListingsPage + 1;
        const res = await apiService.adminListDeletedListingsCancelable({
          skip: nextPage * PAGE_LIMIT,
          limit: PAGE_LIMIT,
          requestKey: 'load-more-deleted',
        });
        const items = parseListPayload(res.data, 'listings');
        setDeletedListings((prev) => [...prev, ...items]);
        setDeletedListingsPage(nextPage);
      }
    } catch (err) {
      const requestCanceled =
        typeof apiService.isRequestCanceled === 'function' && apiService.isRequestCanceled(err);
      if (requestCanceled) {
        return;
      }

      toast.show(extractApiErrorMessage(err, t('adminLoadFailed')), { type: 'error' });
    } finally {
      setLoadingMoreTab(null);
    }
  };

  const pendingListFooter = hasMorePendingListings ? (
    <TouchableOpacity
      style={[styles.loadMoreBtn, loadingMoreTab === 'pending' && styles.loadMoreBtnDisabled]}
      onPress={() => handleLoadMore('pending')}
      disabled={loadingMoreTab === 'pending'}
    >
      {loadingMoreTab === 'pending' ? (
        <ActivityIndicator size="small" color={COLORS.primary} />
      ) : (
        <Text style={styles.loadMoreText}>{t('loadMore')}</Text>
      )}
    </TouchableOpacity>
  ) : (
    <View style={styles.listFooterSpacer} />
  );

  const listingsListFooter = hasMoreAllListings ? (
    <TouchableOpacity
      style={[styles.loadMoreBtn, loadingMoreTab === 'listings' && styles.loadMoreBtnDisabled]}
      onPress={() => handleLoadMore('listings')}
      disabled={loadingMoreTab === 'listings'}
    >
      {loadingMoreTab === 'listings' ? (
        <ActivityIndicator size="small" color={COLORS.primary} />
      ) : (
        <Text style={styles.loadMoreText}>{t('loadMore')}</Text>
      )}
    </TouchableOpacity>
  ) : (
    <View style={styles.listFooterSpacer} />
  );

  const deletedListFooter = hasMoreDeletedListings ? (
    <TouchableOpacity
      style={[styles.loadMoreBtn, loadingMoreTab === 'deleted' && styles.loadMoreBtnDisabled]}
      onPress={() => handleLoadMore('deleted')}
      disabled={loadingMoreTab === 'deleted'}
    >
      {loadingMoreTab === 'deleted' ? (
        <ActivityIndicator size="small" color={COLORS.primary} />
      ) : (
        <Text style={styles.loadMoreText}>{t('loadMore')}</Text>
      )}
    </TouchableOpacity>
  ) : (
    <View style={styles.listFooterSpacer} />
  );

  const usersListFooter = hasMoreUsers ? (
    <TouchableOpacity
      style={[styles.loadMoreBtn, loadingMoreTab === 'users' && styles.loadMoreBtnDisabled]}
      onPress={() => handleLoadMore('users')}
      disabled={loadingMoreTab === 'users'}
    >
      {loadingMoreTab === 'users' ? (
        <ActivityIndicator size="small" color={COLORS.primary} />
      ) : (
        <Text style={styles.loadMoreText}>{t('loadMore')}</Text>
      )}
    </TouchableOpacity>
  ) : (
    <View style={styles.listFooterSpacer} />
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* Executive Command Header */}
      <View style={[styles.header, isRTL && styles.rowRTL]}>
        <View style={[styles.headerLeftWrap, isRTL && styles.rowRTL]}>
          <View style={styles.brandIconWrap}>
            <BrandMark size={32} />
          </View>
          <View style={[styles.headerCopyWrap, isRTL && styles.headerCopyWrapRTL]}>
            <View style={[styles.portalBadge, isRTL && styles.rowRTL]}>
              <View style={styles.portalBadgeDot} />
              <Text style={styles.portalBadgeText}>
                {isRTL ? 'غرفة العمليات المركزية والرقابة' : 'EXECUTIVE PLATFORM OPERATIONS & AUDIT'}
              </Text>
            </View>
            <Text style={[styles.headerTitle, isRTL && styles.textRTL]}>{t('adminPanel')}</Text>
            <Text style={[styles.headerSubtitle, isRTL && styles.textRTL]}>{t('adminPanelSubtitle')}</Text>
          </View>
        </View>

        <TouchableOpacity
          testID="admin-panel-hotline-btn"
          style={styles.headerHotlineBtn}
          onPress={handleExecutiveHotline}
          activeOpacity={0.8}
          accessibilityLabel="Executive Operations WhatsApp Hotline"
        >
          <Ionicons name="logo-whatsapp" size={17} color="#25D366" />
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        {[
          { key: 'users', label: t('adminUsers'), value: stats.users, icon: 'people-outline', colors: ['#0F3826', '#1E6B49'] },
          { key: 'listings', label: t('adminAllListings'), value: stats.listings, icon: 'list-outline', colors: ['#9C7733', '#C5A059'] },
        ].map((card) => (
          <LinearGradient key={card.key} colors={card.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.statCard}>
            <View style={styles.statIconWrap}>
              <Ionicons name={card.icon} size={15} color={COLORS.white} />
            </View>
            <Text style={styles.statNumber}>{card.value}</Text>
            <Text style={styles.statLabel}>{card.label}</Text>
          </LinearGradient>
        ))}
      </View>

      {/* 3-Console Operations Command Center */}
      <View style={styles.opsHubContainer}>
        <TouchableOpacity
          testID="nav-admin-moderation"
          style={[styles.moderationBtn, isRTL && styles.rowRTL]}
          onPress={() => navigation.navigate('AdminModerationDashboardScreen')}
          activeOpacity={0.8}
        >
          <View style={styles.hubIconWrap}>
            <Ionicons name="shield-checkmark" size={20} color={COLORS.primary} />
          </View>
          <View style={styles.hubContentWrap}>
            <View style={[styles.hubTitleRow, isRTL && styles.rowRTL]}>
              <Text style={[styles.moderationBtnText, isRTL && styles.textRTL]}>{t('adminModeration')}</Text>
              {nonHorsePendingCounts.total > 0 && (
                <View style={styles.moderationBadge}>
                  <Text style={styles.moderationBadgeText}>{nonHorsePendingCounts.total}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.hubSubtitle, isRTL && styles.textRTL]} numberOfLines={1}>
              {t('adminModerationSubtitle')}
            </Text>
          </View>
          <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <View style={[styles.hubSubRow, isRTL && styles.rowRTL]}>
          <TouchableOpacity
            testID="nav-admin-offer-audit"
            style={[styles.hubMiniTile, isRTL && styles.rowRTL]}
            onPress={() => navigation.navigate('AdminOfferAudit')}
            activeOpacity={0.8}
          >
            <View style={[styles.hubIconWrapSmall, { backgroundColor: COLORS.accent + '22' }]}>
              <Ionicons name="receipt-outline" size={16} color={COLORS.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.hubMiniTitle, isRTL && styles.textRTL]} numberOfLines={1}>
                {t('adminOfferAuditTitle')}
              </Text>
              <Text style={[styles.hubMiniSubtitle, isRTL && styles.textRTL]} numberOfLines={1}>
                {t('adminOfferAuditSubtitle')}
              </Text>
            </View>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={14} color={COLORS.textLight} />
          </TouchableOpacity>

          <TouchableOpacity
            testID="nav-admin-push-logs"
            style={[styles.hubMiniTile, isRTL && styles.rowRTL]}
            onPress={() => navigation.navigate('AdminPushLogs')}
            activeOpacity={0.8}
          >
            <View style={[styles.hubIconWrapSmall, { backgroundColor: COLORS.primaryLight + '22' }]}>
              <Ionicons name="notifications-outline" size={16} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.hubMiniTitle, isRTL && styles.textRTL]} numberOfLines={1}>
                {t('adminPushLogsTitle')}
              </Text>
              <Text style={[styles.hubMiniSubtitle, isRTL && styles.textRTL]} numberOfLines={1}>
                {t('adminPushLogsSubtitle')}
              </Text>
            </View>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={14} color={COLORS.textLight} />
          </TouchableOpacity>
        </View>

        {/* Executive Platform Security & Escrow Telemetry Shield */}
        <View testID="admin-escrow-security-shield" style={styles.escrowShieldCard}>
          <View style={[styles.escrowShieldHeader, isRTL && styles.rowRTL]}>
            <View style={styles.escrowShieldIconWrap}>
              <Ionicons name="shield-checkmark" size={18} color={COLORS.accentDark} />
            </View>
            <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <View style={[styles.escrowBadgeRow, isRTL && styles.rowRTL]}>
                <View style={styles.escrowPulseDot} />
                <Text style={styles.escrowBadgeText}>
                  {isRTL ? 'الرقابة المصرفية وتتبع حسابات الضمان' : 'EXECUTIVE ESCROW & PLATFORM SURVEILLANCE'}
                </Text>
              </View>
              <Text style={[styles.escrowShieldTitle, isRTL && styles.textRTL]}>
                {isRTL ? 'منظومة الحماية المصرفية وتدقيق الصفقات' : 'Certified Equestrian Escrow & Integrity Custody'}
              </Text>
              <Text style={[styles.escrowShieldDesc, isRTL && styles.textRTL]}>
                {isRTL
                  ? 'متابعة فورية للعروض الملزمة، شروط التحكيم المصرفي، وسياسات الحذف الآمن والاسترداد'
                  : 'Live monitoring of binding offers, banking escrow arbitration, and soft-delete retention'}
              </Text>
            </View>
          </View>

          {/* 3 Platform Integrity Pillars */}
          <View style={styles.escrowPillars}>
            <View style={[styles.escrowPillarItem, isRTL && styles.rowRTL]}>
              <View style={styles.escrowPillarIcon}>
                <Ionicons name="document-lock" size={13} color={COLORS.accentDark} />
              </View>
              <Text style={[styles.escrowPillarText, isRTL && styles.textRTL]}>
                {isRTL ? 'مراقبة عروض الصفقات والضمان' : 'Live Escrow & Offer Audit Surveillance'}
              </Text>
            </View>
            <View style={[styles.escrowPillarItem, isRTL && styles.rowRTL]}>
              <View style={styles.escrowPillarIcon}>
                <Ionicons name="time" size={13} color={COLORS.accentDark} />
              </View>
              <Text style={[styles.escrowPillarText, isRTL && styles.textRTL]}>
                {isRTL ? 'سجلات الحذف المؤقت والاسترداد (30 يوماً)' : 'Automated 30-Day Retention & Expiry Purge'}
              </Text>
            </View>
            <View style={[styles.escrowPillarItem, isRTL && styles.rowRTL]}>
              <View style={styles.escrowPillarIcon}>
                <Ionicons name="call" size={13} color={COLORS.accentDark} />
              </View>
              <Text style={[styles.escrowPillarText, isRTL && styles.textRTL]}>
                {isRTL ? 'خط ساخن مع كبار الوسطاء والمشرفين' : 'Direct Senior Broker & Admin Hotline'}
              </Text>
            </View>
          </View>

          {/* 1-Tap WhatsApp Operations Escrow Director button */}
          <TouchableOpacity
            testID="admin-escrow-director-btn"
            style={[styles.escrowDirectorBtn, isRTL && styles.rowRTL]}
            onPress={handleEscrowDirectorInquiry}
            activeOpacity={0.85}
          >
            <Ionicons name="logo-whatsapp" size={15} color="#25D366" />
            <Text style={styles.escrowDirectorBtnText}>
              {isRTL ? 'استشارة مدير حسابات الضمان والعمليات' : 'Consult Escrow & Operations Director'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.tabRow, isRTL && styles.rowRTL]}>
        {[
          { key: 'pending', label: t('adminPendingListings') },
          { key: 'listings', label: t('adminAllListings') },
          { key: 'deleted', label: t('adminDeletedListings') },
          { key: 'users', label: t('adminUsers') },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabBtn, activeTab === tab.key && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <View style={styles.tabBtnLabelWrap}>
              <Text style={[styles.tabBtnText, activeTab === tab.key && styles.tabBtnTextActive]}>{tab.label}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <>
          {activeTab === 'pending' && (
            <>
              <View style={[styles.pendingCategoryRow, isRTL && styles.rowRTL]}>
                <TouchableOpacity
                  style={[styles.pendingCategoryChip, styles.pendingCategoryChipActive]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.pendingCategoryChipText, styles.pendingCategoryChipTextActive]}>
                    🐴 {t('adminPendingListings') || 'Horses'} ({pendingListingsTotal})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.pendingCategoryChip}
                  onPress={() => navigation.navigate('AdminModerationDashboardScreen', { initialTab: 'equipment' })}
                  activeOpacity={0.8}
                >
                  <Text style={styles.pendingCategoryChipText}>
                    📦 {t('equipmentModule')} ({nonHorsePendingCounts.equipment})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.pendingCategoryChip}
                  onPress={() => navigation.navigate('AdminModerationDashboardScreen', { initialTab: 'rider_gear' })}
                  activeOpacity={0.8}
                >
                  <Text style={styles.pendingCategoryChipText}>
                    🏇 {t('riderGearModule')} ({nonHorsePendingCounts.riderGear})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.pendingCategoryChip}
                  onPress={() => navigation.navigate('AdminModerationDashboardScreen', { initialTab: 'services' })}
                  activeOpacity={0.8}
                >
                  <Text style={styles.pendingCategoryChipText}>
                    ⚙️ {t('servicesModule')} ({nonHorsePendingCounts.services})
                  </Text>
                </TouchableOpacity>
              </View>

              <FlatList
                data={pendingListings}
                keyExtractor={(horse) => String(horse.id)}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />}
                initialNumToRender={5}
                maxToRenderPerBatch={8}
                windowSize={8}
                removeClippedSubviews={false}
                ListEmptyComponent={<Text style={[styles.emptyText, isRTL && styles.textRTL]}>{t('adminNoPending')}</Text>}
                ListFooterComponent={pendingListFooter}
                renderItem={({ item: horse }) => (
                  <View style={styles.block}>
                    <HorseCard
                      horse={horse}
                      onPress={() => navigation.navigate('AdminEditHorse', { horse })}
                      onFavorite={() => {}}
                      isFavorited={false}
                    />
                    <View style={[styles.secondaryActionRow, isRTL && styles.rowRTL]}>
                      <TouchableOpacity
                        style={styles.secondaryActionBtn}
                        onPress={() => navigation.navigate('HorseDetail', { horse })}
                      >
                        <Text style={styles.secondaryActionText}>{t('viewDetails')}</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={[styles.actionRow, isRTL && styles.rowRTL]}>
                      <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(horse.id)}>
                        <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.white} />
                        <Text style={styles.approveText}>{t('approve')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.rejectBtn} onPress={() => openRejectEditor(horse)}>
                        <Ionicons name="close-circle-outline" size={18} color={COLORS.white} />
                        <Text style={styles.rejectText}>{t('reject')}</Text>
                      </TouchableOpacity>
                    </View>
                    {renderReviewMeta(horse.id)}
                  </View>
                )}
              />
            </>
          )}

          {activeTab === 'listings' && (
            <FlatList
              data={allListings}
              keyExtractor={(horse) => String(horse.id)}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />}
              initialNumToRender={5}
              maxToRenderPerBatch={8}
              windowSize={8}
              removeClippedSubviews
              ListEmptyComponent={<Text style={[styles.emptyText, isRTL && styles.textRTL]}>{t('adminNoListings')}</Text>}
              ListFooterComponent={listingsListFooter}
              renderItem={({ item: horse }) => (
                <View style={styles.block}>
                  <HorseCard
                    horse={horse}
                    onPress={() => navigation.navigate('AdminEditHorse', { horse })}
                    onFavorite={() => {}}
                    isFavorited={false}
                  />
                  <View style={[styles.secondaryActionRow, isRTL && styles.rowRTL]}>
                    <TouchableOpacity
                      style={styles.secondaryActionBtn}
                      onPress={() => navigation.navigate('HorseDetail', { horse })}
                    >
                      <Text style={styles.secondaryActionText}>{t('viewDetails')}</Text>
                    </TouchableOpacity>
                  </View>
                  {renderReviewMeta(horse.id)}
                </View>
              )}
            />
          )}

          {activeTab === 'deleted' && (
            <FlatList
              data={filteredDeletedListings}
              keyExtractor={(horse) => String(horse.id)}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />}
              initialNumToRender={5}
              maxToRenderPerBatch={8}
              windowSize={8}
              removeClippedSubviews
              ListHeaderComponent={
                deletedListings.length === 0 ? null : (
                  <>
                    <View style={styles.deletedToolsWrap}>
                      <TextInput
                        style={[styles.deletedSearchInput, isRTL && styles.textRTL]}
                        value={deletedSearchInput}
                        onChangeText={setDeletedSearchInput}
                        placeholder={t('adminDeletedSearchPlaceholder')}
                        placeholderTextColor={COLORS.textLight}
                        textAlign={isRTL ? 'right' : 'left'}
                      />
                      <View style={[styles.deletedFilterRow, isRTL && styles.rowRTL]}>
                        {[
                          { key: 'all', label: t('adminDeletedFilterAll') },
                          { key: 'restorable', label: t('adminDeletedFilterRestorable') },
                          { key: 'urgent', label: t('adminDeletedFilterUrgent') },
                          { key: 'expired', label: t('adminDeletedFilterExpired') },
                        ].map((option) => (
                          <TouchableOpacity
                            key={option.key}
                            style={[
                              styles.deletedChip,
                              deletedStatusFilter === option.key && styles.deletedChipActive,
                            ]}
                            onPress={() => setDeletedStatusFilter(option.key)}
                          >
                            <Text
                              style={[
                                styles.deletedChipText,
                                deletedStatusFilter === option.key && styles.deletedChipTextActive,
                              ]}
                            >
                              {option.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <TouchableOpacity
                        style={[styles.deletedSortBtn, isRTL && styles.rowRTL]}
                        onPress={() =>
                          setDeletedSortBy((prev) =>
                            prev === 'nearest_expiry' ? 'latest_deleted' : 'nearest_expiry'
                          )
                        }
                      >
                        <Ionicons name="swap-vertical-outline" size={16} color={COLORS.primary} />
                        <Text style={styles.deletedSortBtnText}>
                          {deletedSortBy === 'nearest_expiry'
                            ? t('adminDeletedSortNearest')
                            : t('adminDeletedSortLatest')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                      testID="manual-purge-expired-btn"
                      style={[
                        styles.purgeBtn,
                        (restoreWindowDays <= 0 || purgingExpired) && styles.loadMoreBtnDisabled,
                      ]}
                      onPress={handlePurgeExpiredDeleted}
                      disabled={restoreWindowDays <= 0 || purgingExpired}
                    >
                      {purgingExpired ? (
                        <ActivityIndicator size="small" color={COLORS.white} />
                      ) : (
                        <>
                          <Ionicons name="trash-bin-outline" size={16} color={COLORS.white} />
                          <Text style={styles.purgeBtnText}>{t('adminPurgeExpired')}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    {purgeConfirmMode && (
                      <View style={styles.purgeConfirmCard}>
                        <Text style={[styles.purgeConfirmTitle, isRTL && styles.textRTL]}>
                          {purgeConfirmMode === 'manual' ? t('adminPurgeManualPrompt') : `${t('adminPurgeBulkPrompt')} ${selectedDeletedListings.size}`}
                        </Text>
                        <Text style={[styles.purgeConfirmHint, isRTL && styles.textRTL]}>
                          {t('adminPurgeTypeToConfirm')}
                        </Text>
                        <TextInput
                          style={[styles.purgeConfirmInput, isRTL && styles.textRTL]}
                          value={purgeConfirmText}
                          onChangeText={setPurgeConfirmText}
                          autoCapitalize="characters"
                          autoCorrect={false}
                          placeholder={t('adminPurgeTypePlaceholder')}
                          placeholderTextColor={COLORS.textLight}
                          textAlign={isRTL ? 'right' : 'left'}
                        />
                        <View style={[styles.purgeConfirmActions, isRTL && styles.rowRTL]}>
                          <TouchableOpacity
                            style={styles.purgeConfirmCancelBtn}
                            onPress={() => {
                              setPurgeConfirmMode(null);
                              setPurgeConfirmText('');
                            }}
                          >
                            <Text style={styles.purgeConfirmCancelText}>{t('cancel')}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.purgeConfirmSubmitBtn,
                              (purgingExpired || bulkOperationLoading) && styles.loadMoreBtnDisabled,
                            ]}
                            onPress={handleConfirmPurgeAction}
                            disabled={purgingExpired || bulkOperationLoading}
                          >
                            {purgingExpired || bulkOperationLoading ? (
                              <ActivityIndicator size="small" color={COLORS.white} />
                            ) : (
                              <Text style={styles.purgeConfirmSubmitText}>{t('adminPurgeConfirmAction')}</Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                    <View style={[styles.selectAllRow, isRTL && styles.rowRTL]}>
                      <TouchableOpacity
                        style={styles.selectAllCheckbox}
                        onPress={toggleAllDeletedListingsSelection}
                      >
                        <Ionicons
                          name={
                            filteredDeletedListings.length > 0 &&
                            selectedDeletedListings.size === filteredDeletedListings.length
                              ? 'checkbox'
                              : 'square-outline'
                          }
                          size={20}
                          color={selectedDeletedListings.size > 0 ? COLORS.primary : COLORS.textLight}
                        />
                      </TouchableOpacity>
                      <Text style={[styles.selectAllText, isRTL && styles.textRTL]}>
                        {selectedDeletedListings.size > 0
                          ? `${t('selected')}: ${selectedDeletedListings.size}`
                          : t('selectAll')}
                      </Text>
                    </View>
                    {selectedDeletedListings.size > 0 && (
                      <View style={[styles.bulkActionsRow, isRTL && styles.rowRTL]}>
                        <TouchableOpacity
                          style={[styles.bulkRestoreBtn, bulkOperationLoading && styles.loadMoreBtnDisabled]}
                          onPress={handleBulkRestoreSelected}
                          disabled={bulkOperationLoading}
                        >
                          {bulkOperationLoading ? (
                            <ActivityIndicator size="small" color={COLORS.white} />
                          ) : (
                            <>
                              <Ionicons name="return-up-back-outline" size={16} color={COLORS.white} />
                              <Text style={styles.bulkRestoreBtnText}>{t('adminBulkRestore')}</Text>
                            </>
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          testID="bulk-purge-selected-btn"
                          style={[styles.bulkPurgeBtn, bulkOperationLoading && styles.loadMoreBtnDisabled]}
                          onPress={handleBulkPurgeSelected}
                          disabled={bulkOperationLoading}
                        >
                          {bulkOperationLoading ? (
                            <ActivityIndicator size="small" color={COLORS.white} />
                          ) : (
                            <>
                              <Ionicons name="trash-bin-outline" size={16} color={COLORS.white} />
                              <Text style={styles.bulkPurgeBtnText}>{t('adminBulkPurge')}</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}
                  </>
                )
              }
              ListEmptyComponent={
                <Text style={[styles.emptyText, isRTL && styles.textRTL]}>
                  {deletedListings.length === 0 ? t('adminNoDeletedListings') : t('adminNoDeletedFilterMatches')}
                </Text>
              }
              ListFooterComponent={deletedListings.length === 0 ? <View style={styles.listFooterSpacer} /> : deletedListFooter}
              renderItem={({ item: horse }) => {
                const restoreExpired = isRestoreExpired(horse);
                const isSelected = selectedDeletedListings.has(horse.id);

                return (
                  <View style={[styles.block, isSelected && styles.blockSelected]}>
                    <TouchableOpacity
                      testID={`deleted-select-${horse.id}`}
                      style={styles.checkboxWrapper}
                      onPress={() => toggleDeletedListingSelection(horse.id)}
                    >
                      <Ionicons
                        name={isSelected ? 'checkbox' : 'square-outline'}
                        size={20}
                        color={isSelected ? COLORS.primary : COLORS.textLight}
                      />
                    </TouchableOpacity>
                    <HorseCard
                      horse={horse}
                      onPress={() => navigation.navigate('AdminEditHorse', { horse })}
                      onFavorite={() => {}}
                      isFavorited={false}
                    />
                    {renderDeletedMeta(horse)}
                    <View style={[styles.actionRow, isRTL && styles.rowRTL]}>
                      <TouchableOpacity
                        style={[styles.approveBtn, restoreExpired && styles.approveBtnDisabled]}
                        onPress={() => handleRestoreListing(horse.id)}
                        disabled={restoreExpired}
                      >
                        <Ionicons name="return-up-back-outline" size={18} color={COLORS.white} />
                        <Text style={styles.approveText}>
                          {restoreExpired ? t('adminRestoreExpired') : t('restoreListing')}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.secondaryActionBtnWide}
                        onPress={() => navigation.navigate('HorseDetail', { horse })}
                      >
                        <Text style={styles.secondaryActionText}>{t('viewDetails')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }}
            />
          )}

          {activeTab === 'users' && (
            <FlatList
              data={users}
              keyExtractor={(user) => String(user.id)}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />}
              initialNumToRender={8}
              maxToRenderPerBatch={10}
              windowSize={8}
              removeClippedSubviews
              ListEmptyComponent={<Text style={[styles.emptyText, isRTL && styles.textRTL]}>{t('adminNoUsers')}</Text>}
              ListFooterComponent={usersListFooter}
              renderItem={({ item: user }) => (
                <TouchableOpacity
                  style={styles.userCard}
                  activeOpacity={0.9}
                  onPress={() => navigation.navigate('AdminEditUser', { user })}
                >
                  <View style={styles.userMain}>
                    <Text style={[styles.userEmail, isRTL && styles.textRTL]}>{user.email}</Text>
                    <View style={[styles.userMetaRow, isRTL && styles.rowRTL]}>
                      <Text style={styles.userMeta}>{t('adminRole')}: {user.role}</Text>
                      <Text style={styles.userMeta}>•</Text>
                      <Text style={styles.userMeta}>
                        {user.is_verified ? t('verified') : t('adminUnverified')}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.userActions, isRTL && styles.rowRTL]}>
                    {user.role !== 'admin' && (
                      <TouchableOpacity
                        style={styles.userActionBtn}
                        onPress={() => toggleVerifyUser(user)}
                      >
                        <Text style={styles.userActionText}>
                          {user.is_verified ? t('adminMarkUnverified') : t('adminMarkVerified')}
                        </Text>
                      </TouchableOpacity>
                    )}
                    {user.role !== 'admin' && (
                      <TouchableOpacity
                        style={[styles.userActionBtn, styles.promoteBtn]}
                        onPress={() => promoteUser(user)}
                      >
                        <Text style={[styles.userActionText, styles.promoteText]}>{t('adminPromote')}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </>
      )}

      {/* Rejection Modal */}
      <Modal
        visible={showRejectModal}
        animationType="fade"
        transparent
        onRequestClose={cancelRejectEditor}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={[styles.modalTitle, isRTL && styles.textRTL]}>{t('adminRejectTitle')}</Text>
              {rejectingHorse && (
                <Text style={[styles.modalSubtitle, isRTL && styles.textRTL]} numberOfLines={1}>
                  {rejectingHorse.title}
                </Text>
              )}

              <Text style={[styles.modalPrompt, isRTL && styles.textRTL]}>
                {t('adminRejectConfirm')}
              </Text>

              <Text style={[styles.modalFieldLabel, isRTL && styles.textRTL]}>
                {t('adminRejectReason')}
              </Text>

              <TextInput
                style={[styles.modalTextInput, isRTL && styles.textRTL]}
                placeholder={t('adminRejectReasonPlaceholder')}
                placeholderTextColor={COLORS.textLight}
                value={rejectReason}
                onChangeText={setRejectReason}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <View style={[styles.modalActionsRow, isRTL && styles.rowRTL]}>
                <TouchableOpacity
                  style={[styles.modalActionBtn, styles.modalCancelBtn]}
                  onPress={cancelRejectEditor}
                  disabled={submittingReject}
                >
                  <Text style={styles.modalCancelBtnText}>{t('cancel')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalActionBtn, styles.modalRejectBtn]}
                  onPress={handleRejectSubmit}
                  disabled={submittingReject}
                >
                  {submittingReject ? (
                    <ActivityIndicator color={COLORS.white} size="small" />
                  ) : (
                    <Text style={styles.modalRejectBtnText}>{t('reject')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
  },
  headerLeftWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
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
  escrowShieldCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginTop: SPACING.xs,
    borderWidth: 1.5,
    borderColor: 'rgba(197, 160, 89, 0.3)',
    ...SHADOWS.small,
  },
  escrowShieldHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  escrowShieldIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(197, 160, 89, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.3)',
  },
  escrowBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  escrowPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  escrowBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.accentDark,
    letterSpacing: 0.5,
  },
  escrowShieldTitle: {
    ...FONTS.h3,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  escrowShieldDesc: {
    ...FONTS.bodySmall,
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  escrowPillars: {
    gap: 6,
    paddingVertical: SPACING.xs,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.borderLight,
    marginVertical: SPACING.xs,
  },
  escrowPillarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  escrowPillarIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(197, 160, 89, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  escrowPillarText: {
    ...FONTS.caption,
    fontSize: 11,
    color: COLORS.text,
    fontWeight: '600',
    flex: 1,
  },
  escrowDirectorBtn: {
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
  escrowDirectorBtnText: {
    ...FONTS.button,
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  brandIconWrap: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: '#FAF8F5',
    borderWidth: 1.5,
    borderColor: COLORS.accent + '40',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.card,
  },
  headerCopyWrap: {
    flex: 1,
  },
  headerCopyWrapRTL: {
    alignItems: 'flex-end',
  },
  headerTitle: {
    ...FONTS.h2,
    color: COLORS.primary,
    fontWeight: '800',
  },
  headerSubtitle: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  opsHubContainer: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.xs,
    gap: SPACING.xs,
  },
  moderationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.primary + '25',
    ...SHADOWS.card,
  },
  hubIconWrap: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryLight + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubContentWrap: {
    flex: 1,
  },
  hubTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  moderationBtnText: {
    ...FONTS.body,
    fontWeight: '800',
    color: COLORS.primary,
  },
  hubSubtitle: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  hubSubRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  hubMiniTile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs + 2,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.card,
  },
  hubIconWrapSmall: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubMiniTitle: {
    ...FONTS.caption,
    fontWeight: '700',
    color: COLORS.text,
  },
  hubMiniSubtitle: {
    ...FONTS.caption,
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  moderationBtnText: {
    flex: 1,
    ...FONTS.body,
    fontWeight: '700',
    color: COLORS.text,
  },
  statCard: {
    flex: 1,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    alignItems: 'center',
    ...SHADOWS.soft,
  },
  statIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: 4,
  },
  statNumber: {
    ...FONTS.h3,
    color: COLORS.white,
    fontSize: 20,
    lineHeight: 24,
  },
  statLabel: {
    ...FONTS.caption,
    color: COLORS.white,
    opacity: 0.95,
    marginTop: 1,
    fontSize: 11,
  },
  tabRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.md,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabBtnLabelWrap: {
    minHeight: 30,
    justifyContent: 'center',
  },
  tabBtnActive: {
    backgroundColor: COLORS.primaryLight + '20',
    borderColor: COLORS.primary,
  },
  tabBtnText: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    textAlign: 'center',
    includeFontPadding: false,
  },
  tabBtnTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  block: {
    marginBottom: SPACING.md,
  },
  blockSelected: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    padding: 6,
    backgroundColor: COLORS.primaryLight + '0D',
  },
  checkboxWrapper: {
    alignSelf: 'flex-end',
    marginBottom: SPACING.xs,
  },
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  selectAllCheckbox: {
    padding: 2,
  },
  selectAllText: {
    ...FONTS.bodySmall,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  bulkActionsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  bulkRestoreBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.success,
  },
  bulkRestoreBtnText: {
    ...FONTS.bodySmall,
    color: COLORS.white,
    fontWeight: '700',
  },
  bulkPurgeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.error,
  },
  bulkPurgeBtnText: {
    ...FONTS.bodySmall,
    color: COLORS.white,
    fontWeight: '700',
  },
  purgeConfirmCard: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.error,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
  },
  purgeConfirmTitle: {
    ...FONTS.bodySmall,
    color: COLORS.error,
    fontWeight: '700',
  },
  purgeConfirmHint: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginTop: 4,
    marginBottom: SPACING.xs,
  },
  purgeConfirmInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.inputBg,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    ...FONTS.bodySmall,
    color: COLORS.text,
  },
  purgeConfirmActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  purgeConfirmCancelBtn: {
    flex: 1,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
  },
  purgeConfirmCancelText: {
    ...FONTS.bodySmall,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  purgeConfirmSubmitBtn: {
    flex: 1,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
  },
  purgeConfirmSubmitText: {
    ...FONTS.bodySmall,
    color: COLORS.white,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
    paddingHorizontal: SPACING.xs,
  },
  secondaryActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: SPACING.xs,
    marginTop: SPACING.xs,
  },
  secondaryActionBtn: {
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.inputBg,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  secondaryActionBtnWide: {
    flex: 1,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
  },
  secondaryActionText: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  approveBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: SPACING.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.success,
  },
  approveBtnDisabled: {
    opacity: 0.55,
    backgroundColor: COLORS.textLight,
  },
  approveText: {
    ...FONTS.bodySmall,
    color: COLORS.white,
    fontWeight: '700',
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: SPACING.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.error,
  },
  rejectText: {
    ...FONTS.bodySmall,
    color: COLORS.white,
    fontWeight: '700',
  },
  rejectEditorCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginTop: SPACING.sm,
  },
  rejectEditorLabel: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  rejectEditorInput: {
    minHeight: 84,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    ...FONTS.bodySmall,
    color: COLORS.text,
    backgroundColor: COLORS.inputBg,
  },
  rejectEditorActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  rejectSubmitBtn: {
    flex: 1,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
  },
  rejectSubmitText: {
    ...FONTS.bodySmall,
    color: COLORS.white,
    fontWeight: '700',
  },
  rejectCancelBtn: {
    flex: 1,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
  },
  rejectCancelText: {
    ...FONTS.bodySmall,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  reviewMetaCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginTop: SPACING.sm,
  },
  reviewMetaCardRTL: {
    alignItems: 'flex-end',
  },
  reviewMetaTitle: {
    ...FONTS.caption,
    color: COLORS.primary,
    fontWeight: '700',
    marginBottom: 2,
  },
  deletedMetaTitle: {
    ...FONTS.caption,
    color: COLORS.warning,
    fontWeight: '700',
    marginBottom: 2,
  },
  reviewMetaLine: {
    ...FONTS.bodySmall,
    color: COLORS.textSecondary,
  },
  restoreStatusText: {
    ...FONTS.bodySmall,
    marginTop: 6,
    fontWeight: '700',
  },
  restoreStatusActive: {
    color: COLORS.success,
  },
  restoreStatusUrgent: {
    color: COLORS.warning,
  },
  restoreStatusExpired: {
    color: COLORS.error,
  },
  deletedToolsWrap: {
    marginBottom: SPACING.sm,
    gap: SPACING.xs,
  },
  deletedSearchInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    ...FONTS.bodySmall,
    color: COLORS.text,
  },
  deletedFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  deletedChip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
  },
  deletedChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight + '16',
  },
  deletedChipText: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  deletedChipTextActive: {
    color: COLORS.primary,
  },
  deletedSortBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    backgroundColor: COLORS.primaryLight + '10',
  },
  deletedSortBtnText: {
    ...FONTS.caption,
    color: COLORS.primary,
    fontWeight: '700',
  },
  userCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.soft,
  },
  userMain: {
    marginBottom: SPACING.sm,
  },
  userEmail: {
    ...FONTS.body,
    color: COLORS.text,
    fontWeight: '700',
  },
  userMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: 4,
  },
  userMeta: {
    ...FONTS.bodySmall,
    color: COLORS.textSecondary,
  },
  userActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  userActionBtn: {
    flex: 1,
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
  },
  userActionText: {
    ...FONTS.caption,
    color: COLORS.text,
    fontWeight: '700',
  },
  promoteBtn: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight + '15',
  },
  promoteText: {
    color: COLORS.primary,
  },
  emptyText: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.lg,
  },
  loadMoreBtn: {
    marginTop: SPACING.sm,
    alignSelf: 'center',
    minWidth: 140,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight + '12',
    alignItems: 'center',
  },
  loadMoreBtnDisabled: {
    opacity: 0.6,
  },
  loadMoreText: {
    ...FONTS.bodySmall,
    color: COLORS.primary,
    fontWeight: '700',
  },
  listFooterSpacer: {
    height: 4,
  },
  purgeBtn: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.error,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  purgeBtnText: {
    ...FONTS.bodySmall,
    color: COLORS.white,
    fontWeight: '700',
  },
  moderationBadge: {
    backgroundColor: COLORS.error,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.xs,
  },
  moderationBadgeText: {
    ...FONTS.caption,
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 11,
  },
  pendingCategoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: SPACING.xs,
  },
  pendingCategoryChip: {
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pendingCategoryChipActive: {
    backgroundColor: COLORS.primaryLight + '20',
    borderColor: COLORS.primary,
  },
  pendingCategoryChipText: {
    ...FONTS.caption,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  pendingCategoryChipTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    padding: SPACING.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.card,
  },
  modalTitle: {
    ...FONTS.h3,
    color: COLORS.error,
    marginBottom: 4,
  },
  modalSubtitle: {
    ...FONTS.body,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  modalPrompt: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  modalFieldLabel: {
    ...FONTS.caption,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  modalTextInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.inputBg,
    ...FONTS.bodySmall,
    color: COLORS.text,
    minHeight: 88,
    marginBottom: SPACING.md,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    justifyContent: 'flex-end',
  },
  modalActionBtn: {
    flex: 1,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtn: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalCancelBtnText: {
    ...FONTS.bodySmall,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  modalRejectBtn: {
    backgroundColor: COLORS.error,
  },
  modalRejectBtnText: {
    ...FONTS.bodySmall,
    fontWeight: '700',
    color: COLORS.white,
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  textRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
