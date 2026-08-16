import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './auth.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { DriversModule } from '../drivers/drivers.module';

@Module({ imports: [DriversModule], controllers: [AuthController], providers: [AuthService, TokenService, { provide: APP_GUARD, useClass: AuthGuard }] })
export class AuthModule {}
