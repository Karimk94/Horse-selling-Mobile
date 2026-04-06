export const COLORS = {
  primary: '#1B4332',
  primaryLight: '#2D6A4F',
  primaryDark: '#0B2B1F',
  accent: '#D4A76A',
  accentLight: '#E8CFA0',
  background: '#FAF8F5',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  text: '#1C1C1E',
  textSecondary: '#6B7280',
  textLight: '#9CA3AF',
  border: '#E8E5E0',
  borderLight: '#F0EDE8',
  error: '#DC2626',
  success: '#059669',
  warning: '#D97706',
  overlay: 'rgba(0,0,0,0.4)',
  favorite: '#EF4444',
  price: '#1B4332',
  badge: '#FEF3C7',
  badgeText: '#92400E',
  skeleton: '#E8E5E0',
  inputBg: '#F3F1ED',
  white: '#FFFFFF',
  black: '#000000',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const FONTS = {
  h1: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  h2: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  h3: { fontSize: 18, fontWeight: '600' },
  body: { fontSize: 15, fontWeight: '400', lineHeight: 22 },
  bodySmall: { fontSize: 13, fontWeight: '400', lineHeight: 18 },
  caption: { fontSize: 11, fontWeight: '500', letterSpacing: 0.5, textTransform: 'uppercase' },
  button: { fontSize: 16, fontWeight: '600' },
  price: { fontSize: 20, fontWeight: '800' },
  priceSm: { fontSize: 16, fontWeight: '700' },
};

export const SHADOWS = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHover: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
  },
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  tabBar: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
};
