import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  adminGetPendingEquipment,
  adminGetRejectedEquipment,
  adminApproveEquipment,
  adminRejectEquipment,
  adminGetPendingRiderGear,
  adminGetRejectedRiderGear,
  adminApproveRiderGear,
  adminRejectRiderGear,
  adminGetPendingServices,
  adminGetRejectedServices,
  adminApproveService,
  adminRejectService,
} from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

export default function AdminModerationDashboardScreen({ navigation, route }) {
  const initialTabParam = route?.params?.initialTab;
  const [activeTab, setActiveTab] = useState(initialTabParam || 'equipment'); // equipment, rider_gear, services
  const [statusFilter, setStatusFilter] = useState('pending_review'); // 'pending_review' or 'rejected'
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [counts, setCounts] = useState({ equipment: 0, rider_gear: 0, services: 0 });
  const [rejectedCounts, setRejectedCounts] = useState({ equipment: 0, rider_gear: 0, services: 0 });

  // Rejection Modal State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingItem, setRejectingItem] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  const { language: currentLanguage, t, isRTL } = useLanguage();
  const isArabic = currentLanguage === 'ar';

  useEffect(() => {
    if (route?.params?.initialTab) {
      setActiveTab(route.params.initialTab);
    }
  }, [route?.params?.initialTab]);

  const fetchCounts = useCallback(async () => {
    try {
      const [eqPen, rgPen, svPen, eqRej, rgRej, svRej] = await Promise.all([
        adminGetPendingEquipment(0, 1),
        adminGetPendingRiderGear(0, 1),
        adminGetPendingServices(0, 1),
        adminGetRejectedEquipment(0, 1),
        adminGetRejectedRiderGear(0, 1),
        adminGetRejectedServices(0, 1),
      ]);
      setCounts({
        equipment: eqPen.data?.total || eqPen.data?.items?.length || 0,
        rider_gear: rgPen.data?.total || rgPen.data?.items?.length || 0,
        services: svPen.data?.total || svPen.data?.items?.length || 0,
      });
      setRejectedCounts({
        equipment: eqRej.data?.total || eqRej.data?.items?.length || 0,
        rider_gear: rgRej.data?.total || rgRej.data?.items?.length || 0,
        services: svRej.data?.total || svRej.data?.items?.length || 0,
      });
    } catch (e) {
      // ignore
    }
  }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      let res;
      if (statusFilter === 'rejected') {
        if (activeTab === 'equipment') {
          res = await adminGetRejectedEquipment();
        } else if (activeTab === 'rider_gear') {
          res = await adminGetRejectedRiderGear();
        } else {
          res = await adminGetRejectedServices();
        }
      } else {
        if (activeTab === 'equipment') {
          res = await adminGetPendingEquipment();
        } else if (activeTab === 'rider_gear') {
          res = await adminGetPendingRiderGear();
        } else {
          res = await adminGetPendingServices();
        }
      }
      setItems(res.data?.items || []);
    } catch (error) {
      console.warn('[AdminModerationDashboard] Fetch error:', error);
      Alert.alert(t('error'), isArabic ? 'فشل تحميل الإعلانات.' : 'Failed to fetch items.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, statusFilter]);

  useEffect(() => {
    fetchItems();
    fetchCounts();
  }, [activeTab, statusFilter]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchItems();
    fetchCounts();
  };

  const handleApprove = async (item) => {
    Alert.alert(
      isArabic ? 'تأكيد القبول' : 'Confirm Approval',
      isArabic ? `هل أنت تأكد من قبول إعلان "${item.title}"؟` : `Approve listing "${item.title}"?`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: isArabic ? 'قبول' : 'Approve',
          onPress: async () => {
            setSubmittingAction(true);
            try {
              if (activeTab === 'equipment') {
                await adminApproveEquipment(item.id);
              } else if (activeTab === 'rider_gear') {
                await adminApproveRiderGear(item.id);
              } else {
                await adminApproveService(item.id);
              }
              Alert.alert(t('success'), isArabic ? 'تم قبول الإعلان بنجاح.' : 'Listing approved successfully.');
              fetchItems();
              fetchCounts();
            } catch (err) {
              Alert.alert(t('error'), isArabic ? 'فشل قبول الإعلان.' : 'Failed to approve listing.');
            } finally {
              setSubmittingAction(false);
            }
          },
        },
      ]
    );
  };

  const handleOpenRejectModal = (item) => {
    setRejectingItem(item);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectReason.trim()) {
      Alert.alert(t('error'), isArabic ? 'يرجى كتابة سبب الرفض.' : 'Please provide a rejection reason.');
      return;
    }

    setSubmittingAction(true);
    try {
      if (activeTab === 'equipment') {
        await adminRejectEquipment(rejectingItem.id, rejectReason.trim());
      } else if (activeTab === 'rider_gear') {
        await adminRejectRiderGear(rejectingItem.id, rejectReason.trim());
      } else {
        await adminRejectService(rejectingItem.id, rejectReason.trim());
      }
      setShowRejectModal(false);
      Alert.alert(t('success'), isArabic ? 'تم رفض الإعلان بنجاح.' : 'Listing rejected successfully.');
      fetchItems();
      fetchCounts();
    } catch (err) {
      Alert.alert(t('error'), isArabic ? 'فشل رفض الإعلان.' : 'Failed to reject listing.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const renderPendingCard = ({ item }) => {
    const mainImage = item.images?.[0]?.image_url || 'https://via.placeholder.com/300x200?text=Listing';
    const categoryName = isArabic ? item.category?.name_ar : item.category?.name_en;
    const isRejected = item.status === 'rejected';

    return (
      <View style={styles.card}>
        <Image source={{ uri: mainImage }} style={styles.cardImage} resizeMode="cover" />

        <View style={styles.cardBody}>
          <View style={styles.badgeRow}>
            {categoryName && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{categoryName}</Text>
              </View>
            )}
            {isRejected ? (
              <View style={styles.rejectedBadge}>
                <Text style={styles.rejectedBadgeText}>{isArabic ? 'مرفوض' : 'Rejected'}</Text>
              </View>
            ) : (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>{isArabic ? 'قيد المراجعة' : 'Pending Review'}</Text>
              </View>
            )}
          </View>

          <Text style={styles.cardTitle}>{item.title}</Text>

          <Text style={styles.cardPrice}>
            {item.price ? `${item.price.toLocaleString()} AED` : 'POA'}
          </Text>

          {item.location_text && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color="#64748b" />
              <Text style={styles.locationText}>{item.location_text}</Text>
            </View>
          )}

          {item.description && (
            <Text style={styles.descriptionText} numberOfLines={2}>
              {item.description}
            </Text>
          )}

          {/* Rejection Reason Notice */}
          {isRejected && item.rejection_reason && (
            <View style={styles.rejectionReasonBox}>
              <View style={[styles.rejectionReasonHeader, isRTL && styles.rowRTL]}>
                <Ionicons name="alert-circle" size={16} color="#dc2626" />
                <Text style={styles.rejectionReasonTitle}>
                  {isArabic ? 'سبب الرفض:' : 'Rejection Reason:'}
                </Text>
              </View>
              <Text style={styles.rejectionReasonContent}>{item.rejection_reason}</Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={[styles.actionRow, isRTL && styles.rowRTL]}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.approveBtn]}
              disabled={submittingAction}
              onPress={() => handleApprove(item)}
            >
              <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
              <Text style={styles.actionBtnText}>
                {isRejected
                  ? (isArabic ? 'إلغاء الرفض وقبول' : 'Approve Listing')
                  : (isArabic ? 'قبول' : 'Approve')}
              </Text>
            </TouchableOpacity>

            {!isRejected && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.rejectBtn]}
                disabled={submittingAction}
                onPress={() => handleOpenRejectModal(item)}
              >
                <Ionicons name="close-circle" size={18} color="#ffffff" />
                <Text style={styles.actionBtnText}>{isArabic ? 'رفض' : 'Reject'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isArabic ? 'لوحة مراجعة الإعلانات' : 'Moderation Dashboard'}</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'equipment' && styles.activeTab]}
          onPress={() => setActiveTab('equipment')}
        >
          <Text style={[styles.tabText, activeTab === 'equipment' && styles.activeTabText]}>
            {isArabic ? 'مستلزمات الخيل' : 'Equipment'}
            {counts.equipment > 0 ? ` (${counts.equipment})` : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'rider_gear' && styles.activeTab]}
          onPress={() => setActiveTab('rider_gear')}
        >
          <Text style={[styles.tabText, activeTab === 'rider_gear' && styles.activeTabText]}>
            {isArabic ? 'مستلزمات الفارس' : 'Rider Gear'}
            {counts.rider_gear > 0 ? ` (${counts.rider_gear})` : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'services' && styles.activeTab]}
          onPress={() => setActiveTab('services')}
        >
          <Text style={[styles.tabText, activeTab === 'services' && styles.activeTabText]}>
            {isArabic ? 'الخدمات' : 'Services'}
            {counts.services > 0 ? ` (${counts.services})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Status Filter: Pending Review vs Rejected */}
      <View style={[styles.statusFilterRow, isRTL && styles.rowRTL]}>
        <TouchableOpacity
          style={[
            styles.statusFilterBtn,
            statusFilter === 'pending_review' && styles.statusFilterBtnActive,
          ]}
          onPress={() => setStatusFilter('pending_review')}
        >
          <Text
            style={[
              styles.statusFilterText,
              statusFilter === 'pending_review' && styles.statusFilterTextActive,
            ]}
          >
            ⏳ {isArabic ? 'بانتظار المراجعة' : 'Pending Review'}
            {counts[activeTab] > 0 ? ` (${counts[activeTab]})` : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.statusFilterBtn,
            statusFilter === 'rejected' && styles.statusFilterBtnActiveRejected,
          ]}
          onPress={() => setStatusFilter('rejected')}
        >
          <Text
            style={[
              styles.statusFilterText,
              statusFilter === 'rejected' && styles.statusFilterTextActiveRejected,
            ]}
          >
            ❌ {isArabic ? 'المرفوضة' : 'Rejected'}
            {rejectedCounts[activeTab] > 0 ? ` (${rejectedCounts[activeTab]})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderPendingCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#2563eb']} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name={statusFilter === 'rejected' ? 'checkmark-circle-outline' : 'checkmark-done-circle-outline'}
                size={54}
                color={statusFilter === 'rejected' ? '#64748b' : '#16a34a'}
              />
              <Text style={styles.emptyTitle}>
                {statusFilter === 'rejected'
                  ? (isArabic ? 'لا توجد إعلانات مرفوضة' : 'No rejected items')
                  : (isArabic ? 'لا توجد إعلانات بانتظار المراجعة' : 'No pending items to review')}
              </Text>
              <Text style={styles.emptySubtitle}>
                {statusFilter === 'rejected'
                  ? (isArabic ? 'لم يتم رفض أي إعلان في هذا القسم.' : 'No items have been rejected in this section.')
                  : (isArabic ? 'تمت مراجعة كافة الإعلانات في هذا القسم.' : 'All items in this section have been reviewed.')}
              </Text>
            </View>
          }
        />
      )}

      {/* Rejection Modal */}
      <Modal visible={showRejectModal} animationType="fade" transparent>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={[styles.modalOverlay, { justifyContent: 'flex-end' }]}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>{isArabic ? 'رفض الإعلان' : 'Reject Listing'}</Text>
              <Text style={styles.modalSubTitle}>
                {rejectingItem?.title}
              </Text>

              <Text style={styles.modalLabel}>{isArabic ? 'سبب الرفض *' : 'Rejection Reason *'}</Text>
              <TextInput
                style={[styles.modalInput, { textAlign: isArabic ? 'right' : 'left' }]}
                placeholder={isArabic ? 'مثال: معلومات ناقصة أو صور غير واضحة...' : 'e.g. Incomplete description or invalid images...'}
                multiline
                numberOfLines={3}
                value={rejectReason}
                onChangeText={setRejectReason}
                placeholderTextColor="#94a3b8"
              />

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalCancelBtn]}
                  onPress={() => setShowRejectModal(false)}
                >
                  <Text style={styles.modalCancelText}>{t('cancel')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalRejectBtn]}
                  disabled={submittingAction}
                  onPress={handleConfirmReject}
                >
                  {submittingAction ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.modalRejectText}>{isArabic ? 'تأكيد الرفض' : 'Confirm Rejection'}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    marginHorizontal: 3,
  },
  activeTab: {
    backgroundColor: '#2563eb',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  activeTabText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
  },
  cardImage: {
    width: '100%',
    height: 160,
    backgroundColor: '#e2e8f0',
  },
  cardBody: {
    padding: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  categoryBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
  },
  pendingBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400e',
  },
  rejectedBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rejectedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#b91c1c',
  },
  statusFilterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  statusFilterBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusFilterBtnActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  statusFilterBtnActiveRejected: {
    backgroundColor: '#fef2f2',
    borderColor: '#dc2626',
  },
  statusFilterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  statusFilterTextActive: {
    color: '#2563eb',
    fontWeight: '700',
  },
  statusFilterTextActiveRejected: {
    color: '#dc2626',
    fontWeight: '700',
  },
  rejectionReasonBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    marginBottom: 8,
  },
  rejectionReasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  rejectionReasonTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#dc2626',
  },
  rejectionReasonContent: {
    fontSize: 13,
    color: '#7f1d1d',
    lineHeight: 18,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  cardPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2563eb',
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  locationText: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 4,
  },
  descriptionText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    marginHorizontal: 4,
  },
  approveBtn: {
    backgroundColor: '#16a34a',
  },
  rejectBtn: {
    backgroundColor: '#dc2626',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    marginLeft: 6,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#16a34a',
    marginTop: 14,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 6,
  },
  modalOverlay: {
    flexGrow: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#dc2626',
    marginBottom: 4,
  },
  modalSubTitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
    height: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginLeft: 8,
  },
  modalCancelBtn: {
    backgroundColor: '#f1f5f9',
  },
  modalRejectBtn: {
    backgroundColor: '#dc2626',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  modalRejectText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
