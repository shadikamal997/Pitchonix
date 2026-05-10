// Test deck creation to diagnose the issue
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testDeckCreation() {
  try {
    console.log('=== Testing Deck Creation ===\n');

    // Find a test project
    const project = await prisma.project.findFirst({
      where: {
        status: 'completed',
      },
      include: {
        decks: {
          include: {
            slides: true,
          },
        },
      },
    });

    if (!project) {
      console.log('No completed projects found.');
      return;
    }

    console.log(`Project found: ${project.name} (${project.id})`);
    console.log(`Project status: ${project.status}`);
    console.log(`Decks count: ${project.decks.length}\n`);

    if (project.decks.length > 0) {
      project.decks.forEach((deck, index) => {
        console.log(`Deck ${index + 1}:`);
        console.log(`  ID: ${deck.id}`);
        console.log(`  Title: ${deck.title}`);
        console.log(`  Slides: ${deck.slides.length}`);
        console.log(`  Created: ${deck.createdAt}`);
      });
    } else {
      console.log('❌ No decks found for this project!');
      console.log('\nLet\'s check if there are ANY decks in the database...\n');

      const allDecks = await prisma.deck.findMany({
        where: {
          projectId: project.id,
        },
        include: {
          slides: true,
        },
      });

      console.log(`Total decks for this project: ${allDecks.length}`);
      
      if (allDecks.length === 0) {
        console.log('\n🔍 ISSUE FOUND: Deck is not being created!');
      }
    }

    // Check all projects with generating status
    console.log('\n=== Checking generating projects ===\n');
    const generatingProjects = await prisma.project.findMany({
      where: {
        status: 'generating',
      },
      include: {
        decks: true,
      },
    });

    console.log(`Found ${generatingProjects.length} projects with status 'generating'`);
    generatingProjects.forEach((proj) => {
      console.log(`  - ${proj.name}: ${proj.decks.length} decks`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDeckCreation();
