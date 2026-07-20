import { Module } from '@nestjs/common';
import { IncidentAiService } from './incident-ai.service';
import { IncidentsController } from './incidents.controller';
import { IncidentsService } from './incidents.service';

@Module({ controllers: [IncidentsController], providers: [IncidentsService, IncidentAiService], exports: [IncidentsService] })
export class IncidentsModule {}
