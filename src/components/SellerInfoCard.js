import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SPACING, SHADOWS } from '../config/theme';

export default function SellerInfoCard({
  seller,
  isRTL = false,
  t = (k) => k,
  onEmailPress,
  onCallPress,
  onWhatsAppPress,
  itemTitle = '',
}) {
  if (!seller) return null;

  const firstName = seller.profile?.first_name;
  const lastName = seller.profile?.last_name;
  const displayName = [firstName, lastName].filter(Boolean).join(' ') || t('userFallback');
  const initial = (firstName?.[0] || seller.email?.[0] || 'S').toUpperCase();
  const phoneNumber = seller.profile?.phone_number || '';
  const location = seller.profile?.location || '';

  const handleEmailPress = () => {
    if (onEmailPress) {
      onEmailPress();
    } else if (seller.email) {
      try {
        const res = Linking.openURL(`mailto:${seller.email}`);
        if (res && typeof res.catch === 'function') res.catch(() => {});
      } catch (e) {}
    }
  };

  const handleCallPress = () => {
    if (onCallPress) {
      onCallPress();
    } else if (phoneNumber) {
      const cleaned = phoneNumber.replace(/[^0-9+]/g, '');
      try {
        const res = Linking.openURL(`tel:${cleaned}`);
        if (res && typeof res.catch === 'function') res.catch(() => {});
      } catch (e) {}
    }
  };

  const handleWhatsAppPress = () => {
    if (onWhatsAppPress) {
      onWhatsAppPress();
    } else if (phoneNumber) {
      let cleaned = phoneNumber.replace(/[^0-9]/g, '');
      if (cleaned.startsWith('00')) cleaned = cleaned.substring(2);
      if (cleaned.startsWith('05')) cleaned = '971' + cleaned.substring(1);
      const greeting = isRTL
        ? `مرحباً ${displayName}، أود الاستفسار عن إعلانك على ستيد ماركت ${itemTitle ? `(${itemTitle})` : ''}`
        : `Hello ${displayName}, I am inquiring about your SteedMarket listing ${itemTitle ? `(${itemTitle})` : ''}`;
      try {
        const res = Linking.openURL(`https://wa.me/${cleaned}?text=${encodeURIComponent(greeting)}`);
        if (res && typeof res.catch === 'function') res.catch(() => {});
      } catch (e) {}
    }
  };

  const handleConciergeVerification = () => {
    const isArabic = isRTL;
    const text = isArabic
      ? `مرحباً وسيط ستيد ماركت، أود الاستفسار والتحقق من حساب البائع (${displayName}) وأوراق الفحص والضمان بخصوص الإعلان ${itemTitle ? `(${itemTitle})` : ''}.`
      : `Hello SteedMarket Concierge, I would like to request official seller verification and escrow inspection for ${displayName} regarding listing ${itemTitle ? `(${itemTitle})` : ''}.`;
    try {
      const res = Linking.openURL(`https://wa.me/971500000000?text=${encodeURIComponent(text)}`);
      if (res && typeof res.catch === 'function') res.catch(() => {});
    } catch (e) {}
  };

  return (
    <View testID="seller-info-card" style={styles.card}>
      {/* Card Header Label */}
      <View style={[styles.cardHeader, isRTL && styles.rowRTL]}>
        <Ionicons name="ribbon-outline" size={16} color={COLORS.accentDark} />
        <Text style={[styles.title, isRTL && styles.textRTL]}>{t('aboutSeller')}</Text>
      </View>

      <View style={[styles.mainRow, isRTL && styles.rowRTL]}>
        {/* Gold-Rimmed Avatar Crest */}
        <View style={styles.avatar}>
          <Text style={styles.initial}>{initial}</Text>
          {seller.is_verified && (
            <View style={styles.avatarVerifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color={COLORS.primary} />
            </View>
          )}
        </View>

        {/* Seller Info Column */}
        <View style={styles.infoCol}>
          <View style={[styles.nameRow, isRTL && styles.rowRTL]}>
            <Text style={[styles.name, isRTL && styles.textRTL]}>{displayName}</Text>
            {seller.is_verified && (
              <View style={[styles.verifiedBadge, isRTL && styles.rowRTL]}>
                <Ionicons name="shield-checkmark" size={12} color={COLORS.primary} />
                <Text style={styles.verifiedText}>{t('verified')}</Text>
              </View>
            )}
          </View>

          {location ? (
            <View style={[styles.locationRow, isRTL && styles.rowRTL]}>
              <Ionicons name="location-outline" size={13} color={COLORS.accentDark} />
              <Text style={[styles.locationText, isRTL && styles.textRTL]}>{location}</Text>
            </View>
          ) : null}

          {seller.email ? (
            <TouchableOpacity
              accessibilityRole="link"
              testID="seller-email-action"
              style={[styles.emailAction, isRTL && styles.rowRTL]}
              onPress={handleEmailPress}
              activeOpacity={0.7}
            >
              <Ionicons name="mail-outline" size={14} color={COLORS.primary} />
              <Text style={styles.emailText} numberOfLines={1}>
                {seller.email}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Quick Action Contact Chips */}
      {phoneNumber ? (
        <View style={[styles.actionsRow, isRTL && styles.rowRTL]}>
          <TouchableOpacity
            testID="seller-call-action"
            style={[styles.quickActionBtn, styles.callActionBtn, isRTL && styles.rowRTL]}
            onPress={handleCallPress}
            activeOpacity={0.8}
          >
            <Ionicons name="call" size={14} color={COLORS.primary} />
            <Text style={styles.callActionText}>{t('callOwner')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="seller-whatsapp-action"
            style={[styles.quickActionBtn, styles.whatsappActionBtn, isRTL && styles.rowRTL]}
            onPress={handleWhatsAppPress}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-whatsapp" size={14} color="#16a34a" />
            <Text style={styles.whatsappActionText}>{t('whatsapp')}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* SteedMarket Concierge Escrow & Seller Verification Button */}
      <TouchableOpacity
        testID="seller-concierge-verify-btn"
        style={[styles.conciergeVerifyBtn, isRTL && styles.rowRTL]}
        onPress={handleConciergeVerification}
        activeOpacity={0.85}
        accessibilityLabel="Request SteedMarket Escrow & Verification"
      >
        <Ionicons name="shield-checkmark" size={14} color={COLORS.accentDark} />
        <Text style={[styles.conciergeVerifyText, isRTL && styles.textRTL]}>
          {isRTL
            ? 'طلب توثيق الحساب وضمان الصفقة عبر وسيط ستيد ماركت'
            : 'Request SteedMarket Escrow & Seller Verification'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
    ...SHADOWS.soft,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
    paddingBottom: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  title: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.accent,
    ...SHADOWS.soft,
  },
  avatarVerifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: COLORS.white,
    borderRadius: 7,
  },
  initial: {
    ...FONTS.h3,
    color: COLORS.white,
    fontWeight: '800',
  },
  infoCol: {
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
    fontWeight: '700',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: SPACING.xs + 2,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  verifiedText: {
    ...FONTS.caption,
    color: COLORS.primary,
    fontWeight: '800',
    fontSize: 10,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  locationText: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
  },
  emailAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: 4,
  },
  emailText: {
    ...FONTS.bodySmall,
    color: COLORS.primary,
    flex: 1,
    textAlign: 'left',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.sm + 2,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  callActionBtn: {
    backgroundColor: COLORS.primary + '10',
    borderColor: COLORS.primary + '30',
  },
  callActionText: {
    ...FONTS.caption,
    color: COLORS.primary,
    fontWeight: '700',
  },
  whatsappActionBtn: {
    backgroundColor: '#16a34a10',
    borderColor: '#16a34a30',
  },
  whatsappActionText: {
    ...FONTS.caption,
    color: '#16a34a',
    fontWeight: '700',
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  textRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  conciergeVerifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.surface,
    paddingVertical: 9,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.accent + '50',
    marginTop: SPACING.sm + 2,
    ...SHADOWS.soft,
  },
  conciergeVerifyText: {
    ...FONTS.caption,
    color: COLORS.accentDark,
    fontWeight: '700',
    fontSize: 11,
  },
});

