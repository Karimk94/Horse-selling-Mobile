import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../config/theme';
import BrandMark from './BrandMark';
import { useLanguage } from '../contexts/LanguageContext';

export default function BrandLogo({
  title,
  subtitle,
  iconSize = 34,
  textStyle,
  style,
  isRTL: propIsRTL,
  showVipBadge = false,
  vipBadgeText,
  onPress,
}) {
  let langIsRTL = false;
  try {
    const lang = useLanguage();
    langIsRTL = !!lang?.isRTL;
  } catch (e) {}
  const isRTL = propIsRTL !== undefined ? propIsRTL : langIsRTL;

  const content = (
    <View
      testID="brand-logo-container"
      style={[styles.container, isRTL && styles.rowRTL, style]}
    >
      <View style={styles.markWrap}>
        <BrandMark size={iconSize} />
      </View>
      <View style={[styles.textWrap, isRTL && styles.textWrapRTL]}>
        {showVipBadge && (
          <View
            testID="brand-logo-vip-badge"
            style={[styles.vipBadge, isRTL && styles.rowRTL]}
          >
            <View style={styles.vipPulseDot} />
            <Text style={styles.vipBadgeText}>
              {vipBadgeText || (isRTL ? 'منصة الفروسية المعتمدة' : 'VIP EQUESTRIAN EXCHANGE')}
            </Text>
          </View>
        )}
        <Text
          testID="brand-logo-title"
          style={[styles.title, isRTL && styles.textRTL, textStyle]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            testID="brand-logo-subtitle"
            style={[styles.subtitle, isRTL && styles.textRTL]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        testID="brand-logo-touchable"
        activeOpacity={0.85}
        onPress={onPress}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  markWrap: {
    padding: 2,
  },
  vipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF5E8',
    borderWidth: 1,
    borderColor: '#D4AF37',
    borderRadius: RADIUS.full,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    marginBottom: 2,
    alignSelf: 'flex-start',
  },
  vipPulseDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10B981',
    marginRight: 4,
  },
  vipBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#8C6D23',
    letterSpacing: 0.5,
  },
  textWrap: {
    justifyContent: 'center',
  },
  textWrapRTL: {
    alignItems: 'flex-end',
  },
  title: {
    ...FONTS.h2,
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  subtitle: {
    ...FONTS.caption,
    color: COLORS.accentDark,
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  textRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
