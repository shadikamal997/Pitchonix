import { ProTemplateRendererService } from './pro-template-renderer.service';

describe('ProTemplateRendererService content fidelity', () => {
  it('preserves long paragraph and bullet content through overflow appendix', () => {
    const renderer = new ProTemplateRendererService();
    const paragraphs = Array.from(
      { length: 30 },
      (_, i) =>
        `Paragraph ${i + 1} content is intentionally long enough to be mapped as prose and must remain visible in the rendered document.`,
    );
    const bullets = Array.from(
      { length: 40 },
      (_, i) => `Bullet row ${i + 1} must not be silently dropped by a pro template.`,
    );
    const document = {
      title: 'Long Report',
      pages: [
        {
          pageType: 'content',
          title: 'Detailed Findings',
          content: {
            text: [...paragraphs, ...bullets.map((item) => `- ${item}`)].join('\n'),
          },
        },
      ],
    };

    const html = renderer.renderDocument(document, 'modern-minimal-report', 'export');

    for (const paragraph of paragraphs) expect(html).toContain(paragraph);
    for (const bullet of bullets) expect(html).toContain(bullet);
    expect(html).toContain('data-overflow-nodes=');
  });
});
