import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle, Text } from 'react-native';
import { useThemeStyles } from '../theme/ThemeProvider';

type Props = {
  onPress: () => void;
  style?: ViewStyle;
  size?: number;
};

const FloatingActionButton: React.FC<Props> = ({ onPress, style, size = 64 }) => {
  const theme = useThemeStyles();
  const radius = size / 2;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: theme.colors.accent,
          ...theme.shadows.lg,
        },
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <Text
        style={[
          styles.plus,
          {
            color: theme.colors.background,
            fontSize: size * 0.5,
            lineHeight: size * 0.5,
          },
        ]}
      >
        ＋
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  plus: {
    textAlign: 'center',
  },
});

export default FloatingActionButton;
