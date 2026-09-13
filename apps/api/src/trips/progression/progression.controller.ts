import {
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../../auth/guards/auth.guard.js';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import type { TripDexUser } from '../../users/types/tripdex-user.js';
import type { ProgressionResponseDto } from './dto/progression-response.dto.js';
import { ProgressionService } from './progression.service.js';

@Controller('me/progression')
@UseGuards(AuthGuard)
export class ProgressionController {
  constructor(private readonly progression: ProgressionService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'private, no-store')
  async get(@CurrentUser() user: TripDexUser): Promise<ProgressionResponseDto> {
    return this.progression.forUser(user.id);
  }
}
