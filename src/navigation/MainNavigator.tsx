import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { ReportsStackParamList, MainTabParamList } from '../types';
import { MapViewScreen } from '../screens/main/MapViewScreen';
import { ReportsListScreen } from '../screens/main/ReportsListScreen';
import { ProfileScreen } from '../screens/main/ProfileScreen';
import { ReportDetailsScreen } from '../screens/reports/ReportDetailsScreen';
import { NewReportScreen } from '../screens/reports/NewReportScreen';
import { PinOnMapScreen } from '../screens/reports/PinOnMapScreen';
import { APP_THEME } from '../constants';

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<ReportsStackParamList>();

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{icon}</Text>;
}

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: APP_THEME.primary,
        tabBarInactiveTintColor: APP_THEME.textSecondary,
        tabBarStyle: { borderTopColor: APP_THEME.border, elevation: 8, shadowOpacity: 0.1 },
        headerStyle: { backgroundColor: APP_THEME.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Tab.Screen
        name="MapTab"
        component={MapViewScreen}
        options={{
          title: 'Map',
          tabBarLabel: 'Map',
          tabBarIcon: ({ focused }) => <TabIcon icon="🗺️" focused={focused} />,
          headerTitle: 'FixItLocal — Map',
        }}
      />
      <Tab.Screen
        name="ListTab"
        component={ReportsListScreen}
        options={{
          title: 'Reports',
          tabBarLabel: 'Reports',
          tabBarIcon: ({ focused }) => <TabIcon icon="📋" focused={focused} />,
          headerTitle: 'All Reports',
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon icon="👤" focused={focused} />,
          headerTitle: 'My Profile',
        }}
      />
    </Tab.Navigator>
  );
}

export function MainNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: APP_THEME.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen name="MapView" component={TabNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="ReportDetails" component={ReportDetailsScreen} options={{ title: 'Report Details' }} />
      <Stack.Screen name="NewReport" component={NewReportScreen} options={{ title: 'New Report', presentation: 'modal' }} />
      <Stack.Screen name="PinOnMap" component={PinOnMapScreen} options={{ title: 'Pin Location', presentation: 'modal' }} />
    </Stack.Navigator>
  );
}
