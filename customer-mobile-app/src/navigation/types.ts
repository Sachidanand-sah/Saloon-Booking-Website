import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';

/** Choices made so far in the booking flow; each step adds one. staffId 'any' = first available. */
export type BookingDraft = {
  locationId?: string;
  serviceId?: string;
  staffId?: string;
  /** Set when changing the time of an existing booking. */
  rescheduleId?: string;
};

export type TabParamList = {
  Home: undefined;
  Book: undefined;
  Bookings: undefined;
  Shop: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  // Signed out
  Welcome: undefined;
  Login: undefined;
  Signup: undefined;
  // Signed in
  Tabs: NavigatorScreenParams<TabParamList>;
  Services: { category?: string } | undefined;
  ServiceDetail: { slug: string };
  BookService: BookingDraft;
  BookStylist: BookingDraft;
  BookTime: BookingDraft;
  BookConfirm: BookingDraft & { startAt: string };
  BookSuccess: { bookingId: string };
  BookingDetail: { id: string };
  Packages: undefined;
  Rewards: undefined;
  Events: undefined;
  EventRequest: { packageSlug?: string } | undefined;
  MyEvents: undefined;
  ProductDetail: { slug: string };
  Bag: undefined;
  MyOrders: undefined;
  Locations: undefined;
  LocationDetail: { slug: string };
  EditProfile: undefined;
};

export type RootScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;

export type TabScreenProps<T extends keyof TabParamList> = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    // Lets useNavigation() know every route without casting.
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
