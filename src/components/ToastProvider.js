import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../config/theme';

const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

const TOAST_THEMES = {
  success: {
    bg: '#0F3826',
    border: '#C5A059',
    icon: 'checkmark-circle',
    iconColor: '#C5A059',
    pulseColor: '#10B981',
  },
  error: {
    bg: '#991B1B',
    border: '#F87171',
    icon: 'alert-circle',
    iconColor: '#FCA5A5',
    pulseColor: '#EF4444',
  },
  warning: {
    bg: '#B45309',
    border: '#FCD34D',
    icon: 'warning',
    iconColor: '#FDE68A',
    pulseColor: '#F59E0B',
  },
  info: {
    bg: '#1E293B',
    border: '#C5A059',
    icon: 'information-circle',
    iconColor: '#C5A059',
    pulseColor: '#60A5FA',
  },
};

export default function ToastProvider({ children }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState(null);
  const anim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef(null);

  const dismiss = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    Animated.timing(anim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      setToast(null);
    });
  }, [anim]);

  const show = useCallback(
    (
      message,
      {
        type = 'info',
        duration = 3000,
        showConcierge = false,
        conciergeText = null,
        action = null,
      } = {}
    ) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      setToast({
        message,
        type,
        showConcierge,
        conciergeText,
        action,
      });

      Animated.spring(anim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();

      timerRef.current = setTimeout(() => {
        dismiss();
      }, duration);
    },
    [anim, dismiss]
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleConcierge = (msg, customText) => {
    const isArabic = /[\u0600-\u06FF]/.test(msg || '');
    const text =
      customText ||
      (isArabic
        ? `مرحباً ستيد ماركت، أود الاستفسار من الوسيط أو الدعم بخصوص: "${msg}"`
        : `Hello SteedMarket Concierge, I need assistance regarding: "${msg}"`);
    try {
      const res = Linking.openURL(
        `https://wa.me/971500000000?text=${encodeURIComponent(text)}`
      );
      if (res && typeof res.catch === 'function') {
        res.catch(() => {});
      }
    } catch (e) {}
  };

  const topInset = Math.max(insets.top + 8, 48);
  const currentTheme = toast ? TOAST_THEMES[toast.type] || TOAST_THEMES.info : TOAST_THEMES.info;
  const isArabicMsg = toast?.message ? /[\u0600-\u06FF]/.test(toast.message) : false;

  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}
      {toast ? (
        <Animated.View
          testID="toast-container"
          pointerEvents="box-none"
          style={[
            styles.container,
            { top: topInset },
            {
              transform: [
                {
                  translateY: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-80, 0],
                  }),
                },
              ],
              opacity: anim,
            },
          ]}
        >
          <TouchableOpacity
            testID="toast-dismiss-btn"
            activeOpacity={0.9}
            onPress={dismiss}
            style={[
              styles.toast,
              {
                backgroundColor: currentTheme.bg,
                borderColor: currentTheme.border,
              },
              isArabicMsg && styles.toastRTL,
            ]}
          >
            <View style={[styles.leftGroup, isArabicMsg && styles.rowRTL]}>
              <View
                testID="toast-pulse-dot"
                style={[
                  styles.pulseDot,
                  { backgroundColor: currentTheme.pulseColor },
                ]}
              />
              <Ionicons
                name={currentTheme.icon}
                size={20}
                color={currentTheme.iconColor}
                style={isArabicMsg ? styles.iconRTL : styles.icon}
              />
            </View>

            <Text
              testID="toast-message"
              style={[styles.text, isArabicMsg && styles.textRTL]}
              numberOfLines={3}
            >
              {toast.message}
            </Text>

            {/* Optional Custom Action */}
            {toast.action && (
              <TouchableOpacity
                testID="toast-action-btn"
                style={styles.actionBtn}
                onPress={() => {
                  toast.action.onPress?.();
                  dismiss();
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.actionBtnText}>{toast.action.label}</Text>
              </TouchableOpacity>
            )}

            {/* Optional 1-Tap WhatsApp Concierge CTA */}
            {toast.showConcierge && (
              <TouchableOpacity
                testID="toast-concierge-btn"
                style={[styles.conciergeBtn, isArabicMsg && styles.rowRTL]}
                onPress={() => handleConcierge(toast.message, toast.conciergeText)}
                activeOpacity={0.8}
              >
                <Ionicons name="logo-whatsapp" size={13} color="#25D366" />
                <Text style={styles.conciergeBtnText}>
                  {isArabicMsg ? 'الوسيط' : 'Concierge'}
                </Text>
              </TouchableOpacity>
            )}

            <Ionicons
              name="close"
              size={16}
              color="rgba(255,255,255,0.7)"
              style={isArabicMsg ? styles.closeIconRTL : styles.closeIcon}
            />
          </TouchableOpacity>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: SPACING.md,
    right: SPACING.md,
    alignItems: 'center',
    zIndex: 99999,
    elevation: 99999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    minWidth: 200,
    maxWidth: '100%',
    gap: SPACING.xs + 2,
    ...SHADOWS.card,
  },
  toastRTL: {
    flexDirection: 'row-reverse',
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  icon: {
    marginRight: 2,
  },
  iconRTL: {
    marginLeft: 2,
  },
  text: {
    ...FONTS.bodySmall,
    color: COLORS.white,
    fontWeight: '700',
    flex: 1,
    lineHeight: 18,
  },
  textRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  actionBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  actionBtnText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
  },
  conciergeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  conciergeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1B5E20',
  },
  closeIcon: {
    marginLeft: 2,
  },
  closeIconRTL: {
    marginRight: 2,
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
});
