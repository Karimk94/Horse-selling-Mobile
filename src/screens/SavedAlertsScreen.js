import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../config/theme';
import { useLanguage } from '../contexts/LanguageContext';
import * as apiService from '../services/api';
import { extractApiErrorMessage } from '../utils/apiErrors';
import { useToast } from '../components/ToastProvider';

export default function SavedAlertsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { t, isRTL } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [inbox, setInbox] = useState([]);
  const [form, setForm] = useState({
    name: '',
    breed: '',
    min_price: '',
    max_price: '',
    discipline: '',
    vet_check_available: false,
    verified_seller: false,
  });
  const [errors, setErrors] = useState({});
  const toast = useToast();

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const [savedRes, inboxRes] = await Promise.all([
        apiService.getSavedSearches(),
        apiService.getSavedSearchAlerts(),
      ]);
      setAlerts(savedRes.data || []);
      setInbox(inboxRes.data || []);
    } catch (error) {
      toast.show(extractApiErrorMessage(error, t('savedAlertLoadFailed')), { type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      loadAlerts();
    }, [loadAlerts])
  );

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const createAlert = async () => {
    const next = {};
    if (!form.name.trim()) next.name = t('savedAlertNameRequired');
    // Validate numeric price inputs before sending to backend
    const minPriceRaw = form.min_price?.toString().trim();
    const maxPriceRaw = form.max_price?.toString().trim();
    let minPrice = null;
    let maxPrice = null;

    if (minPriceRaw) {
      const parsed = Number(minPriceRaw);
      if (!Number.isFinite(parsed) || parsed < 0) {
        next.min_price = t('adminInvalidPrice');
      }
      minPrice = parsed;
    }

    if (maxPriceRaw) {
      const parsed = Number(maxPriceRaw);
      if (!Number.isFinite(parsed) || parsed < 0) {
        next.max_price = t('adminInvalidPrice');
      }
      maxPrice = parsed;
    }
    if (minPrice != null && maxPrice != null && minPrice > maxPrice) {
      next.min_price = t('minMustBeLessOrEqualMax') || 'Min must be less than or equal to Max';
    }

    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }

    setSaving(true);
    try {
      await apiService.createSavedSearch({
        name: form.name.trim(),
        breed: form.breed.trim() || null,
        discipline: form.discipline.trim() || null,
        min_price: minPrice != null ? minPrice : null,
        max_price: maxPrice != null ? maxPrice : null,
        vet_check_available: form.vet_check_available || null,
        verified_seller: form.verified_seller || null,
      });

      setForm({
        name: '',
        breed: '',
        min_price: '',
        max_price: '',
        discipline: '',
        vet_check_available: false,
        verified_seller: false,
      });
      setErrors({});
      await loadAlerts();
        toast.show(t('savedAlertCreated'), { type: 'success' });
    } catch (error) {
      toast.show(extractApiErrorMessage(error, t('savedAlertCreateFailed')), { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const removeAlert = async (id) => {
    try {
      await apiService.deleteSavedSearch(id);
      await loadAlerts();
    } catch (error) {
      toast.show(extractApiErrorMessage(error, t('savedAlertDeleteFailed')), { type: 'error' });
    }
  };

  const markAlertRead = async (id) => {
    try {
      await apiService.markSavedSearchAlertRead(id);
      await loadAlerts();
    } catch (error) {
      toast.show(extractApiErrorMessage(error, t('savedAlertMarkReadFailed')), { type: 'error' });
    }
  };

  const openAlertHorse = async (item) => {
    try {
      if (!item.is_read) {
        await apiService.markSavedSearchAlertRead(item.id);
      }
      const res = await apiService.getHorse(item.horse_id);
      await loadAlerts();
      navigation.navigate('HorseDetail', { horse: res.data });
    } catch (error) {
      toast.show(extractApiErrorMessage(error, t('savedAlertOpenFailed')), { type: 'error' });
    }
  };

  const markAllRead = async () => {
    try {
      await apiService.markAllSavedSearchAlertsRead();
      await loadAlerts();
    } catch (error) {
      toast.show(extractApiErrorMessage(error, t('savedAlertMarkReadFailed')), { type: 'error' });
    }
  };

  const unreadCount = inbox.filter((item) => !item.is_read).length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={[styles.header, isRTL && styles.rowRTL]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={[styles.title, isRTL && styles.textRTL]}>{t('savedAlerts')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t('createSavedAlert')}</Text>

          <TextInput
            style={[styles.input, isRTL && styles.inputRTL]}
            placeholder={t('savedAlertName')}
            placeholderTextColor={COLORS.textLight}
            value={form.name}
            onChangeText={(v) => {
              updateForm('name', v);
              if (errors.name) setErrors((e) => { const n = { ...e }; delete n.name; return n; });
            }}
            textAlign={isRTL ? 'right' : 'left'}
          />
          {errors.name && <Text style={[styles.errorText, isRTL && styles.textRTL]}>{errors.name}</Text>}
          <TextInput
            style={[styles.input, isRTL && styles.inputRTL]}
            placeholder={t('breedFilterPlaceholder')}
            placeholderTextColor={COLORS.textLight}
            value={form.breed}
            onChangeText={(v) => updateForm('breed', v)}
            textAlign={isRTL ? 'right' : 'left'}
          />
          <TextInput
            style={[styles.input, isRTL && styles.inputRTL]}
            placeholder={t('disciplineFilterPlaceholder')}
            placeholderTextColor={COLORS.textLight}
            value={form.discipline}
            onChangeText={(v) => updateForm('discipline', v)}
            textAlign={isRTL ? 'right' : 'left'}
          />

          <View style={[styles.row, isRTL && styles.rowRTL]}>
            <TextInput
              style={[styles.input, styles.halfInput, isRTL && styles.inputRTL]}
              placeholder={t('min')}
              placeholderTextColor={COLORS.textLight}
              value={form.min_price}
              onChangeText={(v) => {
                updateForm('min_price', v);
                if (errors.min_price) setErrors((e) => { const n = { ...e }; delete n.min_price; return n; });
              }}
              keyboardType="numeric"
              textAlign={isRTL ? 'right' : 'left'}
            />
            <TextInput
              style={[styles.input, styles.halfInput, isRTL && styles.inputRTL]}
              placeholder={t('max')}
              placeholderTextColor={COLORS.textLight}
              value={form.max_price}
              onChangeText={(v) => {
                updateForm('max_price', v);
                if (errors.max_price) setErrors((e) => { const n = { ...e }; delete n.max_price; return n; });
              }}
              keyboardType="numeric"
              textAlign={isRTL ? 'right' : 'left'}
            />
          {(errors.min_price || errors.max_price) && (
            <Text style={[styles.errorText, isRTL && styles.textRTL]}>{errors.min_price || errors.max_price}</Text>
          )}
          </View>

          <View style={[styles.switchRow, isRTL && styles.rowRTL]}>
            <Text style={[styles.switchLabel, isRTL && styles.textRTL]}>{t('vetCheckedOnly')}</Text>
            <Switch
              value={form.vet_check_available}
              onValueChange={(v) => updateForm('vet_check_available', v)}
              trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
              thumbColor={form.vet_check_available ? COLORS.primary : COLORS.textLight}
            />
          </View>

          <View style={[styles.switchRow, isRTL && styles.rowRTL]}>
            <Text style={[styles.switchLabel, isRTL && styles.textRTL]}>{t('verifiedSellersOnly')}</Text>
            <Switch
              value={form.verified_seller}
              onValueChange={(v) => updateForm('verified_seller', v)}
              trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
              thumbColor={form.verified_seller ? COLORS.primary : COLORS.textLight}
            />
          </View>

          <TouchableOpacity style={styles.createBtn} onPress={createAlert} disabled={saving}>
            {saving ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.createBtnText}>{t('createAlert')}</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.inboxHeader}>
            <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t('alertsInbox')}</Text>
            {unreadCount > 0 && (
              <TouchableOpacity onPress={markAllRead}>
                <Text style={styles.markAllReadText}>{t('markAllRead')}</Text>
              </TouchableOpacity>
            )}
          </View>
          {loading ? (
            <ActivityIndicator style={{ marginTop: SPACING.md }} color={COLORS.primary} />
          ) : inbox.length === 0 ? (
            <Text style={[styles.emptyText, isRTL && styles.textRTL]}>{t('noInboxAlerts')}</Text>
          ) : (
            inbox.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.inboxItem, !item.is_read && styles.inboxItemUnread]}
                onPress={() => openAlertHorse(item)}
                activeOpacity={0.8}
              >
                <View style={styles.alertTextWrap}>
                  <Text style={[styles.alertName, isRTL && styles.textRTL]}>{item.title}</Text>
                  <Text style={[styles.alertMeta, isRTL && styles.textRTL]}>{item.message}</Text>
                </View>
                {!item.is_read && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t('mySavedAlerts')}</Text>
          {loading ? (
            <ActivityIndicator style={{ marginTop: SPACING.md }} color={COLORS.primary} />
          ) : alerts.length === 0 ? (
            <Text style={[styles.emptyText, isRTL && styles.textRTL]}>{t('noSavedAlerts')}</Text>
          ) : (
            alerts.map((alert) => (
              <View key={alert.id} style={styles.alertItem}>
                <View style={styles.alertTextWrap}>
                  <Text style={[styles.alertName, isRTL && styles.textRTL]}>{alert.name}</Text>
                  <Text style={[styles.alertMeta, isRTL && styles.textRTL]}>
                    {[alert.breed, alert.discipline].filter(Boolean).join(' • ') || t('anyHorse')}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => removeAlert(alert.id)}>
                  <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
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
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...FONTS.h2,
    color: COLORS.text,
    marginLeft: SPACING.sm,
  },
  content: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.card,
  },
  sectionTitle: {
    ...FONTS.h3,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  inboxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  markAllReadText: {
    ...FONTS.bodySmall,
    color: COLORS.primary,
    fontWeight: '700',
  },
  inboxItem: {
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
  },
  inboxItemUnread: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight + '10',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  input: {
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    color: COLORS.text,
    ...FONTS.body,
    marginTop: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  halfInput: {
    flex: 1,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  switchLabel: {
    ...FONTS.body,
    color: COLORS.text,
  },
  createBtn: {
    marginTop: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm + 2,
  },
  createBtnText: {
    ...FONTS.button,
    color: COLORS.white,
  },
  emptyText: {
    ...FONTS.body,
    color: COLORS.textSecondary,
  },
  alertItem: {
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  alertTextWrap: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  alertName: {
    ...FONTS.body,
    fontWeight: '700',
    color: COLORS.text,
  },
  alertMeta: {
    ...FONTS.bodySmall,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  textRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  inputRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
