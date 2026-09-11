export type CommunityMapMode = "travelers" | "trending" | "flows";

export interface CommunityFlow {
  originIso3: string;
  destinationIso3: string;
  travelers: number;
}
