import { Body, Controller, Get, Header, HttpCode, Param, Post, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../auth/guards/auth.guard.js';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import type { ITripDexUser } from '../../users/types/tripdex-user.js';
import { PhotoContestService } from './photo-contest.service.js';
import { SubmissionPipe, VotePipe } from './photo-contest-input.pipe.js';
import type { ISubmissionInput, IVoteInput } from './photo-contest.dto.js';

@Controller('community')
export class PhotoContestController {
  constructor(private readonly contests: PhotoContestService) {}
  @Get('photo-contests/:contestId')
  @Header('Cache-Control', 'no-store')
  detail(@Param('contestId') id: string) { return this.contests.detail(id); }

  @Get('photo-contests/:contestId/participation')
  @UseGuards(AuthGuard)
  @Header('Cache-Control', 'no-store')
  participation(@Param('contestId') id: string, @CurrentUser() user: ITripDexUser) {
    return this.contests.participation(id, user.id);
  }
  @Post('photo-contests/:contestId/submissions')
  @UseGuards(AuthGuard)
  @HttpCode(204)
  submit(@Param('contestId') id: string, @CurrentUser() user: ITripDexUser, @Body(SubmissionPipe) input: ISubmissionInput) {
    return this.contests.submit(id, user.id, input.tripId);
  }
  @Put('photo-contests/:contestId/vote')
  @UseGuards(AuthGuard)
  @HttpCode(204)
  vote(@Param('contestId') id: string, @CurrentUser() user: ITripDexUser, @Body(VotePipe) input: IVoteInput) {
    return this.contests.vote(id, user.id, input.submissionId);
  }
  @Get('memories')
  @Header('Cache-Control', 'no-store')
  memories() { return this.contests.memories(); }
  @Get('countries/:countryCode/memory')
  @Header('Cache-Control', 'no-store')
  async memory(@Param('countryCode') code: string) { return (await this.contests.memories(code.toUpperCase()))[0] ?? null; }
}
