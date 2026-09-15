import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { DatabaseService } from '../../prisma/database.service.js';
import { ProgressionRepository } from './progression.repository.js';

describe('ProgressionRepository', () => {
  it('loads the full country denominator and all owned trips without a visibility filter', async () => {
    // Arrange
    const statements: Array<{ text: string; values: unknown[] }> = [];
    const countryRows = [
      {
        id: 'jp',
        iso2: 'JP',
        iso3: 'JPN',
        name: 'Japan',
        slug: 'japan',
        continentCode: 'AS',
      },
    ];
    const countryAll = jest.fn().mockResolvedValue(countryRows);
    const countryOrderBy = jest.fn(() => ({ all: countryAll }));
    const countrySelect = jest.fn(() => ({ orderBy: countryOrderBy }));
    const tripRow = {
      tripId: 'private-trip',
      startDate: '2026-01-01T00:00:00.000Z',
      endDate: null,
      countryId: 'jp',
      arrivalDate: null,
    };
    const database = {
      client: {
        orm: {
          public: { Country: { select: countrySelect } },
        },
        raw: {
          sql(strings: TemplateStringsArray, ...values: unknown[]) {
            const statement = {
              text: Array.from(strings).join(' ? '),
              values,
            };
            statements.push(statement);
            return {
              returnsRow: () => ({ build: () => statement }),
            };
          },
        },
        runtime: () => ({
          query: () => ({
            async *[Symbol.asyncIterator]() {
              yield tripRow;
            },
          }),
        }),
      },
    };
    const module = await Test.createTestingModule({
      providers: [
        ProgressionRepository,
        { provide: DatabaseService, useValue: database },
      ],
    }).compile();
    const repository = module.get(ProgressionRepository);

    // Act
    const result = await repository.snapshot('owner-id');

    // Assert
    expect(result.countries).toEqual(countryRows);
    expect(result.tripCountries).toEqual([tripRow]);
    expect(countryAll).toHaveBeenCalledTimes(1);
    expect(statements).toHaveLength(1);
    expect(statements[0].text).toContain('t."userId" = ');
    expect(statements[0].values).toContain('owner-id');
    expect(statements[0].text.toLowerCase()).not.toContain('visibility');
    await module.close();
  });
});
