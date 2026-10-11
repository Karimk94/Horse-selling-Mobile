import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../config/theme';

export default function BrandMark({ size = 32, color = COLORS.primary, style }) {
  return <MaterialCommunityIcons name="horse" size={size} color={color} style={style} />;
}
