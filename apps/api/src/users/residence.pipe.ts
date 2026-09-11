import { BadRequestException, Injectable } from '@nestjs/common';
import type { PipeTransform } from '@nestjs/common';
import type { UpdateResidenceDto } from './dto/residence.dto.js';

@Injectable()
export class ResidencePipe implements PipeTransform<
  unknown,
  UpdateResidenceDto
> {
  transform(value: unknown): UpdateResidenceDto {
    if (
      !value ||
      typeof value !== 'object' ||
      Array.isArray(value) ||
      Object.keys(value).some((key) => key !== 'residenceCountryId') ||
      !('residenceCountryId' in value)
    ) {
      throw new BadRequestException('Only residenceCountryId is accepted.');
    }
    const id = value.residenceCountryId;
    if (
      id !== null &&
      (typeof id !== 'string' ||
        !id.trim() ||
        id.length > 128 ||
        id !== id.trim())
    ) {
      throw new BadRequestException(
        'residenceCountryId must be a country ID or null.',
      );
    }
    return { residenceCountryId: id };
  }
}
