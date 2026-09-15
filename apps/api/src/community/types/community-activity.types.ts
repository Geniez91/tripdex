import type { CommunityActivityItemDto } from '../dto/community-activity-response.dto.js';

export interface ActivityCursor {
  createdAt: string;
  id: string;
}

export interface ActivityRecord {
  item: CommunityActivityItemDto;
  cursor: ActivityCursor;
}
