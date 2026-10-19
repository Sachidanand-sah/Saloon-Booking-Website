import { useQuery } from '@tanstack/react-query';
import { api } from './client';
import type {
  Booking,
  Category,
  EventPackage,
  EventRequest,
  LocationDetail,
  LocationListItem,
  LoyaltyProgramme,
  LoyaltySummary,
  Membership,
  Plan,
  Product,
  Reservation,
  Review,
  SalonInfo,
  Service,
  Staff,
} from './types';

/** Query keys in one place so mutations can invalidate the right data. */
export const keys = {
  salon: ['salon'] as const,
  categories: ['categories'] as const,
  services: (q = '') => ['services', q] as const,
  service: (idOrSlug: string) => ['service', idOrSlug] as const,
  staff: ['staff'] as const,
  locations: ['locations'] as const,
  location: (slug: string) => ['location', slug] as const,
  reviews: ['reviews'] as const,
  bookings: (scope: 'upcoming' | 'past' | 'all') => ['bookings', scope] as const,
  booking: (id: string) => ['booking', id] as const,
  plans: ['plans'] as const,
  memberships: ['memberships'] as const,
  loyalty: ['loyalty'] as const,
  programme: ['loyalty-programme'] as const,
  eventPackages: ['event-packages'] as const,
  eventRequests: ['event-requests'] as const,
  products: (q = '') => ['products', q] as const,
  product: (slug: string) => ['product', slug] as const,
  reservations: ['reservations'] as const,
};

const long = { staleTime: 5 * 60_000 };

export const useSalon = () => useQuery({ queryKey: keys.salon, queryFn: () => api.get<SalonInfo>('/salon'), ...long });
export const useCategories = () =>
  useQuery({ queryKey: keys.categories, queryFn: () => api.get<Category[]>('/categories'), ...long });
export const useServices = (query = '') =>
  useQuery({ queryKey: keys.services(query), queryFn: () => api.get<Service[]>(`/services${query}`), ...long });
export const useService = (idOrSlug: string) =>
  useQuery({ queryKey: keys.service(idOrSlug), queryFn: () => api.get<Service>(`/services/${idOrSlug}`), ...long });
export const useStaff = () => useQuery({ queryKey: keys.staff, queryFn: () => api.get<Staff[]>('/staff'), ...long });
export const useLocations = () =>
  useQuery({ queryKey: keys.locations, queryFn: () => api.get<LocationListItem[]>('/locations'), ...long });
export const useLocation = (slug: string) =>
  useQuery({ queryKey: keys.location(slug), queryFn: () => api.get<LocationDetail>(`/locations/${slug}`), ...long });
export const useReviews = () =>
  useQuery({ queryKey: keys.reviews, queryFn: () => api.get<Review[]>('/reviews?limit=6'), ...long });

export const useBookings = (scope: 'upcoming' | 'past') =>
  useQuery({ queryKey: keys.bookings(scope), queryFn: () => api.get<Booking[]>(`/bookings?scope=${scope}`) });
export const useBooking = (id: string) =>
  useQuery({ queryKey: keys.booking(id), queryFn: () => api.get<Booking>(`/bookings/${id}`) });

export const usePlans = () => useQuery({ queryKey: keys.plans, queryFn: () => api.get<Plan[]>('/plans'), ...long });
export const useMemberships = () =>
  useQuery({ queryKey: keys.memberships, queryFn: () => api.get<Membership[]>('/memberships') });
export const useLoyalty = () => useQuery({ queryKey: keys.loyalty, queryFn: () => api.get<LoyaltySummary>('/loyalty/me') });
export const useProgramme = () =>
  useQuery({ queryKey: keys.programme, queryFn: () => api.get<LoyaltyProgramme>('/loyalty/programme'), ...long });

export const useEventPackages = () =>
  useQuery({ queryKey: keys.eventPackages, queryFn: () => api.get<EventPackage[]>('/event-packages'), ...long });
export const useEventRequests = () =>
  useQuery({ queryKey: keys.eventRequests, queryFn: () => api.get<EventRequest[]>('/event-requests') });

export const useProducts = (query = '') =>
  useQuery({ queryKey: keys.products(query), queryFn: () => api.get<Product[]>(`/products${query}`), ...long });
export const useProduct = (slug: string) =>
  useQuery({ queryKey: keys.product(slug), queryFn: () => api.get<Product>(`/products/${slug}`), ...long });
export const useReservations = () =>
  useQuery({ queryKey: keys.reservations, queryFn: () => api.get<Reservation[]>('/reservations') });
