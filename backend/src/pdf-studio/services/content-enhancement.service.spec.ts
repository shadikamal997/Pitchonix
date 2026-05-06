import { Test, TestingModule } from '@nestjs/testing';
import { ContentEnhancementService } from './content-enhancement.service';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Unit Tests for Content Enhancement Service
 */
describe('ContentEnhancementService', () => {
  let service: ContentEnhancementService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentEnhancementService,
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<ContentEnhancementService>(ContentEnhancementService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('fixGrammar', () => {
    it('should fix their/there confusion', async () => {
      const result = await service.enhanceContent('their is a problem here', {
        fixGrammar: true,
      });

      expect(result.enhancedContent).toContain('there is');
      expect(result.changes.length).toBeGreaterThan(0);
    });

    it('should fix your/you\'re confusion', async () => {
      const result = await service.enhanceContent('your going to like this', {
        fixGrammar: true,
      });

      expect(result.enhancedContent).toContain('you\'re going');
    });

    it('should fix could of → could have', async () => {
      const result = await service.enhanceContent('I could of done better', {
        fixGrammar: true,
      });

      expect(result.enhancedContent).toContain('could have');
    });

    it('should capitalize I', async () => {
      const result = await service.enhanceContent('i went to the store', {
        fixGrammar: true,
      });

      expect(result.enhancedContent).toContain('I went');
    });

    it('should fix a/an usage', async () => {
      const result = await service.enhanceContent('a hour, an user', {
        fixGrammar: true,
      });

      expect(result.enhancedContent).toContain('an hour');
      expect(result.enhancedContent).toContain('a user');
    });

    it('should remove redundant phrases', async () => {
      const result = await service.enhanceContent(
        'past history, free gift, end result',
        { fixGrammar: true },
      );

      expect(result.enhancedContent).toContain('history');
      expect(result.enhancedContent).toContain('gift');
      expect(result.enhancedContent).toContain('result');
      expect(result.enhancedContent).not.toContain('past history');
    });
  });

  describe('quality improvement', () => {
    it('should show quality improvement metrics', async () => {
      const result = await service.enhanceContent(
        'their is problems with you grammar',
        { fixGrammar: true, improveWriting: true },
      );

      expect(result.qualityBefore).toBeDefined();
      expect(result.qualityAfter).toBeDefined();
      expect(result.improvement).toBeGreaterThan(0);
    });
  });

  describe('tone adjustment', () => {
    it('should maintain professional tone', async () => {
      const result = await service.enhanceContent(
        'gonna make this work, kinda important',
        { improveWriting: true, tone: 'formal' },
      );

      expect(result.enhancedContent).not.toContain('gonna');
      expect(result.enhancedContent).not.toContain('kinda');
    });
  });
});
