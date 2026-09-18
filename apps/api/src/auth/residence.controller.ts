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
import type { ITripDexUser } from '../users/types/tripdex-user.js';
import { ResidenceService } from '../users/residence.service.js';
import { ResidencePipe } from '../users/residence.pipe.js';
import type {
  IResidenceResponseDto,
  IUpdateResidenceDto,
} from '../users/dto/residence.dto.js';

@Controller('me/residence')
@UseGuards(AuthGuard)
export class ResidenceController {
  constructor(private readonly residence: ResidenceService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'private, no-store')
  get(@CurrentUser() user: ITripDexUser): Promise<IResidenceResponseDto> {
    return this.residence.get(user.id);
  }

  @Put()
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'private, no-store')
  update(
    @CurrentUser() user: ITripDexUser,
    @Body(ResidencePipe) input: IUpdateResidenceDto,
  ): Promise<IResidenceResponseDto> {
    return this.residence.update(user.id, input.residenceCountryId);
  }
}
