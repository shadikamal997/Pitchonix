import { PrismaClient } from '@prisma/client';
import { sanitizeCvProfile } from './src/career/cv-profile-sanitizer';
import { sanitizeCvDocumentContent, rebuildCvContentFromProfile } from './src/career/cv-document-sanitizer';

const prisma = new PrismaClient();

async function main() {
  const docs = await prisma.cvDocument.findMany({
    where: { doctype: { in: ['cv', 'resume'] } },
    include: { profile: true },
  });

  let scanned = 0;
  let repairedProfiles = 0;
  let repairedDocuments = 0;

  for (const doc of docs) {
    scanned++;
    const profileDto: any = {
      id: doc.profile.id,
      userId: doc.profile.userId,
      personal: doc.profile.personal,
      experience: doc.profile.experience || [],
      education: doc.profile.education || [],
      skills: doc.profile.skills || [],
      languages: doc.profile.languages || [],
      projects: doc.profile.projects || [],
      certifications: doc.profile.certifications || [],
      awards: doc.profile.awards || [],
      publications: doc.profile.publications || [],
      references: doc.profile.references || [],
      importSource: doc.profile.importSource,
      importedAt: doc.profile.importedAt?.toISOString() ?? null,
      createdAt: doc.profile.createdAt.toISOString(),
      updatedAt: doc.profile.updatedAt.toISOString(),
    };

    const profileRepair = sanitizeCvProfile(profileDto);
    if (profileRepair.report.anyChange) {
      await prisma.cvProfile.update({
        where: { id: doc.profileId },
        data: {
          personal: profileRepair.profile.personal as any,
          experience: profileRepair.profile.experience as any,
          education: profileRepair.profile.education as any,
          skills: profileRepair.profile.skills as any,
        },
      });
      repairedProfiles++;
    }

    const contentRepair = sanitizeCvDocumentContent(doc.content, doc.doctype);
    const shouldRebuild =
      contentRepair.report.headerFixed ||
      contentRepair.report.summaryFixed ||
      contentRepair.report.issues.some((issue) => /Legacy|Duplicate|Invalid/.test(issue));

    if (contentRepair.report.anyChange || shouldRebuild) {
      await prisma.cvDocument.update({
        where: { id: doc.id },
        data: {
          content: (shouldRebuild ? rebuildCvContentFromProfile(doc.doctype) : contentRepair.content) as any,
        },
      });
      repairedDocuments++;
      console.log(`[repair] doc=${doc.id} title="${doc.title}" issues=${contentRepair.report.issues.join('; ') || 'content normalized'}`);
    }
  }

  console.log(JSON.stringify({ scanned, repairedProfiles, repairedDocuments }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
