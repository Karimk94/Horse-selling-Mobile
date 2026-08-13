import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../config/theme';

const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

export default function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const [anim] = useState(new Animated.Value(0));

  const show = useCallback((message, { type = 'info', duration = 3000 } = {}) => {
    setToast({ message, type });
    Animated.timing(anim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    const hideTimeout = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        setToast(null);
      });
    }, duration);
    return () => clearTimeout(hideTimeout);
  }, [anim]);

  useEffect(() => () => setToast(null), []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.container,
            { transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-100, 0] }) }] },
          ]}
        >
          <View style={[styles.toast, toast.type === 'success' ? styles.success : toast.type === 'error' ? styles.error : styles.info]}>
            <Text style={styles.text}>{toast.message}</Text>
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 60,
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  toast: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    minWidth: 120,
    maxWidth: '95%',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  text: {
    ...FONTS.body,
    color: '#fff',
  },
  success: { backgroundColor: '#2E7D32' },
  error: { backgroundColor: '#B00020' },
  info: { backgroundColor: '#333' },
});
