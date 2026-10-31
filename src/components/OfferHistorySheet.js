import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../config/theme';
import { useLanguage } from '../contexts/LanguageContext';
import * as apiService from '../services/api';
import { useToast } from '../components/ToastProvider';
import BrandMark from './BrandMark';

const OfferHistorySheet = ({
  horseId,
  horseTitle = '',
  listingPrice = null,
  sellerPhone = null,
  isVisible,
  onClose,
  userRole = 'buyer',
  onOfferUpdated,
}) => {
  const insets = useSafeAreaInsets();
  const { t, isRTL } = useLanguage();
  const toast = useToast();

  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [showResponseForm, setShowResponseForm] = useState(null); // 'counter' | 'accept' | 'reject' | null
  const [formData, setFormData] = useState({ amount: '', message: '' });
  const [responseData, setResponseData] = useState({ counterAmount: '', responseMessage: '' });
  const [formErrors, setFormErrors] = useState({});
  const [responseErrors, setResponseErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleOfferConciergeHotline = () => {
    const isArabic = isRTL;
    const text = isArabic
      ? `مرحباً ستيد ماركت، أود استشارة الوسيط المعتمد بخصوص تقديم أو مراجعة عرض مالي لـ "${horseTitle || 'هذا الخيل'}"${listingPrice ? ` (السعر المطلوب: ${listingPrice.toLocaleString()} درهم)` : ''}.`
      : `Hello SteedMarket Concierge, I would like to consult an accredited broker regarding an offer for "${horseTitle || 'this horse'}"${listingPrice ? ` (Asking Price: ${listingPrice.toLocaleString()} AED)` : ''}.`;
    try {
      const res = Linking.openURL(`https://wa.me/971500000000?text=${encodeURIComponent(text)}`);
      if (res && typeof res.catch === 'function') {
        res.catch(() => {});
      }
    } catch (e) {}
  };

  const handleEscrowConcierge = (offer) => {
    const isArabic = isRTL;
    const amt = offer?.counter_amount || offer?.amount || 0;
    const text = isArabic
      ? `مرحباً ستيد ماركت، أود تفعيل خدمة الإيداع والوساطة المالية الآمنة (Escrow) للعرض المقدم بقيمة ${amt.toLocaleString()} درهم لخيل "${horseTitle}".`
      : `Hello SteedMarket Escrow Concierge, I would like to initiate certified escrow protection for the offer of ${amt.toLocaleString()} AED on "${horseTitle}".`;
    try {
      const res = Linking.openURL(`https://wa.me/971500000000?text=${encodeURIComponent(text)}`);
      if (res && typeof res.catch === 'function') {
        res.catch(() => {});
      }
    } catch (e) {}
  };

  const handleValuationConcierge = () => {
    const isArabic = isRTL;
    const text = isArabic
      ? `مرحباً ستيد ماركت، أود استشارة وسيط معتمد لتقييم السعر العادل لخيل "${horseTitle}"${listingPrice ? ` المعروض بسعر ${listingPrice.toLocaleString()} درهم` : ''} قبل تقديم عرض رسمي.`
      : `Hello SteedMarket Concierge, I would like expert broker valuation assistance for "${horseTitle}"${listingPrice ? ` listed at ${listingPrice.toLocaleString()} AED` : ''} before submitting an offer.`;
    try {
      const res = Linking.openURL(`https://wa.me/971500000000?text=${encodeURIComponent(text)}`);
      if (res && typeof res.catch === 'function') {
        res.catch(() => {});
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (isVisible && horseId) {
      loadOffers();
    }
  }, [isVisible, horseId]);

  const loadOffers = async () => {
    setLoading(true);
    try {
      if (userRole === 'seller') {
        const response = await apiService.getHorseOffers(horseId);
        setOffers(response.data?.offers || []);
      } else {
        const response = await apiService.getMyOffers('buyer', null);
        const horseOffers = (response.data?.offers || []).filter((o) => o.horse_id === horseId);
        setOffers(horseOffers);
      }
    } catch (error) {
      toast?.show?.(t('offerLoadFailed'), { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOffer = async () => {
    setFormErrors({});
    const amountVal = Number(formData.amount);
    if (!Number.isFinite(amountVal) || amountVal <= 0) {
      setFormErrors({ amount: t('offerAmountRequired') });
      return;
    }

    setSubmitting(true);
    try {
      await apiService.createOffer(horseId, parseFloat(formData.amount), formData.message);
      toast?.show?.(t('offerCreated'), { type: 'success' });
      setFormData({ amount: '', message: '' });
      setShowOfferForm(false);
      await loadOffers();
      onOfferUpdated?.();
    } catch (error) {
      toast?.show?.(t('offerCreateFailed'), { type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCounterOffer = async () => {
    setResponseErrors({});
    const counterVal = Number(responseData.counterAmount);
    if (!Number.isFinite(counterVal) || counterVal <= 0) {
      setResponseErrors({ counterAmount: t('counterAmountRequired') });
      return;
    }

    setSubmitting(true);
    try {
      await apiService.counterOffer(
        selectedOffer.id,
        parseFloat(responseData.counterAmount),
        responseData.responseMessage
      );
      toast?.show?.(t('counterOfferSent'), { type: 'success' });
      setResponseData({ counterAmount: '', responseMessage: '' });
      setShowResponseForm(null);
      setSelectedOffer(null);
      await loadOffers();
      onOfferUpdated?.();
    } catch (error) {
      toast?.show?.(t('counterOfferFailed'), { type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptOffer = async () => {
    Alert.alert(
      t('offerConfirm'),
      t('offerAcceptMessage'),
      [
        { text: t('cancel'), onPress: () => {} },
        {
          text: t('accept'),
          onPress: async () => {
            setSubmitting(true);
            try {
              await apiService.acceptOffer(selectedOffer.id, responseData.responseMessage);
              toast?.show?.(t('offerAccepted'), { type: 'success' });
              setResponseData({ counterAmount: '', responseMessage: '' });
              setShowResponseForm(null);
              setSelectedOffer(null);
              await loadOffers();
              onOfferUpdated?.();
            } catch (error) {
              toast?.show?.(t('offerAcceptFailed'), { type: 'error' });
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const handleRejectOffer = async () => {
    Alert.alert(
      t('offerRejectConfirm'),
      t('offerRejectMessage'),
      [
        { text: t('cancel'), onPress: () => {} },
        {
          text: t('reject'),
          onPress: async () => {
            setSubmitting(true);
            try {
              await apiService.rejectOffer(selectedOffer.id, responseData.responseMessage);
              toast?.show?.(t('offerRejected'), { type: 'success' });
              setResponseData({ counterAmount: '', responseMessage: '' });
              setShowResponseForm(null);
              setSelectedOffer(null);
              await loadOffers();
              onOfferUpdated?.();
            } catch (error) {
              toast?.show?.(t('offerRejectFailed'), { type: 'error' });
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const handleWhatsAppDiscuss = (offer) => {
    const phone = sellerPhone || offer?.seller_phone || offer?.buyer_phone || '';
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const title = horseTitle || offer?.horse_title || `Horse #${horseId}`;
    const amountFormatted = (offer?.amount || 0).toLocaleString();
    const msg = typeof t('offerWhatsAppMessage') === 'function'
      ? t('offerWhatsAppMessage')(title, (offer?.id || '').slice(0, 8), amountFormatted)
      : `Hello, discussing offer on "${title}" for ${amountFormatted} AED`;
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    Linking.openURL(url).catch(() => {
      toast?.show?.(t('whatsappFailed') || 'Could not open WhatsApp', { type: 'error' });
    });
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'accepted':
        return { bg: '#E8F5E9', border: '#C8E6C9', text: '#2E7D32' };
      case 'countered':
        return { bg: '#E0F2FE', border: '#BAE6FD', text: '#0284C7' };
      case 'pending':
        return { bg: '#FEF3C7', border: '#FDE68A', text: '#D97706' };
      case 'rejected':
      case 'cancelled':
        return { bg: '#FEE2E2', border: '#FECACA', text: '#DC2626' };
      default:
        return { bg: COLORS.card, border: COLORS.border, text: COLORS.textSecondary };
    }
  };

  // Smart offer calculation presets based on asking price
  const quickOfferChips = useMemo(() => {
    if (!listingPrice || listingPrice <= 0) return [];
    return [
      { labelKey: 'offerQuickListPrice', amount: listingPrice },
      { labelKey: 'offerQuickMinus5', amount: Math.round(listingPrice * 0.95) },
      { labelKey: 'offerQuickMinus10', amount: Math.round(listingPrice * 0.90) },
      { labelKey: 'offerQuickMinus15', amount: Math.round(listingPrice * 0.85) },
      { labelKey: 'counterQuickRound5k', amount: Math.ceil((listingPrice * 0.90) / 5000) * 5000 },
    ];
  }, [listingPrice]);

  // Smart counter calculation presets based on active offer amount
  const quickCounterChips = useMemo(() => {
    const base = selectedOffer?.amount || 0;
    if (!base || base <= 0) return [];
    return [
      { labelKey: 'counterQuickPlus5', amount: Math.round(base * 1.05) },
      { labelKey: 'counterQuickPlus10', amount: Math.round(base * 1.10) },
      { labelKey: 'counterQuickPlus15', amount: Math.round(base * 1.15) },
      { labelKey: 'counterQuickRound5k', amount: Math.ceil((base * 1.05) / 5000) * 5000 },
    ];
  }, [selectedOffer]);

  return (
    <Modal visible={isVisible} animationType="slide" transparent={false}>
      <KeyboardAvoidingView
        style={[styles.container, { paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        testID="offer-history-sheet"
      >
        {/* Luxury Header */}
        <View style={[styles.header, isRTL && styles.rowRTL]}>
          <View style={[styles.headerLeft, isRTL && styles.rowRTL]}>
            <TouchableOpacity
              testID="close-offer-sheet"
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
            >
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>

            <View style={styles.brandMarkCrest}>
              <BrandMark size={26} />
            </View>

            <View style={styles.headerTitleWrap}>
              <View style={[styles.portalBadge, isRTL && styles.rowRTL]}>
                <View style={styles.portalPulseDot} />
                <Text style={styles.portalBadgeText}>
                  {isRTL ? 'ميثاق التفاوض والوساطة المعتمدة' : 'VIP ESCROW & OFFER GOVERNANCE'}
                </Text>
              </View>
              <Text style={[styles.headerTitle, isRTL && styles.textRTL]}>{t('offerHistory')}</Text>
              {horseTitle ? (
                <Text style={[styles.headerSubtitle, isRTL && styles.textRTL]} numberOfLines={1}>
                  {horseTitle}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={[styles.headerActionsRight, isRTL && styles.rowRTL]}>
            <TouchableOpacity
              testID="offer-header-hotline-btn"
              style={styles.headerHotlineBtn}
              onPress={handleOfferConciergeHotline}
              activeOpacity={0.8}
              accessibilityLabel="Offer Concierge Hotline"
            >
              <Ionicons name="logo-whatsapp" size={17} color="#25D366" />
            </TouchableOpacity>

            {userRole === 'buyer' && !showOfferForm ? (
              <TouchableOpacity
                testID="create-offer-button"
                style={[styles.createBtn, isRTL && styles.rowRTL]}
                onPress={() => setShowOfferForm(true)}
                accessibilityRole="button"
              >
                <Ionicons name="add" size={18} color={COLORS.white} />
                <Text style={styles.createBtnText}>{t('makeOffer')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : showOfferForm ? (
          /* Buyer New Offer Creation Studio */
          <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
            <View style={styles.formCard}>
              <View style={[styles.formTitleRow, isRTL && styles.rowRTL]}>
                <View style={styles.formIconBadge}>
                  <Ionicons name="pricetag" size={18} color={COLORS.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.formTitle, isRTL && styles.textRTL]}>{t('makeOffer')}</Text>
                  {listingPrice ? (
                    <Text style={[styles.askingPriceText, isRTL && styles.textRTL]}>
                      {t('offerListingPrice')} {listingPrice.toLocaleString()} {t('currencyAed')}
                    </Text>
                  ) : null}
                </View>
              </View>

              {/* Quick Offer Presets */}
              {quickOfferChips.length > 0 && (
                <View style={styles.quickChipsSection}>
                  <Text style={[styles.quickChipsLabel, isRTL && styles.textRTL]}>
                    {t('offerQuickChipsLabel')}
                  </Text>
                  <View style={[styles.chipRow, isRTL && styles.rowRTL]}>
                    {quickOfferChips.map((chip, idx) => {
                      const isSelected = formData.amount === chip.amount.toString();
                      return (
                        <TouchableOpacity
                          key={idx}
                          testID={`quick-offer-chip-${idx}`}
                          style={[styles.presetChip, isSelected && styles.presetChipActive]}
                          onPress={() => setFormData((prev) => ({ ...prev, amount: chip.amount.toString() }))}
                        >
                          <Text style={[styles.presetChipText, isSelected && styles.presetChipTextActive]}>
                            {t(chip.labelKey)} ({chip.amount.toLocaleString()})
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Numeric Amount Input */}
              <View style={styles.inputWrap}>
                <Text style={[styles.inputLabel, isRTL && styles.textRTL]}>
                  {t('offerAmount')} ({t('currencyAed')})
                </Text>
                <TextInput
                  testID="offer-amount-input"
                  style={[styles.input, isRTL && styles.inputRTL]}
                  placeholder={`${t('offerAmount')} (${t('currencyAed')})`}
                  placeholderTextColor={COLORS.textLight}
                  value={formData.amount}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, amount: text }))}
                  keyboardType="numeric"
                  editable={!submitting}
                  textAlign={isRTL ? 'right' : 'left'}
                />
                {formErrors.amount && (
                  <Text style={[styles.errorText, isRTL && styles.textRTL]}>{formErrors.amount}</Text>
                )}
              </View>

              {/* Message Input */}
              <View style={styles.inputWrap}>
                <Text style={[styles.inputLabel, isRTL && styles.textRTL]}>{t('offerMessage')}</Text>
                <TextInput
                  testID="offer-message-input"
                  style={[styles.input, styles.messageInput, isRTL && styles.inputRTL]}
                  placeholder={t('offerMessage')}
                  placeholderTextColor={COLORS.textLight}
                  value={formData.message}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, message: text }))}
                  multiline
                  editable={!submitting}
                  textAlign={isRTL ? 'right' : 'left'}
                />
              </View>

              {/* Equine Trust Shield Card */}
              <View style={styles.trustCard}>
                <Ionicons name="shield-checkmark" size={18} color={COLORS.accent} style={{ marginTop: 2 }} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={[styles.trustTitle, isRTL && styles.textRTL]}>{t('offerTrustShieldTitle')}</Text>
                  <Text style={[styles.trustDesc, isRTL && styles.textRTL]}>{t('offerTrustShieldDesc')}</Text>
                </View>
              </View>

              {/* Form Action Buttons */}
              <View style={[styles.buttonRow, isRTL && styles.rowRTL]}>
                <TouchableOpacity
                  testID="cancel-offer-button"
                  style={[styles.btn, styles.cancelBtn]}
                  onPress={() => {
                    setShowOfferForm(false);
                    setFormData({ amount: '', message: '' });
                    setFormErrors({});
                  }}
                  disabled={submitting}
                >
                  <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  testID="submit-offer-button"
                  style={[styles.btn, styles.submitBtn]}
                  onPress={handleCreateOffer}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <Text style={styles.submitBtnText}>{t('send')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        ) : offers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="pricetags-outline" size={36} color={COLORS.primary} />
            </View>
            <Text style={[styles.emptyTitle, isRTL && styles.textRTL]}>{t('noOffers')}</Text>
            {userRole === 'buyer' && (
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={() => setShowOfferForm(true)}
              >
                <Text style={styles.emptyActionBtnText}>{t('makeOffer')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              testID="offer-empty-concierge-btn"
              style={[styles.emptyConciergeBtn, isRTL && styles.rowRTL]}
              onPress={handleValuationConcierge}
              activeOpacity={0.85}
            >
              <Ionicons name="logo-whatsapp" size={15} color="#25D366" />
              <Text style={styles.emptyConciergeBtnText}>
                {isRTL
                  ? 'استشارة وسيط الخيل لتقييم السعر العادل'
                  : 'Consult Equine Broker on Fair Valuation'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.offersList} keyboardShouldPersistTaps="handled">
            {offers.map((offer) => {
              const badge = getStatusBadgeStyle(offer.status);
              return (
                <TouchableOpacity
                  key={offer.id}
                  testID={`offer-card-${offer.id}`}
                  style={[styles.offerCard, selectedOffer?.id === offer.id && styles.offerCardSelected]}
                  onPress={() => setSelectedOffer(offer)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.offerCardTopRow, isRTL && styles.rowRTL]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.offerAmountText, isRTL && styles.textRTL]}>
                        {(offer.amount || 0).toLocaleString()} {t('currencyAed')}
                      </Text>
                      <Text style={[styles.offerPartyText, isRTL && styles.textRTL]}>
                        {userRole === 'buyer' ? t('you') : offer.buyer_email || t('buyer')}
                      </Text>
                    </View>

                    <View style={[styles.statusBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                      <Text style={[styles.statusText, { color: badge.text }]}>
                        {t(`status_${offer.status}`)}
                      </Text>
                    </View>
                  </View>

                  {offer.message ? (
                    <Text style={[styles.offerMessageText, isRTL && styles.textRTL]} numberOfLines={2}>
                      "{offer.message}"
                    </Text>
                  ) : null}

                  {offer.counter_amount ? (
                    <View style={[styles.counterRow, isRTL && styles.rowRTL]}>
                      <Ionicons name="repeat" size={14} color={COLORS.primary} />
                      <Text style={[styles.counterText, isRTL && styles.textRTL]}>
                        {t('counterOffer')}: {(offer.counter_amount || 0).toLocaleString()} {t('currencyAed')}
                      </Text>
                    </View>
                  ) : null}

                  <View style={[styles.offerCardBottomRow, isRTL && styles.rowRTL]}>
                    <Text style={[styles.offerDateText, isRTL && styles.textRTL]}>
                      {new Date(offer.created_at).toLocaleDateString()}
                    </Text>
                    <Ionicons
                      name={isRTL ? 'chevron-back' : 'chevron-forward'}
                      size={16}
                      color={COLORS.textLight}
                    />
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Selected Offer Details Slide-up Sheet */}
        {selectedOffer && !showOfferForm && (
          <View style={styles.detailsContainer}>
            <View style={[styles.detailsHeader, isRTL && styles.rowRTL]}>
              <Text style={[styles.detailsTitle, isRTL && styles.textRTL]}>{t('offerDetails')}</Text>
              <TouchableOpacity onPress={() => setSelectedOffer(null)} style={styles.detailsCloseBtn}>
                <Ionicons name="close" size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.detailsContent} keyboardShouldPersistTaps="handled">
              {/* Contextual Advisory Banners */}
              {selectedOffer.status === 'accepted' && (
                <View style={styles.dealClosedCard}>
                  <Ionicons name="trophy" size={20} color={COLORS.accent} />
                  <Text style={[styles.dealClosedText, isRTL && styles.textRTL]}>
                    {t('offerDealClosedBanner')}
                  </Text>
                </View>
              )}

              {userRole === 'seller' && selectedOffer.status === 'pending' && (
                <View style={styles.actionAdvisoryCard}>
                  <Ionicons name="alert-circle" size={18} color="#D97706" />
                  <Text style={[styles.actionAdvisoryText, isRTL && styles.textRTL]}>
                    {t('offerStatusPendingActionSeller')}
                  </Text>
                </View>
              )}

              {userRole === 'buyer' && selectedOffer.status === 'countered' && (
                <View style={styles.actionAdvisoryCard}>
                  <Ionicons name="information-circle" size={18} color="#0284C7" />
                  <Text style={[styles.actionAdvisoryText, isRTL && styles.textRTL]}>
                    {t('offerStatusCounteredActionBuyer')}
                  </Text>
                </View>
              )}

              {/* Data Rows */}
              <View style={[styles.detailRow, isRTL && styles.rowRTL]}>
                <Text style={styles.detailLabel}>{t('amount')}:</Text>
                <Text style={styles.detailValue}>
                  {(selectedOffer.amount || 0).toLocaleString()} {t('currencyAed')}
                </Text>
              </View>

              {selectedOffer.counter_amount ? (
                <View style={[styles.detailRow, isRTL && styles.rowRTL]}>
                  <Text style={styles.detailLabel}>{t('counterAmount')}:</Text>
                  <Text style={[styles.detailValue, { color: COLORS.primary }]}>
                    {(selectedOffer.counter_amount || 0).toLocaleString()} {t('currencyAed')}
                  </Text>
                </View>
              ) : null}

              {selectedOffer.message ? (
                <View style={styles.detailBlock}>
                  <Text style={[styles.detailLabel, isRTL && styles.textRTL]}>{t('message')}:</Text>
                  <Text style={[styles.detailValueBlock, isRTL && styles.textRTL]}>{selectedOffer.message}</Text>
                </View>
              ) : null}

              {selectedOffer.response_message ? (
                <View style={styles.detailBlock}>
                  <Text style={[styles.detailLabel, isRTL && styles.textRTL]}>{t('responseMessage')}:</Text>
                  <Text style={[styles.detailValueBlock, isRTL && styles.textRTL]}>
                    {selectedOffer.response_message}
                  </Text>
                </View>
              ) : null}

              {/* SteedMarket VIP Certified Escrow Guarantee Card */}
              <View testID="offer-escrow-guarantee-card" style={styles.escrowCard}>
                <View style={[styles.escrowHeaderRow, isRTL && styles.rowRTL]}>
                  <View style={styles.escrowIconWrap}>
                    <Ionicons name="shield-checkmark" size={18} color={COLORS.accentDark} />
                  </View>
                  <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                    <View style={[styles.escrowBadgeRow, isRTL && styles.rowRTL]}>
                      <View style={styles.escrowPulseDot} />
                      <Text style={styles.escrowBadgeText}>
                        {isRTL ? 'ضمان الإيداع والوساطة المالية' : 'STEEDMARKET VIP ESCROW GUARANTEE'}
                      </Text>
                    </View>
                    <Text style={[styles.escrowTitle, isRTL && styles.textRTL]}>
                      {isRTL ? 'تسوية مالية مؤمنة عبر الحساب الوسيط' : 'Protected Equine Escrow Settlement'}
                    </Text>
                    <Text style={[styles.escrowDesc, isRTL && styles.textRTL]}>
                      {isRTL
                        ? 'يتم حجز المبالغ في حساب ضمان ستيد ماركت حتى اكتمال الفحص البيطري واعتماد نقل الملكية'
                        : 'Funds are securely escrowed until veterinary inspection clearance and official passport transfer'}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  testID="offer-concierge-escrow-btn"
                  style={[styles.escrowCtaBtn, isRTL && styles.rowRTL]}
                  activeOpacity={0.85}
                  onPress={() => handleEscrowConcierge(selectedOffer)}
                >
                  <Ionicons name="logo-whatsapp" size={15} color="#25D366" />
                  <Text style={styles.escrowCtaBtnText}>
                    {isRTL
                      ? 'طلب تفعيل الضمان المالي والوساطة عبر واتساب'
                      : 'Request Escrow Protection on WhatsApp'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* WhatsApp Negotiation Bridge */}
              <TouchableOpacity
                testID="whatsapp-offer-button"
                style={[styles.whatsappBtn, isRTL && styles.rowRTL]}
                onPress={() => handleWhatsAppDiscuss(selectedOffer)}
              >
                <Ionicons name="logo-whatsapp" size={18} color={COLORS.white} />
                <Text style={styles.whatsappBtnText}>{t('offerWhatsAppInquiry')}</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Seller Action Buttons for Pending Offer */}
            {userRole === 'seller' && selectedOffer.status === 'pending' && !showResponseForm && (
              <View style={[styles.actionButtonsRow, isRTL && styles.rowRTL]}>
                <TouchableOpacity
                  testID="reject-offer-button"
                  style={[styles.actionBtn, styles.rejectBtn]}
                  onPress={handleRejectOffer}
                >
                  <Text style={styles.rejectBtnText}>{t('reject')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  testID="counter-offer-button"
                  style={[styles.actionBtn, styles.counterBtn]}
                  onPress={() => setShowResponseForm('counter')}
                >
                  <Text style={styles.counterBtnText}>{t('sendCounter')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  testID="accept-offer-button"
                  style={[styles.actionBtn, styles.acceptBtn]}
                  onPress={handleAcceptOffer}
                >
                  <Text style={styles.acceptBtnText}>{t('accept')}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Buyer Action Buttons for Countered Offer */}
            {userRole === 'buyer' && selectedOffer.status === 'countered' && !showResponseForm && (
              <View style={[styles.actionButtonsRow, isRTL && styles.rowRTL]}>
                <TouchableOpacity
                  testID="reject-offer-button"
                  style={[styles.actionBtn, styles.rejectBtn]}
                  onPress={handleRejectOffer}
                >
                  <Text style={styles.rejectBtnText}>{t('reject')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  testID="accept-offer-button"
                  style={[styles.actionBtn, styles.acceptBtn]}
                  onPress={handleAcceptOffer}
                >
                  <Text style={styles.acceptBtnText}>{t('accept')}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* In-Sheet Counter / Response Studio */}
            {showResponseForm && (
              <View style={styles.responseFormContainer}>
                {showResponseForm === 'counter' && (
                  <>
                    <Text style={[styles.formSubtitle, isRTL && styles.textRTL]}>{t('sendCounter')}</Text>

                    {quickCounterChips.length > 0 && (
                      <View style={styles.quickChipsSection}>
                        <Text style={[styles.quickChipsLabel, isRTL && styles.textRTL]}>
                          {t('counterQuickChipsLabel')}
                        </Text>
                        <View style={[styles.chipRow, isRTL && styles.rowRTL]}>
                          {quickCounterChips.map((chip, idx) => (
                            <TouchableOpacity
                              key={idx}
                              testID={`quick-counter-chip-${idx}`}
                              style={styles.presetChip}
                              onPress={() =>
                                setResponseData((prev) => ({
                                  ...prev,
                                  counterAmount: chip.amount.toString(),
                                }))
                              }
                            >
                              <Text style={styles.presetChipText}>
                                {t(chip.labelKey)} ({chip.amount.toLocaleString()})
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}

                    <TextInput
                      style={[styles.input, isRTL && styles.inputRTL]}
                      placeholder={`${t('counterAmount')} (${t('currencyAed')})`}
                      placeholderTextColor={COLORS.textLight}
                      value={responseData.counterAmount}
                      onChangeText={(text) => setResponseData((prev) => ({ ...prev, counterAmount: text }))}
                      keyboardType="numeric"
                      editable={!submitting}
                      textAlign={isRTL ? 'right' : 'left'}
                    />
                    {responseErrors.counterAmount && (
                      <Text style={[styles.errorText, isRTL && styles.textRTL]}>
                        {responseErrors.counterAmount}
                      </Text>
                    )}
                  </>
                )}

                {(showResponseForm === 'reject' || showResponseForm === 'accept') && (
                  <Text style={[styles.formSubtitle, isRTL && styles.textRTL]}>
                    {showResponseForm === 'reject' ? t('rejectReason') : t('acceptMessage')}
                  </Text>
                )}

                <TextInput
                  style={[styles.input, styles.messageInput, isRTL && styles.inputRTL]}
                  placeholder={t('responseMessage')}
                  placeholderTextColor={COLORS.textLight}
                  value={responseData.responseMessage}
                  onChangeText={(text) => setResponseData((prev) => ({ ...prev, responseMessage: text }))}
                  multiline
                  editable={!submitting}
                  textAlign={isRTL ? 'right' : 'left'}
                />

                <View style={[styles.buttonRow, isRTL && styles.rowRTL]}>
                  <TouchableOpacity
                    style={[styles.btn, styles.cancelBtn]}
                    onPress={() => {
                      setShowResponseForm(null);
                      setResponseData({ counterAmount: '', responseMessage: '' });
                      setResponseErrors({});
                    }}
                    disabled={submitting}
                  >
                    <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    testID="submit-response-button"
                    style={[styles.btn, styles.submitBtn]}
                    onPress={
                      showResponseForm === 'counter'
                        ? handleCounterOffer
                        : showResponseForm === 'accept'
                        ? handleAcceptOffer
                        : handleRejectOffer
                    }
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                      <Text style={styles.submitBtnText}>
                        {showResponseForm === 'counter'
                          ? t('sendCounter')
                          : showResponseForm === 'accept'
                          ? t('accept')
                          : t('reject')}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    ...SHADOWS.card,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: SPACING.xs,
  },
  brandMarkCrest: {
    marginRight: 2,
  },
  portalBadge: {
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
  portalPulseDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10B981',
    marginRight: 4,
  },
  portalBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#8C6D23',
    letterSpacing: 0.5,
  },
  headerActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  headerHotlineBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#A5D6A7',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.subtle,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    marginHorizontal: SPACING.xs,
  },
  headerTitle: {
    ...FONTS.h3,
    color: COLORS.text,
    fontWeight: '800',
  },
  headerSubtitle: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 7,
    borderRadius: RADIUS.md,
    gap: 4,
  },
  createBtnText: {
    ...FONTS.caption,
    color: COLORS.white,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    gap: SPACING.sm,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.primaryLight + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  emptyTitle: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  emptyActionBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    marginTop: SPACING.xs,
  },
  emptyActionBtnText: {
    ...FONTS.button,
    color: COLORS.white,
  },
  offersList: {
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  offerCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.card,
  },
  offerCardSelected: {
    borderColor: COLORS.primary,
    borderWidth: 1.5,
  },
  offerCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  offerAmountText: {
    ...FONTS.h3,
    color: COLORS.text,
    fontWeight: '800',
  },
  offerPartyText: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  statusText: {
    ...FONTS.caption,
    fontSize: 11,
    fontWeight: '700',
  },
  offerMessageText: {
    ...FONTS.bodySmall,
    color: COLORS.text,
    fontStyle: 'italic',
    marginTop: SPACING.xs + 2,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight + '10',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.xs,
    gap: 6,
  },
  counterText: {
    ...FONTS.caption,
    color: COLORS.primary,
    fontWeight: '700',
  },
  offerCardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  offerDateText: {
    ...FONTS.caption,
    color: COLORS.textLight,
  },
  // Form Studio Styles
  formScroll: {
    padding: SPACING.md,
  },
  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.card,
  },
  formTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  formIconBadge: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.accent + '20',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.accent + '50',
  },
  formTitle: {
    ...FONTS.h3,
    color: COLORS.text,
    fontWeight: '800',
  },
  askingPriceText: {
    ...FONTS.caption,
    color: COLORS.accent,
    fontWeight: '700',
    marginTop: 2,
  },
  quickChipsSection: {
    marginBottom: SPACING.md,
  },
  quickChipsLabel: {
    ...FONTS.caption,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  presetChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EBE7E0',
  },
  presetChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  presetChipText: {
    ...FONTS.caption,
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text,
  },
  presetChipTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  inputWrap: {
    marginBottom: SPACING.sm + 2,
  },
  inputLabel: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    fontWeight: '700',
    marginBottom: 4,
  },
  input: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    ...FONTS.body,
    color: COLORS.text,
  },
  messageInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  trustCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.primaryLight + '0C',
    borderRadius: RADIUS.md,
    padding: SPACING.sm + 2,
    borderWidth: 1,
    borderColor: COLORS.accent + '40',
    marginVertical: SPACING.sm,
  },
  trustTitle: {
    ...FONTS.caption,
    fontWeight: '800',
    color: COLORS.primary,
  },
  trustDesc: {
    ...FONTS.caption,
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  btn: {
    flex: 1,
    paddingVertical: SPACING.sm + 4,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelBtnText: {
    ...FONTS.button,
    color: COLORS.textSecondary,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    ...SHADOWS.card,
  },
  submitBtnText: {
    ...FONTS.button,
    color: COLORS.white,
  },
  errorText: {
    ...FONTS.caption,
    color: COLORS.error,
    marginTop: 4,
  },
  // Details Sheet
  detailsContainer: {
    maxHeight: '55%',
    backgroundColor: COLORS.card,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    ...SHADOWS.card,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  detailsTitle: {
    ...FONTS.h3,
    color: COLORS.text,
    fontWeight: '800',
  },
  detailsCloseBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsContent: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  dealClosedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  dealClosedText: {
    ...FONTS.caption,
    color: '#2E7D32',
    fontWeight: '700',
    flex: 1,
  },
  actionAdvisoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  actionAdvisoryText: {
    ...FONTS.caption,
    color: '#B45309',
    fontWeight: '700',
    flex: 1,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  detailBlock: {
    paddingVertical: SPACING.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  detailLabel: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  detailValue: {
    ...FONTS.body,
    color: COLORS.text,
    fontWeight: '700',
  },
  detailValueBlock: {
    ...FONTS.bodySmall,
    color: COLORS.text,
    marginTop: 2,
  },
  whatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm + 2,
    gap: 6,
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  whatsappBtnText: {
    ...FONTS.button,
    color: COLORS.white,
    fontSize: 13,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: SPACING.xs + 2,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtn: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  rejectBtnText: {
    ...FONTS.button,
    color: COLORS.error,
    fontSize: 12,
  },
  counterBtn: {
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  counterBtnText: {
    ...FONTS.button,
    color: '#0284C7',
    fontSize: 12,
  },
  acceptBtn: {
    backgroundColor: COLORS.primary,
  },
  acceptBtnText: {
    ...FONTS.button,
    color: COLORS.white,
    fontSize: 12,
  },
  responseFormContainer: {
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  formSubtitle: {
    ...FONTS.h3,
    color: COLORS.text,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  escrowCard: {
    backgroundColor: '#FDFBF7',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#EFE7DA',
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  escrowHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  escrowIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FAF5E8',
    borderWidth: 1,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  escrowBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  escrowPulseDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10B981',
    marginRight: 4,
  },
  escrowBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.accentDark,
    letterSpacing: 0.5,
  },
  escrowTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  escrowDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  escrowCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#81C784',
    paddingVertical: 9,
    borderRadius: RADIUS.full,
  },
  escrowCtaBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1B5E20',
  },
  emptyConciergeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#81C784',
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    marginTop: SPACING.md,
  },
  emptyConciergeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1B5E20',
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

export default OfferHistorySheet;
