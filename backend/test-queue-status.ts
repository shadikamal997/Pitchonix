// Test if Bull queue is working
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testQueueStatus() {
  try {
    console.log('=== Checking Queue Status ===\n');

    // Check for pitch_deck projects
    const pitchDeckProjects = await prisma.project.findMany({
      where: {
        documentType: 'pitch_deck',
      },
      include: {
        decks: {
          include: {
            slides: true,
          },
        },
        generationJobs: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    });

    console.log(`Found ${pitchDeckProjects.length} pitch deck projects\n`);

    for (const project of pitchDeckProjects) {
      console.log(`Project: ${project.name}`);
      console.log(`  Status: ${project.status}`);
      console.log(`  Created: ${project.createdAt}`);
      console.log(`  Decks: ${project.decks.length}`);
      
      if (project.decks.length > 0) {
        project.decks.forEach((deck, i) => {
          console.log(`    Deck ${i + 1}: ${deck.title}`);
          console.log(`      Status: ${deck.status}`);
          console.log(`      Slides: ${deck.slides.length}`);
        });
      }
      
      console.log(`  Generation Jobs: ${project.generationJobs.length}`);
      if (project.generationJobs.length > 0) {
        project.generationJobs.forEach((job, i) => {
          console.log(`    Job ${i + 1}: ${job.status} (${job.progress}%)`);
          if (job.error) console.log(`      Error: ${job.error}`);
        });
      }
      console.log('');
    }

    // Check Redis connection
    console.log('\n=== Redis Connection Test ===');
    try {
      const { createClient } = await import('redis');
      const redisClient = createClient({
        url: 'redis://localhost:6379',
      });
      
      await redisClient.connect();
      const pong = await redisClient.ping();
      console.log(`Redis: ${pong === 'PONG' ? '✅ Connected' : '❌ Not responding'}`);
      await redisClient.quit();
    } catch (error: any) {
      console.log('Redis: ❌ Connection failed:', error.message);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testQueueStatus();
