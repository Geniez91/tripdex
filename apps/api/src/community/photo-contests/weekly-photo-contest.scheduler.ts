import { Injectable, Logger } from '@nestjs/common';
import type { OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { LOGGER_CONTEXT } from '../../logger.constants.js';
import { WeeklyPhotoContestSelectionService } from './photo-contest-selection.service.js';

@Injectable()
export class WeeklyPhotoContestScheduler implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(
    LOGGER_CONTEXT.WEEKLY_PHOTO_CONTEST_SCHEDULER,
  );
  private timer: ReturnType<typeof setInterval> | null = null;
  private pending: Promise<void> | null = null;
  constructor(private readonly selection: WeeklyPhotoContestSelectionService) {}

  onApplicationBootstrap(): void {
    if (process.env.PHOTO_CONTEST_AUTOMATION_ENABLED === 'false') return;
    this.timer = setInterval(() => { void this.tick(); }, 15 * 60 * 1000);
    this.timer.unref();
    void this.tick();
  }
  async tick(): Promise<void> {
    if (this.pending) return this.pending;
    this.pending = this.selection.run().then(result => {
      if (result.outcome === 'created') this.logger.log('Weekly photo contest created.');
    }).catch(() => { this.logger.error('Weekly photo contest job failed; the next tick will retry.'); });
    try { await this.pending; } finally { this.pending = null; }
  }
  async onApplicationShutdown(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    await this.pending;
  }
}
