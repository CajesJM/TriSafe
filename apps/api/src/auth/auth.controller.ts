import { Body, Controller, Post, Req } from '@nestjs/common';
import { Public } from './public.decorator';
import { LoginDto } from './dto/login.dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  login(@Req() request: { ip?: string }, @Body() dto: LoginDto) {
    return this.auth.login(dto, request.ip);
  }
}
