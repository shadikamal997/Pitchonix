import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';
import { jwtSecret } from './jwt-secret';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // Phase Ω.CERT — use the SAME hardened secret resolver the signing module
      // uses. Previously this fell back to a hardcoded weak key, which (a) would
      // silently fail to validate tokens signed with the module's dev fallback,
      // and (b) is a known-string secret if JWT_SECRET is ever unset in prod.
      // jwtSecret() throws when NODE_ENV != development and JWT_SECRET is unset.
      secretOrKey: jwtSecret(),
    });
  }

  async validate(payload: any) {
    const user = await this.authService.validateUser(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
