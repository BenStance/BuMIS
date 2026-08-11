import { Body, Controller, Get, Headers, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Request } from 'express';
import { AuditService } from '../audit/audit.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
  ) {}

  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto, @Req() request: Request): Promise<Record<string, unknown>> {
    try {
      return await this.authService.login(
        dto,
        request.headers['x-forwarded-for'] as string | undefined,
        request.headers['user-agent'],
      );
    } catch (error) {
      void this.auditService.recordLoginAttempt({
        email: dto.email,
        success: false,
        ipAddress: request.headers['x-forwarded-for'] as string | undefined,
        userAgent: request.headers['user-agent'] as string | undefined,
        reason: error instanceof Error ? error.message : 'Login failed',
      });
      throw error;
    }
  }

  @Public()
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto): Promise<Record<string, string>> {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto): Promise<Record<string, string>> {
    return this.authService.resetPassword(dto);
  }

  @Public()
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto): Promise<Record<string, unknown>> {
    return this.authService.refreshAccessToken(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  changePassword(@CurrentUser() user: { sub: string }, @Body() dto: ChangePasswordDto): Promise<Record<string, string>> {
    return this.authService.changePassword(user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@Body() dto: RefreshTokenDto): Promise<Record<string, string>> {
    return this.authService.logout(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: { sub: string }): Promise<Record<string, unknown>> {
    return this.authService.me(user.sub);
  }
}
