import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { TermsController } from './terms.controller';
import { TermsService } from './terms.service';

@Module({ imports: [AuditModule], controllers: [TermsController], providers: [TermsService] })
export class TermsModule {}
