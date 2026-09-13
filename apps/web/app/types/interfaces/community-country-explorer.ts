import type { Country } from '~/types/tripdex';
import type { CountryMemory } from './photo-contests';

export interface CommunityCountryExplorerTrip {
  id: string;
  title: string;
  createdAt: string;
  startDate: string;
  endDate: string | null;
  rating: number | null;
  review: string | null;
  coverUrl: string | null;
  user: { username: string };
}

export interface CommunityCountryExplorer {
  country: Pick<Country, 'id' | 'iso2' | 'iso3' | 'name'>;
  stats: {
    travelers: number;
    travelersNow: number;
    averageRating: number | null;
    ratingCount: number;
  };
  recentTrips: CommunityCountryExplorerTrip[];
  memory: CountryMemory | null;
}
