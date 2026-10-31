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
  Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../config/theme';
import BrandMark from '../components/BrandMark';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../components/ToastProvider';
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

const QUICK_REASONS = [
  { key: 'incomplete', en: 'Incomplete description or details', ar: 'وصف وتفاصيل غير مكتملة' },
  { key: 'photos', en: 'Low photo quality or resolution', ar: 'جودة الصور ضعيفة أو غير واضحة' },
  { key: 'category', en: 'Incorrect category selected', ar: 'القسم المختار غير مناسب للمنتج' },
  { key: 'price', en: 'Unrealistic or non-compliant price', ar: 'السعر غير منطقي أو غير متوافق' },
  { key: 'specs', en: 'Missing essential specifications', ar: 'المواصفات الأساسية ناقصة' },
];

export default function AdminModerationDashboardScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
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
  const toast = useToast();

  const handleLeadModeratorInquiry = () => {
    const text = isArabic
      ? 'مرحباً، أود استشارة مشرف العمليات بخصوص مراجعة إعلان فروسية في المنصة.'
      : 'Hello SteedMarket Lead Moderator, I need to consult regarding an equestrian listing review.';
    try {
      const res = Linking.openURL(`https://wa.me/971500000000?text=${encodeURIComponent(text)}`);
      if (res && typeof res.catch === 'function') {
        res.catch(() => {});
      }
    } catch (e) {}
  };

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
      // ignore count fetch error
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
      const msg = isArabic ? 'فشل تحميل الإعلانات.' : 'Failed to fetch items.';
      toast?.show ? toast.show(msg, { type: 'error' }) : Alert.alert(t('error') || 'Error', msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, statusFilter, isArabic, t, toast]);

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
      isArabic
        ? `هل أنت متأكد من قبول إعلان "${item.title}" ونشره؟`
        : `Approve listing "${item.title}"?`,
      [
        { text: t('cancel') || 'Cancel', style: 'cancel' },
        {
          text: isArabic ? 'قبول ونشر' : 'Approve',
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
              const successMsg = isArabic
                ? 'تم قبول الإعلان ونشره بنجاح.'
                : 'Listing approved successfully.';
              toast?.show
                ? toast.show(successMsg, { type: 'success' })
                : Alert.alert(t('success') || 'Success', successMsg);
              fetchItems();
              fetchCounts();
            } catch (err) {
              const errMsg = isArabic ? 'فشل قبول الإعلان.' : 'Failed to approve listing.';
              toast?.show
                ? toast.show(errMsg, { type: 'error' })
                : Alert.alert(t('error') || 'Error', errMsg);
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
      const msg = isArabic ? 'يرجى كتابة سبب الرفض.' : 'Please provide a rejection reason.';
      toast?.show ? toast.show(msg, { type: 'error' }) : Alert.alert(t('error') || 'Error', msg);
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
      const successMsg = isArabic
        ? 'تم رفض الإعلان وإرسال الملاحظات للمعلن.'
        : 'Listing rejected successfully.';
      toast?.show
        ? toast.show(successMsg, { type: 'success' })
        : Alert.alert(t('success') || 'Success', successMsg);
      fetchItems();
      fetchCounts();
    } catch (err) {
      const errMsg = isArabic ? 'فشل رفض الإعلان.' : 'Failed to reject listing.';
      toast?.show
        ? toast.show(errMsg, { type: 'error' })
        : Alert.alert(t('error') || 'Error', errMsg);
    } finally {
      setSubmittingAction(false);
    }
  };

  const renderPendingCard = ({ item }) => {
    const mainImage = item.images?.[0]?.image_url;
    const categoryName = isArabic ? item.category?.name_ar : item.category?.name_en;
    const isRejected = item.status === 'rejected';

    return (
      <View style={styles.card}>
        {/* Card Media Header */}
        <View style={styles.imageWrap}>
          {mainImage ? (
            <Image source={{ uri: mainImage }} style={styles.cardImage} resizeMode="cover" />
          ) : (
            <View style={styles.imageFallback}>
              <Ionicons name="image-outline" size={36} color={COLORS.secondary} />
              <Text style={styles.imageFallbackText}>
                {isArabic ? 'لا توجد صورة' : 'No Photo Available'}
              </Text>
            </View>
          )}

          {/* Category Chip Badge */}
          {categoryName ? (
            <View style={[styles.categoryBadge, isRTL ? styles.badgeRight : styles.badgeLeft]}>
              <Text style={styles.categoryText}>{categoryName}</Text>
            </View>
          ) : null}

          {/* Status Badge */}
          <View style={[styles.statusBadge, isRTL ? styles.badgeLeft : styles.badgeRight]}>
            {isRejected ? (
              <View style={[styles.badgePill, styles.badgePillRejected]}>
                <Ionicons name="close-circle" size={12} color={COLORS.error} />
                <Text style={styles.rejectedBadgeText}>
                  {isArabic ? 'مرفوض' : 'Rejected'}
                </Text>
              </View>
            ) : (
              <View style={[styles.badgePill, styles.badgePillPending]}>
                <Ionicons name="time" size={12} color={COLORS.warning} />
                <Text style={styles.pendingBadgeText}>
                  {isArabic ? 'قيد المراجعة' : 'Pending Review'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Card Body */}
        <View style={styles.cardBody}>
          <Text style={[styles.cardTitle, isRTL && styles.textRTL]}>{item.title}</Text>

          {/* Price */}
          <Text style={[styles.cardPrice, isRTL && styles.textRTL]}>
            {item.price ? `${item.price.toLocaleString()} AED` : 'POA'}
          </Text>

          {/* Location */}
          {item.location_text ? (
            <View style={[styles.locationRow, isRTL && styles.rowRTL]}>
              <Ionicons name="location-outline" size={14} color={COLORS.primary} />
              <Text style={[styles.locationText, isRTL && styles.textRTL]}>
                {item.location_text}
              </Text>
            </View>
          ) : null}

          {/* Description */}
          {item.description ? (
            <Text
              style={[styles.descriptionText, isRTL && styles.textRTL]}
              numberOfLines={3}
            >
              {item.description}
            </Text>
          ) : null}

          {/* Rejection Reason Notice */}
          {isRejected && item.rejection_reason ? (
            <View style={styles.rejectionReasonBox}>
              <View style={[styles.rejectionReasonHeader, isRTL && styles.rowRTL]}>
                <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                <Text style={styles.rejectionReasonTitle}>
                  {isArabic ? 'سبب الرفض المسجل:' : 'Rejection Feedback:'}
                </Text>
              </View>
              <Text style={[styles.rejectionReasonContent, isRTL && styles.textRTL]}>
                {item.rejection_reason}
              </Text>
            </View>
          ) : null}

          {/* Action Buttons */}
          <View style={[styles.actionRow, isRTL && styles.rowRTL]}>
            <TouchableOpacity
              testID={`admin-approve-button-${item.id}`}
              style={[styles.actionBtn, styles.approveBtn]}
              disabled={submittingAction}
              onPress={() => handleApprove(item)}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-circle" size={17} color={COLORS.white} />
              <Text style={styles.actionBtnText}>
                {isRejected
                  ? isArabic ? 'إلغاء الرفض وقبول' : 'Approve Listing'
                  : isArabic ? 'قبول ونشر' : 'Approve'}
              </Text>
            </TouchableOpacity>

            {!isRejected && (
              <TouchableOpacity
                testID={`admin-reject-button-${item.id}`}
                style={[styles.actionBtn, styles.rejectBtn]}
                disabled={submittingAction}
                onPress={() => handleOpenRejectModal(item)}
                activeOpacity={0.85}
              >
                <Ionicons name="close-circle" size={17} color={COLORS.white} />
                <Text style={styles.actionBtnText}>
                  {isArabic ? 'رفض وملاحظات' : 'Reject'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderListHeader = () => (
    <View testID="moderation-standards-shield" style={styles.shieldCard}>
      <View style={[styles.shieldHeader, isRTL && styles.rowRTL]}>
        <View style={styles.shieldIconWrap}>
          <Ionicons name="shield-checkmark" size={18} color={COLORS.accentDark} />
        </View>
        <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
          <View style={[styles.shieldBadgeRow, isRTL && styles.rowRTL]}>
            <View style={styles.shieldPulseDot} />
            <Text style={styles.shieldBadgeText}>
              {isArabic ? 'معايير الجودة والرقابة الخليجية' : 'VIP ACCREDITATION & QUALITY ASSURANCE'}
            </Text>
          </View>
          <Text style={[styles.shieldTitle, isRTL && styles.textRTL]}>
            {isArabic ? 'ميثاق فحص واعتماد إعلانات الفروسية' : 'Equestrian Listing Quality & Compliance Charter'}
          </Text>
          <Text style={[styles.shieldDesc, isRTL && styles.textRTL]}>
            {isArabic
              ? 'تدقيق صارم لمواصفات السلع، أسعار السوق العادلة، وشهادات مزودي الخدمات المعتمدين في الإمارات والخليج'
              : 'Strict verification of equine gear specifications, fair pricing adherence, and certified GCC service credentials'}
          </Text>
        </View>
      </View>

      {/* 3 Quality & Compliance Pillars */}
      <View style={styles.shieldPillars}>
        <View style={[styles.shieldPillarItem, isRTL && styles.rowRTL]}>
          <View style={styles.shieldPillarIcon}>
            <Ionicons name="ribbon" size={13} color={COLORS.accentDark} />
          </View>
          <Text style={[styles.shieldPillarText, isRTL && styles.textRTL]}>
            {isArabic ? 'التحقق من الرخص والشهادات المعتمدة' : 'Official Accreditation & Licensure Vetting'}
          </Text>
        </View>
        <View style={[styles.shieldPillarItem, isRTL && styles.rowRTL]}>
          <View style={styles.shieldPillarIcon}>
            <Ionicons name="camera" size={13} color={COLORS.accentDark} />
          </View>
          <Text style={[styles.shieldPillarText, isRTL && styles.textRTL]}>
            {isArabic ? 'صور واضحة وإثبات ملكية موثق' : 'High-Res Media & Authenticity Proof'}
          </Text>
        </View>
        <View style={[styles.shieldPillarItem, isRTL && styles.rowRTL]}>
          <View style={styles.shieldPillarIcon}>
            <Ionicons name="shield" size={13} color={COLORS.accentDark} />
          </View>
          <Text style={[styles.shieldPillarText, isRTL && styles.textRTL]}>
            {isArabic ? 'حماية المشترين ومكافحة التلاعب بالأسعار' : 'Buyer Protection & Anti-Fraud Pricing'}
          </Text>
        </View>
      </View>

      {/* 1-Tap WhatsApp Lead Moderator Escalation button */}
      <TouchableOpacity
        testID="moderation-escalation-concierge-btn"
        style={[styles.shieldConciergeBtn, isRTL && styles.rowRTL]}
        onPress={handleLeadModeratorInquiry}
        activeOpacity={0.85}
      >
        <Ionicons name="logo-whatsapp" size={15} color="#25D366" />
        <Text style={styles.shieldConciergeBtnText}>
          {isArabic ? 'تصعيد استفسار أو مخالفة لمشرف العمليات' : 'Escalate to Lead Operations Moderator'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Flagship Header */}
      <View style={[styles.header, isRTL && styles.rowRTL]}>
        <View style={[styles.headerLeft, isRTL && styles.rowRTL]}>
          <TouchableOpacity
            testID="admin-moderation-back-btn"
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isRTL ? 'arrow-forward' : 'arrow-back'}
              size={20}
              color={COLORS.text}
            />
          </TouchableOpacity>
          <View style={styles.brandCrest}>
            <BrandMark size={28} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={[styles.portalBadge, isRTL && styles.rowRTL]}>
              <View style={styles.portalBadgeDot} />
              <Text style={styles.portalBadgeText}>
                {isArabic ? 'غرفة مراجعة الجودة والاعتماد' : 'VIP QUALITY & ACCREDITATION AUDIT'}
              </Text>
            </View>
            <Text style={[styles.headerTitle, isRTL && styles.textRTL]}>
              {isArabic ? 'لوحة مراجعة الإعلانات' : 'Moderation Dashboard'}
            </Text>
            <Text style={[styles.headerSubtitle, isRTL && styles.textRTL]}>
              {isArabic ? 'مراقبة الجودة للمستلزمات والعتاد والخدمات' : 'Quality review for marketplace'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          testID="admin-moderation-header-concierge-btn"
          style={styles.headerConciergeBtn}
          onPress={handleLeadModeratorInquiry}
          activeOpacity={0.8}
          accessibilityLabel="Lead Moderator WhatsApp Hotline"
        >
          <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
        </TouchableOpacity>
      </View>

      {/* Tabs Row: Equipment, Rider Gear, Services */}
      <View style={[styles.tabsRow, isRTL && styles.rowRTL]}>
        <TouchableOpacity
          testID="tab-equipment"
          style={[styles.tab, activeTab === 'equipment' && styles.activeTab]}
          onPress={() => setActiveTab('equipment')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'equipment' && styles.activeTabText]}>
            {isArabic ? 'مستلزمات الخيل' : 'Equipment'}
          </Text>
          {counts.equipment > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{counts.equipment}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          testID="tab-rider-gear"
          style={[styles.tab, activeTab === 'rider_gear' && styles.activeTab]}
          onPress={() => setActiveTab('rider_gear')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'rider_gear' && styles.activeTabText]}>
            {isArabic ? 'مستلزمات الفارس' : 'Rider Gear'}
          </Text>
          {counts.rider_gear > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{counts.rider_gear}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          testID="tab-services"
          style={[styles.tab, activeTab === 'services' && styles.activeTab]}
          onPress={() => setActiveTab('services')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'services' && styles.activeTabText]}>
            {isArabic ? 'الخدمات' : 'Services'}
          </Text>
          {counts.services > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{counts.services}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Status Filter: Pending Review vs Rejected */}
      <View style={[styles.statusFilterRow, isRTL && styles.rowRTL]}>
        <TouchableOpacity
          testID="filter-pending-review"
          style={[
            styles.statusFilterBtn,
            statusFilter === 'pending_review' && styles.statusFilterBtnActive,
            isRTL && styles.rowRTL,
          ]}
          onPress={() => setStatusFilter('pending_review')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="hourglass-outline"
            size={14}
            color={statusFilter === 'pending_review' ? COLORS.primary : COLORS.textLight}
          />
          <Text
            style={[
              styles.statusFilterText,
              statusFilter === 'pending_review' && styles.statusFilterTextActive,
            ]}
          >
            {isArabic ? 'بانتظار المراجعة' : 'Pending Review'}
            {counts[activeTab] > 0 ? ` (${counts[activeTab]})` : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID="filter-rejected"
          style={[
            styles.statusFilterBtn,
            statusFilter === 'rejected' && styles.statusFilterBtnActiveRejected,
            isRTL && styles.rowRTL,
          ]}
          onPress={() => setStatusFilter('rejected')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="close-circle-outline"
            size={14}
            color={statusFilter === 'rejected' ? COLORS.error : COLORS.textLight}
          />
          <Text
            style={[
              styles.statusFilterText,
              statusFilter === 'rejected' && styles.statusFilterTextActiveRejected,
            ]}
          >
            {isArabic ? 'المرفوضة' : 'Rejected'}
            {rejectedCounts[activeTab] > 0 ? ` (${rejectedCounts[activeTab]})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderPendingCard}
          ListHeaderComponent={renderListHeader}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons
                  name={statusFilter === 'rejected' ? 'checkmark-circle' : 'shield-checkmark'}
                  size={40}
                  color={statusFilter === 'rejected' ? COLORS.textLight : COLORS.primary}
                />
              </View>
              <Text style={styles.emptyTitle}>
                {statusFilter === 'rejected'
                  ? isArabic ? 'لا توجد إعلانات مرفوضة' : 'No rejected items'
                  : isArabic ? 'لا توجد إعلانات بانتظار المراجعة' : 'No pending items to review'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {statusFilter === 'rejected'
                  ? isArabic
                    ? 'لم يتم رفض أي إعلان في هذا القسم.'
                    : 'No items have been rejected in this section.'
                  : isArabic
                  ? 'تمت مراجعة كافة الإعلانات واعتمادها في هذا القسم.'
                  : 'All items in this section have been reviewed.'}
              </Text>
            </View>
          }
        />
      )}

      {/* Rejection Modal with 1-Tap Quick Reason Chips */}
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
              <View style={[styles.modalHeaderRow, isRTL && styles.rowRTL]}>
                <Ionicons name="alert-circle" size={22} color={COLORS.error} />
                <Text style={styles.modalTitle}>
                  {isArabic ? 'رفض الإعلان مع الملاحظات' : 'Reject Listing with Feedback'}
                </Text>
              </View>
              <Text style={[styles.modalSubTitle, isRTL && styles.textRTL]}>
                {rejectingItem?.title}
              </Text>

              {/* Quick Reasons Chips */}
              <Text style={[styles.quickReasonsHeader, isRTL && styles.textRTL]}>
                {isArabic ? 'أسباب رفض سريعة (انقر للإضافة):' : 'Quick Reasons (tap to add):'}
              </Text>
              <View style={[styles.quickChipsWrap, isRTL && styles.rowReverseWrap]}>
                {QUICK_REASONS.map((qr) => (
                  <TouchableOpacity
                    key={qr.key}
                    testID={`quick-reason-${qr.key}`}
                    style={styles.quickChip}
                    onPress={() => {
                      const text = isArabic ? qr.ar : qr.en;
                      setRejectReason((prev) => (prev ? `${prev} - ${text}` : text));
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add" size={12} color={COLORS.primary} />
                    <Text style={styles.quickChipText}>{isArabic ? qr.ar : qr.en}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.modalLabel, isRTL && styles.textRTL]}>
                {isArabic ? 'سبب الرفض الموجه للبائع *' : 'Rejection Reason to Seller *'}
              </Text>
              <TextInput
                testID="reject-reason-input"
                style={[styles.modalInput, { textAlign: isArabic ? 'right' : 'left' }]}
                placeholder={
                  isArabic
                    ? 'مثال: تفاصيل المنتج ناقصة، يرجى إضافة صور أوضح...'
                    : 'e.g. Incomplete description, please add clearer photos...'
                }
                multiline
                numberOfLines={3}
                value={rejectReason}
                onChangeText={setRejectReason}
                placeholderTextColor={COLORS.textLight}
              />

              <View style={[styles.modalBtnRow, isRTL && styles.rowRTL]}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalCancelBtn]}
                  onPress={() => setShowRejectModal(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalCancelText}>{t('cancel') || 'Cancel'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  testID="confirm-reject-submit-button"
                  style={[styles.modalBtn, styles.modalRejectBtn]}
                  disabled={submittingAction}
                  onPress={handleConfirmReject}
                  activeOpacity={0.85}
                >
                  {submittingAction ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Text style={styles.modalRejectText}>
                      {isArabic ? 'تأكيد الرفض' : 'Confirm Rejection'}
                    </Text>
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
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    ...SHADOWS.soft,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  headerTitle: {
    ...FONTS.h2,
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '800',
  },
  headerSubtitle: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    gap: SPACING.xs + 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xs + 4,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.inputBg,
    borderWidth: 1.5,
    borderColor: 'transparent',
    gap: 4,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabText: {
    ...FONTS.bodySmall,
    color: COLORS.textSecondary,
    fontWeight: '600',
    fontSize: 12,
  },
  activeTabText: {
    color: COLORS.white,
    fontWeight: '700',
  },
  tabBadge: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: RADIUS.full,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  statusFilterRow: {
    flexDirection: 'row',
    gap: SPACING.xs + 2,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  statusFilterBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  statusFilterBtnActive: {
    backgroundColor: COLORS.primaryLight + '15',
    borderColor: COLORS.primary,
  },
  statusFilterBtnActiveRejected: {
    backgroundColor: COLORS.error + '10',
    borderColor: COLORS.error,
  },
  statusFilterText: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    fontWeight: '600',
    fontSize: 12,
  },
  statusFilterTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  statusFilterTextActiveRejected: {
    color: COLORS.error,
    fontWeight: '700',
  },
  listContent: {
    padding: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.card,
  },
  imageWrap: {
    width: '100%',
    height: 160,
    backgroundColor: COLORS.inputBg,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryLight + '10',
    gap: 4,
  },
  imageFallbackText: {
    ...FONTS.caption,
    color: COLORS.textLight,
    fontSize: 11,
  },
  badgeLeft: {
    left: SPACING.sm,
  },
  badgeRight: {
    right: SPACING.sm,
  },
  categoryBadge: {
    position: 'absolute',
    top: SPACING.sm,
    backgroundColor: COLORS.surface + 'EE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  categoryText: {
    ...FONTS.caption,
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 11,
  },
  statusBadge: {
    position: 'absolute',
    top: SPACING.sm,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface + 'EE',
  },
  badgePillPending: {
    borderWidth: 1,
    borderColor: COLORS.warning + '60',
  },
  badgePillRejected: {
    borderWidth: 1,
    borderColor: COLORS.error + '60',
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.warning,
  },
  rejectedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.error,
  },
  cardBody: {
    padding: SPACING.md,
  },
  cardTitle: {
    ...FONTS.h3,
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  cardPrice: {
    ...FONTS.h2,
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  locationText: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  descriptionText: {
    ...FONTS.bodySmall,
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: SPACING.sm,
  },
  rejectionReasonBox: {
    backgroundColor: COLORS.error + '10',
    borderWidth: 1,
    borderColor: COLORS.error + '30',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  rejectionReasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  rejectionReasonTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.error,
  },
  rejectionReasonContent: {
    ...FONTS.caption,
    color: COLORS.text,
    fontSize: 12,
    lineHeight: 16,
  },
  actionRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    gap: 6,
    ...SHADOWS.soft,
  },
  approveBtn: {
    backgroundColor: COLORS.primary,
  },
  rejectBtn: {
    backgroundColor: COLORS.error,
  },
  actionBtnText: {
    ...FONTS.button,
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: SPACING.xl,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
    borderWidth: 1.5,
    borderColor: COLORS.secondary + '40',
    ...SHADOWS.card,
  },
  emptyTitle: {
    ...FONTS.h3,
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 4,
  },
  emptySubtitle: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
  },
  modalOverlay: {
    flexGrow: 1,
    backgroundColor: 'rgba(15, 56, 38, 0.65)',
    justifyContent: 'flex-end',
    padding: SPACING.md,
  },
  modalContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.card,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: 4,
  },
  modalTitle: {
    ...FONTS.h2,
    color: COLORS.error,
    fontSize: 17,
    fontWeight: '800',
  },
  modalSubTitle: {
    ...FONTS.bodySmall,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    fontWeight: '600',
  },
  quickReasonsHeader: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    fontWeight: '600',
  },
  quickChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: SPACING.md,
  },
  rowReverseWrap: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primaryLight + '12',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.primaryLight + '30',
  },
  quickChipText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
  },
  modalLabel: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    fontWeight: '600',
  },
  modalInput: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: 13,
    color: COLORS.text,
    height: 80,
    textAlignVertical: 'top',
    marginBottom: SPACING.md,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
  },
  modalBtn: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtn: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  modalRejectBtn: {
    backgroundColor: COLORS.error,
  },
  modalCancelText: {
    ...FONTS.button,
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  modalRejectText: {
    ...FONTS.button,
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  brandCrest: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(197, 160, 89, 0.35)',
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  portalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(197, 160, 89, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
    marginBottom: 2,
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.28)',
  },
  portalBadgeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10B981',
    marginRight: 5,
  },
  portalBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.accentDark,
    letterSpacing: 0.5,
  },
  headerConciergeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(37, 211, 102, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(37, 211, 102, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1.5,
    borderColor: 'rgba(197, 160, 89, 0.3)',
    ...SHADOWS.small,
  },
  shieldHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  shieldIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(197, 160, 89, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.3)',
  },
  shieldBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  shieldPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  shieldBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.accentDark,
    letterSpacing: 0.5,
  },
  shieldTitle: {
    ...FONTS.h3,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  shieldDesc: {
    ...FONTS.bodySmall,
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  shieldPillars: {
    gap: 6,
    paddingVertical: SPACING.xs,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.borderLight,
    marginVertical: SPACING.xs,
  },
  shieldPillarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  shieldPillarIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(197, 160, 89, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldPillarText: {
    ...FONTS.caption,
    fontSize: 11,
    color: COLORS.text,
    fontWeight: '600',
    flex: 1,
  },
  shieldConciergeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(37, 211, 102, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(37, 211, 102, 0.25)',
    paddingVertical: 9,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    marginTop: SPACING.xs,
  },
  shieldConciergeBtnText: {
    ...FONTS.button,
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  textRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
