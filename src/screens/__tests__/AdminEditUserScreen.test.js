import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import AdminEditUserScreen from '../AdminEditUserScreen';
import * as apiService from '../../services/api';

jest.mock('../../services/api', () => ({
  adminUpdateUser: jest.fn(),
}));

const mockToastShow = jest.fn();
jest.mock('../../components/ToastProvider', () => ({
  useToast: () => ({ show: mockToastShow }),
}));

const mockUser = {
  id: 'usr-456',
  email: 'zayed.breeder@steedmarket.ae',
  role: 'seller',
  is_verified: true,
  profile: {
    first_name: 'Zayed',
    last_name: 'Al Mansoori',
    phone_number: '+971501234567',
    location: 'Abu Dhabi',
  },
};

describe('AdminEditUserScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Linking, 'openURL').mockImplementation(() => Promise.resolve());
    apiService.adminUpdateUser.mockResolvedValue({ data: { success: true } });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders user details, email, and role cards correctly', () => {
    const { getByText, getByTestId } = render(
      <AdminEditUserScreen
        navigation={{ goBack: jest.fn() }}
        route={{ params: { user: mockUser } }}
      />
    );

    expect(getByText('zayed.breeder@steedmarket.ae')).toBeTruthy();
    expect(getByTestId('input-first-name').props.value).toBe('Zayed');
    expect(getByTestId('input-last-name').props.value).toBe('Al Mansoori');
    expect(getByTestId('input-phone').props.value).toBe('+971501234567');
    expect(getByTestId('input-location').props.value).toBe('Abu Dhabi');
    expect(getByTestId('role-card-seller')).toBeTruthy();
  });

  it('handles back button navigation', () => {
    const goBack = jest.fn();
    const { getByTestId } = render(
      <AdminEditUserScreen
        navigation={{ goBack }}
        route={{ params: { user: mockUser } }}
      />
    );

    fireEvent.press(getByTestId('admin-edit-user-back-btn'));
    expect(goBack).toHaveBeenCalledTimes(1);
  });

  it('updates location when tapping UAE emirate chip', () => {
    const { getByTestId } = render(
      <AdminEditUserScreen
        navigation={{ goBack: jest.fn() }}
        route={{ params: { user: mockUser } }}
      />
    );

    fireEvent.press(getByTestId('emirate-chip-dubai'));
    expect(getByTestId('input-location').props.value).toBe('Dubai');
  });

  it('switches role when selecting a different role card', async () => {
    const { getByTestId } = render(
      <AdminEditUserScreen
        navigation={{ goBack: jest.fn() }}
        route={{ params: { user: mockUser } }}
      />
    );

    fireEvent.press(getByTestId('role-card-buyer'));
    fireEvent.press(getByTestId('admin-save-user-btn'));

    await waitFor(() => {
      expect(apiService.adminUpdateUser).toHaveBeenCalledWith(
        'usr-456',
        expect.objectContaining({
          role: 'buyer',
        })
      );
    });
  });

  it('toggles verification state upon pressing verify card', async () => {
    const { getByTestId } = render(
      <AdminEditUserScreen
        navigation={{ goBack: jest.fn() }}
        route={{ params: { user: mockUser } }}
      />
    );

    fireEvent.press(getByTestId('verify-toggle'));
    fireEvent.press(getByTestId('admin-save-user-btn'));

    await waitFor(() => {
      expect(apiService.adminUpdateUser).toHaveBeenCalledWith(
        'usr-456',
        expect.objectContaining({
          is_verified: false,
        })
      );
    });
  });

  it('validates first name minimum length', async () => {
    const { getByTestId, getByText } = render(
      <AdminEditUserScreen
        navigation={{ goBack: jest.fn() }}
        route={{ params: { user: mockUser } }}
      />
    );

    fireEvent.changeText(getByTestId('input-first-name'), 'A');
    fireEvent.press(getByTestId('admin-save-user-btn'));

    await waitFor(() => {
      expect(getByText('adminInvalidName')).toBeTruthy();
    });
    expect(apiService.adminUpdateUser).not.toHaveBeenCalled();
  });

  it('successfully saves and navigates back on valid submission', async () => {
    const goBack = jest.fn();
    const { getByTestId } = render(
      <AdminEditUserScreen
        navigation={{ goBack }}
        route={{ params: { user: mockUser } }}
      />
    );

    fireEvent.changeText(getByTestId('input-first-name'), 'Sultan');
    fireEvent.press(getByTestId('admin-save-user-btn'));

    await waitFor(() => {
      expect(apiService.adminUpdateUser).toHaveBeenCalledWith('usr-456', {
        first_name: 'Sultan',
        last_name: 'Al Mansoori',
        phone_number: '+971501234567',
        location: 'Abu Dhabi',
        role: 'seller',
        is_verified: true,
      });
      expect(mockToastShow).toHaveBeenCalledWith('adminUserUpdated', { type: 'success' });
      expect(goBack).toHaveBeenCalledTimes(1);
    });
  });

  it('renders executive header hotline and member accreditation shield with officer consultation', () => {
    const { getByTestId } = render(
      <AdminEditUserScreen
        navigation={{ goBack: jest.fn() }}
        route={{ params: { user: mockUser } }}
      />
    );

    // Header hotline button
    expect(getByTestId('admin-edit-user-hotline-btn')).toBeTruthy();
    fireEvent.press(getByTestId('admin-edit-user-hotline-btn'));
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/971500000000'));

    // Member trust & accreditation shield card & officer consultation button
    expect(getByTestId('admin-user-accreditation-shield')).toBeTruthy();
    expect(getByTestId('admin-user-officer-consult-btn')).toBeTruthy();
    fireEvent.press(getByTestId('admin-user-officer-consult-btn'));
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/971500000000'));
  });
});
