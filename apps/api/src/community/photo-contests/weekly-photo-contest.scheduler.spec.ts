import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';
import { CommunityModule } from '../community.module.js';
import { WeeklyPhotoContestScheduler } from './weekly-photo-contest.scheduler.js';
import { WeeklyPhotoContestSelectionService } from './photo-contest-selection.service.js';
import { DatabaseService } from '../../prisma/database.service.js';

describe('Community weekly scheduler registration and startup', () => {
  it('resolves the real module providers and catches up at startup, then every 15 minutes', async () => {
    const previous = process.env.PHOTO_CONTEST_AUTOMATION_ENABLED;
    process.env.PHOTO_CONTEST_AUTOMATION_ENABLED = 'true';
    jest.useFakeTimers();
    const run = jest.fn<WeeklyPhotoContestSelectionService['run']>()
      .mockResolvedValue({ outcome: 'no-candidate', contest: null, countryName: null });
    const module = await Test.createTestingModule({ imports: [CommunityModule] })
      .overrideProvider(DatabaseService).useValue({ client: {} })
      .compile();
    const selection = module.get(WeeklyPhotoContestSelectionService);
    jest.spyOn(selection, 'run').mockImplementation(run);
    try {
      expect(module.get(WeeklyPhotoContestScheduler)).toBeDefined();
      await module.init();
      expect(run).toHaveBeenCalledTimes(1);
      await jest.advanceTimersByTimeAsync(15 * 60 * 1000);
      expect(run).toHaveBeenCalledTimes(2);
      await module.close();
      await jest.advanceTimersByTimeAsync(15 * 60 * 1000);
      expect(run).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
      if (previous === undefined) delete process.env.PHOTO_CONTEST_AUTOMATION_ENABLED;
      else process.env.PHOTO_CONTEST_AUTOMATION_ENABLED = previous;
    }
  });
});
