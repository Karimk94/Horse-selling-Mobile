import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../config/theme';
import { useLanguage } from '../contexts/LanguageContext';
import HorseCard from '../components/HorseCard';
import * as apiService from '../services/api';
import { extractApiErrorMessage } from '../utils/apiErrors';

const TELEMETRY_STATUS_TTL_MS = 2400;
let telemetryStatusCache = {
  message: '',
  tone: 'info',
  expiresAt: 0,
};

function getInitialTelemetryStatus() {
  if (telemetryStatusCache.expiresAt > Date.now()) {
    return {
      message: telemetryStatusCache.message,
      tone: telemetryStatusCache.tone,
    };
  }

  return {
    message: '',
    tone: 'info',
  };
}

export default function AdminPanelScreen({ navigation, initialTab = 'pending' }) {
  const insets = useSafeAreaInsets();
  const { t, isRTL } = useLanguage();
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
  const [rejectingHorseId, setRejectingHorseId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
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
  const [telemetryActionBusy, setTelemetryActionBusy] = useState(false);
  const [telemetryActionStatus, setTelemetryActionStatus] = useState(() => getInitialTelemetryStatus());
  const refreshAbortControllerRef = useRef(null);
  const telemetryActionCooldownRef = useRef(0);
  const telemetryStatusTimeoutRef = useRef(null);
  const [telemetrySummary, setTelemetrySummary] = useState({
    total: 0,
    avgMs: 0,
    p95Ms: 0,
    errorCount: 0,
    canceledCount: 0,
    lastStatus: '-',
    trend: 'insufficient',
    trendDeltaPct: null,
    slowEndpoints: [],
  });
  const [securityStatus, setSecurityStatus] = useState({
    purge_confirm_token_strong: false,
    expiry_purge_enabled: true,
    restore_window_days: 30,
  });

  const PURGE_KEYWORD = 'PURGE';
  const TELEMETRY_WARN_MS = 800;
  const TELEMETRY_CRITICAL_MS = 1500;
  const MAX_EXPORT_ENTRY_ERROR_LEN = 200;

  const getLatencyTone = useCallback(
    (valueMs) => {
      if (valueMs >= TELEMETRY_CRITICAL_MS) return 'critical';
      if (valueMs >= TELEMETRY_WARN_MS) return 'warning';
      return 'ok';
    },
    [TELEMETRY_CRITICAL_MS, TELEMETRY_WARN_MS]
  );

  useEffect(() => {
    const debounceId = setTimeout(() => {
      setDeletedSearchQuery(deletedSearchInput);
    }, 180);

    return () => clearTimeout(debounceId);
  }, [deletedSearchInput]);

  useEffect(() => {
    return () => {
      if (telemetryStatusTimeoutRef.current) {
        clearTimeout(telemetryStatusTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (telemetryActionStatus.message && telemetryStatusCache.expiresAt > Date.now()) {
      const remainingMs = telemetryStatusCache.expiresAt - Date.now();
      if (telemetryStatusTimeoutRef.current) {
        clearTimeout(telemetryStatusTimeoutRef.current);
      }

      telemetryStatusTimeoutRef.current = setTimeout(() => {
        telemetryStatusCache = { message: '', tone: 'info', expiresAt: 0 };
        setTelemetryActionStatus({ message: '', tone: 'info' });
        telemetryStatusTimeoutRef.current = null;
      }, remainingMs);
    }
  }, [telemetryActionStatus.message]);

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

    setSecurityStatus((prev) => ({
      ...prev,
      purge_confirm_token_strong: Boolean(payload.security?.purge_confirm_token_strong),
      expiry_purge_enabled:
        typeof payload.security?.expiry_purge_enabled === 'boolean'
          ? payload.security.expiry_purge_enabled
          : fallbackRestoreWindowDays > 0,
      restore_window_days:
        typeof payload.security?.restore_window_days === 'number'
          ? payload.security.restore_window_days
          : fallbackRestoreWindowDays,
    }));

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
      const payload = await apiService.adminFetchDashboard({
        skip: 0,
        limit: PAGE_LIMIT,
        force,
        signal: controller.signal,
      });

      if (refreshAbortControllerRef.current !== controller) {
        return;
      }

      applyDashboardPayload(payload);
    } catch (err) {
      const requestCanceled =
        typeof apiService.isRequestCanceled === 'function' && apiService.isRequestCanceled(err);
      if (requestCanceled) {
        return;
      }

      Alert.alert(t('error'), extractApiErrorMessage(err, t('adminLoadFailed')));
    } finally {
      if (refreshAbortControllerRef.current === controller) {
        refreshAbortControllerRef.current = null;
      }
    }
  }, [applyDashboardPayload, t]);

  const refreshTelemetrySummary = useCallback(() => {
    if (typeof apiService.getAdminRequestTelemetry !== 'function') {
      return;
    }

    const entries = apiService.getAdminRequestTelemetry({ limit: 60 }) || [];
    if (entries.length === 0) {
      setTelemetrySummary({
        total: 0,
        avgMs: 0,
        p95Ms: 0,
        errorCount: 0,
        canceledCount: 0,
        lastStatus: '-',
        trend: 'insufficient',
        trendDeltaPct: null,
        slowEndpoints: [],
      });
      return;
    }

    const durations = entries
      .map((entry) => (typeof entry?.durationMs === 'number' ? entry.durationMs : 0))
      .sort((a, b) => a - b);
    const totalDuration = durations.reduce((acc, current) => acc + current, 0);
    const avgMs = Math.round(totalDuration / durations.length);
    const p95Index = Math.max(0, Math.ceil(durations.length * 0.95) - 1);
    const p95Ms = Math.round(durations[p95Index] || 0);
    const errorCount = entries.filter(
      (entry) => !entry?.canceled && typeof entry?.statusCode === 'number' && entry.statusCode >= 400
    ).length;
    const canceledCount = entries.filter((entry) => Boolean(entry?.canceled)).length;
    const latestStatus = entries[0]?.statusCode;

    const newestWindow = entries.slice(0, 20);
    const previousWindow = entries.slice(20, 40);
    const newestAvg =
      newestWindow.length > 0
        ? newestWindow.reduce((acc, entry) => acc + (Number(entry?.durationMs) || 0), 0) / newestWindow.length
        : 0;
    const previousAvg =
      previousWindow.length > 0
        ? previousWindow.reduce((acc, entry) => acc + (Number(entry?.durationMs) || 0), 0) / previousWindow.length
        : 0;

    const classifyTrend = (latestAvg, baselineAvg, latestCount, baselineCount) => {
      if (latestCount < 10 || baselineCount < 10 || baselineAvg <= 0) {
        return { trend: 'insufficient', trendDeltaPct: null };
      }

      const deltaPct = Math.round(((latestAvg - baselineAvg) / baselineAvg) * 100);
      if (deltaPct <= -12) {
        return { trend: 'improving', trendDeltaPct: deltaPct };
      }
      if (deltaPct >= 12) {
        return { trend: 'degrading', trendDeltaPct: deltaPct };
      }
      return { trend: 'stable', trendDeltaPct: deltaPct };
    };

    const { trend, trendDeltaPct } = classifyTrend(
      newestAvg,
      previousAvg,
      newestWindow.length,
      previousWindow.length
    );

    const endpointGroups = new Map();

    entries.forEach((entry) => {
      const method = String(entry?.method || 'GET').toUpperCase();
      const rawUrl = String(entry?.url || '');
      const pathOnly = rawUrl.split('?')[0] || rawUrl;
      const endpointKey = `${method} ${pathOnly}`;
      const durationMs = typeof entry?.durationMs === 'number' ? entry.durationMs : 0;

      if (!endpointGroups.has(endpointKey)) {
        endpointGroups.set(endpointKey, []);
      }
      endpointGroups.get(endpointKey).push(durationMs);
    });

    const slowEndpoints = Array.from(endpointGroups.entries())
      .map(([endpoint, endpointDurations]) => {
        const sortedDurations = [...endpointDurations].sort((a, b) => a - b);
        const total = sortedDurations.reduce((acc, current) => acc + current, 0);
        const avg = sortedDurations.length > 0 ? Math.round(total / sortedDurations.length) : 0;
        const p95IndexForEndpoint = Math.max(0, Math.ceil(sortedDurations.length * 0.95) - 1);
        const p95 = Math.round(sortedDurations[p95IndexForEndpoint] || 0);

        const endpointNewestWindow = endpointDurations.slice(0, 10);
        const endpointPreviousWindow = endpointDurations.slice(10, 20);
        const endpointNewestAvg =
          endpointNewestWindow.length > 0
            ? endpointNewestWindow.reduce((acc, value) => acc + value, 0) / endpointNewestWindow.length
            : 0;
        const endpointPreviousAvg =
          endpointPreviousWindow.length > 0
            ? endpointPreviousWindow.reduce((acc, value) => acc + value, 0) / endpointPreviousWindow.length
            : 0;
        const endpointTrendData = classifyTrend(
          endpointNewestAvg,
          endpointPreviousAvg,
          endpointNewestWindow.length,
          endpointPreviousWindow.length
        );

        return {
          endpoint,
          count: sortedDurations.length,
          avgMs: avg,
          p95Ms: p95,
          trend: endpointTrendData.trend,
          trendDeltaPct: endpointTrendData.trendDeltaPct,
        };
      })
      .sort((a, b) => {
        if (b.p95Ms !== a.p95Ms) return b.p95Ms - a.p95Ms;
        if (b.avgMs !== a.avgMs) return b.avgMs - a.avgMs;
        return b.count - a.count;
      })
      .slice(0, 3);

    setTelemetrySummary({
      total: entries.length,
      avgMs,
      p95Ms,
      errorCount,
      canceledCount,
      lastStatus: typeof latestStatus === 'number' ? String(latestStatus) : '-',
      trend,
      trendDeltaPct,
      slowEndpoints,
    });
  }, []);

  const telemetryTrendLabel =
    telemetrySummary.trend === 'improving'
      ? t('adminPerfTrendImproving')
      : telemetrySummary.trend === 'degrading'
      ? t('adminPerfTrendDegrading')
      : telemetrySummary.trend === 'stable'
      ? t('adminPerfTrendStable')
      : t('adminPerfTrendInsufficientData');

  const getTrendLabel = (trend) =>
    trend === 'improving'
      ? t('adminPerfTrendImproving')
      : trend === 'degrading'
      ? t('adminPerfTrendDegrading')
      : trend === 'stable'
      ? t('adminPerfTrendStable')
      : t('adminPerfTrendInsufficientData');

  const getTrendArrow = (trend) => {
    if (trend === 'improving') return '↘';
    if (trend === 'degrading') return '↗';
    if (trend === 'stable') return '→';
    return '•';
  };

  const clearTelemetrySummary = () => {
    if (typeof apiService.clearAdminRequestTelemetry === 'function') {
      apiService.clearAdminRequestTelemetry();
    }
    refreshTelemetrySummary();
    showTelemetryActionStatus(t('adminPerfStatusCleared'), 'info');
  };

  const showTelemetryActionStatus = (message, tone = 'info') => {
    telemetryStatusCache = {
      message,
      tone,
      expiresAt: Date.now() + TELEMETRY_STATUS_TTL_MS,
    };

    setTelemetryActionStatus({ message, tone });

    if (telemetryStatusTimeoutRef.current) {
      clearTimeout(telemetryStatusTimeoutRef.current);
    }

    telemetryStatusTimeoutRef.current = setTimeout(() => {
      telemetryStatusCache = { message: '', tone: 'info', expiresAt: 0 };
      setTelemetryActionStatus({ message: '', tone: 'info' });
      telemetryStatusTimeoutRef.current = null;
    }, TELEMETRY_STATUS_TTL_MS);
  };

  const runTelemetryAction = async (action) => {
    const now = Date.now();
    const cooldownMs = 900;
    if (telemetryActionBusy || now - telemetryActionCooldownRef.current < cooldownMs) {
      return;
    }

    setTelemetryActionBusy(true);
    try {
      await action();
    } finally {
      telemetryActionCooldownRef.current = Date.now();
      setTelemetryActionBusy(false);
    }
  };

  const exportTelemetrySnapshot = async () => {
    if (typeof apiService.getAdminRequestTelemetry !== 'function') {
      Alert.alert(t('error'), t('adminPerfExportUnavailable'));
      showTelemetryActionStatus(t('adminPerfExportUnavailable'), 'warning');
      return;
    }

    const rawEntries = apiService.getAdminRequestTelemetry({ limit: 60 }) || [];
    let exportTruncated = false;
    const entries = rawEntries.map((entry) => {
      if (entry?.errorMessage && entry.errorMessage.length > MAX_EXPORT_ENTRY_ERROR_LEN) {
        exportTruncated = true;
        return { ...entry, errorMessage: entry.errorMessage.slice(0, MAX_EXPORT_ENTRY_ERROR_LEN) + '…' };
      }
      return entry;
    });
    const payload = {
      exported_at: new Date().toISOString(),
      ...(exportTruncated && { truncated: true }),
      summary: telemetrySummary,
      entries,
    };

    try {
      await Share.share({
        title: t('adminPerfExportTitle'),
        message: JSON.stringify(payload, null, 2),
      });
      showTelemetryActionStatus(t('adminPerfStatusExportOpened'), 'success');
    } catch (_err) {
      const fallbackLine = `${t('adminPerfShareFallback')}: Avg ${telemetrySummary.avgMs ?? '-'}ms | P95 ${telemetrySummary.p95Ms ?? '-'}ms | ×${telemetrySummary.errorCount ?? 0} err`;
      showTelemetryActionStatus(fallbackLine, 'info');
    }
  };

  const exportFailingTelemetrySnapshot = async () => {
    if (typeof apiService.getAdminRequestTelemetry !== 'function') {
      Alert.alert(t('error'), t('adminPerfExportUnavailable'));
      showTelemetryActionStatus(t('adminPerfExportUnavailable'), 'warning');
      return;
    }

    const entries = apiService.getAdminRequestTelemetry({ limit: 120 }) || [];
    const failingEntries = entries.filter(
      (entry) => !entry?.canceled && typeof entry?.statusCode === 'number' && entry.statusCode >= 400
    );

    if (failingEntries.length === 0) {
      showTelemetryActionStatus(t('adminPerfNoFailingRequests'), 'info');
      return;
    }

    let exportTruncated = false;
    const sanitizedEntries = failingEntries.map((entry) => {
      if (entry?.errorMessage && entry.errorMessage.length > MAX_EXPORT_ENTRY_ERROR_LEN) {
        exportTruncated = true;
        return { ...entry, errorMessage: entry.errorMessage.slice(0, MAX_EXPORT_ENTRY_ERROR_LEN) + '…' };
      }
      return entry;
    });
    const payload = {
      exported_at: new Date().toISOString(),
      ...(exportTruncated && { truncated: true }),
      failing_request_count: sanitizedEntries.length,
      entries: sanitizedEntries,
    };

    try {
      await Share.share({
        title: t('adminPerfExportErrorsTitle'),
        message: JSON.stringify(payload, null, 2),
      });
      showTelemetryActionStatus(t('adminPerfStatusErrorsExportOpened'), 'success');
    } catch (_err) {
      const fallbackLine = `${t('adminPerfShareFallback')}: ${sanitizedEntries.length} ×HTTP≥400`;
      showTelemetryActionStatus(fallbackLine, 'info');
    }
  };

  const shareTopSlowEndpointLine = async () => {
    const topSlow = telemetrySummary.slowEndpoints?.[0];
    if (!topSlow) {
      showTelemetryActionStatus(t('adminPerfNoData'), 'info');
      return;
    }

    const trendLabel = getTrendLabel(topSlow.trend);
    const trendArrow = getTrendArrow(topSlow.trend);
    const trendDelta =
      topSlow.trendDeltaPct === null
        ? ''
        : ` (${topSlow.trendDeltaPct > 0 ? '+' : ''}${topSlow.trendDeltaPct}%)`;
    const summaryLine = `${topSlow.endpoint} | p95 ${topSlow.p95Ms}ms | avg ${topSlow.avgMs}ms | n=${topSlow.count} | ${t('adminPerfTrend')} ${trendArrow} ${trendLabel}${trendDelta}`;

    try {
      await Share.share({
        title: t('adminPerfTopLineTitle'),
        message: summaryLine,
      });
      showTelemetryActionStatus(t('adminPerfStatusTopLineShared'), 'success');
    } catch (_err) {
      showTelemetryActionStatus(`${t('adminPerfShareFallback')}: ${summaryLine}`, 'info');
    }
  };

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
        refreshTelemetrySummary();
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
    }, [applyDashboardPayload, refreshAdminData, refreshTelemetrySummary])
  );

  useEffect(() => {
    refreshTelemetrySummary();
  }, [refreshTelemetrySummary]);

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
      Alert.alert(t('success'), t('adminListingApproved'));
    } catch (err) {
      Alert.alert(t('error'), extractApiErrorMessage(err, t('adminActionFailed')));
    }
  };

  const openRejectEditor = (horseId) => {
    setRejectingHorseId(horseId);
    setRejectReason('');
  };

  const cancelRejectEditor = () => {
    setRejectingHorseId(null);
    setRejectReason('');
  };

  const handleRejectSubmit = async (horseId) => {
    const reason = rejectReason.trim() || t('adminDefaultRejectReason');
    try {
      await apiService.adminRejectListing(horseId, reason);
      await refreshAdminData();
      cancelRejectEditor();
      Alert.alert(t('success'), t('adminListingRejected'));
    } catch (err) {
      Alert.alert(t('error'), extractApiErrorMessage(err, t('adminActionFailed')));
    }
  };

  const handleRestoreListing = async (horseId) => {
    try {
      await apiService.restoreHorseListing(horseId);
      await refreshAdminData();
      Alert.alert(t('success'), t('listingRestored'));
    } catch (err) {
      Alert.alert(t('error'), extractApiErrorMessage(err, t('listingRestoreFailed')));
    }
  };

  const handlePurgeExpiredDeleted = () => {
    if (restoreWindowDays <= 0) {
      Alert.alert(t('error'), t('adminPurgeExpiredDisabled'));
      return;
    }

    setPurgeConfirmText('');
    setPurgeConfirmMode('manual');
  };

  const handleBulkRestoreSelected = () => {
    if (selectedDeletedListings.size === 0) {
      Alert.alert(t('error'), t('adminSelectItems'));
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
              Alert.alert(t('success'), message);
            } catch (err) {
              Alert.alert(t('error'), extractApiErrorMessage(err, t('adminActionFailed')));
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
      Alert.alert(t('error'), t('adminSelectItems'));
      return;
    }

    if (restoreWindowDays <= 0) {
      Alert.alert(t('error'), t('adminBulkPurgeDisabled'));
      return;
    }

    setPurgeConfirmText('');
    setPurgeConfirmMode('bulk');
  };

  const handleConfirmPurgeAction = async () => {
    if (purgeConfirmText.trim().toUpperCase() !== PURGE_KEYWORD) {
      Alert.alert(t('error'), t('adminPurgeTypeInvalid'));
      return;
    }

    if (purgeConfirmMode === 'manual') {
      setPurgingExpired(true);
      try {
        const res = await apiService.adminPurgeExpiredDeletedListings();
        await refreshAdminData();
        const purgedCount = typeof res.data?.purged_count === 'number' ? res.data.purged_count : 0;
        Alert.alert(t('success'), `${t('adminPurgeExpiredSuccess')}: ${purgedCount}`);
      } catch (err) {
        Alert.alert(t('error'), extractApiErrorMessage(err, t('adminActionFailed')));
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
        Alert.alert(t('success'), message);
      } catch (err) {
        Alert.alert(t('error'), extractApiErrorMessage(err, t('adminActionFailed')));
      } finally {
        setBulkOperationLoading(false);
        setPurgeConfirmMode(null);
        setPurgeConfirmText('');
      }
    }
  };

  const toggleVerifyUser = async (user) => {
    if (user.role === 'admin' && user.is_verified) {
      Alert.alert(t('error'), t('adminCannotUnverifyAdmin'));
      return;
    }
    try {
      await apiService.adminUpdateUser(user.id, { is_verified: !user.is_verified });
      await refreshAdminData();
    } catch (err) {
      Alert.alert(t('error'), extractApiErrorMessage(err, t('adminActionFailed')));
    }
  };

  const promoteUser = async (user) => {
    try {
      await apiService.adminUpdateUserRole(user.id, 'admin');
      await refreshAdminData();
      Alert.alert(t('success'), t('adminPromoted'));
    } catch (err) {
      Alert.alert(t('error'), extractApiErrorMessage(err, t('adminActionFailed')));
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

      Alert.alert(t('error'), extractApiErrorMessage(err, t('adminLoadFailed')));
    } finally {
      setLoadingMoreTab(null);
      refreshTelemetrySummary();
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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <Text style={[styles.headerTitle, isRTL && styles.textRTL]}>{t('adminPanel')}</Text>
        <Text style={[styles.headerSubtitle, isRTL && styles.textRTL]}>{t('adminPanelSubtitle')}</Text>
      </View>

      <View style={[styles.toolsRow, isRTL && styles.rowRTL]}>
        <TouchableOpacity
          style={styles.toolCard}
          onPress={() => navigation.navigate('AdminPushLogs')}
        >
          <Ionicons name="notifications-outline" size={18} color={COLORS.primary} />
          <Text style={[styles.toolTitle, isRTL && styles.textRTL]}>{t('adminPushLogs')}</Text>
          <Text style={[styles.toolSubtitle, isRTL && styles.textRTL]}>{t('adminPushLogsSubtitle')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.toolCard}
          onPress={() => navigation.navigate('AdminOfferAudit')}
        >
          <Ionicons name="swap-horizontal-outline" size={18} color={COLORS.primary} />
          <Text style={[styles.toolTitle, isRTL && styles.textRTL]}>{t('adminOfferAudit')}</Text>
          <Text style={[styles.toolSubtitle, isRTL && styles.textRTL]}>{t('adminOfferAuditSubtitle')}</Text>
        </TouchableOpacity>
        <View style={styles.toolCard} testID="admin-security-status-card">
          <Ionicons
            name={securityStatus.purge_confirm_token_strong ? 'shield-checkmark-outline' : 'warning-outline'}
            size={18}
            color={securityStatus.purge_confirm_token_strong ? COLORS.success : COLORS.warning}
          />
          <Text style={[styles.toolTitle, isRTL && styles.textRTL]}>{t('adminSecurityStatus')}</Text>
          <Text style={[styles.toolSubtitle, isRTL && styles.textRTL]}>
            {securityStatus.purge_confirm_token_strong
              ? t('adminPurgeTokenStrong')
              : t('adminPurgeTokenWeak')}
          </Text>
          <Text style={[styles.toolSubtitle, isRTL && styles.textRTL]}>
            {securityStatus.expiry_purge_enabled
              ? `${t('adminExpiryPurgeEnabled')}: ${securityStatus.restore_window_days}`
              : t('adminExpiryPurgeDisabled')}
          </Text>
        </View>
      </View>

      <View style={styles.telemetryRow}>
        <View style={styles.telemetryCard} testID="admin-performance-card">
          <View style={[styles.telemetryHeader, isRTL && styles.rowRTL]}>
            <Ionicons name="speedometer-outline" size={18} color={COLORS.primary} />
            <Text style={[styles.toolTitle, isRTL && styles.textRTL]}>{t('adminPerformanceSnapshot')}</Text>
            <TouchableOpacity
              style={[styles.telemetryActionBtn, telemetryActionBusy && styles.telemetryActionBtnDisabled]}
              onPress={() => runTelemetryAction(shareTopSlowEndpointLine)}
              disabled={telemetryActionBusy}
            >
              <Text style={styles.telemetryActionBtnText}>{t('adminPerfShareTopLine')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.telemetryActionBtn, telemetryActionBusy && styles.telemetryActionBtnDisabled]}
              onPress={() => runTelemetryAction(exportFailingTelemetrySnapshot)}
              disabled={telemetryActionBusy}
            >
              <Text style={styles.telemetryActionBtnText}>{t('adminPerfExportErrors')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.telemetryActionBtn, telemetryActionBusy && styles.telemetryActionBtnDisabled]}
              onPress={() => runTelemetryAction(exportTelemetrySnapshot)}
              disabled={telemetryActionBusy}
            >
              <Text style={styles.telemetryActionBtnText}>{t('adminPerfExport')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.telemetryActionBtn,
                styles.telemetryClearBtn,
                telemetryActionBusy && styles.telemetryActionBtnDisabled,
              ]}
              onPress={() => runTelemetryAction(async () => clearTelemetrySummary())}
              disabled={telemetryActionBusy}
            >
              <Text style={styles.telemetryClearBtnText}>{t('adminPerfClear')}</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.telemetryGrid, isRTL && styles.rowRTL]}>
            <Text style={[styles.telemetryMetric, isRTL && styles.textRTL]}>{t('adminPerfRecentRequests')}: {telemetrySummary.total}</Text>
            <Text
              style={[
                styles.telemetryMetric,
                getLatencyTone(telemetrySummary.avgMs) === 'warning' && styles.telemetryMetricWarning,
                getLatencyTone(telemetrySummary.avgMs) === 'critical' && styles.telemetryMetricCritical,
                isRTL && styles.textRTL,
              ]}
            >
              {t('adminPerfAvgMs')}: {telemetrySummary.avgMs}
            </Text>
            <Text
              style={[
                styles.telemetryMetric,
                getLatencyTone(telemetrySummary.p95Ms) === 'warning' && styles.telemetryMetricWarning,
                getLatencyTone(telemetrySummary.p95Ms) === 'critical' && styles.telemetryMetricCritical,
                isRTL && styles.textRTL,
              ]}
            >
              {t('adminPerfP95Ms')}: {telemetrySummary.p95Ms}
            </Text>
            <Text style={[styles.telemetryMetric, isRTL && styles.textRTL]}>{t('adminPerfErrors')}: {telemetrySummary.errorCount}</Text>
            <Text style={[styles.telemetryMetric, isRTL && styles.textRTL]}>{t('adminPerfCanceled')}: {telemetrySummary.canceledCount}</Text>
            <Text style={[styles.telemetryMetric, isRTL && styles.textRTL]}>{t('adminPerfLastStatus')}: {telemetrySummary.lastStatus}</Text>
            <Text
              style={[
                styles.telemetryMetric,
                telemetrySummary.trend === 'improving' && styles.telemetryTrendImproving,
                telemetrySummary.trend === 'degrading' && styles.telemetryTrendDegrading,
                telemetrySummary.trend === 'stable' && styles.telemetryTrendStable,
                isRTL && styles.textRTL,
              ]}
            >
              {t('adminPerfTrend')}:{' '}
              {telemetrySummary.trendDeltaPct === null
                ? telemetryTrendLabel
                : `${telemetryTrendLabel} (${telemetrySummary.trendDeltaPct > 0 ? '+' : ''}${telemetrySummary.trendDeltaPct}%)`}
            </Text>
          </View>
          {telemetryActionStatus.message ? (
            <Text
              style={[
                styles.telemetryActionStatus,
                telemetryActionStatus.tone === 'success' && styles.telemetryActionStatusSuccess,
                telemetryActionStatus.tone === 'warning' && styles.telemetryActionStatusWarning,
                isRTL && styles.textRTL,
              ]}
            >
              {telemetryActionStatus.message}
            </Text>
          ) : null}
          <Text style={[styles.telemetryThresholdHint, isRTL && styles.textRTL]}>
            {`${t('adminPerfThresholdHint')}: ${TELEMETRY_WARN_MS}ms / ${TELEMETRY_CRITICAL_MS}ms`}
          </Text>
          <View style={styles.telemetrySlowList}>
            <Text style={[styles.telemetrySlowTitle, isRTL && styles.textRTL]}>{t('adminPerfSlowEndpoints')}</Text>
            {telemetrySummary.slowEndpoints.length === 0 ? (
              <Text style={[styles.telemetrySlowItem, isRTL && styles.textRTL]}>{t('adminPerfNoData')}</Text>
            ) : (
              telemetrySummary.slowEndpoints.map((item, index) => (
                <Text
                  key={item.endpoint}
                  style={[
                    styles.telemetrySlowItem,
                    getLatencyTone(item.p95Ms) === 'warning' && styles.telemetryMetricWarning,
                    getLatencyTone(item.p95Ms) === 'critical' && styles.telemetryMetricCritical,
                    item.trend === 'improving' && styles.telemetryTrendImproving,
                    item.trend === 'degrading' && styles.telemetryTrendDegrading,
                    item.trend === 'stable' && styles.telemetryTrendStable,
                    isRTL && styles.textRTL,
                  ]}
                >
                  {index + 1}. {item.endpoint} - p95 {item.p95Ms}ms | avg {item.avgMs}ms | n={item.count} | {t('adminPerfTrend')} {getTrendArrow(item.trend)} {getTrendLabel(item.trend)}
                  {item.trendDeltaPct === null ? '' : ` (${item.trendDeltaPct > 0 ? '+' : ''}${item.trendDeltaPct}%)`}
                </Text>
              ))
            )}
          </View>
        </View>
      </View>

      <View style={styles.statsRow}>
        {[
          { key: 'users', label: t('adminUsers'), value: stats.users, icon: 'people-outline', colors: ['#0891B2', '#22D3EE'] },
          { key: 'admins', label: t('adminAdmins'), value: stats.admins, icon: 'shield-outline', colors: ['#0F766E', '#34D399'] },
          { key: 'pending', label: t('adminPending'), value: stats.pending, icon: 'time-outline', colors: ['#B45309', '#F59E0B'] },
        ].map((card) => (
          <LinearGradient key={card.key} colors={card.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.statCard}>
            <View style={styles.statIconWrap}>
              <Ionicons name={card.icon} size={14} color={COLORS.white} />
            </View>
            <Text style={styles.statNumber}>{card.value}</Text>
            <Text style={styles.statLabel}>{card.label}</Text>
          </LinearGradient>
        ))}
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
            <Text style={[styles.tabBtnText, activeTab === tab.key && styles.tabBtnTextActive]}>{tab.label}</Text>
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
            <FlatList
              data={pendingListings}
              keyExtractor={(horse) => String(horse.id)}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />}
              initialNumToRender={5}
              maxToRenderPerBatch={8}
              windowSize={8}
              removeClippedSubviews
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
                    <TouchableOpacity style={styles.rejectBtn} onPress={() => openRejectEditor(horse.id)}>
                      <Ionicons name="close-circle-outline" size={18} color={COLORS.white} />
                      <Text style={styles.rejectText}>{t('reject')}</Text>
                    </TouchableOpacity>
                  </View>
                  {renderReviewMeta(horse.id)}
                  {rejectingHorseId === horse.id && (
                    <View style={styles.rejectEditorCard}>
                      <Text style={[styles.rejectEditorLabel, isRTL && styles.textRTL]}>
                        {t('adminRejectReason')}
                      </Text>
                      <TextInput
                        style={[styles.rejectEditorInput, isRTL && styles.textRTL]}
                        value={rejectReason}
                        onChangeText={setRejectReason}
                        placeholder={t('adminRejectReasonPlaceholder')}
                        placeholderTextColor={COLORS.textLight}
                        multiline
                        textAlignVertical="top"
                        textAlign={isRTL ? 'right' : 'left'}
                      />
                      <View style={[styles.rejectEditorActions, isRTL && styles.rowRTL]}>
                        <TouchableOpacity style={styles.rejectSubmitBtn} onPress={() => handleRejectSubmit(horse.id)}>
                          <Text style={styles.rejectSubmitText}>{t('reject')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.rejectCancelBtn} onPress={cancelRejectEditor}>
                          <Text style={styles.rejectCancelText}>{t('cancel')}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              )}
            />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  headerRTL: {
    alignItems: 'flex-end',
  },
  headerTitle: {
    ...FONTS.h1,
    color: COLORS.primary,
  },
  headerSubtitle: {
    ...FONTS.bodySmall,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  toolsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  telemetryRow: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  toolCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.soft,
  },
  telemetryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.soft,
  },
  telemetryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  telemetryActionBtn: {
    marginLeft: 'auto',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    backgroundColor: COLORS.inputBg,
  },
  telemetryActionBtnText: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  telemetryActionBtnDisabled: {
    opacity: 0.6,
  },
  telemetryClearBtn: {
    marginLeft: SPACING.xs,
  },
  telemetryClearBtnText: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  telemetryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  telemetryMetric: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    minWidth: '48%',
  },
  telemetryMetricWarning: {
    color: COLORS.warning,
    fontWeight: '700',
  },
  telemetryMetricCritical: {
    color: COLORS.error,
    fontWeight: '700',
  },
  telemetryTrendImproving: {
    color: COLORS.success,
    fontWeight: '700',
  },
  telemetryTrendDegrading: {
    color: COLORS.error,
    fontWeight: '700',
  },
  telemetryTrendStable: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  telemetryThresholdHint: {
    ...FONTS.caption,
    color: COLORS.textLight,
    marginTop: 4,
  },
  telemetryActionStatus: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginTop: 6,
    fontWeight: '600',
  },
  telemetryActionStatusSuccess: {
    color: COLORS.success,
  },
  telemetryActionStatusWarning: {
    color: COLORS.warning,
  },
  telemetrySlowList: {
    marginTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.xs,
  },
  telemetrySlowTitle: {
    ...FONTS.caption,
    color: COLORS.text,
    fontWeight: '700',
    marginBottom: 4,
  },
  telemetrySlowItem: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  toolTitle: {
    ...FONTS.bodySmall,
    color: COLORS.text,
    fontWeight: '700',
    marginTop: SPACING.sm,
  },
  toolSubtitle: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  statCard: {
    flex: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
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
    ...FONTS.h2,
    color: COLORS.white,
  },
  statLabel: {
    ...FONTS.caption,
    color: COLORS.white,
    opacity: 0.95,
    marginTop: 2,
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
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabBtnActive: {
    backgroundColor: COLORS.primaryLight + '20',
    borderColor: COLORS.primary,
  },
  tabBtnText: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
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
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  textRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
