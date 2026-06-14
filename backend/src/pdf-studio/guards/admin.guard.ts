import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

// Phase Ω.4A — AdminGuard: enforces ADMIN_EMAILS allowlist in all environments.
// The previous dev-mode bypass was removed because staging environments often
// run with NODE_ENV=development and would otherwise expose admin endpoints.
// Set ADMIN_EMAILS="email1@example.com,email2@example.com" to grant access.
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const allowList = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    if (allowList.length > 0 && user.email && allowList.includes(user.email.toLowerCase())) {
      return true;
    }

    throw new ForbiddenException('Admin access required');
  }
}
