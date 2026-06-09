import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { TwoFactorService } from './two-factor.service';

const LOCAL_DEV_JWT_SECRET = 'pitchonix-local-development-only-secret';

function jwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') return LOCAL_DEV_JWT_SECRET;
  throw new Error('JWT_SECRET must be set when NODE_ENV is not "development".');
}

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: jwtSecret(),
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, TwoFactorService],
  exports: [AuthService, TwoFactorService],
})
export class AuthModule {}
