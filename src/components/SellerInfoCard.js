import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SPACING } from '../config/theme';

export default function SellerInfoCard({ seller, isRTL, t, onEmailPress }) {
  if (!seller) return null;

  const firstName = seller.profile?.first_name;
  const lastName = seller.profile?.last_name;
  const displayName = [firstName, lastName].filter(Boolean).join(' ') || t('userFallback');
  const initial = firstName?.[0] || seller.email?.[0] || '?';

  const handleEmailPress = () => {
    if (onEmailPress) {
      onEmailPress();
    } else if (seller.email) {
      Linking.openURL(`mailto:${seller.email}`);
    }
  };

  return (
    <View testID="seller-info-card" style={styles.card}>
      <Text style={[styles.title, isRTL && styles.textRTL]}>{t('aboutSeller')}</Text>
      <View style={[styles.row, isRTL && styles.rowRTL]}>
        <View style={styles.avatar}>
          <Text style={styles.initial}>{initial.toUpperCase()}</Text>
        </View>
        <View style={styles.info}>
          <View style={[styles.nameRow, isRTL && styles.rowRTL]}>
            <Text style={[styles.name, isRTL && styles.textRTL]}>{displayName}</Text>
            {seller.is_verified && (
              <View style={[styles.verifiedBadge, isRTL && styles.rowRTL]}>
                <Ionicons name="checkmark-circle" size={13} color={COLORS.success} />
                <Text style={styles.verifiedText}>{t('verified')}</Text>
              </View>
            )}
          </View>
          {seller.email && (
            <TouchableOpacity
              accessibilityRole="link"
              testID="seller-email-action"
              style={styles.emailAction}
              onPress={handleEmailPress}
            >
              <Ionicons name="mail-outline" size={16} color={COLORS.primary} />
              <Text style={styles.emailText} numberOfLines={1}>{seller.email}</Text>
            </TouchableOpacity>
          )}
          {seller.profile?.location && (
            <View style={[styles.location, isRTL && styles.rowRTL]}>
              <Ionicons name="location-outline" size={14} color={COLORS.textLight} />
              <Text style={[styles.locationText, isRTL && styles.textRTL]}>
                {seller.profile.location}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#f8fafc',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: SPACING.md,
  },
  title: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryLight + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    ...FONTS.h3,
    color: COLORS.primary,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    flexWrap: 'wrap',
  },
  name: {
    ...FONTS.body,
    color: COLORS.text,
    fontWeight: '600',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.success + '12',
    paddingHorizontal: SPACING.xs + 2,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  verifiedText: {
    ...FONTS.caption,
    color: COLORS.success,
    fontWeight: '700',
    fontSize: 10,
  },
  emailAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  emailText: {
    ...FONTS.bodySmall,
    color: COLORS.primary,
    flex: 1,
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: 2,
  },
  locationText: {
    ...FONTS.bodySmall,
    color: COLORS.textLight,
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  textRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
