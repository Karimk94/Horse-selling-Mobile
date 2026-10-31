import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SPACING, SHADOWS } from '../config/theme';
import BrandMark from './BrandMark';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled SteedMarket Exception:', error, errorInfo);
  }

  handleRestart = () => {
    this.setState({ hasError: false, error: null });
  };

  handleConciergeSupport = () => {
    const errorMsg = this.state.error?.message ? ` (${this.state.error.message.slice(0, 100)})` : '';
    const text = `Hello SteedMarket VIP Concierge, I experienced an unexpected application issue${errorMsg} and require priority support.`;
    try {
      const res = Linking.openURL(`https://wa.me/971500000000?text=${encodeURIComponent(text)}`);
      if (res && typeof res.catch === 'function') {
        res.catch(() => {});
      }
    } catch (e) {}
  };

  render() {
    if (this.state.hasError) {
      return (
        <View testID="error-boundary-container" style={styles.container}>
          <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

          {/* SteedMarket Emblem Crest */}
          <View style={styles.emblemContainer}>
            <BrandMark size={48} />
          </View>

          {/* Protocol Status Badge with Live Emerald Pulse Dot */}
          <View style={styles.statusBadge}>
            <View style={styles.pulseDot} />
            <Text style={styles.statusBadgeText}>VIP PLATFORM RESILIENCE PROTOCOL</Text>
          </View>

          {/* Warning Badge */}
          <View style={styles.iconCircle}>
            <Ionicons name="warning-outline" size={32} color={COLORS.accentDark} />
          </View>

          <Text testID="error-boundary-title" style={styles.title}>
            Oops! Something went wrong
          </Text>
          <Text style={styles.titleArabic}>عذراً! حدث خطأ غير متوقع</Text>

          <Text testID="error-boundary-message" style={styles.subtitle}>
            An unexpected error occurred. Please reload to resume your luxury equestrian marketplace experience.
          </Text>

          <TouchableOpacity
            testID="error-boundary-reload-btn"
            style={styles.button}
            onPress={this.handleRestart}
            activeOpacity={0.85}
          >
            <Ionicons name="refresh" size={18} color={COLORS.white} />
            <Text style={styles.buttonText}>Reload Application / إعادة التحميل</Text>
          </TouchableOpacity>

          {/* 1-Tap WhatsApp VIP Concierge Hotline Button */}
          <TouchableOpacity
            testID="error-boundary-concierge-btn"
            style={styles.conciergeButton}
            onPress={this.handleConciergeSupport}
            activeOpacity={0.85}
            accessibilityLabel="VIP Support on WhatsApp"
          >
            <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
            <Text style={styles.conciergeButtonText}>VIP Concierge Support / الدعم الفوري</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  emblemContainer: {
    marginBottom: SPACING.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.sm + 4,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.accent + '40',
    marginBottom: SPACING.md,
    ...SHADOWS.soft,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  statusBadgeText: {
    ...FONTS.caption,
    color: COLORS.accentDark,
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.accent + '20',
    borderWidth: 2,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.soft,
  },
  title: {
    ...FONTS.h2,
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 4,
  },
  titleArabic: {
    ...FONTS.h3,
    color: COLORS.accentDark,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 22,
    maxWidth: 320,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs + 2,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.accent,
    ...SHADOWS.medium,
  },
  buttonText: {
    ...FONTS.button,
    color: COLORS.white,
    fontWeight: '700',
  },
  conciergeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs + 2,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md - 2,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#25D366' + '60',
    marginTop: SPACING.sm + 2,
    ...SHADOWS.soft,
  },
  conciergeButtonText: {
    ...FONTS.button,
    color: '#128C7E',
    fontWeight: '700',
    fontSize: 14,
  },
});

