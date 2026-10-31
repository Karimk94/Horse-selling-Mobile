import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../config/theme';
import { useLanguage } from '../contexts/LanguageContext';

export default function DetailActionBar({
  actions = [],
  isRTL: propIsRTL,
  showEscrowRibbon = true,
  onConciergePress,
  conciergeInquiryText,
  title,
}) {
  const insets = useSafeAreaInsets();
  let langIsRTL = false;
  try {
    const lang = useLanguage();
    langIsRTL = !!lang?.isRTL;
  } catch (e) {
    // Context fallback in isolated test environments
  }
  const isRTL = propIsRTL !== undefined ? propIsRTL : langIsRTL;
  const bottomPadding = Math.max(insets.bottom, SPACING.sm);

  if (!actions || actions.length === 0) return null;

  const handleConcierge = () => {
    if (onConciergePress) {
      onConciergePress();
      return;
    }
    const defaultText =
      conciergeInquiryText ||
      (isRTL
        ? `مرحباً ستيد ماركت، أود الاستفسار من الوسيط المعتمد بخصوص ${
            title ? `"${title}"` : 'هذا الإعلان'
          } وتفاصيل الضمان وخدمة الدفع الآمن.`
        : `Hello SteedMarket Concierge, I would like to consult an accredited broker regarding ${
            title ? `"${title}"` : 'this listing'
          } and inquire about escrow protection.`);
    try {
      const res = Linking.openURL(
        `https://wa.me/971500000000?text=${encodeURIComponent(defaultText)}`
      );
      if (res && typeof res.catch === 'function') {
        res.catch(() => {});
      }
    } catch (e) {}
  };

  return (
    <View
      testID="detail-action-bar"
      style={[
        styles.container,
        { paddingBottom: bottomPadding },
      ]}
    >
      {showEscrowRibbon && (
        <View
          testID="detail-action-escrow-ribbon"
          style={[styles.ribbonRow, isRTL && styles.rowRTL]}
        >
          <View style={[styles.ribbonLeft, isRTL && styles.rowRTL]}>
            <View style={styles.pulseDot} />
            <Ionicons
              name="shield-checkmark"
              size={13}
              color={COLORS.accentDark}
              style={styles.shieldIcon}
            />
            <Text style={[styles.ribbonText, isRTL && styles.textRTL]}>
              {isRTL
                ? 'حماية ووساطة ستيد ماركت المعتمدة'
                : 'STEEDMARKET VIP ESCROW & VERIFIED SELLER'}
            </Text>
          </View>

          <TouchableOpacity
            testID="detail-action-concierge-btn"
            style={[styles.conciergeBtn, isRTL && styles.rowRTL]}
            activeOpacity={0.8}
            onPress={handleConcierge}
            accessibilityLabel="VIP Concierge Escrow"
          >
            <Ionicons name="logo-whatsapp" size={13} color="#25D366" />
            <Text style={styles.conciergeBtnText}>
              {isRTL ? 'الوسيط المعتمد' : 'Concierge'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={[styles.actionsRow, isRTL && styles.rowRTL]}>
        {actions.map((action) => {
          const btnBg = action.color || COLORS.primary;
          return (
            <TouchableOpacity
              key={action.id}
              testID={action.testID || `detail-action-${action.id}`}
              accessibilityRole="button"
              activeOpacity={0.85}
              style={[
                styles.button,
                { backgroundColor: btnBg },
                action.inactive && styles.inactive,
                isRTL && styles.btnRowRTL,
              ]}
              onPress={action.onPress}
              disabled={action.inactive}
            >
              {action.icon && (
                <Ionicons
                  name={action.icon}
                  size={20}
                  color={action.iconColor || COLORS.white}
                />
              )}
              <Text style={[styles.label, isRTL && styles.textRTL]}>{action.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xs + 2,
    borderTopWidth: 1,
    borderTopColor: '#E6D7B8',
    ...SHADOWS.card,
  },
  ribbonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
    paddingHorizontal: SPACING.xs + 2,
    marginBottom: SPACING.xs + 2,
    backgroundColor: '#FAF7F0',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#EFE7DA',
  },
  ribbonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 5,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  shieldIcon: {
    marginRight: 1,
  },
  ribbonText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0F291E',
    letterSpacing: 0.5,
  },
  conciergeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  conciergeBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1B5E20',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: RADIUS.md,
    gap: SPACING.xs + 2,
    paddingHorizontal: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    ...SHADOWS.soft,
  },
  label: {
    ...FONTS.button,
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 15,
  },
  inactive: {
    opacity: 0.5,
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  btnRowRTL: {
    flexDirection: 'row-reverse',
  },
  textRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
