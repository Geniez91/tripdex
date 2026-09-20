import type {
  ITripActivityItemDto,
  TCommunityActivityItemDto,
} from '../dto/community-activity-response.dto.js';

export interface IActivityCursor {
  createdAt: string;
  id: string;
}

export interface IActivityRecord {
  item: TCommunityActivityItemDto;
  cursor: IActivityCursor;
}

export interface ICommunityActivityRecord {
  item: ITripActivityItemDto;
  cursor: IActivityCursor;
  coverPath: string | null;
  userId: string;
}
