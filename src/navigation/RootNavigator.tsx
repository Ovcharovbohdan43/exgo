import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { TouchableOpacity, Text } from 'react-native';
import HomeScreen from '../screens/HomeScreen';
import DetailsScreen from '../screens/DetailsScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { useThemeStyles } from '../theme/ThemeProvider';

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

// Header button component for Settings
const SettingsHeaderButton = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const theme = useThemeStyles();

  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('Settings')}
      style={{ marginRight: theme.spacing.md }}
      activeOpacity={0.7}
    >
      <Text
        style={{
          fontSize: theme.typography.fontSize.md,
          color: theme.colors.accent,
          fontWeight: theme.typography.fontWeight.medium,
        }}
      >
        Settings
      </Text>
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
          headerShown: false,
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
