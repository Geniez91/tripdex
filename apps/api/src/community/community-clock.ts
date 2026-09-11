import { Injectable } from '@nestjs/common';

@Injectable()
export class CommunityClock {
  today(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
