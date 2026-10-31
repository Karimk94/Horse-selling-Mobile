import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text, Linking } from 'react-native';
import ErrorBoundary from '../ErrorBoundary';

function ProblematicComponent({ shouldThrow }) {
  if (shouldThrow) {
    throw new Error('Test crash in child component');
  }
  return <Text>Working fine</Text>;
}

describe('ErrorBoundary', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(Linking, 'openURL').mockImplementation(() => Promise.resolve());
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.restoreAllMocks();
  });

  it('renders children normally when there is no error', () => {
    const { getByText, queryByTestId } = render(
      <ErrorBoundary>
        <ProblematicComponent shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(getByText('Working fine')).toBeTruthy();
    expect(queryByTestId('error-boundary-container')).toBeNull();
  });

  it('catches thrown error and renders luxury recovery screen', () => {
    const { getByTestId, getByText } = render(
      <ErrorBoundary>
        <ProblematicComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(getByTestId('error-boundary-container')).toBeTruthy();
    expect(getByTestId('error-boundary-title')).toBeTruthy();
    expect(getByText('Oops! Something went wrong')).toBeTruthy();
    expect(getByTestId('error-boundary-reload-btn')).toBeTruthy();
  });

  it('handles reload button press to reset error state', () => {
    let throwError = true;
    function DynamicChild() {
      if (throwError) throw new Error('Crash');
      return <Text>Recovered</Text>;
    }

    const { getByTestId, getByText, queryByTestId } = render(
      <ErrorBoundary>
        <DynamicChild />
      </ErrorBoundary>
    );

    expect(getByTestId('error-boundary-reload-btn')).toBeTruthy();

    throwError = false;
    fireEvent.press(getByTestId('error-boundary-reload-btn'));

    expect(queryByTestId('error-boundary-container')).toBeNull();
    expect(getByText('Recovered')).toBeTruthy();
  });

  it('renders VIP Concierge support hotline button and triggers WhatsApp link', () => {
    const { getByTestId } = render(
      <ErrorBoundary>
        <ProblematicComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(getByTestId('error-boundary-concierge-btn')).toBeTruthy();
    fireEvent.press(getByTestId('error-boundary-concierge-btn'));
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/971500000000'));
  });
});
