/**
 * Firestore Seed Data Script
 * Creates test data for development and testing
 *
 * Usage: node scripts/seed.js [--userId=<id>]
 */
import { initializeAdmin, getFirestore } from '../lib/firebase/admin.js';

const args = process.argv.slice(2);
const userIdArg = args.find(a => a.startsWith('--userId='));
const TEST_USER_ID = userIdArg ? userIdArg.split('=')[1] : 'test-user-001';

const MODULE_COLORS = ['#9333EA', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const SEED_MODULES = [
  {
    name: 'Biology 101',
    description: 'Cell structure, genetics, and basic biology concepts',
    color: MODULE_COLORS[0],
  },
  {
    name: 'World History',
    description: 'Major historical events and civilizations',
    color: MODULE_COLORS[1],
  },
  {
    name: 'JavaScript Fundamentals',
    description: 'Core JavaScript concepts and patterns',
    color: MODULE_COLORS[2],
  },
];

const SEED_FLASHCARDS = {
  'Biology 101': [
    { question: 'What is the powerhouse of the cell?', answer: 'Mitochondria' },
    { question: 'What molecule carries genetic information?', answer: 'DNA (Deoxyribonucleic Acid)' },
    { question: 'What is the process by which plants convert sunlight to energy?', answer: 'Photosynthesis' },
    { question: 'What organelle contains the cell\'s genetic material?', answer: 'Nucleus' },
    { question: 'What is the basic unit of life?', answer: 'Cell' },
  ],
  'World History': [
    { question: 'In what year did World War II end?', answer: '1945' },
    { question: 'Who was the first Emperor of Rome?', answer: 'Augustus (Octavian)' },
    { question: 'What ancient wonder was located in Egypt?', answer: 'The Great Pyramid of Giza' },
    { question: 'What year did the French Revolution begin?', answer: '1789' },
  ],
  'JavaScript Fundamentals': [
    { question: 'What keyword declares a block-scoped variable in JavaScript?', answer: 'const or let' },
    { question: 'What method converts a JSON string to a JavaScript object?', answer: 'JSON.parse()' },
    { question: 'What is a closure in JavaScript?', answer: 'A function that has access to variables from its outer (enclosing) scope, even after the outer function has returned' },
    { question: 'What does the spread operator (...) do?', answer: 'Expands an iterable (like an array) into individual elements' },
    { question: 'What is the difference between == and ===?', answer: '== performs type coercion before comparison, === compares both value and type without coercion' },
    { question: 'What is the event loop in JavaScript?', answer: 'A mechanism that handles asynchronous callbacks by monitoring the call stack and callback queue' },
  ],
};

async function seed() {
  console.log(`\nSeeding Firestore with test data for user: ${TEST_USER_ID}\n`);

  initializeAdmin();
  const db = getFirestore();
  const batch = db.batch();
  const now = new Date();

  // Create user
  const userRef = db.collection('users').doc(TEST_USER_ID);
  batch.set(userRef, {
    id: TEST_USER_ID,
    email: `${TEST_USER_ID}@test.com`,
    name: 'Test User',
    picture: '',
    preferences: {
      quizType: 'mixed',
      speechRate: 1.0,
      theme: 'light',
    },
    createdAt: now,
    lastLoginAt: now,
    updatedAt: now,
  });
  console.log(`  [users] Creating user: ${TEST_USER_ID}`);

  // Create modules and flashcards
  for (const mod of SEED_MODULES) {
    const modRef = db.collection('modules').doc();
    const flashcards = SEED_FLASHCARDS[mod.name] || [];

    // Calculate random aggregate score for demo
    const scores = flashcards.map(() => Math.floor(Math.random() * 60));
    const aggregateScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

    batch.set(modRef, {
      userId: TEST_USER_ID,
      name: mod.name,
      description: mod.description,
      color: mod.color,
      flashcardCount: flashcards.length,
      aggregateKnowledgeScore: aggregateScore,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`  [modules] Creating module: ${mod.name} (${flashcards.length} flashcards)`);

    // Create flashcards for this module
    for (let i = 0; i < flashcards.length; i++) {
      const fc = flashcards[i];
      const fcRef = db.collection('flashcards').doc();
      batch.set(fcRef, {
        userId: TEST_USER_ID,
        moduleId: modRef.id,
        question: fc.question,
        answer: fc.answer,
        sourceImageUrl: '',
        confidence: 1.0,
        knowledgeScore: scores[i],
        reviewCount: Math.floor(Math.random() * 5),
        correctCount: Math.floor(Math.random() * 3),
        incorrectCount: Math.floor(Math.random() * 2),
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  // Create a completed quiz session for demo
  const sessionRef = db.collection('quiz_sessions').doc();
  batch.set(sessionRef, {
    userId: TEST_USER_ID,
    moduleId: '',
    type: 'voice',
    status: 'completed',
    flashcardIds: [],
    currentFlashcardIndex: 0,
    responses: [],
    scoreChanges: {},
    startedAt: new Date(now.getTime() - 3600000),
    endedAt: now,
  });
  console.log(`  [quiz_sessions] Creating sample quiz session`);

  await batch.commit();
  console.log(`\nSeed complete! Created:`);
  console.log(`  - 1 user`);
  console.log(`  - ${SEED_MODULES.length} modules`);
  console.log(`  - ${Object.values(SEED_FLASHCARDS).flat().length} flashcards`);
  console.log(`  - 1 quiz session`);
  console.log(`\nUser ID: ${TEST_USER_ID}\n`);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
