import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import HomeScreen from '../HomeScreen';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: false }),
}));

jest.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ isRTL: true, t: (key) => key }),
}));

jest.mock('../../services/api', () => ({}));

describe('HomeScreen hub navigation', () => {
  it('returns to the Browse hub from the horse listing screen', () => {
    const goBack = jest.fn();
    const screen = render(<HomeScreen navigation={{ goBack }} />);

    fireEvent.press(screen.getByTestId('horse-list-back-button'));

    expect(goBack).toHaveBeenCalledTimes(1);
  });

  it('keeps the search input mounted while typing', () => {
    const screen = render(<HomeScreen navigation={{ goBack: jest.fn() }} />);
    const searchInput = screen.getByPlaceholderText('searchPlaceholder');

    fireEvent.changeText(searchInput, 'a');

    const updatedInput = screen.getByPlaceholderText('searchPlaceholder');
    expect(updatedInput).toBe(searchInput);
    expect(updatedInput.props.value).toBe('a');
  });
});
