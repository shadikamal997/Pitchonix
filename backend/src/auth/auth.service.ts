import { Injectable, UnauthorizedException, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existingUser) throw new ConflictException('User with this email already exists');

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
        verificationToken,
        verificationTokenExpiry,
      },
      select: { id: true, email: true, name: true, createdAt: true, isVerified: true },
    });

    await this.emailService.sendVerificationEmail(dto.email, verificationToken);
    const token = this.generateToken(user.id, user.email);
    return { user: { ...user, onboardingCompleted: false, twoFactorEnabled: false }, token };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials');

    const token = this.generateToken(user.id, user.email);
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        isVerified: user.isVerified,
        onboardingCompleted: user.onboardingCompleted,
        twoFactorEnabled: user.twoFactorEnabled,
      },
      token,
    };
  }

  async verifyEmail(token: string) {
    const user = await this.prisma.user.findUnique({ where: { verificationToken: token } });
    if (!user) throw new BadRequestException('Invalid or expired verification link');
    if (user.verificationTokenExpiry && user.verificationTokenExpiry < new Date()) {
      throw new BadRequestException('Verification link has expired — please request a new one');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true, verificationToken: null, verificationTokenExpiry: null },
    });
    return { message: 'Email verified successfully' };
  }

  async resendVerification(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('No account found with that email');
    if (user.isVerified) throw new BadRequestException('Email is already verified');

    const token = crypto.randomBytes(32).toString('hex');
    await this.prisma.user.update({
      where: { id: user.id },
      data: { verificationToken: token, verificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000) },
    });
    await this.emailService.sendVerificationEmail(email, token);
    return { message: 'Verification email sent' };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Always respond the same — don't leak whether email exists
    if (!user) return { message: 'If that email is registered, a reset link has been sent' };

    const token = crypto.randomBytes(32).toString('hex');
    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetToken: token, resetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000) }, // 1h
    });
    await this.emailService.sendPasswordResetEmail(email, token);
    return { message: 'If that email is registered, a reset link has been sent' };
  }

  async resetPassword(token: string, newPassword: string) {
    if (newPassword.length < 8) throw new BadRequestException('Password must be at least 8 characters');

    const user = await this.prisma.user.findUnique({ where: { resetToken: token } });
    if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      throw new BadRequestException('Invalid or expired reset link');
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashed, resetToken: null, resetTokenExpiry: null },
    });
    return { message: 'Password reset successfully — please log in' };
  }

  async sendMagicLink(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return { message: 'If that email is registered, a sign-in link has been sent' };

    const token = crypto.randomBytes(32).toString('hex');
    await this.prisma.user.update({
      where: { id: user.id },
      data: { magicLinkToken: token, magicLinkTokenExpiry: new Date(Date.now() + 15 * 60 * 1000) }, // 15min
    });
    await this.emailService.sendMagicLinkEmail(email, token);
    return { message: 'If that email is registered, a sign-in link has been sent' };
  }

  async verifyMagicLink(token: string) {
    const user = await this.prisma.user.findUnique({ where: { magicLinkToken: token } });
    if (!user || !user.magicLinkTokenExpiry || user.magicLinkTokenExpiry < new Date()) {
      throw new BadRequestException('Invalid or expired sign-in link');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { magicLinkToken: null, magicLinkTokenExpiry: null, isVerified: true },
    });

    const jwtToken = this.generateToken(user.id, user.email);
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        isVerified: true,
        onboardingCompleted: user.onboardingCompleted,
        twoFactorEnabled: user.twoFactorEnabled,
      },
      token: jwtToken,
    };
  }

  async completeOnboarding(userId: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { onboardingCompleted: true } });
    return { message: 'Onboarding complete' };
  }

  private generateToken(userId: string, email: string): string {
    return this.jwtService.sign({ sub: userId, email });
  }

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, createdAt: true, isVerified: true, onboardingCompleted: true },
    });
    if (!user) throw new UnauthorizedException();
    return user;
  }

  async validateGoogleUser(googleUser: { googleId: string; email: string; name: string; picture?: string }) {
    // Check if user exists by Google ID
    let user = await (this.prisma.user as any).findFirst({
      where: { googleId: googleUser.googleId },
    });

    // If not, check by email (for existing users linking Google)
    if (!user) {
      user = await this.prisma.user.findUnique({
        where: { email: googleUser.email },
      });

      // Link Google ID to existing user
      if (user) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { googleId: googleUser.googleId, picture: googleUser.picture, isVerified: true } as any,
        });
      }
    }

    // Create new user if doesn't exist
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: googleUser.email,
          name: googleUser.name,
          googleId: googleUser.googleId,
          picture: googleUser.picture,
          isVerified: true,
          password: '', // No password for OAuth users
        } as any,
      });
    }

    const token = this.generateToken(user.id, user.email);
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        isVerified: user.isVerified,
        onboardingCompleted: user.onboardingCompleted,
        twoFactorEnabled: user.twoFactorEnabled,
        picture: (user as any).picture,
      },
      token,
    };
  }
}
