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
  adminApproveEquipment,
  adminRejectEquipment,
  adminGetPendingRiderGear,
  adminApproveRiderGear,
  adminRejectRiderGear,
  adminGetPendingServices,
  adminApproveService,
  adminRejectService,
} from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

export default function AdminModerationDashboardScreen({ navigation, route }) {
  const [activeTab, setActiveTab] = useState('equipment'); // equipment, rider_gear, services
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Rejection Modal State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingItem, setRejectingItem] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  const { language: currentLanguage, t, isRTL } = useLanguage();
  const isArabic = currentLanguage === 'ar';

  const fetchPendingItems = useCallback(async () => {
    setLoading(true);
    try {
      let res;
      if (activeTab === 'equipment') {
        res = await adminGetPendingEquipment();
      } else if (activeTab === 'rider_gear') {
        res = await adminGetPendingRiderGear();
      } else {
        res = await adminGetPendingServices();
      }
      setItems(res.data?.items || []);
    } catch (error) {
      console.warn('[AdminModerationDashboard] Fetch error:', error);
      Alert.alert(t('error'), isArabic ? 'فشل تحميل الإعلانات المعلقة.' : 'Failed to fetch pending items.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchPendingItems();
  }, [activeTab]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPendingItems();
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
              fetchPendingItems();
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
      fetchPendingItems();
    } catch (err) {
      Alert.alert(t('error'), isArabic ? 'فشل رفض الإعلان.' : 'Failed to reject listing.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const renderPendingCard = ({ item }) => {
    const mainImage = item.images?.[0]?.image_url || 'https://via.placeholder.com/300x200?text=Pending+Item';
    const categoryName = isArabic ? item.category?.name_ar : item.category?.name_en;

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
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>{isArabic ? 'قيد المراجعة' : 'Pending Review'}</Text>
            </View>
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

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.approveBtn]}
              disabled={submittingAction}
              onPress={() => handleApprove(item)}
            >
              <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
              <Text style={styles.actionBtnText}>{isArabic ? 'قبول' : 'Approve'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn]}
              disabled={submittingAction}
              onPress={() => handleOpenRejectModal(item)}
            >
              <Ionicons name="close-circle" size={18} color="#ffffff" />
              <Text style={styles.actionBtnText}>{isArabic ? 'رفض' : 'Reject'}</Text>
            </TouchableOpacity>
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
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
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
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'rider_gear' && styles.activeTab]}
          onPress={() => setActiveTab('rider_gear')}
        >
          <Text style={[styles.tabText, activeTab === 'rider_gear' && styles.activeTabText]}>
            {isArabic ? 'مستلزمات الفارس' : 'Rider Gear'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'services' && styles.activeTab]}
          onPress={() => setActiveTab('services')}
        >
          <Text style={[styles.tabText, activeTab === 'services' && styles.activeTabText]}>
            {isArabic ? 'الخدمات' : 'Services'}
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
              <Ionicons name="checkmark-done-circle-outline" size={54} color="#16a34a" />
              <Text style={styles.emptyTitle}>
                {isArabic ? 'لا توجد إعلانات بانتظار المراجعة' : 'No pending items to review'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {isArabic ? 'تمت مراجعة كافة الإعلانات في هذا القسم.' : 'All items in this section have been reviewed.'}
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
