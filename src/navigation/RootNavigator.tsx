import React, { useEffect, useRef } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { TouchableOpacity } from 'react-native';
import HomeScreen from '../screens/HomeScreen';
import DetailsScreen from '../screens/DetailsScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { useThemeStyles } from '../theme/ThemeProvider';
import { SettingsIcon } from '../components/icons';

export type RootStackParamList = {
  Onboarding: undefined;
  Home: undefined;
  Details: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

type Props = {
  isOnboarded: boolean;
};

// Header button component for Settings (gear icon)
// Standardized positioning: marginRight matches safe area + standard header padding
const SettingsHeaderButton = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const theme = useThemeStyles();

  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('Settings')}
      style={{ 
        marginRight: 16, // Standard header right padding (matches React Navigation default)
        padding: theme.spacing.xs,
      }}
      activeOpacity={0.7}
    >
      <SettingsIcon size={24} color={theme.colors.textPrimary} />
    </TouchableOpacity>
  );
};

const RootNavigator: React.FC<Props> = ({ isOnboarded }) => {
  const theme = useThemeStyles();

  return (
    <Stack.Navigator
      initialRouteName={isOnboarded ? 'Home' : 'Onboarding'}
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.background,
        },
        headerTintColor: theme.colors.textPrimary,
        headerTitleStyle: {
          fontWeight: theme.typography.fontWeight.semibold,
          fontSize: theme.typography.fontSize.lg,
        },
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
      }}
    >
      <Stack.Screen
        name="Onboarding"
        component={OnboardingScreen}
        options={{
          headerShown: false,
          gestureEnabled: false, // Prevent back gesture during onboarding
        }}
      />
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Home',
          headerRight: () => <SettingsHeaderButton />,
          contentStyle: {
            paddingTop: 0, // Remove default padding, we'll handle it in component
          },
        }}
      />
      <Stack.Screen
        name="Details"
        component={DetailsScreen}
        options={{
          title: 'Spending Breakdown',
          headerRight: () => <SettingsHeaderButton />,
        }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          presentation: 'modal', // iOS modal presentation
        }}
      />
    </Stack.Navigator>
  );
};

export default RootNavigator;
