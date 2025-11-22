import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import DetailsScreen from '../screens/DetailsScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import SettingsScreen from '../screens/SettingsScreen';

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

const RootNavigator: React.FC<Props> = ({ isOnboarded }) => {
  return (
    <Stack.Navigator initialRouteName={isOnboarded ? 'Home' : 'Onboarding'}>
      <Stack.Screen
        name="Onboarding"
        component={OnboardingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Details" component={DetailsScreen} options={{ title: 'Breakdown' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
    </Stack.Navigator>
  );
};

export default RootNavigator;
