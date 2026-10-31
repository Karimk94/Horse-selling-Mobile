import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONTS, RADIUS, SHADOWS } from '../config/theme';

export default function EmptyState({
  icon = 'albums-outline',
  title = 'Nothing here yet',
  subtitle,
  buttonTitle,
  actionLabel,
  onButtonPress,
  onAction,
  suggestions = [],
  onSelectSuggestion,
  isRTL = false,
  showConcierge = false,
  onConciergePress,
  conciergeText,
}) {
  const btnLabel = buttonTitle || actionLabel;
  const handleBtnPress = onButtonPress || onAction;

  const handleConciergePress = () => {
    if (onConciergePress) {
      onConciergePress();
    } else {
      const text = isRTL
        ? `مرحباً وسيط ستيد ماركت، أود المساعدة في البحث عن طلب خاص (${title})`
        : `Hello SteedMarket VIP Concierge, I am looking for a specific equestrian inquiry regarding: "${title}".`;
      try {
        const res = Linking.openURL(`https://wa.me/971500000000?text=${encodeURIComponent(text)}`);
        if (res && typeof res.catch === 'function') res.catch(() => {});
      } catch (e) {}
    }
  };

  return (
    <View testID="empty-state-container" style={styles.container}>
      {/* Luxury Gold-Rimmed Icon Emblem */}
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={44} color={COLORS.accentDark} />
      </View>

      <Text testID="empty-state-title" style={[styles.title, isRTL && styles.textRTL]}>
        {title}
      </Text>

      {subtitle ? (
        <Text testID="empty-state-subtitle" style={[styles.subtitle, isRTL && styles.textRTL]}>
          {subtitle}
        </Text>
      ) : null}

      {/* Optional Suggestions Chips */}
      {suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <Text style={[styles.suggestionsLabel, isRTL && styles.textRTL]}>
            {isRTL ? 'جرّب البحث عن:' : 'Try searching for:'}
          </Text>
          <View style={[styles.chipsWrap, isRTL && styles.rowRTL]}>
            {suggestions.map((item, idx) => (
              <TouchableOpacity
                key={`${item}-${idx}`}
                testID={`empty-state-chip-${item.toLowerCase().replace(/\s+/g, '-')}`}
                style={styles.suggestionChip}
                onPress={() => onSelectSuggestion && onSelectSuggestion(item)}
                activeOpacity={0.7}
              >
                <Ionicons name="search-outline" size={12} color={COLORS.accentDark} />
                <Text style={styles.suggestionChipText}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Optional Action Button */}
      {btnLabel && handleBtnPress ? (
        <TouchableOpacity
          testID="empty-state-action-btn"
          style={styles.actionButton}
          onPress={handleBtnPress}
          activeOpacity={0.85}
        >
          <Text style={styles.actionButtonText}>{btnLabel}</Text>
        </TouchableOpacity>
      ) : null}

      {/* Optional VIP Equine Concierge Hotline Button */}
      {showConcierge && (
        <TouchableOpacity
          testID="empty-state-concierge-btn"
          style={[styles.conciergeButton, isRTL && styles.rowRTL]}
          onPress={handleConciergePress}
          activeOpacity={0.85}
          accessibilityLabel="VIP Equine Concierge on WhatsApp"
        >
          <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
          <Text style={[styles.conciergeButtonText, isRTL && styles.textRTL]}>
            {conciergeText ||
              (isRTL
                ? 'استعن بوسيط ستيد ماركت الخاص للبحث عن طلبك'
                : 'Inquire with SteedMarket VIP Concierge')}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xl,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.accent + '15',
    borderWidth: 2,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.soft,
  },
  title: {
    ...FONTS.h3,
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: SPACING.xs,
    fontSize: 18,
  },
  subtitle: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
    marginBottom: SPACING.md,
  },
  suggestionsContainer: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
    alignItems: 'center',
  },
  suggestionsLabel: {
    ...FONTS.caption,
    color: COLORS.textLight,
    marginBottom: SPACING.xs,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.soft,
  },
  suggestionChipText: {
    ...FONTS.caption,
    color: COLORS.text,
    fontWeight: '600',
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.accent,
    marginTop: SPACING.xs,
    ...SHADOWS.soft,
  },
  actionButtonText: {
    ...FONTS.button,
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
  conciergeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs + 2,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#25D366' + '60',
    marginTop: SPACING.sm + 4,
    ...SHADOWS.soft,
  },
  conciergeButtonText: {
    ...FONTS.caption,
    color: '#128C7E',
    fontWeight: '700',
    fontSize: 12,
  },
});

