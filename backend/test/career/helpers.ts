/**
 * Phase Ω.4 — Shared E2E test helpers for the career module.
 * All specs import from here to avoid repeating bootstrap logic.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as path from 'path';
import * as fs from 'fs';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

// Unique suffix so parallel test runs don't collide on email uniqueness.
const RUN_ID = Date.now().toString(36);

export interface TestSession {
  app:    INestApplication;
  prisma: PrismaService;
  token:  string;
  userId: string;
  req:    ReturnType<typeof request>;
}

export async function createSession(suffix = ''): Promise<TestSession> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();

  const prisma = app.get<PrismaService>(PrismaService);

  // Register a throwaway user for this test session.
  const email = `e2e-career-${RUN_ID}${suffix}@test.local`;
  const regRes = await request(app.getHttpServer())
    .post('/auth/register')
    .send({ email, password: 'Test123!@#', name: `E2E User ${suffix}` });

  const token  = regRes.body?.token ?? regRes.body?.access_token;
  const userId = regRes.body?.user?.id ?? regRes.body?.id;

  if (!token) throw new Error(`Auth failed in E2E setup: ${JSON.stringify(regRes.body)}`);

  return { app, prisma, token, userId, req: request(app.getHttpServer()) };
}

export async function closeSession(session: TestSession) {
  try {
    // Clean up all career data then the user.
    await session.prisma.betaTelemetry.deleteMany({ where: { userId: session.userId } });
    await session.prisma.betaFeedback.deleteMany({ where: { userId: session.userId } });
    await session.prisma.cvAnalysisSnapshot.deleteMany({ where: { userId: session.userId } });
    await session.prisma.cvDocument.deleteMany({ where: { userId: session.userId } });
    await session.prisma.cvProfile.deleteMany({ where: { userId: session.userId } });
    await session.prisma.user.delete({ where: { id: session.userId } });
  } catch { /* best-effort */ }
  await session.app.close();
}

export function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

/** Minimal 1-page PDF fixture for upload tests (synthetic, no real content needed). */
export function minimalPdfBuffer(): Buffer {
  const pdfPath = path.join(__dirname, 'fixtures', 'minimal.pdf');
  if (fs.existsSync(pdfPath)) return fs.readFileSync(pdfPath);
  // Inline 3-line PDF — parseable by pdf-parse, not OCR-worthy.
  return Buffer.from(
    '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
    '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
    '3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>/Contents 4 0 R>>endobj\n' +
    '4 0 obj<</Length 44>>stream\nBT /F1 12 Tf 72 720 Td (John Doe - Engineer) Tj ET\nendstream\nendobj\n' +
    'xref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n' +
    '0000000115 00000 n\n0000000266 00000 n\n\ntrailer<</Size 5/Root 1 0 R>>\nstartxref\n358\n%%EOF'
  );
}
