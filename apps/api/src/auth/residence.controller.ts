import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { AuthGuard } from './guards/auth.guard.js';
import type { TripDexUser } from '../users/types/tripdex-user.js';
import { ResidenceService } from '../users/residence.service.js';
import { ResidencePipe } from '../users/residence.pipe.js';
import type {
  ResidenceResponseDto,
  UpdateResidenceDto,
} from '../users/dto/residence.dto.js';

@Controller('me/residence')
@UseGuards(AuthGuard)
export class ResidenceController {
  constructor(private readonly residence: ResidenceService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'private, no-store')
  get(@CurrentUser() user: TripDexUser): Promise<ResidenceResponseDto> {
    return this.residence.get(user.id);
  }

  @Put()
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'private, no-store')
  update(
    @CurrentUser() user: TripDexUser,
    @Body(ResidencePipe) input: UpdateResidenceDto,
  ): Promise<ResidenceResponseDto> {
    return this.residence.update(user.id, input.residenceCountryId);
  }
}
