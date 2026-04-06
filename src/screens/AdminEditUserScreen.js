import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../config/theme';
import { useLanguage } from '../contexts/LanguageContext';
import * as apiService from '../services/api';
import { extractApiErrorMessage } from '../utils/apiErrors';

const ROLE_OPTIONS = ['buyer', 'seller', 'both', 'admin'];

export default function AdminEditUserScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { t, isRTL } = useLanguage();
  const { user } = route.params;

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    first_name: user?.profile?.first_name || '',
    last_name: user?.profile?.last_name || '',
    phone_number: user?.profile?.phone_number || '',
    location: user?.profile?.location || '',
    role: user?.role || 'buyer',
    is_verified: !!user?.is_verified,
  });

  const update = (key, value) => {
    setForm((p) => ({ ...p, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const toggleVerified = () => {
    if (user?.role === 'admin' && form.is_verified) {
      Alert.alert(t('error'), t('adminCannotUnverifyAdmin'));
      return;
    }
    update('is_verified', !form.is_verified);
  };

  const save = async () => {
    const next = {};
    if (form.first_name.trim() && form.first_name.trim().length < 2) {
      next.first_name = t('adminInvalidName');
    }
    if (form.last_name.trim() && form.last_name.trim().length < 2) {
      next.last_name = t('adminInvalidName');
    }
    if (form.phone_number.trim()) {
      const validPhone = /^[0-9+()\-\s]{7,20}$/.test(form.phone_number.trim());
      if (!validPhone) next.phone_number = t('adminInvalidPhone');
    }
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }

    setSaving(true);
    try {
      await apiService.adminUpdateUser(user.id, {
        first_name: form.first_name.trim() || null,
        last_name: form.last_name.trim() || null,
        phone_number: form.phone_number.trim() || null,
        location: form.location.trim() || null,
        role: form.role,
        is_verified: form.is_verified,
      });
      Alert.alert(t('success'), t('adminUserUpdated'), [
        { text: t('ok'), onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert(t('error'), extractApiErrorMessage(err, t('adminActionFailed')));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <View style={[styles.header, isRTL && styles.rowRTL]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isRTL && styles.textRTL]}>{t('adminEditUser')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.email, isRTL && styles.textRTL]}>{user.email}</Text>

        <View style={styles.field}>
          <Text style={[styles.label, isRTL && styles.textRTL]}>{t('firstNameLabel')}</Text>
          <TextInput
            style={[styles.input, errors.first_name && styles.inputError, isRTL && styles.inputRTL]}
            value={form.first_name}
            onChangeText={(v) => update('first_name', v)}
            placeholder={t('firstName')}
            placeholderTextColor={COLORS.textLight}
            textAlign={isRTL ? 'right' : 'left'}
          />
          {errors.first_name && <Text style={[styles.errorText, isRTL && styles.textRTL]}>{errors.first_name}</Text>}
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, isRTL && styles.textRTL]}>{t('lastNameLabel')}</Text>
          <TextInput
            style={[styles.input, errors.last_name && styles.inputError, isRTL && styles.inputRTL]}
            value={form.last_name}
            onChangeText={(v) => update('last_name', v)}
            placeholder={t('lastName')}
            placeholderTextColor={COLORS.textLight}
            textAlign={isRTL ? 'right' : 'left'}
          />
          {errors.last_name && <Text style={[styles.errorText, isRTL && styles.textRTL]}>{errors.last_name}</Text>}
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, isRTL && styles.textRTL]}>{t('phoneLabel')}</Text>
          <TextInput
            style={[styles.input, errors.phone_number && styles.inputError, isRTL && styles.inputRTL]}
            value={form.phone_number}
            onChangeText={(v) => update('phone_number', v)}
            placeholder={t('phoneNumber')}
            placeholderTextColor={COLORS.textLight}
            keyboardType="phone-pad"
            textAlign={isRTL ? 'right' : 'left'}
          />
          {errors.phone_number && <Text style={[styles.errorText, isRTL && styles.textRTL]}>{errors.phone_number}</Text>}
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, isRTL && styles.textRTL]}>{t('locationLabel')}</Text>
          <TextInput
            style={[styles.input, isRTL && styles.inputRTL]}
            value={form.location}
            onChangeText={(v) => update('location', v)}
            placeholder={t('location')}
            placeholderTextColor={COLORS.textLight}
            textAlign={isRTL ? 'right' : 'left'}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, isRTL && styles.textRTL]}>{t('adminRole')}</Text>
          <View style={[styles.roleRow, isRTL && styles.rowRTL]}>
            {ROLE_OPTIONS.map((role) => (
              <TouchableOpacity
                key={role}
                style={[styles.roleChip, form.role === role && styles.roleChipActive]}
                onPress={() => update('role', role)}
              >
                <Text style={[styles.roleChipText, form.role === role && styles.roleChipTextActive]}>{role}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <TouchableOpacity style={[styles.verifyToggle, isRTL && styles.rowRTL]} onPress={toggleVerified}>
            <Ionicons
              name={form.is_verified ? 'checkmark-circle' : 'ellipse-outline'}
              size={20}
              color={form.is_verified ? COLORS.success : COLORS.textLight}
            />
            <Text style={[styles.verifyToggleText, isRTL && styles.textRTL]}>
              {form.is_verified ? t('adminMarkUnverified') : t('adminMarkVerified')}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.saveBtnText}>{t('save')}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.soft,
  },
  headerTitle: { ...FONTS.h2, color: COLORS.primary },
  content: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  email: { ...FONTS.bodySmall, color: COLORS.textSecondary, marginBottom: SPACING.md },
  field: { marginBottom: SPACING.md },
  label: { ...FONTS.caption, color: COLORS.textSecondary, marginBottom: SPACING.xs },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    ...FONTS.body,
    color: COLORS.text,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    ...FONTS.caption,
    color: COLORS.error,
    marginTop: SPACING.xs,
  },
  roleRow: { flexDirection: 'row', gap: SPACING.xs, flexWrap: 'wrap' },
  roleChip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.inputBg,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  roleChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight + '20' },
  roleChipText: { ...FONTS.caption, color: COLORS.textSecondary, fontWeight: '700' },
  roleChipTextActive: { color: COLORS.primary },
  verifyToggle: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  verifyToggleText: { ...FONTS.bodySmall, color: COLORS.text },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    marginTop: SPACING.sm,
  },
  saveBtnText: { ...FONTS.button, color: COLORS.white },
  rowRTL: { flexDirection: 'row-reverse' },
  textRTL: { textAlign: 'right', writingDirection: 'rtl' },
  inputRTL: { textAlign: 'right', writingDirection: 'rtl' },
});
