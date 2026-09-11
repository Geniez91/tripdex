import { Module } from '@nestjs/common';
import { DatabaseModule } from '../prisma/database.module.js';
import { UserRepository } from './repositories/user.repository.js';
import { UsersService } from './users.service.js';
import { ResidenceService } from './residence.service.js';
import { ResidenceRepository } from './repositories/residence.repository.js';

@Module({
  imports: [DatabaseModule],
  providers: [
    UserRepository,
    UsersService,
    ResidenceRepository,
    ResidenceService,
  ],
  exports: [UsersService, ResidenceService],
})
export class UsersModule {}
