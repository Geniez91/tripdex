export interface ICommunityActivityCursor {
  createdAt: string;
  id: string;
}

export interface ICommunityActivityQueryDto {
  limit: number;
  cursor: ICommunityActivityCursor | null;
}
