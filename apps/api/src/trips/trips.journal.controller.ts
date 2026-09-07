import { Controller, Get, Header, Param } from '@nestjs/common';
import { CurrentUserService } from '../current-user/current-user.service.js';
import { TripsService } from './trips.service.js';

@Controller('me/trips')
export class TripsJournalController {
  constructor(
    private readonly trips: TripsService,
    private readonly currentUser: CurrentUserService,
  ) {}

  @Get()
  @Header('Cache-Control', 'private, no-store')
  async list() {
    return this.trips.journal(await this.currentUser.getUserId());
  }

  @Get(':id')
  @Header('Cache-Control', 'private, no-store')
  async detail(@Param('id') id: string) {
    return this.trips.detail(await this.currentUser.getUserId(), id);
  }
}
