import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QualityHistory } from '@prisma/client';

export interface QualityMetrics {
  overallScore: number;
  grade: string;
  dimensions: {
    content: number;
    visual: number;
    ai: number;
    export: number;
  };
}

export interface ValidationMetrics {
  passed: boolean;
  errorCount: number;
  warningCount: number;
  infoCount: number;
}

export interface RecordQualityCheckDto {
  deckId: string;
  qualityMetrics: QualityMetrics;
  validationMetrics: ValidationMetrics;
  trigger: 'generation' | 'manual' | 'scheduled';
  changes?: Record<string, any>;
}

export interface TrendData {
  date: Date;
  score: number;
  grade: string;
}

export interface ComparisonResult {
  current: QualityHistory;
  previous: QualityHistory;
  scoreDelta: number;
  gradeDelta: string;
  improvements: string[];
  regressions: string[];
}

export interface QualityStatistics {
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  totalChecks: number;
  passRate: number;
  improvementRate: number;
  currentStreak: number;
}

@Injectable()
export class QualityHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record a quality check in history
   */
  async recordQualityCheck(data: RecordQualityCheckDto): Promise<QualityHistory> {
    // Get previous version number
    const latestHistory = await this.prisma.qualityHistory.findFirst({
      where: { deckId: data.deckId },
      orderBy: { version: 'desc' },
    });

    const version = latestHistory ? latestHistory.version + 1 : 1;

    return this.prisma.qualityHistory.create({
      data: {
        deckId: data.deckId,
        overallScore: data.qualityMetrics.overallScore,
        grade: data.qualityMetrics.grade,
        contentScore: data.qualityMetrics.dimensions.content,
        visualScore: data.qualityMetrics.dimensions.visual,
        aiScore: data.qualityMetrics.dimensions.ai,
        exportScore: data.qualityMetrics.dimensions.export,
        validationPassed: data.validationMetrics.passed,
        errorCount: data.validationMetrics.errorCount,
        warningCount: data.validationMetrics.warningCount,
        infoCount: data.validationMetrics.infoCount,
        trigger: data.trigger,
        version,
        changes: data.changes || {},
      },
    });
  }

  /**
   * Get complete quality history for a deck
   */
  async getHistory(deckId: string, limit?: number): Promise<QualityHistory[]> {
    return this.prisma.qualityHistory.findMany({
      where: { deckId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get latest quality check
   */
  async getLatest(deckId: string): Promise<QualityHistory | null> {
    return this.prisma.qualityHistory.findFirst({
      where: { deckId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get quality history within date range
   */
  async getByDateRange(
    deckId: string,
    startDate: Date,
    endDate: Date
  ): Promise<QualityHistory[]> {
    return this.prisma.qualityHistory.findMany({
      where: {
        deckId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Get quality trends over time
   */
  async getTrends(deckId: string, days: number = 30): Promise<TrendData[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const history = await this.getByDateRange(deckId, startDate, new Date());

    return history.map((entry) => ({
      date: entry.createdAt,
      score: entry.overallScore,
      grade: entry.grade,
    }));
  }

  /**
   * Compare two versions
   */
  async compareVersions(
    deckId: string,
    version1: number,
    version2: number
  ): Promise<ComparisonResult> {
    const [v1, v2] = await Promise.all([
      this.prisma.qualityHistory.findFirst({
        where: { deckId, version: version1 },
      }),
      this.prisma.qualityHistory.findFirst({
        where: { deckId, version: version2 },
      }),
    ]);

    if (!v1 || !v2) {
      throw new Error('One or both versions not found');
    }

    const scoreDelta = v2.overallScore - v1.overallScore;
    const improvements: string[] = [];
    const regressions: string[] = [];

    // Compare dimensions
    const dimensions = [
      { name: 'Content', key: 'contentScore' },
      { name: 'Visual', key: 'visualScore' },
      { name: 'AI', key: 'aiScore' },
      { name: 'Export', key: 'exportScore' },
    ];

    for (const dim of dimensions) {
      const delta = v2[dim.key] - v1[dim.key];
      if (delta > 0) {
        improvements.push(`${dim.name} improved by ${delta.toFixed(1)} points`);
      } else if (delta < 0) {
        regressions.push(`${dim.name} decreased by ${Math.abs(delta).toFixed(1)} points`);
      }
    }

    // Compare validation
    if (v2.errorCount < v1.errorCount) {
      improvements.push(`${v1.errorCount - v2.errorCount} fewer errors`);
    } else if (v2.errorCount > v1.errorCount) {
      regressions.push(`${v2.errorCount - v1.errorCount} more errors`);
    }

    return {
      current: v2,
      previous: v1,
      scoreDelta,
      gradeDelta: `${v1.grade} → ${v2.grade}`,
      improvements,
      regressions,
    };
  }

  /**
   * Get average quality score over time period
   */
  async getAverageScore(deckId: string, days: number = 30): Promise<number> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const history = await this.getByDateRange(deckId, startDate, new Date());

    if (history.length === 0) return 0;

    const sum = history.reduce((acc, entry) => acc + entry.overallScore, 0);
    return sum / history.length;
  }

  /**
   * Get score change (current vs previous)
   */
  async getScoreChange(deckId: string): Promise<number> {
    const history = await this.getHistory(deckId, 2);

    if (history.length < 2) return 0;

    return history[0].overallScore - history[1].overallScore;
  }

  /**
   * Calculate improvement rate (percentage of checks that improved)
   */
  async getImprovementRate(deckId: string): Promise<number> {
    const history = await this.getHistory(deckId);

    if (history.length < 2) return 0;

    let improvements = 0;
    for (let i = 0; i < history.length - 1; i++) {
      if (history[i].overallScore > history[i + 1].overallScore) {
        improvements++;
      }
    }

    return (improvements / (history.length - 1)) * 100;
  }

  /**
   * Get comprehensive statistics
   */
  async getStatistics(deckId: string): Promise<QualityStatistics> {
    const history = await this.getHistory(deckId);

    if (history.length === 0) {
      return {
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
        totalChecks: 0,
        passRate: 0,
        improvementRate: 0,
        currentStreak: 0,
      };
    }

    const scores = history.map((h) => h.overallScore);
    const passedCount = history.filter((h) => h.validationPassed).length;

    // Calculate current streak (consecutive improvements or passing checks)
    let currentStreak = 0;
    for (let i = 0; i < history.length - 1; i++) {
      if (history[i].overallScore >= history[i + 1].overallScore) {
        currentStreak++;
      } else {
        break;
      }
    }

    return {
      averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      highestScore: Math.max(...scores),
      lowestScore: Math.min(...scores),
      totalChecks: history.length,
      passRate: (passedCount / history.length) * 100,
      improvementRate: await this.getImprovementRate(deckId),
      currentStreak,
    };
  }

  /**
   * Prune old quality history entries (keep last N entries per deck)
   */
  async pruneOldHistory(deckId: string, keepCount: number = 100): Promise<number> {
    const history = await this.getHistory(deckId);

    if (history.length <= keepCount) {
      return 0;
    }

    const toDelete = history.slice(keepCount);
    const ids = toDelete.map((h) => h.id);

    const result = await this.prisma.qualityHistory.deleteMany({
      where: {
        id: { in: ids },
      },
    });

    return result.count;
  }

  /**
   * Get dimension trends (breakdown by dimension over time)
   */
  async getDimensionTrends(deckId: string, days: number = 30): Promise<{
    content: TrendData[];
    visual: TrendData[];
    ai: TrendData[];
    export: TrendData[];
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const history = await this.getByDateRange(deckId, startDate, new Date());

    return {
      content: history.map((h) => ({
        date: h.createdAt,
        score: h.contentScore,
        grade: this.scoreToGrade(h.contentScore),
      })),
      visual: history.map((h) => ({
        date: h.createdAt,
        score: h.visualScore,
        grade: this.scoreToGrade(h.visualScore),
      })),
      ai: history.map((h) => ({
        date: h.createdAt,
        score: h.aiScore,
        grade: this.scoreToGrade(h.aiScore),
      })),
      export: history.map((h) => ({
        date: h.createdAt,
        score: h.exportScore,
        grade: this.scoreToGrade(h.exportScore),
      })),
    };
  }

  /**
   * Convert score to grade
   */
  private scoreToGrade(score: number): string {
    if (score >= 97) return 'A+';
    if (score >= 93) return 'A';
    if (score >= 90) return 'A-';
    if (score >= 87) return 'B+';
    if (score >= 83) return 'B';
    if (score >= 80) return 'B-';
    if (score >= 77) return 'C+';
    if (score >= 73) return 'C';
    if (score >= 70) return 'C-';
    if (score >= 67) return 'D+';
    if (score >= 63) return 'D';
    if (score >= 60) return 'D-';
    return 'F';
  }
}
