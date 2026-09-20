import { BadRequestException, Injectable } from '@nestjs/common';
import type { PipeTransform } from '@nestjs/common';
import type { ICommunityQueryDto } from './dto/community-query.dto.js';

@Injectable()
export class CommunityQueryPipe implements PipeTransform<
  unknown,
  ICommunityQueryDto
> {
  transform(value: unknown): ICommunityQueryDto {
    if (
      !value ||
      typeof value !== 'object' ||
      Array.isArray(value) ||
      Object.keys(value).some((key) => key !== 'year') ||
      !('year' in value) ||
      typeof value.year !== 'string' ||
      !/^[0-9]{4}$/.test(value.year) ||
      Number(value.year) < 1 ||
      Number(value.year) > 9998
    ) {
      throw new BadRequestException(
        'year must be a calendar year between 0001 and 9998.',
      );
    }
    return { year: Number(value.year) };
  }
}
