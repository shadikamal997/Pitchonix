import { renderCvHtml } from './src/career/cv-html-renderer';
import { CV_TEMPLATE_LIBRARY } from './src/career/cv-templates';
import { DEFAULT_CV_SECTION_ORDER } from './src/career/cv-types';

const bullets = [
  'Developed responsive web applications using HTML, CSS, and JavaScript frameworks.',
  'Integrated RESTful APIs with authentication, pagination, and graceful error states.',
  'Created custom responsive designs with reusable React components and Tailwind CSS.',
  'Worked closely with designers and product owners to ship accessible user flows.',
  'Managed deployments and hosting with GitHub Actions, Docker, and cloud environments.',
  'Improved page performance by 42% and reduced support tickets by 18%.',
];

const achievements = [
  'Launched a customer portal used by 12,000 monthly users.',
  'Reduced release preparation from 4 hours to 35 minutes.',
];

const technologies = ['HTML', 'CSS', 'JavaScript', 'React', 'REST APIs', 'Docker', 'GitHub Actions'];
const metrics = ['42% performance improvement', '18% fewer support tickets', '12,000 monthly users'];
const projects = ['Customer portal redesign', 'Deployment automation platform'];

function strip(html: string) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').replace(/\s+([.,;:!?])/g, '$1').trim();
}

const templates = CV_TEMPLATE_LIBRARY.filter((template) => template.doctype === 'cv' || template.doctype === 'resume');
const failures: string[] = [];

for (let i = 0; i < 50; i++) {
  const profile: any = {
    id: `stress-profile-${i}`,
    userId: 'stress-user',
    personal: {
      fullName: `Semantic Candidate ${i + 1}`,
      headline: i % 3 === 0 ? 'Frontend Developer' : i % 3 === 1 ? 'Executive Product Leader' : 'Academic Researcher',
      email: `candidate${i + 1}@example.com`,
      phone: '+962 700 000 000',
      summary: [
        'Multidisciplinary professional with deep experience translating complex requirements into polished products.',
        'Known for preserving business context, measurable impact, and implementation detail across fast-moving teams.',
      ].join('\n'),
    },
    experience: [{
      id: `exp-${i}`,
      role: 'Frontend Development Freelancer',
      company: 'Independent',
      location: 'Remote',
      start: '2021',
      end: '',
      description: [
        'Owned the end-to-end delivery of modern web applications for startup and consulting clients.',
        'Balanced product discovery, technical execution, launch readiness, and post-release maintenance.',
      ].join('\n'),
      bullets,
      achievements,
      technologies,
      metrics,
      projects,
    }],
    education: [{ id: 'edu-1', institution: 'ERJAN HIGH SCHOOL', degree: 'High School', start: '2008', end: '2009', honors: [] }],
    skills: technologies.map((name, index) => ({ id: `skill-${index}`, name, category: 'technical', level: 'advanced' })),
    languages: [
      { id: 'lang-1', name: 'Arabic', proficiency: 'native' },
      { id: 'lang-2', name: 'English', proficiency: 'fluent' },
      { id: 'lang-3', name: 'French', proficiency: 'conversational' },
    ],
    projects: [],
    certifications: [],
    awards: [],
    publications: [],
    references: [],
    importSource: 'stress',
    importedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  for (const template of templates) {
    const originalLog = console.log;
    console.log = () => undefined;
    const html = renderCvHtml(profile, {
      id: `doc-${i}`,
      profileId: profile.id,
      userId: profile.userId,
      doctype: template.doctype as any,
      title: 'Semantic Stress CV',
      templateId: template.name,
      brandKitId: null,
      variant: null,
      content: { sectionOrder: DEFAULT_CV_SECTION_ORDER },
      thumbnailUrl: null,
      lastExportUrl: null,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    }, template.layout as any);
    console.log = originalLog;
    const text = strip(html);
    for (const required of [...bullets, ...achievements, ...technologies, ...metrics, ...projects]) {
      if (!text.includes(required.replace(/\s+/g, ' ').trim())) {
        failures.push(`${template.name}: missing "${required}"`);
        break;
      }
    }
  }
}

if (failures.length) {
  console.error(JSON.stringify({ ok: false, templates: templates.length, failures: failures.slice(0, 20) }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, cvs: 50, templates: templates.length, checks: 50 * templates.length }, null, 2));
