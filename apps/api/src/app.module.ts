import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { DriversModule } from './drivers/drivers.module';
import { FaresModule } from './fares/fares.module';
import { RidesModule } from './rides/rides.module';
import { IncidentsModule } from './incidents/incidents.module';
import { AdminModule } from './admin/admin.module';
import { SafetyModule } from './safety/safety.module';
import { HealthModule } from './health/health.module';
import { AuditModule } from './audit/audit.module';
import { validateEnvironment } from './config/environment';
import { PresenceModule } from './presence/presence.module';
import { RatingsModule } from './ratings/ratings.module';
import { TermsModule } from './terms/terms.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }), PrismaModule, AuditModule, AuthModule, DriversModule, FaresModule, RidesModule, IncidentsModule, AdminModule, SafetyModule, HealthModule, PresenceModule, RatingsModule, TermsModule],
})
export class AppModule {}
