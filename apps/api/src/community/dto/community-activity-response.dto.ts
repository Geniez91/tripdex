export interface ICommunityActivityCountryDto {
  id: string;
  iso2: string;
  iso3: string;
  name: string;
}

export interface ICommunityActivityCityDto {
  id: string;
  name: string;
}

export interface ICommunityActivityUserDto {
  username: string;
  avatarUrl: string | null;
}

export interface ICommunityActivityTripDto {
  id: string;
  title: string;
  countries: ICommunityActivityCountryDto[];
  cities: ICommunityActivityCityDto[];
  startDate: string;
  endDate: string | null;
  durationDays: number | null;
  rating: number | null;
  review: string | null;
  coverUrl: string | null;
}

export interface ITripActivityItemDto {
  type: 'TRIP_LOGGED';
  activityDate: string;
  trip:ICommunityActivityTripDto;
  user: ICommunityActivityUserDto;
}

export interface IPhotoContestActivityItemDto {
  type: 'PHOTO_CONTEST_OPENED';
  activityDate: string;
  contest: import('../photo-contests/photo-contest.dto.js').IPhotoContestDto;
}

export type TCommunityActivityItemDto = ITripActivityItemDto | IPhotoContestActivityItemDto;

export interface ICommunityActivityResponseDto {
  openContest?: IPhotoContestActivityItemDto | null;
  activities: TCommunityActivityItemDto[];
  nextCursor: string | null;
}
