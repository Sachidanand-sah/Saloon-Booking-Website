import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/auth/AuthProvider';
import { colors, fonts } from '@/theme';
import type { IconName } from '@/components/ui';
import type { RootStackParamList, TabParamList } from './types';

import WelcomeScreen from '@/screens/auth/WelcomeScreen';
import LoginScreen from '@/screens/auth/LoginScreen';
import SignupScreen from '@/screens/auth/SignupScreen';
import HomeScreen from '@/screens/home/HomeScreen';
import BookStartScreen from '@/screens/booking/BookStartScreen';
import BookServiceScreen from '@/screens/booking/BookServiceScreen';
import BookStylistScreen from '@/screens/booking/BookStylistScreen';
import BookTimeScreen from '@/screens/booking/BookTimeScreen';
import BookConfirmScreen from '@/screens/booking/BookConfirmScreen';
import BookSuccessScreen from '@/screens/booking/BookSuccessScreen';
import BookingsScreen from '@/screens/booking/BookingsScreen';
import BookingDetailScreen from '@/screens/booking/BookingDetailScreen';
import ServicesScreen from '@/screens/booking/ServicesScreen';
import ServiceDetailScreen from '@/screens/booking/ServiceDetailScreen';
import ProfileScreen from '@/screens/account/ProfileScreen';
import EditProfileScreen from '@/screens/account/EditProfileScreen';
import RewardsScreen from '@/screens/account/RewardsScreen';
import PackagesScreen from '@/screens/account/PackagesScreen';
import MyEventsScreen from '@/screens/account/MyEventsScreen';
import MyOrdersScreen from '@/screens/account/MyOrdersScreen';
import EventsScreen from '@/screens/explore/EventsScreen';
import EventRequestScreen from '@/screens/explore/EventRequestScreen';
import LocationsScreen from '@/screens/explore/LocationsScreen';
import LocationDetailScreen from '@/screens/explore/LocationDetailScreen';
import ShopScreen from '@/screens/shop/ShopScreen';
import ProductDetailScreen from '@/screens/shop/ProductDetailScreen';
import BagScreen from '@/screens/shop/BagScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const tabIcons: Record<keyof TabParamList, [IconName, IconName]> = {
  Home: ['home', 'home-outline'],
  Book: ['add-circle', 'add-circle-outline'],
  Bookings: ['calendar', 'calendar-outline'],
  Shop: ['bag-handle', 'bag-handle-outline'],
  Profile: ['person', 'person-outline'],
};

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.plum900,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.line, height: 64, paddingTop: 6 },
        tabBarIcon: ({ focused, color, size }) => (
          <Ionicons name={tabIcons[route.name][focused ? 0 : 1]} size={route.name === 'Book' ? size + 6 : size} color={route.name === 'Book' ? colors.rose500 : color} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Book" component={BookStartScreen} />
      <Tab.Screen name="Bookings" component={BookingsScreen} options={{ title: 'My bookings' }} />
      <Tab.Screen name="Shop" component={ShopScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Me' }} />
    </Tab.Navigator>
  );
}

const header = {
  headerTintColor: colors.plum900,
  headerTitleStyle: { fontFamily: fonts.display, fontSize: 18 },
  headerStyle: { backgroundColor: colors.ivory },
  headerShadowVisible: false,
  headerBackButtonDisplayMode: 'minimal' as const,
  contentStyle: { backgroundColor: colors.ivory },
};

export function RootNavigator() {
  const { user } = useAuth();

  if (!user) {
    return (
      <Stack.Navigator screenOptions={{ ...header, headerShown: false }}>
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: true, title: '' }} />
        <Stack.Screen name="Signup" component={SignupScreen} options={{ headerShown: true, title: '' }} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator screenOptions={header}>
      <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
      <Stack.Screen name="Services" component={ServicesScreen} options={{ title: 'Services' }} />
      <Stack.Screen name="ServiceDetail" component={ServiceDetailScreen} options={{ title: '' }} />
      <Stack.Screen name="BookService" component={BookServiceScreen} options={{ title: 'Choose a treatment' }} />
      <Stack.Screen name="BookStylist" component={BookStylistScreen} options={{ title: 'Choose a specialist' }} />
      <Stack.Screen name="BookTime" component={BookTimeScreen} options={{ title: 'Date & time' }} />
      <Stack.Screen name="BookConfirm" component={BookConfirmScreen} options={{ title: 'Confirm' }} />
      <Stack.Screen
        name="BookSuccess"
        component={BookSuccessScreen}
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen name="BookingDetail" component={BookingDetailScreen} options={{ title: 'Appointment' }} />
      <Stack.Screen name="Packages" component={PackagesScreen} options={{ title: 'Monthly packages' }} />
      <Stack.Screen name="Rewards" component={RewardsScreen} options={{ title: 'Lalima Rewards' }} />
      <Stack.Screen name="Events" component={EventsScreen} options={{ title: 'Bridal & events' }} />
      <Stack.Screen name="EventRequest" component={EventRequestScreen} options={{ title: 'Request a quote' }} />
      <Stack.Screen name="MyEvents" component={MyEventsScreen} options={{ title: 'My event requests' }} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: '' }} />
      <Stack.Screen name="Bag" component={BagScreen} options={{ title: 'My bag' }} />
      <Stack.Screen name="MyOrders" component={MyOrdersScreen} options={{ title: 'My orders' }} />
      <Stack.Screen name="Locations" component={LocationsScreen} options={{ title: 'Our locations' }} />
      <Stack.Screen name="LocationDetail" component={LocationDetailScreen} options={{ title: '' }} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Edit profile' }} />
    </Stack.Navigator>
  );
}
