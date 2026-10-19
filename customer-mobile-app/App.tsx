import 'react-native-gesture-handler';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer, DefaultTheme, type LinkingOptions } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts, PlayfairDisplay_400Regular, PlayfairDisplay_600SemiBold } from '@expo-google-fonts/playfair-display';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import { ToastProvider } from '@/components/toast';
import { RootNavigator } from '@/navigation/RootNavigator';
import { colors } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.ivory, primary: colors.plum900, card: colors.white, border: colors.line },
};

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [Linking.createURL('/'), 'lalima://'],
  config: {
    screens: {
      Login: 'login',
      Signup: 'signup',
      Tabs: { screens: { Home: 'home', Book: 'book', Bookings: 'bookings', Shop: 'shop', Profile: 'me' } },
      ServiceDetail: 'services/:slug',
      BookingDetail: 'bookings/:id',
      Packages: 'packages',
      Events: 'events',
      ProductDetail: 'products/:slug',
      Locations: 'locations',
    },
  },
};

function Splash() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.plum900 }}>
      <ActivityIndicator color={colors.rose300} />
    </View>
  );
}

function AppShell() {
  const { restoring } = useAuth();
  if (restoring) return <Splash />;
  return (
    <NavigationContainer theme={navTheme} linking={linking}>
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } }),
  );
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <QueryClientProvider client={client}>
        <AuthProvider>
          <ToastProvider>{fontsLoaded ? <AppShell /> : <Splash />}</ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
