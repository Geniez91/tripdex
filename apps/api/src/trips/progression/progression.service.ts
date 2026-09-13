import { Injectable } from '@nestjs/common';
import type { ProgressionResponseDto } from './dto/progression-response.dto.js';
import { calculateProgression } from './progression-calculations.js';
import { ProgressionRepository } from './progression.repository.js';

@Injectable()
export class ProgressionService {
  constructor(private readonly progression: ProgressionRepository) {}

  async forUser(userId: string): Promise<ProgressionResponseDto> {
    const snapshot = await this.progression.snapshot(userId);
    return calculateProgression(snapshot, new Date().getUTCFullYear());
  }
}
