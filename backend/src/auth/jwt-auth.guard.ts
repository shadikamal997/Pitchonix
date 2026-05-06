import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (isPublic) {
      // For public endpoints, try to authenticate but don't fail if no token
      try {
        await super.canActivate(context);
      } catch (error) {
        // No token or invalid token - that's OK for public endpoints
      }
      return true;
    }
    
    // For protected endpoints, enforce authentication
    return super.canActivate(context) as Promise<boolean>;
  }
}
