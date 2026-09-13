import { jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommunityController } from './community.controller.js';
import { CommunityModule } from './community.module.js';
import { CommunityCountryExplorerService } from './community-country-explorer.service.js';
import type { CommunityCountryExplorerRecord } from './types/community-country-explorer-record.js';

describe('Community country explorer', () => {
  const record: CommunityCountryExplorerRecord = {
    countryId: 'japan-id', iso2: 'JP', iso3: 'JPN', name: 'Japan',
    travelers: 12, travelersNow: 2, averageRating: 4.5, ratingCount: 4,
    tripId: 'trip-id', tripTitle: 'Tokyo spring',
    tripCreatedAt: '2042-04-03T10:00:00.000Z',
    tripStartDate: '2042-03-01T00:00:00.000Z',
    tripEndDate: '2042-03-08T00:00:00.000Z', tripRating: 5,
    tripReview: 'Lovely trip', coverStoragePath: 'owner/trip/cover.jpg',
    username: 'traveler', tripUserId: 'user-id',
  };

  function setup(rows: CommunityCountryExplorerRecord[]) {
    const repository = { detail: jest.fn(async () => rows) };
    const covers = { readUrl: jest.fn(async () => 'https://signed.test/cover') };
    const memory = {
      countryCode: 'JPN', countryName: 'Japan', imageUrl: 'https://signed.test/winner',
      contestId: 'contest-id', winnerSubmissionId: 'winner-id',
      user: { username: 'winner', avatarUrl: null },
      trip: { id: 'winner-trip', title: 'Winner trip' },
    };
    const contests = { memories: jest.fn(async () => [memory]) };
    const clock = { today: jest.fn(() => '2042-04-04') };
    const service = new CommunityCountryExplorerService(repository, covers, contests, clock);
    return { service, repository, covers, contests, clock, memory };
  }

  it('returns real country aggregates, signed recent public trip covers and the winner memory', async () => {
    // Arrange
    const h = setup([record]);

    // Act
    const result = await h.service.detail('jpn');

    // Assert
    expect(h.repository.detail).toHaveBeenCalledWith('JPN', '2042-04-04');
    expect(result.country).toEqual({ id: 'japan-id', iso2: 'JP', iso3: 'JPN', name: 'Japan' });
    expect(result.stats).toEqual({ travelers: 12, travelersNow: 2, averageRating: 4.5, ratingCount: 4 });
    expect(result.recentTrips).toEqual([{
      id: 'trip-id', title: 'Tokyo spring', createdAt: '2042-04-03T10:00:00.000Z',
      startDate: '2042-03-01T00:00:00.000Z', endDate: '2042-03-08T00:00:00.000Z',
      rating: 5, review: 'Lovely trip', coverUrl: 'https://signed.test/cover',
      user: { username: 'traveler' },
    }]);
    expect(h.covers.readUrl).toHaveBeenCalledWith('user-id', 'trip-id', 'owner/trip/cover.jpg');
    expect(result.memory).toEqual(h.memory);
  });

  it('returns no recent trips and a null memory when neither exists', async () => {
    // Arrange
    const empty: CommunityCountryExplorerRecord = {
      ...record, travelers: 0, travelersNow: 0, averageRating: null, ratingCount: 0,
      tripId: null, tripTitle: null, tripCreatedAt: null, tripStartDate: null,
      tripEndDate: null, tripRating: null, tripReview: null, coverStoragePath: null,
      username: null, tripUserId: null,
    };
    const h = setup([empty]);
    h.contests.memories.mockResolvedValue([]);

    // Act
    const result = await h.service.detail('JPN');

    // Assert
    expect(result.stats).toEqual({ travelers: 0, travelersNow: 0, averageRating: null, ratingCount: 0 });
    expect(result.recentTrips).toEqual([]);
    expect(result.memory).toBeNull();
    expect(h.covers.readUrl).not.toHaveBeenCalled();
  });

  it('rejects malformed and unknown country codes', async () => {
    // Arrange
    const h = setup([]);

    // Act / Assert
    await expect(h.service.detail('JP')).rejects.toThrow(BadRequestException);
    await expect(h.service.detail('ZZZ')).rejects.toThrow(NotFoundException);
  });

  it('registers the country detail endpoint in the Community module', async () => {
    // Arrange
    const result = { country: { id: 'japan-id', iso2: 'JP', iso3: 'JPN', name: 'Japan' } };
    const countryService = { detail: jest.fn(async () => result) };
    const controller = Object.create(CommunityController.prototype) as CommunityController;
    Object.assign(controller, { countries: countryService });

    // Act
    const response = await controller.countryExplorer('JPN');

    // Assert
    expect(response).toBe(result);
    expect(countryService.detail).toHaveBeenCalledWith('JPN');
    expect(Reflect.getMetadata('path', CommunityController)).toBe('community');
    expect(Reflect.getMetadata('path', CommunityController.prototype.countryExplorer)).toBe('countries/:countryCode');
    expect(Reflect.getMetadata('providers', CommunityModule)).toContain(CommunityCountryExplorerService);
  });
});
