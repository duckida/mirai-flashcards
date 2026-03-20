/**
 * Database Seed Script
 * Populates Firestore with sample data for testing.
 *
 * Usage: node lib/firebase/seed.js [--clear]
 *
 * Options:
 *   --clear  Clear existing seed data before seeding
 */

import { getFirestore, initializeAdmin } from './admin.js';

initializeAdmin();
const db = getFirestore();

const SEED_USER_ID = 'seed-user-test-001';

const seedData = {
  users: [
    {
      id: SEED_USER_ID,
      email: 'test@example.com',
      name: 'Test User',
      picture: null,
      preferences: {
        quizType: 'voice',
        speechRate: 1.0,
        theme: 'light',
      },
    },
  ],
  modules: [
    {
      name: 'Biology',
      description: 'Cell structure, DNA, and biological processes',
      color: '#4CAF50',
    },
    {
      name: 'World History',
      description: 'Major events and civilizations',
      color: '#FF9800',
    },
    {
      name: 'Computer Science',
      description: 'Algorithms, data structures, and programming concepts',
      color: '#2196F3',
    },
  ],
  flashcards: {
    Biology: [
      { question: 'What is the powerhouse of the cell?', answer: 'Mitochondria', confidence: 0.95 },
      { question: 'What molecule carries genetic information?', answer: 'DNA (Deoxyribonucleic Acid)', confidence: 0.98 },
      { question: 'What is the process by which plants convert sunlight into energy?', answer: 'Photosynthesis', confidence: 0.92 },
      { question: 'What organelle is responsible for protein synthesis?', answer: 'Ribosome', confidence: 0.9 },
      { question: 'What is the basic unit of life?', answer: 'The cell', confidence: 0.99 },
    ],
    'World History': [
      { question: 'In what year did World War II end?', answer: '1945', confidence: 0.97 },
      { question: 'Who was the first emperor of Rome?', answer: 'Augustus (Octavian)', confidence: 0.88 },
      { question: 'What ancient civilization built the Machu Picchu complex?', answer: 'The Inca Empire', confidence: 0.91 },
      { question: 'What treaty ended World War I?', answer: 'The Treaty of Versailles (1919)', confidence: 0.85 },
    ],
    'Computer Science': [
      { question: 'What data structure uses FIFO (First In, First Out)?', answer: 'Queue', confidence: 0.96 },
      { question: 'What is the time complexity of binary search?', answer: 'O(log n)', confidence: 0.93 },
      { question: 'What does HTML stand for?', answer: 'HyperText Markup Language', confidence: 0.99 },
      { question: 'What is recursion?', answer: 'A function that calls itself to solve a problem by breaking it into smaller subproblems', confidence: 0.87 },
      { question: 'What is the difference between a stack and a queue?', answer: 'A stack uses LIFO (Last In, First Out) while a queue uses FIFO (First In, First Out)', confidence: 0.9 },
      { question: 'What is Big O notation used for?', answer: 'Describing the upper bound of an algorithm\'s time or space complexity as input grows', confidence: 0.84 },
    ],
  },
};

async function clearSeedData() {
  console.log('Clearing existing seed data...');

  const collections = ['flashcards', 'modules', 'quiz_sessions', 'presentations'];

  for (const collectionName of collections) {
    const snapshot = await db.collection(collectionName)
      .where('userId', '==', SEED_USER_ID)
      .get();

    if (snapshot.empty) {
      console.log(`  No documents in ${collectionName} for seed user.`);
      continue;
    }

    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    console.log(`  Deleted ${snapshot.size} documents from ${collectionName}.`);
  }

  await db.collection('users').doc(SEED_USER_ID).delete();
  console.log('  Deleted seed user document.');
}

async function seed() {
  const shouldClear = process.argv.includes('--clear');

  if (shouldClear) {
    await clearSeedData();
  }

  console.log('\nSeeding database...\n');

  // Seed user
  const now = new Date();
  for (const user of seedData.users) {
    await db.collection('users').doc(user.id).set({
      ...user,
      createdAt: now,
      lastLoginAt: now,
      updatedAt: now,
    });
    console.log(`Created user: ${user.name} (${user.id})`);
  }

  // Seed modules and flashcards
  const moduleIds = {};

  for (const moduleData of seedData.modules) {
    const moduleRef = await db.collection('modules').add({
      userId: SEED_USER_ID,
      name: moduleData.name,
      description: moduleData.description,
      flashcardCount: 0,
      aggregateKnowledgeScore: 0,
      color: moduleData.color,
      createdAt: now,
      updatedAt: now,
    });
    moduleIds[moduleData.name] = moduleRef.id;
    console.log(`Created module: ${moduleData.name} (${moduleRef.id})`);

    // Seed flashcards for this module
    const flashcards = seedData.flashcards[moduleData.name] || [];
    let totalScore = 0;

    for (const fc of flashcards) {
      const score = Math.floor(Math.random() * 60);
      const reviewCount = Math.floor(Math.random() * 10);
      const correctCount = Math.floor(reviewCount * (0.4 + Math.random() * 0.6));
      const incorrectCount = reviewCount - correctCount;

      await db.collection('flashcards').add({
        userId: SEED_USER_ID,
        moduleId: moduleRef.id,
        question: fc.question,
        answer: fc.answer,
        sourceImageUrl: null,
        confidence: fc.confidence,
        knowledgeScore: score,
        reviewCount,
        correctCount,
        incorrectCount,
        createdAt: now,
        updatedAt: now,
      });
      totalScore += score;
    }

    // Update module with flashcard count and aggregate score
    const aggregateScore = flashcards.length > 0 ? Math.round(totalScore / flashcards.length) : 0;
    await moduleRef.update({
      flashcardCount: flashcards.length,
      aggregateKnowledgeScore: aggregateScore,
      updatedAt: now,
    });

    console.log(`  Added ${flashcards.length} flashcards (avg score: ${aggregateScore})`);
  }

  // Seed a sample quiz session
  const biologyModuleId = moduleIds['Biology'];
  if (biologyModuleId) {
    const biologyFlashcards = await db.collection('flashcards')
      .where('moduleId', '==', biologyModuleId)
      .get();

    const flashcardIds = biologyFlashcards.docs.map(d => d.id);

    await db.collection('quiz_sessions').add({
      userId: SEED_USER_ID,
      moduleId: biologyModuleId,
      type: 'voice',
      status: 'completed',
      flashcardIds,
      currentFlashcardIndex: flashcardIds.length,
      responses: flashcardIds.map((id, i) => ({
        flashcardId: id,
        questionType: i % 2 === 0 ? 'free_recall' : 'multiple_choice',
        userAnswer: 'sample answer',
        isCorrect: Math.random() > 0.4,
        scoreChange: Math.floor(Math.random() * 10) - 3,
        timestamp: now,
      })),
      scoreChanges: {},
      startedAt: new Date(now.getTime() - 300000),
      endedAt: now,
    });
    console.log('Created sample quiz session');
  }

  console.log('\nSeed complete!');
  console.log(`Seed user ID: ${SEED_USER_ID}`);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
