import React, { useEffect, useRef } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import HomeScreen from '../screens/HomeScreen';
import DetailsScreen from '../screens/DetailsScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import SettingsScreen from '../screens/SettingsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import GoalsScreen from '../screens/GoalsScreen';
import CalendarScreen from '../screens/CalendarScreen';
import GamificationHubScreen from '../screens/GamificationHubScreen';
import { useThemeStyles } from '../theme/ThemeProvider';
import { SettingsIcon, BellIcon } from '../components/icons';
import { useNotifications } from '../state/NotificationProvider';
import { useTranslation } from 'react-i18next';

export type RootStackParamList = {
  Onboarding: undefined;
  Home: { month?: string } | undefined;
  Details: undefined;
  Settings: undefined;
  Notifications: undefined;
  Goals: undefined;
  Calendar: { initialMonth?: string } | undefined;
  GamificationHub: undefined;
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

// Header button component for Notifications (bell icon with badge)
// Standardized positioning: marginLeft matches safe area + standard header padding
const NotificationHeaderButton = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const theme = useThemeStyles();
  const { unreadCount } = useNotifications();

  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('Notifications')}
      style={{ 
        marginLeft: 16, // Standard header left padding (matches React Navigation default)
        padding: theme.spacing.xs,
        position: 'relative',
      }}
      activeOpacity={0.7}
    >
      <BellIcon size={24} color={theme.colors.textPrimary} />
      {unreadCount > 0 && (
        <View
          style={[
            styles.badge,
            {
              backgroundColor: theme.colors.danger,
              minWidth: 13, // Reduced by 30% (18 * 0.7 = 12.6, rounded to 13)
              height: 13, // Reduced by 30% (18 * 0.7 = 12.6, rounded to 13)
              borderRadius: 6.5, // Half of height
              paddingHorizontal: unreadCount > 9 ? 3 : 3.5, // Reduced by 30%
              position: 'absolute',
              top: 4,
              right: 4,
              alignItems: 'center',
              justifyContent: 'center',
            },
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              {
                color: theme.colors.background,
                fontSize: 8, // Reduced by 30% (10 * 0.7 = 7, rounded to 8)
                fontWeight: theme.typography.fontWeight.bold,
              },
            ]}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const RootNavigator: React.FC<Props> = ({ isOnboarded }) => {
  const theme = useThemeStyles();
  const { t } = useTranslation();

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
          title: t('home.title'),
          headerLeft: () => <NotificationHeaderButton />,
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
          title: t('details.title'),
          headerRight: () => <SettingsHeaderButton />,
        }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: t('settings.title'),
          presentation: 'modal', // iOS modal presentation
        }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          title: t('notifications.title'),
          presentation: 'modal', // iOS modal presentation
        }}
      />
      <Stack.Screen
        name="Goals"
        component={GoalsScreen}
        options={{
          title: t('goals.title', { defaultValue: 'Goals' }),
        }}
      />
      <Stack.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          title: t('calendar.title', { defaultValue: 'Select Month' }),
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="GamificationHub"
        component={GamificationHubScreen}
        options={{
          title: t('gamification.title', { defaultValue: 'Gamification' }),
        }}
      />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderWidth: 2,
    borderColor: 'transparent',
  },
  badgeText: {
    textAlign: 'center',
  },
});

export default RootNavigator;
