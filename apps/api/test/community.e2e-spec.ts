import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ServiceUnavailableException } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { CommunityController } from '../src/community/community.controller.js';
import { CommunityService } from '../src/community/community.service.js';
import { CommunityActivityService } from '../src/community/community-activity.service.js';
import { ResidenceController } from '../src/auth/residence.controller.js';
import { ResidenceService } from '../src/users/residence.service.js';
import { AuthGuard } from '../src/auth/guards/auth.guard.js';

describe('Community HTTP contract', () => {
  let app: INestApplication<App>;
  const statistics = jest.fn<CommunityService['statistics']>();
  const activity = jest.fn<CommunityActivityService['list']>();
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [CommunityController, ResidenceController],
      providers: [
        { provide: CommunityService, useValue: { statistics } },
        { provide: CommunityActivityService, useValue: { list: activity } },
        { provide: ResidenceService, useValue: {} },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => false })
      .compile();
    app = module.createNestApplication();
    await app.init();
  });
  afterAll(async () => app.close());
  it('serves public aggregated statistics with no-store', async () => {
    statistics.mockResolvedValueOnce({
      year: 2026,
      asOfDate: '2026-09-11',
      countries: [],
    });
    await request(app.getHttpServer())
      .get('/community/countries?year=2026')
      .expect(200)
      .expect('Cache-Control', 'no-store')
      .expect({ year: 2026, asOfDate: '2026-09-11', countries: [] });
    expect(statistics).toHaveBeenCalledWith(2026);
  });
  it('rejects missing years and repeated query parameters', async () => {
    await request(app.getHttpServer()).get('/community/countries').expect(400);
    await request(app.getHttpServer())
      .get('/community/countries?year=2026&year=2027')
      .expect(400);
  });
  it('serves community activity at the top-level community route', async () => {
    activity.mockResolvedValueOnce({ activities: [], nextCursor: null });
    await request(app.getHttpServer())
      .get('/community/activity?limit=10')
      .expect(200)
      .expect('Cache-Control', 'no-store')
      .expect({ activities: [], nextCursor: null });
    expect(activity).toHaveBeenCalledWith({ limit: 10, cursor: null });
  });
  it('does not disguise service failures as zero counts', async () => {
    statistics.mockRejectedValueOnce(new ServiceUnavailableException());
    await request(app.getHttpServer())
      .get('/community/countries?year=2026')
      .expect(503);
  });
  it('requires the auth guard for residence reads and writes', async () => {
    await request(app.getHttpServer()).get('/me/residence').expect(403);
    await request(app.getHttpServer())
      .put('/me/residence')
      .send({ residenceCountryId: null })
      .expect(403);
  });
});
