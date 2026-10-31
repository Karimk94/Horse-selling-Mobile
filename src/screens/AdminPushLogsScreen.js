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
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EmptyState from '../components/EmptyState';
import BrandMark from '../components/BrandMark';
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

  const handlePushHotline = () => {
    const isArabic = isRTL;
    const text = isArabic
      ? 'مرحباً، أود التواصل مع فريق هندسة الإشعارات لمراجعة بوابة الإرسال وسجلات التسليم.'
      : 'Hello SteedMarket Push Notification Operations, I need assistance reviewing push delivery logs or gateway status.';
    try {
      const res = Linking.openURL(`https://wa.me/971500000000?text=${encodeURIComponent(text)}`);
      if (res && typeof res.catch === 'function') {
        res.catch(() => {});
      }
    } catch (e) {}
  };

  const handleSystemsEngineerConsultation = () => {
    const isArabic = isRTL;
    const text = isArabic
      ? 'مرحباً، أود استشارة مهندس النظم بخصوص رموز الإشعارات غير الفعالة وأخطاء التسليم.'
      : 'Hello SteedMarket Systems Engineer, I need consultation regarding push token pruning and delivery gateway reliability.';
    try {
      const res = Linking.openURL(`https://wa.me/971500000000?text=${encodeURIComponent(text)}`);
      if (res && typeof res.catch === 'function') {
        res.catch(() => {});
      }
    } catch (e) {}
  };

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
      success: { color: '#0A5C36', bg: '#E6F7F0', border: '#10B981', icon: 'checkmark-circle' },
      partial: { color: '#8D6E2E', bg: '#FAF3E8', border: '#C5A059', icon: 'alert-circle' },
      failed: { color: '#9B1C1C', bg: '#FEE2E2', border: '#EF4444', icon: 'close-circle' },
      no_tokens: { color: '#4A5568', bg: '#F0ECE4', border: COLORS.border, icon: 'warning' },
    }),
    []
  );

  // Computed summary metrics
  const summaryMetrics = useMemo(() => {
    let successCount = 0;
    let failedCount = 0;
    let partialCount = 0;
    let noTokensCount = 0;

    logs.forEach((log) => {
      if (log.status === 'success') successCount++;
      else if (log.status === 'failed') failedCount++;
      else if (log.status === 'partial') partialCount++;
      else if (log.status === 'no_tokens') noTokensCount++;
    });

    return { successCount, failedCount, partialCount, noTokensCount };
  }, [logs]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* Executive Command Header */}
      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <View style={[styles.headerLeftWrap, isRTL && styles.rowRTL]}>
          <TouchableOpacity
            testID="admin-push-back-btn"
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={20} color={COLORS.text} />
          </TouchableOpacity>

          <View style={[styles.headerContent, isRTL && styles.headerContentRTL]}>
            <View style={styles.brandIconWrap}>
              <BrandMark size={32} />
            </View>
            <View style={styles.headerCopy}>
              <View style={[styles.portalBadge, isRTL && styles.rowRTL]}>
                <View style={styles.portalBadgeDot} />
                <Text style={styles.portalBadgeText}>
                  {isRTL ? 'منظومة الإشعارات والاتصال الفوري' : 'PUSH DISPATCH & NOTIFICATION TELEMETRY'}
                </Text>
              </View>
              <Text style={[styles.headerTitle, isRTL && styles.textRTL]}>
                {t('adminPushLogsTitle')}
              </Text>
              <Text style={[styles.headerSubtitle, isRTL && styles.textRTL]}>
                {t('adminTotalLogs')}: {total}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.headerActions, isRTL && styles.rowRTL]}>
          <TouchableOpacity
            testID="admin-push-refresh-header-btn"
            style={styles.refreshBtn}
            onPress={loadLogs}
            activeOpacity={0.7}
          >
            <Ionicons name="sync-outline" size={14} color={COLORS.primary} style={styles.syncIcon} />
            <Text style={styles.refreshText}>{t('adminRefresh')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="admin-push-header-hotline-btn"
            style={styles.headerHotlineBtn}
            onPress={handlePushHotline}
            activeOpacity={0.8}
            accessibilityLabel="Push Operations WhatsApp Hotline"
          >
            <Ionicons name="logo-whatsapp" size={17} color="#25D366" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* SteedMarket Push Dispatch & Reliability Protocol Shield */}
        <View testID="admin-push-reliability-shield" style={styles.pushShieldCard}>
          <View style={[styles.pushShieldHeader, isRTL && styles.rowRTL]}>
            <View style={styles.pushShieldIconWrap}>
              <Ionicons name="shield-checkmark" size={18} color={COLORS.accentDark} />
            </View>
            <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <View style={[styles.pushBadgeRow, isRTL && styles.rowRTL]}>
                <View style={styles.pushPulseDot} />
                <Text style={styles.pushBadgeText}>
                  {isRTL ? 'بروتوكول موثوقية الإشعارات الفورية' : 'HIGH-AVAILABILITY DISPATCH PROTOCOL'}
                </Text>
              </View>
              <Text style={[styles.pushShieldTitle, isRTL && styles.textRTL]}>
                {isRTL ? 'منظومة بث الإشعارات المباشرة للمزادات والصفقات' : 'Real-Time Notification Relay & Gateway Health'}
              </Text>
              <Text style={[styles.pushShieldDesc, isRTL && styles.textRTL]}>
                {isRTL
                  ? 'مراقبة فورية لمعدلات التسليم، الأجهزة النشطة، واستبعاد الرموز التالفة لضمان وصول العروض والمحادثات'
                  : 'Multi-provider dispatch surveillance, dead-token pruning, and sub-second alert relays'}
              </Text>
            </View>
          </View>

          {/* 3 Dispatch Reliability Pillars */}
          <View style={styles.pushPillars}>
            <View style={[styles.pushPillarItem, isRTL && styles.rowRTL]}>
              <View style={styles.pushPillarIcon}>
                <Ionicons name="notifications" size={13} color={COLORS.accentDark} />
              </View>
              <Text style={[styles.pushPillarText, isRTL && styles.textRTL]}>
                {isRTL ? 'بوابة إرسال متعددة وموثوقة (Expo Push)' : 'Multi-Token Expo Push Delivery Gateway'}
              </Text>
            </View>
            <View style={[styles.pushPillarItem, isRTL && styles.rowRTL]}>
              <View style={styles.pushPillarIcon}>
                <Ionicons name="flash" size={13} color={COLORS.accentDark} />
              </View>
              <Text style={[styles.pushPillarText, isRTL && styles.textRTL]}>
                {isRTL ? 'توصيل فوري لإشعارات العروض والرسائل' : 'Instant Offer & Message Notification Relay'}
              </Text>
            </View>
            <View style={[styles.pushPillarItem, isRTL && styles.rowRTL]}>
              <View style={styles.pushPillarIcon}>
                <Ionicons name="analytics" size={13} color={COLORS.accentDark} />
              </View>
              <Text style={[styles.pushPillarText, isRTL && styles.textRTL]}>
                {isRTL ? 'مراقبة مستمرة للأخطاء والرموز غير الفعالة' : 'Real-Time Dead Token & Error Surveillance'}
              </Text>
            </View>
          </View>

          {/* 1-Tap WhatsApp Lead Systems Engineer consultation button */}
          <TouchableOpacity
            testID="admin-push-engineer-consult-btn"
            style={[styles.pushConsultBtn, isRTL && styles.rowRTL]}
            onPress={handleSystemsEngineerConsultation}
            activeOpacity={0.85}
          >
            <Ionicons name="logo-whatsapp" size={15} color="#25D366" />
            <Text style={styles.pushConsultBtnText}>
              {isRTL ? 'استشارة مهندس النظم وبوابات الإرسال' : 'Consult Systems & Gateway Engineer'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* KPI Telemetry Summary Row */}
        <View style={[styles.kpiRow, isRTL && styles.rowRTL]}>
          <View style={[styles.kpiCard, styles.kpiCardSuccess]}>
            <Text style={styles.kpiCount}>{summaryMetrics.successCount}</Text>
            <Text style={styles.kpiLabel}>{isRTL ? 'ناجحة' : 'Delivered'}</Text>
          </View>
          <View style={[styles.kpiCard, styles.kpiCardPartial]}>
            <Text style={styles.kpiCount}>{summaryMetrics.partialCount}</Text>
            <Text style={styles.kpiLabel}>{isRTL ? 'جزئية' : 'Partial'}</Text>
          </View>
          <View style={[styles.kpiCard, styles.kpiCardFailed]}>
            <Text style={styles.kpiCount}>{summaryMetrics.failedCount}</Text>
            <Text style={styles.kpiLabel}>{isRTL ? 'فاشلة' : 'Failed'}</Text>
          </View>
          <View style={[styles.kpiCard, styles.kpiCardTokens]}>
            <Text style={styles.kpiCount}>{summaryMetrics.noTokensCount}</Text>
            <Text style={styles.kpiLabel}>{isRTL ? 'بدون رمز' : 'No Tokens'}</Text>
          </View>
        </View>

        {/* Filters Card */}
        <View style={styles.filtersCard}>
          <View style={[styles.filterTitleRow, isRTL && styles.rowRTL]}>
            <Ionicons name="funnel-outline" size={16} color={COLORS.accentDark} />
            <Text style={[styles.filterLabel, isRTL && styles.textRTL]}>
              {t('adminEventTypeLabel')}
            </Text>
          </View>

          <View style={[styles.inputContainer, isRTL && styles.inputContainerRTL]}>
            <Ionicons name="notifications-outline" size={18} color={COLORS.primary} style={styles.inputIcon} />
            <TextInput
              testID="admin-push-event-input"
              style={[styles.input, isRTL && styles.textRTL]}
              value={eventType}
              onChangeText={setEventType}
              placeholder={t('adminEventTypePlaceholder')}
              placeholderTextColor={COLORS.textLight}
              textAlign={isRTL ? 'right' : 'left'}
            />
          </View>

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
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {t(option.labelKey)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TouchableOpacity
            testID="admin-push-filter-apply-btn"
            style={styles.primaryBtn}
            onPress={loadLogs}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={16} color={COLORS.white} style={styles.btnIcon} />
            <Text style={styles.primaryBtnText}>{t('adminRefresh')}</Text>
          </TouchableOpacity>
        </View>

        {/* Stream of Push Delivery Logs */}
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>
              {isRTL ? 'جاري تحميل سجلات الإشعارات...' : 'Loading push notification telemetry...'}
            </Text>
          </View>
        ) : logs.length === 0 ? (
          <EmptyState
            icon="notifications-off-outline"
            title={t('adminPushLogsTitle')}
            subtitle={t('adminPushLogsEmpty')}
          />
        ) : (
          logs.map((log) => {
            const toneConfig = statusTone[log.status] || {
              color: COLORS.textSecondary,
              bg: '#F0ECE4',
              border: COLORS.border,
              icon: 'information-circle',
            };

            return (
              <View key={log.id} style={styles.card}>
                <View style={[styles.cardTop, isRTL && styles.rowRTL]}>
                  <View
                    style={[
                      styles.statusPill,
                      {
                        borderColor: toneConfig.border,
                        backgroundColor: toneConfig.bg,
                      },
                    ]}
                  >
                    <Ionicons
                      name={toneConfig.icon}
                      size={12}
                      color={toneConfig.color}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[styles.statusPillText, { color: toneConfig.color }]}>
                      {log.status}
                    </Text>
                  </View>

                  <View style={[styles.dateBadge, isRTL && styles.rowRTL]}>
                    <Ionicons name="time-outline" size={12} color={COLORS.textLight} />
                    <Text style={[styles.dateText, isRTL && styles.textRTL]}>
                      {new Date(log.created_at).toLocaleString()}
                    </Text>
                  </View>
                </View>

                {/* Event Type Header */}
                <View style={[styles.eventTypeRow, isRTL && styles.rowRTL]}>
                  <View style={styles.eventBullet} />
                  <Text style={[styles.cardTitle, isRTL && styles.textRTL]}>
                    {log.event_type || '-'}
                  </Text>
                </View>

                {/* Log Details Grid */}
                <View style={styles.detailsGrid}>
                  <View style={[styles.metaItem, isRTL && styles.rowRTL]}>
                    <Ionicons name="server-outline" size={13} color={COLORS.accentDark} />
                    <Text style={[styles.metaLine, isRTL && styles.textRTL]}>
                      Provider: {log.provider}
                    </Text>
                  </View>

                  <View style={[styles.metaItem, isRTL && styles.rowRTL]}>
                    <Ionicons name="paper-plane-outline" size={13} color={COLORS.primary} />
                    <Text style={[styles.metaLine, isRTL && styles.textRTL]}>
                      Tokens: {log.accepted_count}/{log.total_tokens} accepted
                    </Text>
                  </View>

                  <View style={[styles.metaItem, isRTL && styles.rowRTL]}>
                    <Ionicons
                      name={log.failed_count > 0 ? 'alert-circle' : 'checkmark-circle'}
                      size={13}
                      color={log.failed_count > 0 ? COLORS.error : '#10B981'}
                    />
                    <Text style={[styles.metaLine, isRTL && styles.textRTL]}>
                      Failed: {log.failed_count}
                    </Text>
                  </View>

                  <View style={[styles.metaItem, isRTL && styles.rowRTL]}>
                    <Ionicons name="person-outline" size={13} color={COLORS.textSecondary} />
                    <Text style={[styles.metaLine, isRTL && styles.textRTL]}>
                      User: {log.target_user_id}
                    </Text>
                  </View>
                </View>

                {/* Error Banner */}
                {log.error_message ? (
                  <View style={[styles.errorCard, isRTL && styles.rowRTL]}>
                    <Ionicons name="warning-outline" size={16} color="#9B1C1C" />
                    <Text style={[styles.errorText, isRTL && styles.textRTL]}>
                      {log.error_message}
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          })
        )}
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
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    ...SHADOWS.subtle,
  },
  headerLeftWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  brandIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
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
  pushShieldCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1.5,
    borderColor: 'rgba(197, 160, 89, 0.3)',
    ...SHADOWS.small,
  },
  pushShieldHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  pushShieldIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(197, 160, 89, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.3)',
  },
  pushBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  pushPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  pushBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.accentDark,
    letterSpacing: 0.5,
  },
  pushShieldTitle: {
    ...FONTS.h3,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  pushShieldDesc: {
    ...FONTS.bodySmall,
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  pushPillars: {
    gap: 6,
    paddingVertical: SPACING.xs,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.borderLight,
    marginVertical: SPACING.xs,
  },
  pushPillarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  pushPillarIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(197, 160, 89, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pushPillarText: {
    ...FONTS.caption,
    fontSize: 11,
    color: COLORS.text,
    fontWeight: '600',
    flex: 1,
  },
  pushConsultBtn: {
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
  pushConsultBtnText: {
    ...FONTS.button,
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: SPACING.sm,
  },
  headerContentRTL: {
    flexDirection: 'row-reverse',
  },
  headerCopy: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.primary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginTop: 1,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryLight,
  },
  syncIcon: {
    marginRight: 4,
  },
  refreshText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.subtle,
  },
  kpiCardSuccess: {
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  kpiCardPartial: {
    borderLeftWidth: 3,
    borderLeftColor: '#C5A059',
  },
  kpiCardFailed: {
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  kpiCardTokens: {
    borderLeftWidth: 3,
    borderLeftColor: '#718096',
  },
  kpiCount: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  kpiLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    marginTop: 2,
    textAlign: 'center',
  },
  filtersCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  filterTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.xs,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  inputContainerRTL: {
    flexDirection: 'row-reverse',
  },
  inputIcon: {
    marginRight: 6,
  },
  input: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    color: COLORS.text,
    fontSize: 13,
  },
  chipRow: {
    gap: SPACING.xs,
    paddingVertical: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  chip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 6,
  },
  chipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  chipText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  chipTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  primaryBtn: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: SPACING.xs,
    ...SHADOWS.subtle,
  },
  btnIcon: {
    marginRight: 6,
  },
  primaryBtnText: {
    fontSize: 13,
    color: COLORS.white,
    fontWeight: '700',
  },
  loadingWrap: {
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    padding: SPACING.md,
    marginBottom: SPACING.sm + 2,
    ...SHADOWS.card,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 11,
    color: COLORS.textLight,
  },
  eventTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.sm,
  },
  eventBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.accent,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  detailsGrid: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    gap: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaLine: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.sm,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
  },
  errorText: {
    fontSize: 12,
    color: '#9B1C1C',
    fontWeight: '600',
    flex: 1,
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  textRTL: {
    textAlign: 'right',
  },
});