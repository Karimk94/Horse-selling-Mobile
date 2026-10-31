import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { Text, TouchableOpacity, Linking } from 'react-native';
import ToastProvider, { useToast } from '../ToastProvider';

function TestConsumer({ message = 'Listing updated successfully!', options = { type: 'success', duration: 1000 } }) {
  const toast = useToast();
  return (
    <TouchableOpacity
      testID="trigger-toast-btn"
      onPress={() => toast.show(message, options)}
    >
      <Text>Trigger</Text>
    </TouchableOpacity>
  );
}

describe('ToastProvider', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
    Linking.openURL.mockRestore?.();
  });

  it('renders children properly when no toast is displayed', () => {
    const { getByText, queryByTestId } = render(
      <ToastProvider>
        <Text>Child App Content</Text>
      </ToastProvider>
    );

    expect(getByText('Child App Content')).toBeTruthy();
    expect(queryByTestId('toast-container')).toBeNull();
  });

  it('displays toast message upon show call', () => {
    const { getByTestId, getByText } = render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    fireEvent.press(getByTestId('trigger-toast-btn'));

    expect(getByTestId('toast-container')).toBeTruthy();
    expect(getByTestId('toast-message')).toBeTruthy();
    expect(getByTestId('toast-pulse-dot')).toBeTruthy();
    expect(getByText('Listing updated successfully!')).toBeTruthy();
  });

  it('dismisses toast on tap of dismiss button', () => {
    const { getByTestId, queryByTestId } = render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    fireEvent.press(getByTestId('trigger-toast-btn'));
    expect(getByTestId('toast-dismiss-btn')).toBeTruthy();

    fireEvent.press(getByTestId('toast-dismiss-btn'));
    act(() => {
      jest.advanceTimersByTime(250);
    });

    expect(queryByTestId('toast-container')).toBeNull();
  });

  it('auto-dismisses toast after duration expires', () => {
    const { getByTestId, queryByTestId } = render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    fireEvent.press(getByTestId('trigger-toast-btn'));
    expect(getByTestId('toast-container')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(1200);
    });

    expect(queryByTestId('toast-container')).toBeNull();
  });

  it('renders 1-tap WhatsApp concierge CTA and dispatches inquiry', () => {
    const { getByTestId } = render(
      <ToastProvider>
        <TestConsumer
          message="Server verification failed. Please check with concierge."
          options={{ type: 'error', duration: 3000, showConcierge: true }}
        />
      </ToastProvider>
    );

    fireEvent.press(getByTestId('trigger-toast-btn'));

    const conciergeBtn = getByTestId('toast-concierge-btn');
    expect(conciergeBtn).toBeTruthy();

    fireEvent.press(conciergeBtn);
    expect(Linking.openURL).toHaveBeenCalledWith(
      expect.stringContaining('wa.me/971500000000')
    );
  });

  it('renders custom action button and invokes callback', () => {
    const onAction = jest.fn();
    const { getByTestId, getByText } = render(
      <ToastProvider>
        <TestConsumer
          message="Connection timeout"
          options={{
            type: 'warning',
            duration: 3000,
            action: { label: 'Retry', onPress: onAction },
          }}
        />
      </ToastProvider>
    );

    fireEvent.press(getByTestId('trigger-toast-btn'));

    const actionBtn = getByTestId('toast-action-btn');
    expect(actionBtn).toBeTruthy();
    expect(getByText('Retry')).toBeTruthy();

    fireEvent.press(actionBtn);
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('renders Arabic message in RTL alignment', () => {
    const { getByTestId, getByText } = render(
      <ToastProvider>
        <TestConsumer
          message="تم تحديث بيانات الخيل بنجاح"
          options={{ type: 'success', duration: 3000 }}
        />
      </ToastProvider>
    );

    fireEvent.press(getByTestId('trigger-toast-btn'));

    expect(getByText('تم تحديث بيانات الخيل بنجاح')).toBeTruthy();
    expect(getByTestId('toast-pulse-dot')).toBeTruthy();
  });
});
