import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CountryMapper } from '../countries/mappers/country.mapper.js';
import { ResidenceRepository } from './repositories/residence.repository.js';
import type { IResidenceResponseDto } from './dto/residence.dto.js';

@Injectable()
export class ResidenceService {
  constructor(private readonly repository: ResidenceRepository) {}

  async get(userId: string): Promise<IResidenceResponseDto> {
    const user = await this.repository.findUser(userId);
    if (!user) throw new NotFoundException('Profile not found.');
    const country =
      user.residenceCountryId === null
        ? null
        : await this.repository.findCountry(user.residenceCountryId);
    return {
      residenceCountry: country ? CountryMapper.toResponse(country) : null,
    };
  }

  async update(
    userId: string,
    countryId: string | null,
  ): Promise<IResidenceResponseDto> {
    const country =
      countryId === null
        ? null
        : await this.repository.findCountry(countryId);
    if (countryId !== null && !country)
      throw new BadRequestException('Unknown residence country.');
    if (!(await this.repository.update(userId, countryId)))
      throw new NotFoundException('Profile not found.');
    return {
      residenceCountry: country ? CountryMapper.toResponse(country) : null,
    };
  }
}
