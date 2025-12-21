import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from './screens/HomeScreen';
import BookingScreen from './screens/BookingScreen';
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import * as Linking from 'expo-linking';

const Stack = createStackNavigator();

const prefix = Linking.createURL('/');

const linking = {
  prefixes: [prefix, 'lovelyglow://'],
  config: {
    screens: {
      Login: 'login',
      Signup: 'signup',
      Home: 'home',
      Booking: 'booking',
    },
  },
};

export default function App() {
  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Signup" component={SignupScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Salon Services', headerLeft: null }} />
        <Stack.Screen name="Booking" component={BookingScreen} options={{ title: 'Book Appointment' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
