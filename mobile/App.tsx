import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { storage } from './src/storage';

import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import DashboardScreen from './src/screens/DashboardScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      console.log('App: Checking initial auth status...');
      const token = await storage.get('parentToken');
      console.log('App: Token found?', !!token);
      if (token) setLoggedIn(true);
      setIsReady(true);
    }
    checkAuth();
  }, []);

  console.log('App: Current loggedIn state:', loggedIn);

  if (!isReady) return null;

  return (
    <View style={styles.container}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {loggedIn ? (
            <Stack.Screen name="Dashboard">
              {(props) => <DashboardScreen {...props} setLoggedIn={setLoggedIn} />}
            </Stack.Screen>
          ) : (
            <>
              <Stack.Screen name="Login">
                {(props) => <LoginScreen {...props} setLoggedIn={setLoggedIn} />}
              </Stack.Screen>
              <Stack.Screen name="Signup">
                {(props) => <SignupScreen {...props} setLoggedIn={setLoggedIn} />}
              </Stack.Screen>
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  }
});
