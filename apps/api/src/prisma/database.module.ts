import { Global, Injectable, Module } from '@nestjs/common';
import type { OnApplicationShutdown } from '@nestjs/common';
import { db } from './db.js';

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  readonly client = db;

  async onApplicationShutdown() {
    await this.client.close();
  }
}

@Global()
@Module({ providers: [DatabaseService], exports: [DatabaseService] })
export class DatabaseModule {}
