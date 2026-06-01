#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client';
import { CvProfilesService } from './src/career/cv-profiles.service';
import { CvTemplatesService } from './src/career/cv-templates.service';
import { CvExportService } from './src/career/cv-export.service';

async function main() {
  const prisma = new PrismaClient();
  const profiles = new CvProfilesService(prisma as any);
  const templates = new CvTemplatesService(prisma as any);
  const exporter = new CvExportService(templates);

  const documentId = 'dc6a3b2f-b64b-43b1-bf45-5197f2c1bbc4';

  try {
    // Fetch the document
    const doc = await prisma.cvDocument.findUnique({ where: { id: documentId } });
    if (!doc) {
      console.error('Document not found');
      process.exit(1);
    }

    console.log('Document found:', {
      id: doc.id,
      title: doc.title,
      profileId: doc.profileId,
      templateId: doc.templateId,
      brandKitId: doc.brandKitId,
      doctype: doc.doctype,
    });

    // Fetch the profile
    const profile = await profiles.get(doc.profileId);
    console.log('Profile found:', {
      id: profile.id,
      hasPersonal: !!profile.personal,
      experienceCount: profile.experience?.length || 0,
      educationCount: profile.education?.length || 0,
    });

    // Try to export
    console.log('\nAttempting HTML export...');
    const result = await exporter.export('html', profile, doc as any, undefined);
    console.log('Export successful:', {
      bufferSize: result.buffer.length,
      mimetype: result.mimetype,
      extension: result.extension,
      durationMs: result.durationMs,
      mode: result.mode,
    });

    // Show a preview of the HTML
    const htmlPreview = result.buffer.toString('utf8').substring(0, 500);
    console.log('\nHTML preview:', htmlPreview);

  } catch (error) {
    console.error('\n❌ Export failed:');
    console.error('Error:', error instanceof Error ? error.message : String(error));
    console.error('Stack:', error instanceof Error ? error.stack : undefined);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
