import {
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
} from '@nestjs/common';
import { CurrentUserService } from '../current-user/current-user.service.js';
import type { TripResponseDto } from './dto/trip-response.dto.js';
import { TripsService } from './trips.service.js';

@Controller('me/trips')
export class TripsJournalController {
  constructor(
    private readonly trips: TripsService,
    private readonly currentUser: CurrentUserService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'private, no-store')
  async list(): Promise<TripResponseDto[]> {
    return this.trips.journal(await this.currentUser.getUserId());
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'private, no-store')
  async detail(@Param('id') id: string): Promise<TripResponseDto> {
    return this.trips.detail(await this.currentUser.getUserId(), id);
  }
}
