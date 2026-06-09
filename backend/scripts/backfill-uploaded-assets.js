/* eslint-disable */
// Phase Ω.1D — backfill UploadedAsset rows for existing /uploads files by
// mapping each on-disk file to an owner via existing DB references.
// Non-destructive: never deletes files; upserts asset rows; reports orphans.
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

// Normalize any stored URL to a /uploads/... public path (strip origin + query).
function toPublicPath(u) {
  if (!u || typeof u !== 'string') return null;
  let s = u.split('?')[0].trim();
  const idx = s.indexOf('/uploads/');
  if (idx === -1) return null;
  return s.slice(idx);
}

(async () => {
  const ownerByPath = new Map(); // publicPath -> { userId, module, projectId? }
  const add = (url, userId, module, extra = {}) => {
    const p = toPublicPath(url);
    if (p && userId && !ownerByPath.has(p)) ownerByPath.set(p, { userId, module, ...extra });
  };

  // 1. Brand kit logos + brand assets
  for (const k of await prisma.brandKit.findMany({ select: { userId: true, logo: true } })) add(k.logo, k.userId, 'brand_kit');
  for (const a of await prisma.brandAsset.findMany({ select: { url: true, brandKit: { select: { userId: true } } } }))
    add(a.url, a.brandKit?.userId, 'brand_kit');

  // 2. Project logo + images
  for (const pr of await prisma.project.findMany({ select: { id: true, userId: true, logoUrl: true, imageUrls: true } })) {
    add(pr.logoUrl, pr.userId, 'presentation', { projectId: pr.id });
    for (const img of pr.imageUrls || []) add(img, pr.userId, 'presentation', { projectId: pr.id });
  }

  // 3. CV photos (CvProfile.personal.photoUrl)
  for (const c of await prisma.cvProfile.findMany({ select: { id: true, userId: true, personal: true } })) {
    const photo = c.personal && c.personal.photoUrl;
    add(photo, c.userId, 'career_photo', { documentId: c.id });
  }

  // 4. Converted files
  for (const f of await prisma.convertedFile.findMany({ where: { userId: { not: null } }, select: { userId: true, outputUrl: true } }))
    add(f.outputUrl, f.userId, 'convert');

  // 5. PDF Studio uploaded images
  for (const i of await prisma.uploadedImage.findMany({ where: { userId: { not: null } }, select: { userId: true, url: true } }))
    add(i.url, i.userId, 'pdf_studio');

  // 6. Excel workbooks (original uploaded / generated)
  for (const e of await prisma.excelProject.findMany({ select: { id: true, userId: true, originalFilePath: true } })) {
    if (e.originalFilePath) add('/' + e.originalFilePath.replace(/\\/g, '/'), e.userId, 'excel', { documentId: e.id });
  }

  // 7. Slide-element & master-element JSON (imported PPTX images / OLE embeddings)
  //    mapped to the owning project via slide → deck → project.
  const re = /\/uploads\/[A-Za-z0-9._/-]+/g;
  const scanInto = (json, userId, projectId, deckId, module) => {
    if (!json) return;
    const s = typeof json === 'string' ? json : JSON.stringify(json);
    let m; while ((m = re.exec(s)) !== null) add(m[0], userId, module, { projectId, documentId: deckId });
  };
  for (const el of await prisma.slideElement.findMany({
    select: { content: true, style: true, data: true, slide: { select: { deck: { select: { id: true, projectId: true, project: { select: { userId: true } } } } } } },
  })) {
    const uid = el.slide?.deck?.project?.userId; const pid = el.slide?.deck?.projectId; const did = el.slide?.deck?.id;
    if (!uid) continue;
    scanInto(el.content, uid, pid, did, 'pptx_import');
    scanInto(el.style, uid, pid, did, 'pptx_import');
    scanInto(el.data, uid, pid, did, 'pptx_import');
  }
  for (const me of await prisma.masterElement.findMany({
    select: { elementData: true, deck: { select: { id: true, projectId: true, project: { select: { userId: true } } } } },
  })) {
    const uid = me.deck?.project?.userId;
    if (uid) scanInto(me.elementData, uid, me.deck?.projectId, me.deck?.id, 'pptx_import');
  }

  // Scan disk and reconcile
  const files = walk(UPLOADS_DIR);
  const stats = { totalFiles: files.length, mapped: 0, alreadyRecorded: 0, orphaned: 0, byModule: {} };
  const orphans = [];

  for (const full of files) {
    const rel = full.slice(UPLOADS_DIR.length).replace(/\\/g, '/'); // e.g. /images/x.png
    const publicPath = '/uploads' + (rel.startsWith('/') ? rel : '/' + rel);
    const existing = await prisma.uploadedAsset.findUnique({ where: { publicPath }, select: { id: true } });
    if (existing) { stats.alreadyRecorded++; continue; }
    const owner = ownerByPath.get(publicPath);
    if (!owner) { stats.orphaned++; orphans.push(publicPath); continue; }
    const size = (() => { try { return fs.statSync(full).size; } catch { return null; } })();
    await prisma.uploadedAsset.upsert({
      where: { publicPath },
      create: {
        userId: owner.userId, module: owner.module, storagePath: full, publicPath,
        projectId: owner.projectId || null, documentId: owner.documentId || null,
        sizeBytes: size, visibility: 'private',
      },
      update: {},
    });
    stats.mapped++;
    stats.byModule[owner.module] = (stats.byModule[owner.module] || 0) + 1;
  }

  console.log('BACKFILL_RESULT ' + JSON.stringify({ ...stats, orphans }, null, 2));
  await prisma.$disconnect();
})().catch(async (e) => { console.error('BACKFILL_ERROR', e.message); await prisma.$disconnect(); process.exit(1); });
