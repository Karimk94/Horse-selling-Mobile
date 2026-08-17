import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  Linking,
  ActivityIndicator,
  Alert,
  Modal,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getServiceDetail, sendServiceInquiry } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

const { width } = Dimensions.get('window');

export default function ServiceDetailScreen({ route, navigation }) {
  const { serviceId } = route.params || {};
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Inquiry Reservation Modal State
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [inquirerName, setInquirerName] = useState('');
  const [inquirerPhone, setInquirerPhone] = useState('');
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [submittingInquiry, setSubmittingInquiry] = useState(false);

  const { language: currentLanguage, t, isRTL } = useLanguage();
  const isArabic = currentLanguage === 'ar';

  useEffect(() => {
    async function loadDetail() {
      if (!serviceId) return;
      try {
        const response = await getServiceDetail(serviceId);
        setItem(response.data);
      } catch (error) {
        Alert.alert(t('error'), isArabic ? 'فشل تحميل تفاصيل الخدمة.' : 'Failed to load service details.');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    }
    loadDetail();
  }, [serviceId]);

  const handleCallProvider = () => {
    const phone = item?.provider?.phone_number || item?.provider?.profile?.phone_number;
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    } else {
      Alert.alert(t('error'), isArabic ? 'رقم الهاتف غير متوفر.' : 'Phone number not available.');
    }
  };

  const handleWhatsApp = () => {
    const phone = item?.provider?.phone_number || item?.provider?.profile?.phone_number;
    if (phone) {
      const cleanPhone = phone.replace(/[^0-9+]/g, '');
      const msg = encodeURIComponent(
        isArabic
          ? `مرحباً، أود الاستفسار عن خدمتك: ${item.title}`
          : `Hello, I am inquiring about your service: ${item.title}`
      );
      Linking.openURL(`https://wa.me/${cleanPhone}?text=${msg}`);
    } else {
      Alert.alert(t('error'), isArabic ? 'رقم الهاتف غير متوفر.' : 'Phone number not available.');
    }
  };

  const handleSendInquiry = async () => {
    if (!inquirerName.trim() || !inquirerPhone.trim()) {
      Alert.alert(t('error'), isArabic ? 'يرجى إدخال الاسم ورقم الهاتف.' : 'Please enter name and phone number.');
      return;
    }

    setSubmittingInquiry(true);
    try {
      await sendServiceInquiry(item.id, {
        inquirer_name: inquirerName.trim(),
        inquirer_phone: inquirerPhone.trim(),
        message: inquiryMessage.trim() || null,
      });

      setShowInquiryModal(false);
      Alert.alert(
        t('success'),
        isArabic
          ? 'تم إرسال طلب الاستفسار / الحجز لمقدم الخدمة بنجاح.'
          : 'Inquiry / Reservation request sent successfully.'
      );
      setInquirerName('');
      setInquirerPhone('');
      setInquiryMessage('');
    } catch (error) {
      Alert.alert(
        t('error'),
        error?.response?.data?.detail || (isArabic ? 'فشل إرسال الاستفسار.' : 'Failed to send inquiry.')
      );
    } finally {
      setSubmittingInquiry(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </SafeAreaView>
    );
  }

  if (!item) return null;

  const images = item.images?.length
    ? item.images
    : [{ id: '1', image_url: 'https://via.placeholder.com/600x400?text=Equestrian+Service' }];
  const categoryName = isArabic ? item.category?.name_ar : item.category?.name_en;

  const getPricingLabel = (pricingType, price) => {
    if (pricingType === 'inquiry' || !price) {
      return isArabic ? 'تواصل للاستفسار' : 'Inquiry Required';
    }
    const suffix = {
      fixed: 'AED',
      hourly: isArabic ? 'د.إ / ساعة' : 'AED / hr',
      daily: isArabic ? 'د.إ / يوم' : 'AED / day',
      monthly: isArabic ? 'د.إ / شهر' : 'AED / month',
      per_head: isArabic ? 'د.إ / رأس' : 'AED / head',
    }[pricingType] || 'AED';

    return `${price.toLocaleString()} ${suffix}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Gallery Slider */}
        <View style={styles.galleryContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const slide = Math.round(e.nativeEvent.contentOffset.x / width);
              setActiveImageIndex(slide);
            }}
            scrollEventThrottle={16}
          >
            {images.map((img) => (
              <Image
                key={img.id || img.image_url}
                source={{ uri: img.image_url }}
                style={styles.galleryImage}
                resizeMode="cover"
              />
            ))}
          </ScrollView>

          {images.length > 1 && (
            <View style={styles.pagination}>
              {images.map((_, i) => (
                <View
                  key={i}
                  style={[styles.paginationDot, i === activeImageIndex && styles.activeDot]}
                />
              ))}
            </View>
          )}

          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#0f172a" />
          </TouchableOpacity>
        </View>

        {/* Body Content */}
        <View style={styles.body}>
          {categoryName && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{categoryName}</Text>
            </View>
          )}

          <Text style={styles.title}>{item.title}</Text>

          <View style={styles.priceRow}>
            <Text style={styles.price}>{getPricingLabel(item.pricing_type, item.price)}</Text>
          </View>

          {/* Working Schedule & Availability Calendar */}
          {item.availability_calendar && (
            <View style={styles.calendarCard}>
              <View style={styles.calendarHeader}>
                <Ionicons name="calendar-outline" size={20} color="#2563eb" />
                <Text style={styles.calendarTitle}>
                  {isArabic ? 'جدول المواعيد وأوقات العمل' : 'Working Hours & Schedule'}
                </Text>
              </View>
              <Text style={styles.calendarBody}>{item.availability_calendar}</Text>
            </View>
          )}

          {/* Location Box */}
          {item.location_text && (
            <View style={styles.locationBox}>
              <Ionicons name="location" size={20} color="#2563eb" />
              <Text style={styles.locationBoxText}>{item.location_text}</Text>
            </View>
          )}

          {/* Description */}
          {item.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('description')}</Text>
              <Text style={styles.descriptionText}>{item.description}</Text>
            </View>
          )}

          {/* Provider Card */}
          <View style={styles.providerCard}>
            <Text style={styles.providerCardTitle}>
              {isArabic ? 'مقدم الخدمة' : 'Service Provider'}
            </Text>
            <Text style={styles.providerName}>
              {item.provider?.profile?.first_name
                ? `${item.provider.profile.first_name} ${item.provider.profile.last_name || ''}`
                : item.provider?.email}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.inquiryBtn]}
          onPress={() => setShowInquiryModal(true)}
        >
          <Ionicons name="chatbubbles" size={20} color="#ffffff" />
          <Text style={styles.actionBtnText}>{isArabic ? 'طلب حجز / استفسار' : 'Inquire / Reserve'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBtn, styles.callBtn]} onPress={handleCallProvider}>
          <Ionicons name="call" size={20} color="#ffffff" />
          <Text style={styles.actionBtnText}>{t('callOwner')}</Text>
        </TouchableOpacity>
      </View>

      {/* Inquiry Reservation Modal */}
      <Modal visible={showInquiryModal} animationType="slide" transparent>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>
                {isArabic ? 'إرسال طلب استفسار / حجز' : 'Send Inquiry Request'}
              </Text>
              <TouchableOpacity onPress={() => setShowInquiryModal(false)}>
                <Ionicons name="close" size={24} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>{isArabic ? 'الاسم بالكامل *' : 'Full Name *'}</Text>
              <TextInput
                style={[styles.modalInput, { textAlign: isArabic ? 'right' : 'left' }]}
                placeholder={isArabic ? 'أدخل اسمك...' : 'Enter your name...'}
                value={inquirerName}
                onChangeText={setInquirerName}
              />

              <Text style={styles.modalLabel}>{isArabic ? 'رقم التواصل *' : 'Phone Number *'}</Text>
              <TextInput
                style={[styles.modalInput, { textAlign: isArabic ? 'right' : 'left' }]}
                placeholder="+971501234567"
                keyboardType="phone-pad"
                value={inquirerPhone}
                onChangeText={setInquirerPhone}
              />

              <Text style={styles.modalLabel}>{isArabic ? 'رسالتك أو تفاصيل الطلب' : 'Message / Details'}</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea, { textAlign: isArabic ? 'right' : 'left' }]}
                placeholder={isArabic ? 'اكتب تفاصيل استفسارك أو تاريخ الحجز المطلوبة...' : 'Details about your requested date or service...'}
                multiline
                numberOfLines={3}
                value={inquiryMessage}
                onChangeText={setInquiryMessage}
              />

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                disabled={submittingInquiry}
                onPress={handleSendInquiry}
              >
                {submittingInquiry ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>
                    {isArabic ? 'إرسال الاستفسار' : 'Submit Request'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 90,
  },
  galleryContainer: {
    position: 'relative',
    width: '100%',
    height: 280,
    backgroundColor: '#0f172a',
  },
  galleryImage: {
    width: width,
    height: 280,
  },
  pagination: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#ffffff',
    width: 12,
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  body: {
    padding: 20,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginBottom: 10,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563eb',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  priceRow: {
    marginBottom: 20,
  },
  price: {
    fontSize: 22,
    fontWeight: '900',
    color: '#2563eb',
  },
  calendarCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  calendarTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e40af',
    marginLeft: 8,
  },
  calendarBody: {
    fontSize: 14,
    color: '#1e3a8a',
    lineHeight: 20,
  },
  locationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
  },
  locationBoxText: {
    fontSize: 14,
    color: '#334155',
    marginLeft: 8,
    flex: 1,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#334155',
  },
  providerCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  providerCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    elevation: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginHorizontal: 6,
  },
  inquiryBtn: {
    backgroundColor: '#2563eb',
  },
  callBtn: {
    backgroundColor: '#16a34a',
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 12,
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalBody: {},
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
    marginTop: 10,
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
  },
  modalTextArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalSubmitBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  modalSubmitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
});
