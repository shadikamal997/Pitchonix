import { FeasibilityAnalyzerService } from './feasibility-analyzer.service';

describe('FeasibilityAnalyzerService content fidelity', () => {
  it('does not cap warnings or recommendations before report rendering', () => {
    const analyzer = new FeasibilityAnalyzerService();
    const analysis = analyzer.analyze('Tiny idea note.');

    expect(analysis.warnings.length).toBeGreaterThan(12);
    expect(analysis.recommendations.length).toBeGreaterThan(10);
    expect(analysis.warnings).toContain('Executive Summary is missing.');
    expect(analysis.recommendations).toContain(
      'Add a concise summary covering the project, decision context, viability, and recommendation.',
    );
  });
});
