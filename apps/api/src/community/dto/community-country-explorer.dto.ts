import type { TCommunityCountryDto } from './community-response.dto.js';
import type { ICountryMemoryDto } from '../photo-contests/photo-contest.dto.js';

export interface ICommunityCountryExplorerStatsDto {
  travelers: number;
  travelersNow: number;
  averageRating: number | null;
  ratingCount: number;
}

export interface ICommunityCountryExplorerTripUserDto {
  username: string;
}

export interface ICommunityCountryExplorerTripDto {
  id: string;
  title: string;
  createdAt: string;
  startDate: string;
  endDate: string | null;
  rating: number | null;
  review: string | null;
  coverUrl: string | null;
  user: ICommunityCountryExplorerTripUserDto;
}

export interface ICommunityCountryExplorerDto {
  country: TCommunityCountryDto;
  stats: ICommunityCountryExplorerStatsDto;
  recentTrips: ICommunityCountryExplorerTripDto[];
  memory: ICountryMemoryDto | null;
}