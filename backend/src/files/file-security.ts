// =============================================================================
//  Phase Ω.1B — Secure static file access.
//
//  Replaces the open `app.useStaticAssets('/exports' | '/uploads')` serving
//  (which let anyone with a URL fetch private exports/uploads) with an Express
//  auth-gate placed IN FRONT of the static handler. A request may pass with:
//
//    1. a valid signed token  (?token=<exp>.<hmac>)  — for sharing / <img> use,
//    2. the `pitchonix-auth` cookie (same-site <img>/download requests), or
//    3. an `Authorization: Bearer <jwt>` header (API/blob downloads).
//
//  For `/exports` (private documents) we additionally enforce per-record
//  ownership when an Export / PdfExport row matches the requested path.
//
//  Path traversal is handled by express.static (it normalises and rejects
//  `..`), and re-checked here as defence in depth.
// =============================================================================

import type { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import * as path from 'path';

function hmac(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

function timingSafeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a || '', 'utf8');
  const bb = Buffer.from(b || '', 'utf8');
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

/**
 * Produce a short-lived signed token for a stored file path (e.g.
 * `/uploads/images/abc.png`). Use for public sharing or `<img>` URLs that
 * cannot carry an Authorization header. Token = `<expEpochSec>.<hmac>`.
 */
export function signFilePath(relPath: string, secret: string, ttlSec = 3600): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  return `${exp}.${hmac(`${relPath}:${exp}`, secret)}`;
}

export function verifyFileToken(relPath: string, token: string, secret: string): boolean {
  const [expStr, sig] = String(token || '').split('.');
  const exp = parseInt(expStr, 10);
  if (!exp || Number.isNaN(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  return timingSafeEqualHex(sig || '', hmac(`${relPath}:${exp}`, secret));
}

function parseCookie(cookieHeader: string | undefined, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    if (k === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return undefined;
}

/** True only when the path resolves inside the served directory. */
function isContained(baseDir: string, relPath: string): boolean {
  const resolved = path.resolve(baseDir, '.' + path.posix.normalize('/' + relPath));
  const root = path.resolve(baseDir);
  return resolved === root || resolved.startsWith(root + path.sep);
}

interface GateOpts {
  jwtSecret: string;
  /** `/exports` or `/uploads` — the mount prefix used to rebuild stored URLs. */
  mountPrefix: string;
  baseDir: string;
  /** Optional ownership resolver: returns true/false/null (null = unknown → allow if authed). */
  resolveOwner?: (storedUrl: string, userId: string) => Promise<boolean | null>;
}

/**
 * Express middleware: authenticate (signed token | cookie | bearer) and,
 * for `/exports`, enforce per-record ownership when resolvable.
 */
export function createFileAuthGate(opts: GateOpts) {
  const { jwtSecret, mountPrefix, baseDir, resolveOwner } = opts;
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // req.path is relative to the mount, e.g. '/images/abc.png' under /uploads.
    const decodedPath = decodeURIComponent(req.path || '');
    // Reject any traversal segment outright (defence in depth — express.static
    // also normalises, and isContained() re-checks the resolved path).
    if (/(^|[\\/])\.\.([\\/]|$)/.test(decodedPath) || !isContained(baseDir, decodedPath)) {
      res.status(400).send('Bad path');
      return;
    }
    const storedUrl = mountPrefix + (decodedPath.startsWith('/') ? decodedPath : '/' + decodedPath);

    // 1) Signed token (sharing / <img> without auth header).
    const token = req.query?.token;
    if (token && verifyFileToken(storedUrl, String(token), jwtSecret)) {
      next();
      return;
    }

    // 2) JWT via cookie or bearer.
    const bearer = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
    const cookieTok = parseCookie(req.headers.cookie, 'pitchonix-auth');
    const jwtToken = bearer || cookieTok;
    let userId: string | undefined;
    if (jwtToken) {
      try {
        const payload = jwt.verify(jwtToken, jwtSecret) as any;
        userId = payload?.sub;
      } catch {
        /* invalid/expired */
      }
    }
    if (!userId) {
      res.status(401).send('Authentication required to access this file.');
      return;
    }

    // 3) Best-effort ownership (exports). null/undefined → allow authed user.
    if (resolveOwner) {
      try {
        const owned = await resolveOwner(storedUrl, userId);
        if (owned === false) {
          res.status(403).send('You do not have access to this file.');
          return;
        }
      } catch {
        /* on resolver error, fall through to authed access */
      }
    }

    next();
  };
}
