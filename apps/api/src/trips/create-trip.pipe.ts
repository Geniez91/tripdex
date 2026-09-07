import { BadRequestException, Injectable } from '@nestjs/common';
import type { PipeTransform } from '@nestjs/common';
import type { CreateTripDto } from './dto/create-trip.dto.js';

function parseDate(value: unknown, field: string): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BadRequestException(
      `${field} must be a date in YYYY-MM-DD format.`,
    );
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new BadRequestException(`${field} must be a valid calendar date.`);
  }
  return date.toISOString();
}

@Injectable()
export class CreateTripPipe implements PipeTransform<unknown, CreateTripDto> {
  transform(value: unknown): CreateTripDto {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException('A JSON object is required.');
    }
    const input = value as Record<string, unknown>;
    if (
      Object.keys(input).some(
        (key) =>
          ![
            'title',
            'startDate',
            'endDate',
            'countryIds',
            'cityIds',
            'rating',
            'review',
          ].includes(key),
      )
    ) {
      throw new BadRequestException('Unknown field in trip.');
    }
    if (
      typeof input.title !== 'string' ||
      !input.title.trim() ||
      input.title.trim().length > 160
    ) {
      throw new BadRequestException(
        'Title must contain between 1 and 160 characters.',
      );
    }
    const startDate = parseDate(input.startDate, 'startDate');
    const endDate =
      input.endDate == null ? null : parseDate(input.endDate, 'endDate');
    if (endDate && endDate < startDate) {
      throw new BadRequestException('endDate must be on or after startDate.');
    }
    if (
      !Array.isArray(input.countryIds) ||
      input.countryIds.length < 1 ||
      input.countryIds.length > 249 ||
      !input.countryIds.every(
        (id): id is string =>
          typeof id === 'string' && id.length > 0 && id.length <= 128,
      )
    ) {
      throw new BadRequestException(
        'Select between 1 and 249 valid country IDs.',
      );
    }
    if (new Set(input.countryIds).size !== input.countryIds.length) {
      throw new BadRequestException('Each country can only be selected once.');
    }
    const cityIds = input.cityIds == null ? [] : input.cityIds;
    if (
      !Array.isArray(cityIds) ||
      cityIds.length > 249 ||
      !cityIds.every(
        (id): id is string =>
          typeof id === 'string' && id.length > 0 && id.length <= 128,
      )
    ) {
      throw new BadRequestException('Select valid city IDs.');
    }
    if (new Set(cityIds).size !== cityIds.length) {
      throw new BadRequestException('Each city can only be selected once.');
    }
    const rating = input.rating == null ? null : input.rating;
    if (
      rating !== null &&
      (typeof rating !== 'number' ||
        !Number.isInteger(rating) ||
        rating < 1 ||
        rating > 5)
    ) {
      throw new BadRequestException(
        'Rating must be an integer between 1 and 5.',
      );
    }
    const review = input.review == null ? null : input.review;
    if (
      review !== null &&
      (typeof review !== 'string' || review.length > 10_000)
    ) {
      throw new BadRequestException(
        'Review must contain at most 10000 characters.',
      );
    }
    return {
      title: input.title.trim(),
      startDate,
      endDate,
      countryIds: input.countryIds,
      cityIds,
      rating,
      review: review?.trim() || null,
    };
  }
}
