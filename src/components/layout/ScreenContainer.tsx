import React from 'react';
import { View, ViewStyle, StyleSheet, ScrollView, ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStyles } from '../../theme/ThemeProvider';

type ScreenContainerProps = {
  children: React.ReactNode;
  scrollable?: boolean;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  scrollViewProps?: Omit<ScrollViewProps, 'style' | 'contentContainerStyle'>;
  safeAreaEdges?: ('top' | 'bottom' | 'left' | 'right')[];
};

/**
 * ScreenContainer - Base container for screens with safe area handling
 * 
 * @param scrollable - If true, wraps content in ScrollView
 * @param safeAreaEdges - Which edges to apply safe area insets (default: all)
 */
export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  scrollable = false,
  style,
  contentContainerStyle,
  scrollViewProps,
  safeAreaEdges = ['top', 'bottom', 'left', 'right'],
}) => {
  const theme = useThemeStyles();
  const insets = useSafeAreaInsets();

  const safeAreaStyle: ViewStyle = {
    paddingTop: safeAreaEdges.includes('top') ? insets.top : 0,
    paddingBottom: safeAreaEdges.includes('bottom') ? insets.bottom : 0,
    paddingLeft: safeAreaEdges.includes('left') ? insets.left : 0,
    paddingRight: safeAreaEdges.includes('right') ? insets.right : 0,
  };

  const containerStyle = [
    styles.container,
    { backgroundColor: theme.colors.background },
    safeAreaStyle,
    style,
  ];

  if (scrollable) {
    return (
      <View style={containerStyle}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            contentContainerStyle,
          ]}
          showsVerticalScrollIndicator={false}
          {...scrollViewProps}
        >
          {children}
        </ScrollView>
      </View>
    );
  }

  return <View style={containerStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});


