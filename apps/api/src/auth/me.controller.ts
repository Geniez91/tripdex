import {
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import type { ITripDexUser } from '../users/types/tripdex-user.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import type { ICurrentUserResponseDto } from './dto/current-user-response.dto.js';
import { AuthGuard } from './guards/auth.guard.js';

@Controller('me')
@UseGuards(AuthGuard)
export class MeController {
  @Get()
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'private, no-store')
  get(@CurrentUser() user: ITripDexUser): ICurrentUserResponseDto {
    return { id: user.id, email: user.email, username: user.username };
  }
}
