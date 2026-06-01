import * as fs from 'node:fs';
import * as path from 'node:path';
import puppeteer from 'puppeteer';
import { CV_TEMPLATE_LIBRARY } from './src/career/cv-templates';
import { renderCvHtml } from './src/career/cv-html-renderer';
import { CvDocumentDto, CvProfileDto } from './src/career/cv-types';

const OUT_DIR = process.env.OUT_DIR || '/tmp/pitchonix-cv-template-audit';
const TEMPLATE_LIMIT = Number(process.env.TEMPLATE_LIMIT || 0);
const CHROME_EXECUTABLE = process.env.CHROME_EXECUTABLE
  || (fs.existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    : undefined);

const SENTINELS = [
  'SENTINEL_SUMMARY_PARAGRAPH_ALPHA',
  'SENTINEL_FRONTEND_BULLET_BRAVO',
  'SENTINEL_API_BULLET_CHARLIE',
  'SENTINEL_DESIGN_BULLET_DELTA',
  'SENTINEL_ACHIEVEMENT_ECHO',
  'SENTINEL_METRIC_FOXTROT',
  'SENTINEL_TECH_GOLF',
  'SENTINEL_PROJECT_HOTEL',
  'SENTINEL_EDUCATION_INDIA',
  'SENTINEL_SKILL_JULIET',
  'SENTINEL_LANGUAGE_KILO',
  'SENTINEL_CERT_LIMA',
  'SENTINEL_AWARD_MIKE',
  'SENTINEL_REFERENCE_NOVEMBER',
];

