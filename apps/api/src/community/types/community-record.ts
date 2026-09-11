export interface CommunityRecord {
  id: string;
  iso2: string;
  iso3: string;
  name: string;
  travelers: number;
  travelersNow: number;
  originId: string | null;
  originIso2: string | null;
  originIso3: string | null;
  originName: string | null;
  originTravelers: number | null;
}

export interface CommunityPeriod {
  start: string;
  next: string;
  today: string;
}
