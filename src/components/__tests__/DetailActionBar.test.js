import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import DetailActionBar from '../DetailActionBar';

describe('DetailActionBar', () => {
  const mockCall = jest.fn();
  const mockWhatsApp = jest.fn();

  const actions = [
    { id: 'call', icon: 'call', label: 'Call Owner', color: '#2563eb', onPress: mockCall },
    { id: 'whatsapp', icon: 'logo-whatsapp', label: 'WhatsApp', color: '#16a34a', onPress: mockWhatsApp },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  });

  afterEach(() => {
    Linking.openURL.mockRestore?.();
  });

  it('renders all action buttons with labels correctly', () => {
    const { getByText, getByTestId } = render(<DetailActionBar actions={actions} />);

    expect(getByTestId('detail-action-bar')).toBeTruthy();
    expect(getByText('Call Owner')).toBeTruthy();
    expect(getByText('WhatsApp')).toBeTruthy();
    expect(getByTestId('detail-action-call')).toBeTruthy();
    expect(getByTestId('detail-action-whatsapp')).toBeTruthy();
  });

  it('triggers action onPress callback when pressed', () => {
    const { getByTestId } = render(<DetailActionBar actions={actions} />);

    fireEvent.press(getByTestId('detail-action-call'));
    expect(mockCall).toHaveBeenCalledTimes(1);

    fireEvent.press(getByTestId('detail-action-whatsapp'));
    expect(mockWhatsApp).toHaveBeenCalledTimes(1);
  });

  it('renders in RTL order when isRTL is true', () => {
    const { getByTestId, getByText } = render(
      <DetailActionBar actions={actions} isRTL={true} />
    );
    const bar = getByTestId('detail-action-bar');
    expect(bar).toBeTruthy();
    expect(getByText('حماية ووساطة ستيد ماركت المعتمدة')).toBeTruthy();
    expect(getByText('الوسيط المعتمد')).toBeTruthy();
  });

  it('does not trigger press on inactive buttons', () => {
    const inactiveAction = [
      { id: 'reserve', icon: 'lock-closed', label: 'Sold', color: '#64748b', inactive: true, onPress: jest.fn() },
    ];
    const { getByTestId } = render(<DetailActionBar actions={inactiveAction} />);
    const btn = getByTestId('detail-action-reserve');

    fireEvent.press(btn);
    expect(inactiveAction[0].onPress).not.toHaveBeenCalled();
  });

  it('returns null if actions array is empty or undefined', () => {
    const { queryByTestId } = render(<DetailActionBar actions={[]} />);
    expect(queryByTestId('detail-action-bar')).toBeNull();
  });

  it('renders VIP escrow ribbon by default and triggers WhatsApp concierge on press', () => {
    const { getByTestId, getByText } = render(
      <DetailActionBar actions={actions} title="Prestige Arabian Saddle" />
    );

    expect(getByTestId('detail-action-escrow-ribbon')).toBeTruthy();
    expect(getByText('STEEDMARKET VIP ESCROW & VERIFIED SELLER')).toBeTruthy();

    const conciergeBtn = getByTestId('detail-action-concierge-btn');
    expect(conciergeBtn).toBeTruthy();

    fireEvent.press(conciergeBtn);
    expect(Linking.openURL).toHaveBeenCalledWith(
      expect.stringContaining('wa.me/971500000000')
    );
    expect(Linking.openURL).toHaveBeenCalledWith(
      expect.stringContaining(encodeURIComponent('Prestige Arabian Saddle'))
    );
  });

  it('invokes custom onConciergePress callback when provided', () => {
    const onConciergePress = jest.fn();
    const { getByTestId } = render(
      <DetailActionBar actions={actions} onConciergePress={onConciergePress} />
    );

    fireEvent.press(getByTestId('detail-action-concierge-btn'));
    expect(onConciergePress).toHaveBeenCalledTimes(1);
    expect(Linking.openURL).not.toHaveBeenCalled();
  });

  it('hides VIP escrow ribbon when showEscrowRibbon is false', () => {
    const { queryByTestId } = render(
      <DetailActionBar actions={actions} showEscrowRibbon={false} />
    );

    expect(queryByTestId('detail-action-escrow-ribbon')).toBeNull();
  });
});