const profile: CvProfileDto = {
  id: 'audit-profile',
  userId: 'audit-user',
  personal: {
    fullName: 'Shadi Kamal',
    headline: 'Frontend Developer',
    email: 'shadi@example.com',
    phone: '+962 79 579 0819',
    location: 'Amman, Jordan',
    website: 'pitchonix.com',
    linkedin: 'linkedin.com/in/shadikamal',
    github: 'github.com/shadikamal',
    summary: [
      'SENTINEL_SUMMARY_PARAGRAPH_ALPHA: Self-taught frontend developer with 15+ years of combined digital product, hospitality, and operations experience.',
      'Builds responsive web applications, integrates APIs, and turns complex business workflows into clear user experiences.',
    ].join('\n'),
  },
  experience: [
    {
      id: 'exp-1',
      role: 'Frontend Development Freelancer',
      company: 'Independent Clients',
      location: 'Amman, Jordan',
      start: '2023',
      end: 'Present',
      description: [
        'Designed and shipped production websites and dashboards for small business clients.',
        'Preserved full multiline CV content during import, editing, template switching, preview, and export.',
      ].join('\n'),
      bullets: [
        'SENTINEL_FRONTEND_BULLET_BRAVO: Developed responsive web applications using HTML, CSS, JavaScript, React, and modern UI systems.',
        'SENTINEL_API_BULLET_CHARLIE: Integrated RESTful APIs, authenticated flows, and deployment pipelines for client-facing applications.',
        'SENTINEL_DESIGN_BULLET_DELTA: Created custom responsive designs and collaborated closely with designers and product owners.',
      ],
      achievements: [
        'SENTINEL_ACHIEVEMENT_ECHO: Delivered 12+ client projects with measurable improvements in launch speed and design consistency.',
      ],
      metrics: ['SENTINEL_METRIC_FOXTROT: 35% faster iteration cycle'],
      technologies: ['SENTINEL_TECH_GOLF', 'React', 'Next.js', 'TypeScript', 'Tailwind CSS'],
      projects: ['SENTINEL_PROJECT_HOTEL: Marketplace dashboard and booking workflow'],
      rawText: '',
    },
    {
      id: 'exp-2',
      role: 'Senior Tour Operator',
      company: 'Hospitality Operations Group',
      location: 'Jordan',
      start: '2009',
      end: '2022',
      description: 'Managed guest operations, supplier coordination, and multilingual customer experiences across high-volume travel programs.',
      bullets: [
        'Coordinated schedules, vendors, and guest support across complex tourism operations.',
        'Improved handoff quality between sales, operations, and customer support teams.',
      ],
      achievements: [],
      technologies: [],
      metrics: [],
      projects: [],
      rawText: '',
    },
  ],
  education: [
    {
      id: 'edu-1',
      institution: 'ERJAN HIGH SCHOOL',
      degree: 'High School Diploma',
      field: 'General Education',
      start: '2008',
      end: '2009',
      honors: ['SENTINEL_EDUCATION_INDIA'],
    },
  ],
  skills: [
    { id: 'skill-1', name: 'Responsive Design', category: 'technical', level: 'expert' },
    { id: 'skill-2', name: 'API Integration', category: 'technical', level: 'advanced' },
    { id: 'skill-3', name: 'SENTINEL_SKILL_JULIET', category: 'technical', level: 'advanced' },
    { id: 'skill-4', name: 'UI/UX Design Principles', category: 'technical', level: 'advanced' },
    { id: 'skill-5', name: 'Client Relationship', category: 'business', level: 'expert' },
    { id: 'skill-6', name: 'Flutter', category: 'technical', level: 'intermediate' },
    { id: 'skill-7', name: 'JavaScript Frameworks', category: 'technical', level: 'advanced' },
    { id: 'skill-8', name: 'Web Application Testing', category: 'technical', level: 'advanced' },
  ],
  languages: [
    { id: 'lang-1', name: 'Arabic', proficiency: 'native' },
    { id: 'lang-2', name: 'English', proficiency: 'fluent' },
    { id: 'lang-3', name: 'SENTINEL_LANGUAGE_KILO', proficiency: 'basic' },
  ],
  projects: [
    {
      id: 'project-1',
      name: 'Client Portal Platform',
      description: 'SENTINEL_PROJECT_HOTEL: Designed the dashboard, onboarding, and reporting workflows.',
      technologies: ['React', 'REST APIs'],
      results: ['Reduced manual status updates and improved client visibility.'],
      links: [],
    },
  ],
  certifications: [
    { id: 'cert-1', name: 'SENTINEL_CERT_LIMA Frontend Architecture', issuer: 'Pitchonix Academy', date: '2026' },
  ],
  awards: [
    { id: 'award-1', title: 'SENTINEL_AWARD_MIKE Service Excellence', issuer: 'Operations Team', date: '2022' },
  ],
  publications: [],
  references: [
    { id: 'ref-1', name: 'SENTINEL_REFERENCE_NOVEMBER', title: 'Product Owner', company: 'Client Co.', email: 'ref@example.com' },
  ],
  importSource: 'pdf',
  importedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const docBase: CvDocumentDto = {
  id: 'audit-doc',
  profileId: profile.id,
  userId: profile.userId,
  doctype: 'cv',
  title: 'CV Template Audit',
  templateId: null,
  brandKitId: null,
  variant: null,
  content: {
    sectionOrder: [
      'header',
      'summary',
      'experience',
      'education',
      'skills',
      'projects',
      'certifications',
      'languages',
      'awards',
      'references',
    ],
  },
  thumbnailUrl: null,
  lastExportUrl: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const templates = CV_TEMPLATE_LIBRARY
    .filter((template) => template.doctype === 'cv' || template.doctype === 'resume')
    .slice(0, TEMPLATE_LIMIT || undefined);

  const browser = await puppeteer.launch({
    headless: true,
    ...(CHROME_EXECUTABLE ? { executablePath: CHROME_EXECUTABLE } : {}),
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1600,2200'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 2200, deviceScaleFactor: 1 });

  const results: any[] = [];
  for (const template of templates) {
    const doc = { ...docBase, doctype: template.doctype as any, templateId: template.name };
    const html = renderCvHtml(profile, doc, template.layout as any);
    const htmlPath = path.join(OUT_DIR, `${slug(template.name)}.html`);
    const pngPath = path.join(OUT_DIR, `${slug(template.name)}.png`);
    fs.writeFileSync(htmlPath, html);

    await page.setContent(html, { waitUntil: 'load' as any, timeout: 60_000 });
    await page.screenshot({ path: pngPath, fullPage: true });

    const metrics = await page.evaluate((sentinels) => {
      const bodyText = document.body.innerText;
      const pageEl = document.querySelector('.page') as HTMLElement | null;
      const pageRect = pageEl?.getBoundingClientRect();
      const nodes = [...document.querySelectorAll('h1,h2,p,li,.entry,.section,.sidebar,.main,.pill,.sk-chip,.cert-item,.award-item,.ref-card')] as HTMLElement[];
      let clipped = 0;
      let outside = 0;
      let tinyText = 0;
      for (const node of nodes) {
        const rect = node.getBoundingClientRect();
        if (node.scrollHeight > node.clientHeight + 2 || node.scrollWidth > node.clientWidth + 2) clipped += 1;
        if (pageRect && (rect.left < pageRect.left - 2 || rect.right > pageRect.right + 2)) outside += 1;
        const fontSize = Number.parseFloat(getComputedStyle(node).fontSize || '0');
        if (bodyText.length > 0 && fontSize > 0 && fontSize < 8) tinyText += 1;
      }
      return {
        bodyLength: bodyText.length,
        missingSentinels: sentinels.filter((sentinel: string) => !bodyText.includes(sentinel)),
        sectionCount: document.querySelectorAll('.section').length,
        pageCount: document.querySelectorAll('.page').length,
        clipped,
        outside,
        tinyText,
        h1: document.querySelector('h1')?.textContent?.trim() || '',
      };
    }, SENTINELS);

    const result = {
      id: slug(template.name),
      name: template.name,
      doctype: template.doctype,
      category: template.category,
      screenshot: pngPath,
      html: htmlPath,
      ...metrics,
    };
    results.push(result);
    console.log(`${template.name}: missing=${metrics.missingSentinels.length} clipped=${metrics.clipped} outside=${metrics.outside} h1="${metrics.h1}"`);
  }

  await browser.close();
  fs.writeFileSync(path.join(OUT_DIR, 'report.json'), JSON.stringify(results, null, 2));
  const summary = {
    templates: results.length,
    missingSentinelTemplates: results.filter((r) => r.missingSentinels.length > 0).length,
    clippedTemplates: results.filter((r) => r.clipped > 0).length,
    outsideTemplates: results.filter((r) => r.outside > 0).length,
    tinyTextTemplates: results.filter((r) => r.tinyText > 0).length,
  };
  fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
