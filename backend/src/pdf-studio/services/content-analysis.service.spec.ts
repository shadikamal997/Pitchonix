import { Test, TestingModule } from '@nestjs/testing';
import { ContentAnalysisService } from './content-analysis.service';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Unit Tests for Content Analysis Service
 */
describe('ContentAnalysisService', () => {
  let service: ContentAnalysisService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentAnalysisService,
        {
          provide: PrismaService,
          useValue: {
            // Mock Prisma methods if needed
          },
        },
      ],
    }).compile();

    service = module.get<ContentAnalysisService>(ContentAnalysisService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('analyzeContent', () => {
    it('should analyze business content correctly', async () => {
      const content = `
        Business Strategy 2026
        
        Executive Summary
        Our startup is revolutionizing the market with innovative solutions.
        We're seeking $5M in Series A funding.
        
        Market Analysis
        - TAM: $10B
        - Growing at 25% annually
        - Strong product-market fit
      `;

      const result = await service.analyzeContent(content);

      expect(result.detectedType).toBe('startup');
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.keywords).toContain('startup');
      expect(result.wordCount).toBeGreaterThan(20);
      expect(result.hasHeadings).toBe(true);
      expect(result.hasBullets).toBe(true);
    });

    it('should detect issues in content', async () => {
      const content = 'their is many grammar issue here alot of them';

      const result = await service.analyzeContent(content);

      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues.some((i) => i.type === 'grammar')).toBe(true);
    });

    it('should extract keywords with NLP', async () => {
      const content = `
        Apple Inc. is a technology company based in Cupertino, California.
        The company develops iPhone, iPad, and Mac computers.
      `;

      const result = await service.analyzeContent(content);

      expect(result.keywords).toContain('apple');
      expect(result.keywords).toContain('technology');
      expect(result.topics).toContain('Apple Inc.');
    });

    it('should calculate readability metrics', async () => {
      const content = `
        This is simple text. Easy to read. Short sentences work well.
        Clear and concise writing improves understanding significantly.
      `;

      const result = await service.analyzeContent(content);

      expect(result.readabilityScore).toBeGreaterThan(40);
      expect(result.readabilityScore).toBeLessThanOrEqual(100);
      expect(result.clarityScore).toBeGreaterThan(30);
    });

    it('should handle empty content gracefully', async () => {
      const content = '';

      const result = await service.analyzeContent(content);

      expect(result.wordCount).toBe(0);
      expect(result.characterCount).toBe(0);
      expect(result.detectedType).toBeDefined(); // Should have fallback
    });
  });

  describe('content type detection', () => {
    it('should detect startup pitch', async () => {
      const content = 'We are seeking investment to scale our startup';
      const result = await service.analyzeContent(content);
      expect(result.detectedType).toContain('startup');
    });

    it('should detect business report', async () => {
      const content = 'Q4 revenue increased by 15% year-over-year';
      const result = await service.analyzeContent(content);
      expect(result.detectedType).toBe('business');
    });

    it('should detect technical document', async () => {
      const content = 'The API endpoint accepts JSON requests with OAuth2 authentication';
      const result = await service.analyzeContent(content);
      expect(['technical', 'documentation']).toContain(result.detectedType);
    });
  });
});
