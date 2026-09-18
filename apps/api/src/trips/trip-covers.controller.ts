import {
  Body,
  BadRequestException,
  Controller,
  Delete,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { ITripDexUser } from '../users/types/tripdex-user.js';
import { MAX_COVER_BYTES } from './cover-file.js';
import type { ICoverFile } from './types/cover-format.js';
import type { ITripCoverResponseDto } from './dto/trip-cover-response.dto.js';
import { TripCoversService } from './trip-covers.service.js';

@Controller('me/trips/:id/cover')
@UseGuards(AuthGuard)
export class TripCoversController {
  constructor(private readonly covers: TripCoversService) {}

  @Put()
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'private, no-store')
  @UseInterceptors(
    FileInterceptor('cover', {
      limits: { fileSize: MAX_COVER_BYTES, files: 1, fields: 0 },
    }),
  )
  async replace(
    @Param('id') id: string,
    @UploadedFile() file: ICoverFile | undefined,
    @Body() body: Record<string, unknown> | undefined,
    @CurrentUser() user: ITripDexUser,
  ): Promise<ITripCoverResponseDto> {
    if (body && Object.keys(body).length)
      throw new BadRequestException('Seul le fichier cover est accepté.');
    return this.covers.replace(user.id, id, file);
  }

  // Return the updated cover state and cleanupPending; this is not a bodyless DELETE.
  @Delete()
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: ITripDexUser,
  ): Promise<ITripCoverResponseDto> {
    return this.covers.remove(user.id, id);
  }
}
