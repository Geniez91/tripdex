import type { CommunityCountryDto } from './community-response.dto.js';
import type { CountryMemoryDto } from '../photo-contests/photo-contest.dto.js';

export interface CommunityCountryExplorerTripDto {
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

export interface CommunityCountryExplorerDto {
  country: CommunityCountryDto;
  stats: {
    travelers: number;
    travelersNow: number;
    averageRating: number | null;
    ratingCount: number;
  };
  recentTrips: CommunityCountryExplorerTripDto[];
  memory: CountryMemoryDto | null;
}
