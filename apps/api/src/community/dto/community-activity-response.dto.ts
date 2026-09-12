export interface CommunityActivityCountryDto {
  id: string;
  iso2: string;
  iso3: string;
  name: string;
}

export interface CommunityActivityCityDto {
  id: string;
  name: string;
}

export interface CommunityActivityUserDto {
  username: string;
  avatarUrl: string | null;
}

export interface CommunityActivityItemDto {
  type: 'TRIP_LOGGED';
  activityDate: string;
  trip: {
    id: string;
    title: string;
    countries: CommunityActivityCountryDto[];
    cities: CommunityActivityCityDto[];
    startDate: string;
    endDate: string | null;
    durationDays: number | null;
    rating: number | null;
    review: string | null;
    coverUrl: string | null;
  };
  user: CommunityActivityUserDto;
}

export interface CommunityActivityResponseDto {
  activities: CommunityActivityItemDto[];
  nextCursor: string | null;
}
