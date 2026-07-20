import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { SafetyService } from './safety.service';

@Controller('safety')
export class SafetyController {
  constructor(private readonly service: SafetyService) {}
  @Public() @Get('emergency-contacts') contacts() { return this.service.contacts(); }
}
