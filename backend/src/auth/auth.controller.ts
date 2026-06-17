import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { TwoFactorService } from './two-factor.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { Public } from './public.decorator';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class VerifyEmailDto {
  @ApiProperty() @IsString() token: string;
}
class ResendVerificationDto {
  @ApiProperty() @IsEmail() email: string;
}
class ForgotPasswordDto {
  @ApiProperty() @IsEmail() email: string;
}
class ResetPasswordDto {
  @ApiProperty() @IsString() token: string;
  @ApiProperty() @IsString() @MinLength(8) newPassword: string;
}
class MagicLinkDto {
  @ApiProperty() @IsEmail() email: string;
}
class TwoFactorCodeDto {
  @ApiProperty() @IsString() code: string;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private twoFactorService: TwoFactorService,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Start Google OAuth sign-in' })
  async googleAuth() {
    // Passport redirects to Google.
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Handle Google OAuth callback' })
  async googleAuthCallback(@Request() req: any, @Res() res: Response) {
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3002')
      .split(',')[0]
      .trim()
      .replace(/\/$/, '');

    const payload = req.user;
    const params = new URLSearchParams({
      token: payload.token,
      user: JSON.stringify(payload.user),
    });

    return res.redirect(`${frontendUrl}/auth/google/callback#${params.toString()}`);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email with token' })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }

  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend email verification link' })
  async resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto.email);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send password reset email' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @Public()
  @Post('magic-link')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send magic sign-in link' })
  async sendMagicLink(@Body() dto: MagicLinkDto) {
    return this.authService.sendMagicLink(dto.email);
  }

  @Public()
  @Get('magic-link/verify')
  @ApiOperation({ summary: 'Verify magic link token' })
  async verifyMagicLink(@Query('token') token: string) {
    return this.authService.verifyMagicLink(token);
  }

  @Post('onboarding/complete')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark onboarding as completed' })
  async completeOnboarding(@Request() req: any) {
    return this.authService.completeOnboarding(req.user.id);
  }

  @Post('2fa/setup')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate 2FA secret and QR code' })
  async setup2FA(@Request() req: any) {
    return this.twoFactorService.setupTwoFactor(req.user.id);
  }

  @Post('2fa/enable')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enable 2FA with a valid TOTP code' })
  async enable2FA(@Request() req: any, @Body() dto: TwoFactorCodeDto) {
    return this.twoFactorService.enableTwoFactor(req.user.id, dto.code);
  }

  @Post('2fa/disable')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disable 2FA with a valid TOTP code' })
  async disable2FA(@Request() req: any, @Body() dto: TwoFactorCodeDto) {
    return this.twoFactorService.disableTwoFactor(req.user.id, dto.code);
  }
}
