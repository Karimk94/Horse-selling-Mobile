import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EmptyState from '../components/EmptyState';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '../config/theme';
import { useLanguage } from '../contexts/LanguageContext';
import * as apiService from '../services/api';

const STATUS_OPTIONS = [
  { key: null, labelKey: 'adminStatusAll' },
  { key: 'success', labelKey: 'status_accepted' },
  { key: 'partial', labelKey: 'counterOfferSent' },
  { key: 'failed', labelKey: 'error' },
  { key: 'no_tokens', labelKey: 'adminNoUsers' },
];

export default function AdminPushLogsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { t, isRTL } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState(null);
  const [eventType, setEventType] = useState('');

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiService.adminListPushDeliveryLogs({
        status: statusFilter,
        eventType: eventType.trim() || null,
      });
      setLogs(res.data?.logs || []);
      setTotal(res.data?.total || 0);
    } catch {
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [eventType, statusFilter]);

  useFocusEffect(
    useCallback(() => {
      loadLogs();
    }, [loadLogs])
  );

  const statusTone = useMemo(
    () => ({
      success: COLORS.success,
      partial: COLORS.warning,
      failed: COLORS.error,
      no_tokens: COLORS.textSecondary,
    }),
    []
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={20} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={[styles.headerTitle, isRTL && styles.textRTL]}>{t('adminPushLogsTitle')}</Text>
          <Text style={[styles.headerSubtitle, isRTL && styles.textRTL]}>
            {t('adminTotalLogs')}: {total}
          </Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={loadLogs}>
          <Text style={styles.refreshText}>{t('adminRefresh')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filtersCard}>
        <Text style={[styles.filterLabel, isRTL && styles.textRTL]}>{t('adminEventTypeLabel')}</Text>
        <TextInput
          style={[styles.input, isRTL && styles.textRTL]}
          value={eventType}
          onChangeText={setEventType}
          placeholder={t('adminEventTypePlaceholder')}
          placeholderTextColor={COLORS.textLight}
          textAlign={isRTL ? 'right' : 'left'}
        />

        <Text style={[styles.filterLabel, isRTL && styles.textRTL]}>{t('adminStatusLabel')}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.chipRow, isRTL && styles.rowRTL]}
        >
          {STATUS_OPTIONS.map((option) => {
            const active = statusFilter === option.key;
            return (
              <TouchableOpacity
                key={option.key || 'all'}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setStatusFilter(option.key)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{t(option.labelKey)}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <TouchableOpacity style={styles.primaryBtn} onPress={loadLogs}>
          <Text style={styles.primaryBtnText}>{t('adminRefresh')}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : logs.length === 0 ? (
        <EmptyState
          icon="notifications-off-outline"
          title={t('adminPushLogsTitle')}
          subtitle={t('adminPushLogsEmpty')}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {logs.map((log) => {
            const tone = statusTone[log.status] || COLORS.textSecondary;
            return (
              <View key={log.id} style={styles.card}>
                <View style={[styles.cardTop, isRTL && styles.rowRTL]}>
                  <View style={[styles.statusPill, { borderColor: tone, backgroundColor: tone + '12' }]}>
                    <Text style={[styles.statusPillText, { color: tone }]}>{log.status}</Text>
                  </View>
                  <Text style={[styles.dateText, isRTL && styles.textRTL]}>
                    {new Date(log.created_at).toLocaleString()}
                  </Text>
                </View>
                <Text style={[styles.cardTitle, isRTL && styles.textRTL]}>{log.event_type || '-'}</Text>
                <Text style={[styles.metaLine, isRTL && styles.textRTL]}>Provider: {log.provider}</Text>
                <Text style={[styles.metaLine, isRTL && styles.textRTL]}>
                  Tokens: {log.accepted_count}/{log.total_tokens} accepted
                </Text>
                <Text style={[styles.metaLine, isRTL && styles.textRTL]}>
                  Failed: {log.failed_count}
                </Text>
                <Text style={[styles.metaLine, isRTL && styles.textRTL]}>
                  User: {log.target_user_id}
                </Text>
                {log.error_message ? (
                  <Text style={[styles.errorText, isRTL && styles.textRTL]}>{log.error_message}</Text>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      )}
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
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerCopy: {
    flex: 1,
  },
  headerTitle: {
    ...FONTS.h2,
    color: COLORS.primary,
  },
  headerSubtitle: {
    ...FONTS.bodySmall,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  refreshBtn: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  refreshText: {
    ...FONTS.caption,
    color: COLORS.primary,
    fontWeight: '700',
  },
  filtersCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.soft,
  },
  filterLabel: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.inputBg,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    color: COLORS.text,
    ...FONTS.bodySmall,
    marginBottom: SPACING.sm,
  },
  chipRow: {
    gap: SPACING.xs,
    paddingVertical: SPACING.xs,
  },
  chip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.inputBg,
    borderRadius: 999,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  chipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight + '20',
  },
  chipText: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  chipTextActive: {
    color: COLORS.primary,
  },
  primaryBtn: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
  },
  primaryBtnText: {
    ...FONTS.bodySmall,
    color: COLORS.white,
    fontWeight: '700',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.soft,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  statusPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  statusPillText: {
    ...FONTS.caption,
    fontWeight: '700',
  },
  dateText: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    flex: 1,
  },
  cardTitle: {
    ...FONTS.body,
    color: COLORS.text,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  metaLine: {
    ...FONTS.bodySmall,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  errorText: {
    ...FONTS.bodySmall,
    color: COLORS.error,
    marginTop: SPACING.sm,
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  textRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});