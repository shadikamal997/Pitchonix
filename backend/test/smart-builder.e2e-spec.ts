import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

/**
 * E2E Test Suite for Smart PDF Builder
 * Tests the complete flow from content input to PDF export
 */
describe('Smart PDF Builder (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Create test user and get auth token
    const authResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'test@example.com',
        password: 'Test123!@#',
        name: 'Test User',
      });

    authToken = authResponse.body.token;
    userId = authResponse.body.user.id;
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.user.delete({ where: { id: userId } });
    await app.close();
  });

  describe('Content Analysis', () => {
    it('should analyze raw content successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/pdf-studio/smart-builder/analyze')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rawContent: `
            Business Strategy 2026
            
            Executive Summary
            Our company is focused on growth and innovation.
            
            Market Analysis
            - Growing market demand
            - Strong competition
            - Technology trends
          `,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('detectedType');
      expect(response.body.data).toHaveProperty('keywords');
      expect(response.body.data).toHaveProperty('readabilityScore');
      expect(response.body.data.keywords.length).toBeGreaterThan(0);
    });

    it('should reject invalid content', async () => {
      await request(app.getHttpServer())
        .post('/api/pdf-studio/smart-builder/analyze')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rawContent: 'abc', // Too short
        })
        .expect(400);
    });
  });

  describe('Content Enhancement', () => {
    it('should enhance content with grammar fixes', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/pdf-studio/smart-builder/enhance-content')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rawContent: 'their is a problem with you grammar here',
          fixAll: true,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('enhancedContent');
      expect(response.body.data.enhancedContent).toContain('there is');
      expect(response.body.data.enhancedContent).toContain('your grammar');
    });
  });

  describe('Document Generation', () => {
    it('should generate PDF document', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/pdf-studio/smart-builder/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rawContent: 'Test content for PDF generation',
          template: 'modern',
          options: {
            enhanceContent: true,
            addStructure: true,
          },
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('documentId');
      expect(response.body.data).toHaveProperty('url');
    });
  });

  describe('Export', () => {
    let documentId: string;
    let projectId: string;

    beforeAll(async () => {
      // Create a project first
      const project = await prisma.project.create({
        data: {
          userId,
          name: 'Test Project',
          documentType: 'business_plan',
          documentFormat: 'pdf',
        },
      });
      projectId = project.id;

      // Create a document
      const doc = await prisma.pdfDocument.create({
        data: {
          projectId,
          title: 'Test Document',
          documentType: 'business_plan',
          status: 'ready',
          exportReady: true,
          pages: {
            create: [
              {
                title: 'Page 1',
                content: { text: 'Test content' },
                order: 1,
                pageType: 'content',
              },
            ],
          },
        },
      });
      documentId = doc.id;
    });

    it('should export document as PDF', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/pdf-studio/smart-builder/export')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          documentId,
          format: 'pdf',
        })
        .expect(201);

      expect(response.headers['content-type']).toContain('application/pdf');
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should export document as DOCX', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/pdf-studio/smart-builder/export')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          documentId,
          format: 'docx',
        })
        .expect(201);

      expect(response.headers['content-type']).toContain(
        'application/vnd.openxmlformats',
      );
    });

    it('should export document as PPTX', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/pdf-studio/smart-builder/export')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          documentId,
          format: 'pptx',
        })
        .expect(201);

      expect(response.headers['content-type']).toContain(
        'application/vnd.openxmlformats',
      );
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      // Make 15 requests quickly (limit is 10 per second)
      const requests = Array.from({ length: 15 }, () =>
        request(app.getHttpServer())
          .post('/api/pdf-studio/smart-builder/analyze')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            rawContent: 'Test content for rate limiting',
          }),
      );

      const responses = await Promise.all(requests);
      const tooManyRequests = responses.filter((r) => r.status === 429);

      expect(tooManyRequests.length).toBeGreaterThan(0);
    });
  });

  describe('Input Validation', () => {
    it('should validate content length', async () => {
      await request(app.getHttpServer())
        .post('/api/pdf-studio/smart-builder/analyze')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rawContent: 'x'.repeat(200000), // Over 100k limit
        })
        .expect(400);
    });

    it('should sanitize XSS attempts', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/pdf-studio/smart-builder/analyze')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rawContent: '<script>alert("xss")</script>This is content',
        })
        .expect(201);

      // Content should be analyzed but script tags removed in export
      expect(response.body.success).toBe(true);
    });
  });
});
