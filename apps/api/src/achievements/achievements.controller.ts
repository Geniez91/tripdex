import { Controller, Get, Header, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { TripDexUser } from '../users/types/tripdex-user.js';
import type { AchievementsResponseDto } from './dto/achievement-response.dto.js';
import { AchievementsService } from './achievements.service.js';

@Controller('me/achievements')
@UseGuards(AuthGuard)
export class AchievementsController {
  constructor(private readonly achievements: AchievementsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'private, no-store')
  get(@CurrentUser() user: TripDexUser): Promise<AchievementsResponseDto> {
    return this.achievements.forUser(user.id);
  }
}
