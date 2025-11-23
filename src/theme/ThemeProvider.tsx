import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { lightColors, darkColors, type ColorScheme, type ThemeColors } from './colors';
import { spacing } from './tokens';
import { typography } from './tokens';
import { radii } from './tokens';
import { shadows } from './tokens';
import { ThemePreference } from '../types';

export interface Theme {
  colors: ThemeColors;
  spacing: typeof spacing;
  typography: typeof typography;
  radii: typeof radii;
  shadows: typeof shadows;
  colorScheme: ColorScheme;
}

type ThemeContextValue = {
  theme: Theme;
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme | 'system') => void;
  toggleColorScheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const createTheme = (colorScheme: ColorScheme): Theme => ({
  colors: colorScheme === 'dark' ? darkColors : lightColors,
  spacing,
  typography,
  radii,
  shadows,
  colorScheme,
});

type ThemeProviderProps = {
  children: React.ReactNode;
  themePreference?: ThemePreference;
  onThemePreferenceChange?: (preference: ThemePreference) => void;
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  themePreference = 'system',
  onThemePreferenceChange,
}) => {
  const systemColorScheme = useRNColorScheme();
  const [preferredScheme, setPreferredScheme] = useState<ColorScheme | 'system'>(
    themePreference,
  );

  // Update preferred scheme when themePreference prop changes
  useEffect(() => {
    setPreferredScheme(themePreference);
  }, [themePreference]);

  const effectiveColorScheme: ColorScheme = useMemo(() => {
    if (preferredScheme === 'system') {
      return systemColorScheme === 'dark' ? 'dark' : 'light';
    }
    return preferredScheme;
  }, [preferredScheme, systemColorScheme]);

  const theme = useMemo(() => createTheme(effectiveColorScheme), [effectiveColorScheme]);

  const setColorScheme = (scheme: ColorScheme | 'system') => {
    setPreferredScheme(scheme);
    if (onThemePreferenceChange) {
      onThemePreferenceChange(scheme as ThemePreference);
    }
  };

  const toggleColorScheme = () => {
    setPreferredScheme((current) => {
      const newScheme = current === 'system'
        ? (systemColorScheme === 'dark' ? 'light' : 'dark')
        : (current === 'dark' ? 'light' : 'dark');
      
      if (onThemePreferenceChange) {
        onThemePreferenceChange(newScheme);
      }
      
      return newScheme;
    });
  };

  const value = useMemo(
    () => ({
      theme,
      colorScheme: effectiveColorScheme,
      setColorScheme,
      toggleColorScheme,
    }),
    [theme, effectiveColorScheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

// Hook to get theme object directly
export const useThemeStyles = (): Theme => {
  const { theme } = useTheme();
  return theme;
};

