// Check generation jobs to diagnose the issue
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkGenerationJobs() {
  try {
    console.log('=== Checking Generation Jobs ===\n');

    const completedProjects = await prisma.project.findMany({
      where: {
        status: 'completed',
      },
      include: {
        decks: true,
        generationJobs: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      take: 5,
    });

    console.log(`Found ${completedProjects.length} completed projects\n`);

    for (const project of completedProjects) {
      console.log(`\nProject: ${project.name} (${project.id})`);
      console.log(`  Status: ${project.status}`);
      console.log(`  Document Type: ${project.documentType}`);
      console.log(`  Decks: ${project.decks.length}`);
      console.log(`  Generation Jobs: ${project.generationJobs.length}`);
      
      if (project.generationJobs.length > 0) {
        project.generationJobs.forEach((job, index) => {
          console.log(`    Job ${index + 1}:`);
          console.log(`      ID: ${job.id}`);
          console.log(`      Status: ${job.status}`);
          console.log(`      Progress: ${job.progress}%`);
          console.log(`      Created: ${job.createdAt}`);
          if (job.error) {
            console.log(`      Error: ${job.error}`);
          }
        });
      }
      
      console.log('  ---');
    }

    // Check if there are any orphaned decks (decks without slides)
    console.log('\n=== Checking for orphaned decks ===\n');
    const orphanedDecks = await prisma.deck.findMany({
      where: {
        slides: {
          none: {},
        },
      },
      include: {
        project: {
          select: {
            name: true,
            status: true,
          },
        },
        slides: true,
      },
    });

    console.log(`Found ${orphanedDecks.length} decks with no slides`);
    orphanedDecks.forEach((deck) => {
      console.log(`  - ${deck.title} (Project: ${deck.project.name}, Status: ${deck.project.status})`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkGenerationJobs();
