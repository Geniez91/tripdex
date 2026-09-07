import {
  Body,
  BadRequestException,
  Controller,
  Delete,
  Header,
  Param,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUserService } from '../current-user/current-user.service.js';
import { MAX_COVER_BYTES } from './cover-file.js';
import type { CoverFile } from './cover-file.js';
import { TripCoversService } from './trip-covers.service.js';

@Controller('me/trips/:id/cover')
export class TripCoversController {
  constructor(
    private readonly currentUser: CurrentUserService,
    private readonly covers: TripCoversService,
  ) {}

  @Put()
  @Header('Cache-Control', 'private, no-store')
  @UseInterceptors(
    FileInterceptor('cover', {
      limits: { fileSize: MAX_COVER_BYTES, files: 1, fields: 0 },
    }),
  )
  async replace(
    @Param('id') id: string,
    @UploadedFile() file: CoverFile | undefined,
    @Body() body: Record<string, unknown> | undefined,
  ) {
    const userId = await this.currentUser.getUserId();
    if (body && Object.keys(body).length)
      throw new BadRequestException('Seul le fichier cover est accepté.');
    return this.covers.replace(userId, id, file);
  }

  @Delete()
  async remove(@Param('id') id: string) {
    return this.covers.remove(await this.currentUser.getUserId(), id);
  }
}
