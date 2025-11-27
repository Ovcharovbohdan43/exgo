import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';
import { useThemeStyles } from '../../theme/ThemeProvider';

type Props = {
  size?: number;
  color?: string;
};

/**
 * CalendarIcon - SVG icon for calendar
 * Displays a calendar icon with outlined stroke
 */
export const CalendarIcon: React.FC<Props> = ({ size = 24, color }) => {
  const theme = useThemeStyles();
  const iconColor = color || theme.colors.textPrimary;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="3"
        y="4"
        width="18"
        height="18"
        rx="2"
        stroke={iconColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M16 2V6"
        stroke={iconColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M8 2V6"
        stroke={iconColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M3 10H21"
        stroke={iconColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
};

