import { Module } from '@nestjs/common';
import { DatabaseModule } from '../prisma/database.module.js';
import { UserRepository } from './repositories/user.repository.js';
import { UsersService } from './users.service.js';

@Module({
  imports: [DatabaseModule],
  providers: [UserRepository, UsersService],
  exports: [UsersService],
})
export class UsersModule {}
