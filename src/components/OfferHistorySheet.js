import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { COLORS } from '../config/theme';
import { useLanguage } from '../contexts/LanguageContext';

const TYPOGRAPHY = {
  sizes: { xs: 11, sm: 13, md: 15, lg: 18 },
  weights: { semibold: '600' },
};
import * as apiService from '../services/api';
import { useToast } from '../components/ToastProvider';

const OfferHistorySheet = ({ horseId, isVisible, onClose, userRole = 'buyer', onOfferUpdated }) => {
  const { t } = useLanguage();
  const [offers, setOffers] = useState([]);
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [formData, setFormData] = useState({ amount: '', message: '' });
  const [responseData, setResponseData] = useState({ counterAmount: '', responseMessage: '' });
  const [formErrors, setFormErrors] = useState({});
  const [responseErrors, setResponseErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

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
        setOffers(response.data.offers || []);
      } else {
        const response = await apiService.getMyOffers('buyer', null);
        const horseOffers = response.data.offers.filter((o) => o.horse_id === horseId);
        setOffers(horseOffers);
      }
    } catch (error) {
      toast.show(t('offerLoadFailed'), { type: 'error' });
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
      toast.show(t('offerCreated'), { type: 'success' });
      setFormData({ amount: '', message: '' });
      setShowOfferForm(false);
      await loadOffers();
      onOfferUpdated?.();
    } catch (error) {
      toast.show(t('offerCreateFailed'), { type: 'error' });
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
      toast.show(t('counterOfferSent'), { type: 'success' });
      setResponseData({ counterAmount: '', responseMessage: '' });
      setShowResponseForm(false);
      setSelectedOffer(null);
      await loadOffers();
      onOfferUpdated?.();
    } catch (error) {
      toast.show(t('counterOfferFailed'), { type: 'error' });
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
              toast.show(t('offerAccepted'), { type: 'success' });
              setResponseData({ counterAmount: '', responseMessage: '' });
              setShowResponseForm(false);
              setSelectedOffer(null);
              await loadOffers();
              onOfferUpdated?.();
            } catch (error) {
              toast.show(t('offerAcceptFailed'), { type: 'error' });
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
              toast.show(t('offerRejected'), { type: 'success' });
              setResponseData({ counterAmount: '', responseMessage: '' });
              setShowResponseForm(false);
              setSelectedOffer(null);
              await loadOffers();
              onOfferUpdated?.();
            } catch (error) {
              toast.show(t('offerRejectFailed'), { type: 'error' });
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return COLORS.warning;
      case 'countered':
        return COLORS.info;
      case 'accepted':
        return COLORS.success;
      case 'rejected':
        return COLORS.error;
      case 'cancelled':
        return COLORS.gray;
      default:
        return COLORS.secondary;
    }
  };

  return (
    <Modal visible={isVisible} animationType="slide" transparent={false}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t('offerHistory')}</Text>
          {userRole === 'buyer' && !showOfferForm && (
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => setShowOfferForm(true)}
            >
              <Text style={styles.createButtonText}>+</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : showOfferForm ? (
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>{t('makeOffer')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('offerAmount') + ' ($)'}
              value={formData.amount}
              onChangeText={(text) => setFormData({ ...formData, amount: text })}
              keyboardType="decimal-pad"
              editable={!submitting}
            />
            {formErrors.amount && (
              <Text style={styles.errorText}>{formErrors.amount}</Text>
            )}
            <TextInput
              style={[styles.input, styles.messageInput]}
              placeholder={t('offerMessage')}
              value={formData.message}
              onChangeText={(text) => setFormData({ ...formData, message: text })}
              multiline
              editable={!submitting}
            />
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  setShowOfferForm(false);
                  setFormData({ amount: '', message: '' });
                  setFormErrors({});
                }}
                disabled={submitting}
              >
                <Text style={styles.buttonText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.submitButton]}
                onPress={handleCreateOffer}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.buttonText}>{t('send')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : offers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t('noOffers')}</Text>
          </View>
        ) : (
          <ScrollView style={styles.offersList}>
            {offers.map((offer) => (
              <TouchableOpacity
                key={offer.id}
                style={styles.offerCard}
                onPress={() => setSelectedOffer(offer)}
              >
                <View style={styles.offerHeader}>
                  <View>
                    <Text style={styles.offerAmount}>${offer.amount?.toFixed(2)}</Text>
                    <Text style={styles.offerParty}>
                      {userRole === 'buyer' ? t('you') : offer.buyer_email}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(offer.status) },
                    ]}
                  >
                    <Text style={styles.statusText}>{t(`status_${offer.status}`)}</Text>
                  </View>
                </View>
                {offer.message && (
                  <Text style={styles.offerMessage}>{offer.message}</Text>
                )}
                {offer.counter_amount && (
                  <Text style={styles.counterAmount}>
                    {t('counterOffer')}: ${offer.counter_amount?.toFixed(2)}
                  </Text>
                )}
                <Text style={styles.offerDate}>
                  {new Date(offer.created_at).toLocaleDateString()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {selectedOffer && !showOfferForm && (
          <View style={styles.detailsContainer}>
            <View style={styles.detailsHeader}>
              <Text style={styles.detailsTitle}>{t('offerDetails')}</Text>
              <TouchableOpacity onPress={() => setSelectedOffer(null)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.details}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('amount')}:</Text>
                <Text style={styles.detailValue}>${selectedOffer.amount?.toFixed(2)}</Text>
              </View>
              {selectedOffer.counter_amount && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{t('counterAmount')}:</Text>
                  <Text style={styles.detailValue}>
                    ${selectedOffer.counter_amount?.toFixed(2)}
                  </Text>
                </View>
              )}
              {selectedOffer.message && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{t('message')}:</Text>
                  <Text style={styles.detailValue}>{selectedOffer.message}</Text>
                </View>
              )}
              {selectedOffer.response_message && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{t('responseMessage')}:</Text>
                  <Text style={styles.detailValue}>{selectedOffer.response_message}</Text>
                </View>
              )}
            </ScrollView>

            {userRole === 'seller' && selectedOffer.status === 'pending' && !showResponseForm && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.button, styles.rejectButton]}
                  onPress={() => setShowResponseForm('reject')}
                >
                  <Text style={styles.buttonText}>{t('reject')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.counterButton]}
                  onPress={() => setShowResponseForm('counter')}
                >
                  <Text style={styles.buttonText}>{t('sendCounter')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.acceptButton]}
                  onPress={() => setShowResponseForm('accept')}
                >
                  <Text style={styles.buttonText}>{t('accept')}</Text>
                </TouchableOpacity>
              </View>
            )}

            {userRole === 'buyer' && selectedOffer.status === 'countered' && !showResponseForm && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.button, styles.rejectButton]}
                  onPress={() => setShowResponseForm('reject')}
                >
                  <Text style={styles.buttonText}>{t('reject')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.acceptButton]}
                  onPress={() => setShowResponseForm('accept')}
                >
                  <Text style={styles.buttonText}>{t('accept')}</Text>
                </TouchableOpacity>
              </View>
            )}

            {showResponseForm && (
              <View style={styles.responseForm}>
                {showResponseForm === 'counter' && (
                  <>
                    <Text style={styles.formTitle}>{t('sendCounter')}</Text>
                    <TextInput
                      style={styles.input}
                      placeholder={t('counterAmount') + ' ($)'}
                      value={responseData.counterAmount}
                      onChangeText={(text) =>
                        setResponseData({ ...responseData, counterAmount: text })
                      }
                      keyboardType="decimal-pad"
                      editable={!submitting}
                    />
                        {responseErrors.counterAmount && (
                          <Text style={styles.errorText}>{responseErrors.counterAmount}</Text>
                        )}
                  </>
                )}
                {(showResponseForm === 'reject' || showResponseForm === 'accept') && (
                  <Text style={styles.formTitle}>
                    {showResponseForm === 'reject' ? t('rejectReason') : t('acceptMessage')}
                  </Text>
                )}
                <TextInput
                  style={[styles.input, styles.messageInput]}
                  placeholder={t('message')}
                  value={responseData.responseMessage}
                  onChangeText={(text) =>
                    setResponseData({ ...responseData, responseMessage: text })
                  }
                  multiline
                  editable={!submitting}
                />
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.button, styles.cancelButton]}
                    onPress={() => {
                      setShowResponseForm(false);
                      setResponseData({ counterAmount: '', responseMessage: '' });
                      setResponseErrors({});
                    }}
                    disabled={submitting}
                  >
                    <Text style={styles.buttonText}>{t('cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.button, styles.submitButton]}
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
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text style={styles.buttonText}>
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
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.text,
  },
  closeButton: {
    fontSize: 24,
    color: COLORS.secondary,
    width: 30,
    textAlign: 'center',
  },
  createButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 20,
    color: 'white',
    fontWeight: 'bold',
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
  },
  emptyText: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.secondary,
  },
  offersList: {
    flex: 1,
    padding: 16,
  },
  offerCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  offerAmount: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.text,
  },
  offerParty: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.secondary,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: 'white',
  },
  offerMessage: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.text,
    marginVertical: 8,
    fontStyle: 'italic',
  },
  counterAmount: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.info,
    fontWeight: TYPOGRAPHY.weights.semibold,
    marginVertical: 4,
  },
  offerDate: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.secondary,
    marginTop: 8,
  },
  formContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: 'white',
  },
  formTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.text,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.text,
  },
  messageInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.border,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
  },
  acceptButton: {
    backgroundColor: COLORS.success,
  },
  rejectButton: {
    backgroundColor: COLORS.error,
  },
  counterButton: {
    backgroundColor: COLORS.warning,
  },
  buttonText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: 'white',
  },
  detailsContainer: {
    maxHeight: '50%',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailsTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.text,
  },
  details: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  detailRow: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.secondary,
  },
  detailValue: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.text,
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  responseForm: {
    padding: 16,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  errorText: {
    color: COLORS.error,
    marginBottom: 12,
    fontSize: TYPOGRAPHY.sizes.xs,
  },
});

export default OfferHistorySheet;
