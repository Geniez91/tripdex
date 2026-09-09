import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import type { TripDexUser } from '../users/types/tripdex-user.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import type { CurrentUserResponseDto } from './dto/current-user-response.dto.js';
import { AuthGuard } from './guards/auth.guard.js';

@Controller('me')
@UseGuards(AuthGuard)
export class MeController {
  @Get()
  @Header('Cache-Control', 'private, no-store')
  get(@CurrentUser() user: TripDexUser): CurrentUserResponseDto {
    return { id: user.id, email: user.email, username: user.username };
  }
}
