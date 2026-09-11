import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { AuthGuard } from './guards/auth.guard.js';
import { MeController } from './me.controller.js';
import { ResidenceController } from './residence.controller.js';
import { SupabaseAuthService } from './supabase-auth.service.js';

@Module({
  imports: [UsersModule],
  controllers: [MeController, ResidenceController],
  providers: [SupabaseAuthService, AuthGuard],
  exports: [AuthGuard, SupabaseAuthService, UsersModule],
})
export class AuthModule {}
