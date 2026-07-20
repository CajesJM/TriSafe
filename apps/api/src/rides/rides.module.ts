import { Module } from '@nestjs/common';
import { FaresModule } from '../fares/fares.module';
import { RidesController } from './rides.controller';
import { RidesService } from './rides.service';

@Module({ imports: [FaresModule], controllers: [RidesController], providers: [RidesService] })
export class RidesModule {}
