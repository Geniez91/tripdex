export interface CommunityActivityCursor {
  createdAt: string;
  id: string;
}

export interface CommunityActivityQueryDto {
  limit: number;
  cursor: CommunityActivityCursor | null;
}
