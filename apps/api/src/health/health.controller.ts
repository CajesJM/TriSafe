import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'ok', service: 'trisafe-api', timestamp: new Date().toISOString() };
    } catch {
      throw new ServiceUnavailableException({ status: 'error', database: 'unavailable', service: 'trisafe-api', timestamp: new Date().toISOString() });
    }
  }
}
