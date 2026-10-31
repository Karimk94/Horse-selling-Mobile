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
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EmptyState from '../components/EmptyState';
import BrandMark from '../components/BrandMark';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '../config/theme';
import { useLanguage } from '../contexts/LanguageContext';
import * as apiService from '../services/api';
import { extractApiErrorMessage } from '../utils/apiErrors';
import { useToast } from '../components/ToastProvider';

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
  const [offerIdError, setOfferIdError] = useState('');
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(Boolean(initialOfferId));
  const toast = useToast();

  const handleEscrowAuditHotline = () => {
    const isArabic = isRTL;
    const text = isArabic
      ? 'مرحباً، أود الاستفسار من فريق تدقيق الضمان بخصوص سجل تحول العرض المالي.'
      : 'Hello SteedMarket Escrow Audit Team, I need assistance regarding an offer transition audit trail.';
    try {
      const res = Linking.openURL(`https://wa.me/971500000000?text=${encodeURIComponent(text)}`);
      if (res && typeof res.catch === 'function') {
        res.catch(() => {});
      }
    } catch (e) {}
  };

  const handleArbitratorConsultation = () => {
    const isArabic = isRTL;
    const text = isArabic
      ? 'مرحباً، أود استشارة المحكّم المصرفي المعتمد لفض نزاع أو مراجعة عرض شراء خيل.'
      : 'Hello SteedMarket Certified Arbitrator, I need consultation regarding equine offer dispute resolution and escrow verification.';
    try {
      const res = Linking.openURL(`https://wa.me/971500000000?text=${encodeURIComponent(text)}`);
      if (res && typeof res.catch === 'function') {
        res.catch(() => {});
      }
    } catch (e) {}
  };

  const loadAudit = useCallback(async () => {
    const normalizedOfferId = offerId.trim();
    setOfferIdError('');
    if (!UUID_PATTERN.test(normalizedOfferId)) {
      setOfferIdError(t('adminOfferAuditInvalidId'));
      Alert.alert('error', t('adminOfferAuditInvalidId'));
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
      const msg = extractApiErrorMessage(err, t('adminOfferAuditLoadFailed'));
      Alert.alert('error', msg);
      toast?.show?.(msg, { type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [actor, offerId, t, toStatus, toast]);

  useEffect(() => {
    if (initialOfferId && UUID_PATTERN.test(initialOfferId)) {
      loadAudit();
    }
  }, [initialOfferId, loadAudit]);

  const getActorColor = (actorType) => {
    switch (actorType) {
      case 'seller':
        return { text: '#8D6E2E', bg: '#FAF3E8', border: '#C5A059' };
      case 'buyer':
        return { text: COLORS.primary, bg: COLORS.primaryLight, border: '#0F3826' };
      case 'system':
      default:
        return { text: COLORS.textSecondary, bg: '#F0ECE4', border: COLORS.border };
    }
  };

  const getStatusColor = (statusKey) => {
    switch (statusKey) {
      case 'accepted':
      case 'sold':
        return { text: '#0A5C36', bg: '#E6F7F0', border: '#10B981' };
      case 'countered':
        return { text: '#8D6E2E', bg: '#FAF3E8', border: '#C5A059' };
      case 'rejected':
      case 'cancelled':
        return { text: '#9B1C1C', bg: '#FEE2E2', border: '#EF4444' };
      case 'pending':
      default:
        return { text: '#92400E', bg: '#FEF3C7', border: '#F59E0B' };
    }
  };

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
            testID="admin-audit-back-btn"
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
                  {isRTL ? 'سجل تدقيق عروض الأسعار والضمان' : 'OFFICIAL OFFER ESCROW AUDIT TRAIL'}
                </Text>
              </View>
              <Text style={[styles.headerTitle, isRTL && styles.textRTL]}>
                {t('adminOfferAuditTitle')}
              </Text>
              <View style={[styles.subtitleBadgeRow, isRTL && styles.rowRTL]}>
                <Text style={[styles.headerSubtitle, isRTL && styles.textRTL]}>
                  {t('adminTotalLogs')}: {total}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <TouchableOpacity
          testID="admin-audit-header-hotline-btn"
          style={styles.headerHotlineBtn}
          onPress={handleEscrowAuditHotline}
          activeOpacity={0.8}
          accessibilityLabel="Escrow Audit WhatsApp Hotline"
        >
          <Ionicons name="logo-whatsapp" size={17} color="#25D366" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* SteedMarket Offer Escrow Custody & Arbitration Charter */}
        <View testID="admin-offer-audit-shield" style={styles.auditShieldCard}>
          <View style={[styles.auditShieldHeader, isRTL && styles.rowRTL]}>
            <View style={styles.auditShieldIconWrap}>
              <Ionicons name="shield-checkmark" size={18} color={COLORS.accentDark} />
            </View>
            <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <View style={[styles.auditBadgeRow, isRTL && styles.rowRTL]}>
                <View style={styles.auditPulseDot} />
                <Text style={styles.auditBadgeText}>
                  {isRTL ? 'بروتوكول التحكيم والرقابة المصرفية' : 'OFFER ESCROW CUSTODY & ARBITRATION'}
                </Text>
              </View>
              <Text style={[styles.auditShieldTitle, isRTL && styles.textRTL]}>
                {isRTL ? 'ميثاق التوثيق الرقمي والنزاهة التعاقدية' : 'Digital Integrity & Escrow Settlement Charter'}
              </Text>
              <Text style={[styles.auditShieldDesc, isRTL && styles.textRTL]}>
                {isRTL
                  ? 'سجل غير قابل للتعديل لكافة تحولات العروض، الرسائل المتبادلة، وتحرير أموال الضمان المعتمد'
                  : 'Immutable cryptographic trail of offer transitions, counter-offers, and escrow disbursement compliance'}
              </Text>
            </View>
          </View>

          {/* 3 Escrow Audit Trust Pillars */}
          <View style={styles.auditPillars}>
            <View style={[styles.auditPillarItem, isRTL && styles.rowRTL]}>
              <View style={styles.auditPillarIcon}>
                <Ionicons name="lock-closed" size={13} color={COLORS.accentDark} />
              </View>
              <Text style={[styles.auditPillarText, isRTL && styles.textRTL]}>
                {isRTL ? 'سجل تحولات غير قابل للتعديل' : 'Immutable Transition Audit Trail'}
              </Text>
            </View>
            <View style={[styles.auditPillarItem, isRTL && styles.rowRTL]}>
              <View style={styles.auditPillarIcon}>
                <Ionicons name="document-text" size={13} color={COLORS.accentDark} />
              </View>
              <Text style={[styles.auditPillarText, isRTL && styles.textRTL]}>
                {isRTL ? 'عقود ملزمة وحماية قانونية للطرفين' : 'Bilateral Contract & Binding Offer Enforcement'}
              </Text>
            </View>
            <View style={[styles.auditPillarItem, isRTL && styles.rowRTL]}>
              <View style={styles.auditPillarIcon}>
                <Ionicons name="cash" size={13} color={COLORS.accentDark} />
              </View>
              <Text style={[styles.auditPillarText, isRTL && styles.textRTL]}>
                {isRTL ? 'بروتوكول تحرير أموال الضمان البنكي' : 'Bank-Grade Escrow Deposit Release Protocol'}
              </Text>
            </View>
          </View>

          {/* 1-Tap WhatsApp Senior Escrow Arbitrator consultation button */}
          <TouchableOpacity
            testID="admin-audit-escrow-consult-btn"
            style={[styles.auditConsultBtn, isRTL && styles.rowRTL]}
            onPress={handleArbitratorConsultation}
            activeOpacity={0.85}
          >
            <Ionicons name="logo-whatsapp" size={15} color="#25D366" />
            <Text style={styles.auditConsultBtnText}>
              {isRTL ? 'استشارة المحكّم المصرفي المعتمد' : 'Consult Certified Escrow Arbitrator'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Lookup & Filter Studio Card */}
        <View style={styles.filtersCard}>
          <View style={[styles.filterTitleRow, isRTL && styles.rowRTL]}>
            <Ionicons name="shield-search-outline" size={18} color={COLORS.accentDark} />
            <Text style={[styles.cardHeaderTitle, isRTL && styles.textRTL]}>
              {t('adminOfferIdLabel')}
            </Text>
          </View>

          <View style={[styles.inputContainer, isRTL && styles.inputContainerRTL]}>
            <Ionicons name="key-outline" size={18} color={COLORS.primary} style={styles.inputIcon} />
            <TextInput
              testID="admin-offer-id-input"
              style={[styles.input, isRTL && styles.textRTL]}
              value={offerId}
              onChangeText={setOfferId}
              placeholder={t('adminOfferIdPlaceholder')}
              placeholderTextColor={COLORS.textLight}
              autoCapitalize="none"
              autoCorrect={false}
              textAlign={isRTL ? 'right' : 'left'}
            />
          </View>
          {offerIdError ? (
            <Text style={[styles.errorText, isRTL && styles.textRTL]}>{offerIdError}</Text>
          ) : null}

          {/* Actor Quick Chips */}
          <Text style={[styles.filterLabel, isRTL && styles.textRTL]}>{t('adminActorAll')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.chipRow, isRTL && styles.rowRTL]}
          >
            {ACTOR_OPTIONS.map((option) => {
              const active = actor === option.key;
              return (
                <TouchableOpacity
                  key={option.key || 'all'}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setActor(option.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {t(option.labelKey)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Status Quick Chips */}
          <Text style={[styles.filterLabel, isRTL && styles.textRTL]}>{t('adminStatusLabel')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.chipRow, isRTL && styles.rowRTL]}
          >
            {STATUS_OPTIONS.map((option) => {
              const active = toStatus === option.key;
              return (
                <TouchableOpacity
                  key={option.key || 'all'}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setToStatus(option.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {t(option.labelKey)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Lookup Action Button */}
          <TouchableOpacity
            testID="admin-offer-lookup-btn"
            style={styles.primaryBtn}
            onPress={loadAudit}
            activeOpacity={0.8}
          >
            <Ionicons name="search" size={16} color={COLORS.white} style={styles.btnIcon} />
            <Text style={styles.primaryBtnText}>{t('adminLookup')}</Text>
          </TouchableOpacity>
        </View>

        {/* Results Stream */}
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>
              {isRTL ? 'جاري استرجاع سجل تدقيق المفاوضات...' : 'Retrieving negotiation audit trail...'}
            </Text>
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
          logs.map((log, index) => {
            const actorStyle = getActorColor(log.actor);
            const fromColor = getStatusColor(log.from_status);
            const toColor = getStatusColor(log.to_status);

            return (
              <View key={log.id} style={styles.card}>
                {/* Timeline Step Indicator */}
                <View style={[styles.cardHeader, isRTL && styles.rowRTL]}>
                  <View style={[styles.stepBadge, isRTL && styles.rowRTL]}>
                    <View style={styles.stepDot} />
                    <Text style={styles.stepIndex}>#{logs.length - index}</Text>
                  </View>

                  <View
                    style={[
                      styles.actorPill,
                      {
                        backgroundColor: actorStyle.bg,
                        borderColor: actorStyle.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        log.actor === 'seller'
                          ? 'business-outline'
                          : log.actor === 'buyer'
                          ? 'person-outline'
                          : 'cog-outline'
                      }
                      size={13}
                      color={actorStyle.text}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[styles.actorPillText, { color: actorStyle.text }]}>
                      {log.actor}
                    </Text>
                  </View>

                  <Text style={[styles.dateText, isRTL && styles.textRTL]}>
                    {new Date(log.created_at).toLocaleString()}
                  </Text>
                </View>

                {/* Transition Flow Visualizer */}
                <View style={[styles.statusRow, isRTL && styles.rowRTL]}>
                  <View
                    style={[
                      styles.statusBox,
                      { backgroundColor: fromColor.bg, borderColor: fromColor.border },
                    ]}
                  >
                    <Text style={styles.statusLabel}>{t('adminFromStatus')}</Text>
                    <Text style={[styles.statusValue, { color: fromColor.text }]}>
                      {log.from_status}
                    </Text>
                  </View>

                  <View style={styles.arrowContainer}>
                    <Ionicons
                      name={isRTL ? 'arrow-back' : 'arrow-forward'}
                      size={18}
                      color={COLORS.primary}
                    />
                  </View>

                  <View
                    style={[
                      styles.statusBox,
                      { backgroundColor: toColor.bg, borderColor: toColor.border },
                    ]}
                  >
                    <Text style={styles.statusLabel}>{t('adminToStatus')}</Text>
                    <Text style={[styles.statusValue, { color: toColor.text }]}>
                      {log.to_status}
                    </Text>
                  </View>
                </View>

                {/* Meta details */}
                <View style={styles.metaContainer}>
                  <View style={[styles.metaRow, isRTL && styles.rowRTL]}>
                    <Ionicons name="chatbubble-ellipses-outline" size={14} color={COLORS.textSecondary} />
                    <Text style={[styles.metaLine, isRTL && styles.textRTL]}>
                      {t('adminResponseMessage')}: {log.response_message || t('adminNoMessage')}
                    </Text>
                  </View>

                  <View style={[styles.metaRow, isRTL && styles.rowRTL]}>
                    <Ionicons name="finger-print-outline" size={14} color={COLORS.textSecondary} />
                    <Text style={[styles.metaLine, isRTL && styles.textRTL]}>
                      User: {log.changed_by_user_id || '-'}
                    </Text>
                  </View>
                </View>
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
  auditShieldCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
    borderWidth: 1.5,
    borderColor: 'rgba(197, 160, 89, 0.3)',
    ...SHADOWS.small,
  },
  auditShieldHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  auditShieldIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(197, 160, 89, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.3)',
  },
  auditBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  auditPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  auditBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.accentDark,
    letterSpacing: 0.5,
  },
  auditShieldTitle: {
    ...FONTS.h3,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  auditShieldDesc: {
    ...FONTS.bodySmall,
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  auditPillars: {
    gap: 6,
    paddingVertical: SPACING.xs,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.borderLight,
    marginVertical: SPACING.xs,
  },
  auditPillarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  auditPillarIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(197, 160, 89, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  auditPillarText: {
    ...FONTS.caption,
    fontSize: 11,
    color: COLORS.text,
    fontWeight: '600',
    flex: 1,
  },
  auditConsultBtn: {
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
  auditConsultBtnText: {
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
  },
  subtitleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xxl,
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
    marginBottom: SPACING.sm,
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    marginTop: SPACING.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    marginBottom: SPACING.xs,
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
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    marginBottom: SPACING.xs,
    marginTop: 2,
  },
  chipRow: {
    gap: SPACING.xs,
    paddingVertical: SPACING.xs,
    marginBottom: SPACING.xs,
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
    paddingVertical: 11,
    marginTop: SPACING.sm,
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
    marginTop: SPACING.xs,
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  stepBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stepDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.accent,
  },
  stepIndex: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  actorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  actorPillText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  dateText: {
    fontSize: 11,
    color: COLORS.textLight,
    flex: 1,
    textAlign: 'right',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  statusBox: {
    flex: 1,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    padding: SPACING.sm,
  },
  arrowContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statusValue: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  metaContainer: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaLine: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  textRTL: {
    textAlign: 'right',
  },
});