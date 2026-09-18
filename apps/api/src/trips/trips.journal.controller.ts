import {
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { ITripDexUser } from '../users/types/tripdex-user.js';
import type { ITripResponseDto } from './dto/trip-response.dto.js';
import { TripsService } from './trips.service.js';

@Controller('me/trips')
@UseGuards(AuthGuard)
export class TripsJournalController {
  constructor(private readonly trips: TripsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'private, no-store')
  async list(@CurrentUser() user: ITripDexUser): Promise<ITripResponseDto[]> {
    return this.trips.journal(user.id);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'private, no-store')
  async detail(
    @Param('id') id: string,
    @CurrentUser() user: ITripDexUser,
  ): Promise<ITripResponseDto> {
    return this.trips.detail(user.id, id);
  }
}
