import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { RatingsController } from './ratings.controller';
import { RatingsService } from './ratings.service';

@Module({ imports: [AuditModule], controllers: [RatingsController], providers: [RatingsService] })
export class RatingsModule {}
