import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Alert, Linking } from 'react-native';
import AdminEditHorseScreen from '../AdminEditHorseScreen';
import * as apiService from '../../services/api';

jest.mock('../../services/api', () => ({
  updateHorse: jest.fn(),
}));

const mockToastShow = jest.fn();
jest.mock('../../components/ToastProvider', () => ({
  useToast: () => ({ show: mockToastShow }),
}));

const mockHorse = {
  id: 'horse-789',
  title: 'Al Aryam Royal Champion',
  price: 250000,
  breed: 'Arabian',
  age: 5,
  gender: 'stallion',
  discipline: 'Show Horse',
  height: 1.56,
  location_text: 'Dubai, UAE',
  description: 'Purebred champion Arabian stallion with exceptional pedigree and graceful movement.',
  vet_check_available: true,
  images: [
    { id: 'img-1', image_url: 'https://example.com/horse1.jpg' },
    { id: 'img-2', image_url: 'https://example.com/horse2.jpg' },
  ],
};

describe('AdminEditHorseScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Linking, 'openURL').mockImplementation(() => Promise.resolve());
    apiService.updateHorse.mockResolvedValue({ data: { success: true } });
    jest.spyOn(Alert, 'alert').mockImplementation((title, msg, buttons) => {
      // simulate clicking delete
      const deleteBtn = buttons?.find((b) => b.style === 'destructive');
      if (deleteBtn?.onPress) deleteBtn.onPress();
    });
  });

  afterEach(() => {
    Alert.alert.mockRestore?.();
    jest.restoreAllMocks();
  });

  it('renders horse details, photos, title, price, and pedigree fields correctly', () => {
    const { getByTestId, getByText } = render(
      <AdminEditHorseScreen
        navigation={{ goBack: jest.fn() }}
        route={{ params: { horse: mockHorse } }}
      />
    );

    expect(getByTestId('input-horse-title').props.value).toBe('Al Aryam Royal Champion');
    expect(getByTestId('input-horse-price').props.value).toBe('250000');
    expect(getByText('Arabian')).toBeTruthy();
    expect(getByTestId('input-horse-age').props.value).toBe('5');
    expect(getByTestId('input-horse-height').props.value).toBe('1.56');
    expect(getByTestId('input-horse-discipline').props.value).toBe('Show Horse');
    expect(getByTestId('input-horse-location').props.value).toBe('Dubai, UAE');
    expect(getByText('250,000 AED')).toBeTruthy();
  });

  it('handles back button navigation', () => {
    const goBack = jest.fn();
    const { getByTestId } = render(
      <AdminEditHorseScreen
        navigation={{ goBack }}
        route={{ params: { horse: mockHorse } }}
      />
    );

    fireEvent.press(getByTestId('admin-edit-horse-back-btn'));
    expect(goBack).toHaveBeenCalledTimes(1);
  });

  it('allows opening breed modal, filtering, and selecting a breed', () => {
    const { getByTestId, getByText } = render(
      <AdminEditHorseScreen
        navigation={{ goBack: jest.fn() }}
        route={{ params: { horse: mockHorse } }}
      />
    );

    fireEvent.press(getByTestId('select-breed-btn'));
    expect(getByTestId('breed-search-input')).toBeTruthy();

    fireEvent.changeText(getByTestId('breed-search-input'), 'Thorough');
    expect(getByTestId('breed-item-Thoroughbred')).toBeTruthy();

    fireEvent.press(getByTestId('breed-item-Thoroughbred'));
    expect(getByText('Thoroughbred')).toBeTruthy();
  });

  it('switches gender when tapping gender chips', async () => {
    const { getByTestId } = render(
      <AdminEditHorseScreen
        navigation={{ goBack: jest.fn() }}
        route={{ params: { horse: mockHorse } }}
      />
    );

    fireEvent.press(getByTestId('gender-chip-mare'));
    fireEvent.press(getByTestId('admin-save-horse-btn'));

    await waitFor(() => {
      expect(apiService.updateHorse).toHaveBeenCalledWith(
        'horse-789',
        expect.objectContaining({
          gender: 'mare',
        })
      );
    });
  });

  it('updates discipline and location using quick selection chips', () => {
    const { getByTestId } = render(
      <AdminEditHorseScreen
        navigation={{ goBack: jest.fn() }}
        route={{ params: { horse: mockHorse } }}
      />
    );

    fireEvent.press(getByTestId('discipline-chip-endurance'));
    expect(getByTestId('input-horse-discipline').props.value).toBe('Endurance');

    fireEvent.press(getByTestId('emirate-chip-abu-dhabi'));
    expect(getByTestId('input-horse-location').props.value).toBe('Abu Dhabi');
  });

  it('toggles veterinary inspection status', async () => {
    const { getByTestId } = render(
      <AdminEditHorseScreen
        navigation={{ goBack: jest.fn() }}
        route={{ params: { horse: mockHorse } }}
      />
    );

    fireEvent.press(getByTestId('vet-check-toggle'));
    fireEvent.press(getByTestId('admin-save-horse-btn'));

    await waitFor(() => {
      expect(apiService.updateHorse).toHaveBeenCalledWith(
        'horse-789',
        expect.objectContaining({
          vet_check_available: false,
        })
      );
    });
  });

  it('removes photo on delete button press with confirmation', () => {
    const { getByTestId, queryByTestId } = render(
      <AdminEditHorseScreen
        navigation={{ goBack: jest.fn() }}
        route={{ params: { horse: mockHorse } }}
      />
    );

    expect(getByTestId('delete-photo-1')).toBeTruthy();
    fireEvent.press(getByTestId('delete-photo-1'));

    expect(Alert.alert).toHaveBeenCalled();
    expect(queryByTestId('delete-photo-1')).toBeNull();
  });

  it('validates required fields before submitting', async () => {
    const { getByTestId, getByText } = render(
      <AdminEditHorseScreen
        navigation={{ goBack: jest.fn() }}
        route={{ params: { horse: mockHorse } }}
      />
    );

    fireEvent.changeText(getByTestId('input-horse-title'), '');
    fireEvent.press(getByTestId('admin-save-horse-btn'));

    await waitFor(() => {
      expect(getByText('titleRequired')).toBeTruthy();
    });
    expect(apiService.updateHorse).not.toHaveBeenCalled();
  });

  it('submits updated horse listing data and navigates back', async () => {
    const goBack = jest.fn();
    const { getByTestId } = render(
      <AdminEditHorseScreen
        navigation={{ goBack }}
        route={{ params: { horse: mockHorse } }}
      />
    );

    fireEvent.changeText(getByTestId('input-horse-price'), '280000');
    fireEvent.press(getByTestId('admin-save-horse-btn'));

    await waitFor(() => {
      expect(apiService.updateHorse).toHaveBeenCalledWith('horse-789', {
        title: 'Al Aryam Royal Champion',
        price: 280000,
        breed: 'Arabian',
        age: 5,
        gender: 'stallion',
        discipline: 'Show Horse',
        height: 1.56,
        location_text: 'Dubai, UAE',
        description: 'Purebred champion Arabian stallion with exceptional pedigree and graceful movement.',
        vet_check_available: true,
        image_urls: ['https://example.com/horse1.jpg', 'https://example.com/horse2.jpg'],
      });
      expect(mockToastShow).toHaveBeenCalledWith('adminHorseUpdated', { type: 'success' });
      expect(goBack).toHaveBeenCalledTimes(1);
    });
  });

  it('renders executive header hotline and equine pedigree integrity shield with registrar consultation', () => {
    const { getByTestId } = render(
      <AdminEditHorseScreen
        navigation={{ goBack: jest.fn() }}
        route={{ params: { horse: mockHorse } }}
      />
    );

    // Header hotline button
    expect(getByTestId('admin-edit-horse-hotline-btn')).toBeTruthy();
    fireEvent.press(getByTestId('admin-edit-horse-hotline-btn'));
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/971500000000'));

    // Equine pedigree integrity shield card & registrar consultation button
    expect(getByTestId('admin-horse-integrity-shield')).toBeTruthy();
    expect(getByTestId('admin-horse-registrar-consult-btn')).toBeTruthy();
    fireEvent.press(getByTestId('admin-horse-registrar-consult-btn'));
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/971500000000'));
  });
});
