import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { useThemeStyles } from '../../theme/ThemeProvider';

type Props = {
  size?: number;
  color?: string;
};

/**
 * BellIcon - SVG icon for notifications/bell
 * Displays a bell icon with transparent fill and outlined stroke
 */
export const BellIcon: React.FC<Props> = ({ size = 24, color }) => {
  const theme = useThemeStyles();
  const iconColor = color || theme.colors.textPrimary;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 8A6 6 0 0 0 6 8C6 11.0909 4.5 13.5 4.5 13.5H19.5C19.5 13.5 18 11.0909 18 8Z"
        stroke={iconColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21"
        stroke={iconColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M4.5 13.5H19.5"
        stroke={iconColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
};


