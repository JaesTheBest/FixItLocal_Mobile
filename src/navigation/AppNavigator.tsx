import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { RootStackParamList } from '../types';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { useAuthContext } from '../hooks/useAuthContext';
import { APP_THEME } from '../constants';

const Root = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const { session, loading } = useAuthContext();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={APP_THEME.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Root.Navigator screenOptions={{ headerShown: false }}>
        {session ? (
          <Root.Screen name="Main" component={MainNavigator} />
        ) : (
          <Root.Screen name="Auth" component={AuthNavigator} />
        )}
      </Root.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: APP_THEME.background },
});
