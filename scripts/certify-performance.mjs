import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const nextDir = path.join(root, 'frontend/.next');
const outDir = path.join(root, 'certification-reports');
fs.mkdirSync(outDir, { recursive: true });

const appManifestPath = path.join(nextDir, 'app-build-manifest.json');
const buildManifestPath = path.join(nextDir, 'build-manifest.json');

if (!fs.existsSync(appManifestPath) || !fs.existsSync(buildManifestPath)) {
  console.error('Missing Next build manifests. Run `npm run build:frontend` before performance certification.');
  process.exit(1);
}

const appManifest = JSON.parse(fs.readFileSync(appManifestPath, 'utf8'));
const buildManifest = JSON.parse(fs.readFileSync(buildManifestPath, 'utf8'));
const staticDir = path.join(nextDir, 'static');

function assetSize(asset) {
  const normalized = asset.replace(/^\/_next\/static\//, '');
  const file = path.join(staticDir, normalized.replace(/^static\//, ''));
  return fs.existsSync(file) ? fs.statSync(file).size : 0;
}

function routeAssets(route) {
  const pages = appManifest.pages || {};
  const appRoute = route === '/' ? '/page' : `${route}/page`;
  const appAssets = pages[route] || pages[appRoute] || [];
  const buildAssets = buildManifest.pages?.[route] || [];
  return [...new Set([...appAssets, ...buildAssets])].filter((asset) => asset.endsWith('.js') || asset.endsWith('.css'));
}

const routeBudgetsKb = {
  '/dashboard': 720,
  '/projects': 500,
  '/projects/[id]': 1800,
  '/projects/[id]/edit/[slideId]': 2800,
  '/pdf-studio': 560,
  '/pdf-studio/editor/[id]': 950,
  '/career': 520,
  '/career/builder/[id]': 720,
  '/excel-studio': 450,
  '/excel-studio/editor/[id]': 470,
  '/feasibility-studio': 610,
  '/feasibility-studio/editor/[id]': 470,
};

const routes = Object.entries(routeBudgetsKb).map(([route, budgetKb]) => {
  const assets = routeAssets(route);
  const bytes = assets.reduce((sum, asset) => sum + assetSize(asset), 0);
  const kb = Math.round(bytes / 1024);
  return {
    route,
    budgetKb,
    measuredKb: kb,
    status: kb <= budgetKb ? 'pass' : 'fail',
    assets: assets.length,
  };
});

const failures = routes.filter((route) => route.status === 'fail');
const report = {
  generatedAt: new Date().toISOString(),
  source: 'frontend/.next app-build-manifest + build-manifest',
  routes,
  failures,
  status: failures.length ? 'fail' : 'pass',
};

fs.writeFileSync(path.join(outDir, 'performance-baseline.json'), JSON.stringify(report, null, 2));
fs.writeFileSync(
  path.join(outDir, 'performance-baseline.md'),
  `# Performance Baseline

Generated: ${report.generatedAt}

Status: **${report.status.toUpperCase()}**

| Route | JS/CSS KB | Budget KB | Assets | Status |
| --- | ---: | ---: | ---: | --- |
${routes.map((route) => `| ${route.route} | ${route.measuredKb} | ${route.budgetKb} | ${route.assets} | ${route.status} |`).join('\n')}
`,
);

if (failures.length) {
  console.error(`Performance certification failed for ${failures.length} route(s).`);
  for (const route of failures) {
    console.error(`${route.route}: ${route.measuredKb} KB > ${route.budgetKb} KB`);
  }
  process.exit(1);
}

console.log(`Performance certification passed for ${routes.length} route(s).`);
