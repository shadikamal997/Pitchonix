import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

/**
 * Guards pdf-studio admin endpoints.
 * In production: only the email set in ADMIN_EMAIL env var passes.
 * In development: any authenticated user passes (so devs can test locally).
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Development — allow any authenticated user
    if (process.env.NODE_ENV !== 'production') {
      return true;
    }

    // Production — require the ADMIN_EMAIL env var to match
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail && user.email === adminEmail) {
      return true;
    }

    throw new ForbiddenException('Admin access required');
  }
}
