import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EmptyState from '../components/EmptyState';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '../config/theme';
import { useLanguage } from '../contexts/LanguageContext';
import * as apiService from '../services/api';
import { extractApiErrorMessage } from '../utils/apiErrors';

const ACTOR_OPTIONS = [
  { key: null, labelKey: 'adminActorAll' },
  { key: 'buyer', labelKey: 'adminActorBuyer' },
  { key: 'seller', labelKey: 'adminActorSeller' },
  { key: 'system', labelKey: 'adminActorSystem' },
];

const STATUS_OPTIONS = [
  { key: null, labelKey: 'adminStatusAll' },
  { key: 'pending', labelKey: 'adminStatusPending' },
  { key: 'countered', labelKey: 'adminStatusCountered' },
  { key: 'accepted', labelKey: 'adminStatusAccepted' },
  { key: 'rejected', labelKey: 'adminStatusRejected' },
  { key: 'cancelled', labelKey: 'adminStatusCancelled' },
  { key: 'sold', labelKey: 'adminStatusSold' },
];

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function AdminOfferAuditScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { t, isRTL } = useLanguage();
  const initialOfferId = route?.params?.offerId || '';

  const [offerId, setOfferId] = useState(initialOfferId);
  const [actor, setActor] = useState(null);
  const [toStatus, setToStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(Boolean(initialOfferId));

  const loadAudit = useCallback(async () => {
    const normalizedOfferId = offerId.trim();
    if (!UUID_PATTERN.test(normalizedOfferId)) {
      Alert.alert(t('error'), t('adminOfferAuditInvalidId'));
      return;
    }

    setLoading(true);
    setHasSearched(true);
    try {
      const res = await apiService.adminGetOfferTransitionAudits(normalizedOfferId, {
        actor,
        toStatus,
      });
      setLogs(res.data?.logs || []);
      setTotal(res.data?.total || 0);
    } catch (err) {
      setLogs([]);
      setTotal(0);
      Alert.alert(t('error'), extractApiErrorMessage(err, t('adminOfferAuditLoadFailed')));
    } finally {
      setLoading(false);
    }
  }, [actor, offerId, t, toStatus]);

  useEffect(() => {
    if (initialOfferId && UUID_PATTERN.test(initialOfferId)) {
      loadAudit();
    }
  }, [initialOfferId, loadAudit]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}> 
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={20} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={[styles.headerTitle, isRTL && styles.textRTL]}>{t('adminOfferAuditTitle')}</Text>
          <Text style={[styles.headerSubtitle, isRTL && styles.textRTL]}>
            {t('adminTotalLogs')}: {total}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.filtersCard}>
          <Text style={[styles.filterLabel, isRTL && styles.textRTL]}>{t('adminOfferIdLabel')}</Text>
          <TextInput
            style={[styles.input, isRTL && styles.textRTL]}
            value={offerId}
            onChangeText={setOfferId}
            placeholder={t('adminOfferIdPlaceholder')}
            placeholderTextColor={COLORS.textLight}
            autoCapitalize="none"
            autoCorrect={false}
            textAlign={isRTL ? 'right' : 'left'}
          />

          <Text style={[styles.filterLabel, isRTL && styles.textRTL]}>{t('adminActorAll')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.chipRow, isRTL && styles.rowRTL]}>
            {ACTOR_OPTIONS.map((option) => {
              const active = actor === option.key;
              return (
                <TouchableOpacity
                  key={option.key || 'all'}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setActor(option.key)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{t(option.labelKey)}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={[styles.filterLabel, isRTL && styles.textRTL]}>{t('adminStatusLabel')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.chipRow, isRTL && styles.rowRTL]}>
            {STATUS_OPTIONS.map((option) => {
              const active = toStatus === option.key;
              return (
                <TouchableOpacity
                  key={option.key || 'all'}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setToStatus(option.key)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{t(option.labelKey)}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TouchableOpacity style={styles.primaryBtn} onPress={loadAudit}>
            <Text style={styles.primaryBtnText}>{t('adminLookup')}</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : !hasSearched ? (
          <EmptyState
            icon="search-outline"
            title={t('adminOfferAuditTitle')}
            subtitle={t('adminOfferAuditPrompt')}
          />
        ) : logs.length === 0 ? (
          <EmptyState
            icon="swap-horizontal-outline"
            title={t('adminOfferAuditTitle')}
            subtitle={t('adminOfferAuditEmpty')}
          />
        ) : (
          logs.map((log) => (
            <View key={log.id} style={styles.card}>
              <View style={[styles.cardTop, isRTL && styles.rowRTL]}>
                <Text style={[styles.actorPill, isRTL && styles.textRTL]}>{log.actor}</Text>
                <Text style={[styles.dateText, isRTL && styles.textRTL]}>
                  {new Date(log.created_at).toLocaleString()}
                </Text>
              </View>
              <View style={[styles.statusRow, isRTL && styles.rowRTL]}>
                <View style={styles.statusBox}>
                  <Text style={styles.statusLabel}>{t('adminFromStatus')}</Text>
                  <Text style={styles.statusValue}>{log.from_status}</Text>
                </View>
                <Ionicons name="arrow-forward" size={18} color={COLORS.textLight} />
                <View style={styles.statusBox}>
                  <Text style={styles.statusLabel}>{t('adminToStatus')}</Text>
                  <Text style={styles.statusValue}>{log.to_status}</Text>
                </View>
              </View>
              <Text style={[styles.metaLine, isRTL && styles.textRTL]}>
                {t('adminResponseMessage')}: {log.response_message || t('adminNoMessage')}
              </Text>
              <Text style={[styles.metaLine, isRTL && styles.textRTL]}>User: {log.changed_by_user_id || '-'}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
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
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  filtersCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
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
    marginBottom: SPACING.sm,
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
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
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
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  actorPill: {
    ...FONTS.caption,
    color: COLORS.primary,
    fontWeight: '700',
    backgroundColor: COLORS.primaryLight + '20',
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  dateText: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  statusBox: {
    flex: 1,
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.sm,
  },
  statusLabel: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
  },
  statusValue: {
    ...FONTS.bodySmall,
    color: COLORS.text,
    fontWeight: '700',
    marginTop: 2,
  },
  metaLine: {
    ...FONTS.bodySmall,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  textRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});