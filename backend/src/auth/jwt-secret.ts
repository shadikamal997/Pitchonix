// Phase Ω.CERT — single hardened source of truth for the JWT signing/verifying
// secret. Both the signing module (JwtModule.register) and the verifying
// strategy (JwtStrategy) import this so they can never diverge.
//
//   • JWT_SECRET set            → use it (production + any explicit override).
//   • NODE_ENV unset/development → fall back to a clearly-labelled dev secret.
//   • NODE_ENV != development    → THROW. Never silently accept a known string
//                                  secret in staging/production.
const LOCAL_DEV_JWT_SECRET = 'pitchonix-local-development-only-secret';

export function jwtSecret(): string {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
    return LOCAL_DEV_JWT_SECRET;
  }
  throw new Error('JWT_SECRET must be set when NODE_ENV is not "development".');
}
