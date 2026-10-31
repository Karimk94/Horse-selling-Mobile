import React from 'react';
import { render } from '@testing-library/react-native';
import SkeletonCard from '../SkeletonCard';

describe('SkeletonCard', () => {
  it('renders skeleton container and shimmer placeholders correctly', () => {
    const { getByTestId } = render(<SkeletonCard />);
    expect(getByTestId('skeleton-card')).toBeTruthy();
  });

  it('renders floating status and vet badges placeholders', () => {
    const { getByTestId } = render(<SkeletonCard />);
    expect(getByTestId('skeleton-badge-status')).toBeTruthy();
    expect(getByTestId('skeleton-badge-vet')).toBeTruthy();
  });

  it('accepts compact prop and custom styles', () => {
    const { getByTestId } = render(
      <SkeletonCard compact={true} style={{ marginTop: 20 }} />
    );
    expect(getByTestId('skeleton-card')).toBeTruthy();
    expect(getByTestId('skeleton-badge-status')).toBeTruthy();
  });

  it('renders in RTL alignment when isRTL is true', () => {
    const { getByTestId } = render(<SkeletonCard isRTL={true} />);
    expect(getByTestId('skeleton-card')).toBeTruthy();
  });
});
