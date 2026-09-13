import { BadRequestException, Injectable } from '@nestjs/common';
import type { PipeTransform } from '@nestjs/common';
import type { SubmissionInput, VoteInput } from './photo-contest.dto.js';

function identifier(value: unknown, field: string): string {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
    Object.keys(value).length !== 1 || !(field in value)) throw new BadRequestException(`Only ${field} is accepted.`);
  const id = Reflect.get(value, field);
  if (typeof id !== 'string' || !id.trim() || id.length > 100) throw new BadRequestException(`Invalid ${field}.`);
  return id.trim();
}
@Injectable()
export class SubmissionPipe implements PipeTransform<unknown, SubmissionInput> {
  transform(value: unknown): SubmissionInput { return { tripId: identifier(value, 'tripId') }; }
}
@Injectable()
export class VotePipe implements PipeTransform<unknown, VoteInput> {
  transform(value: unknown): VoteInput { return { submissionId: identifier(value, 'submissionId') }; }
}
