/**
 * Firestore Cleanup Script
 * Deletes test data from Firestore collections
 *
 * Usage: node scripts/cleanup.js [--userId=<id>] [--all]
 *   --userId=<id>  Delete all data for a specific user
 *   --all          Delete ALL data (use with caution)
 */
import { initializeAdmin, getFirestore } from '../lib/firebase/admin.js';

const args = process.argv.slice(2);
const userIdArg = args.find(a => a.startsWith('--userId='));
const deleteAll = args.includes('--all');
const TARGET_USER_ID = userIdArg ? userIdArg.split('=')[1] : null;

const COLLECTIONS = ['users', 'modules', 'flashcards', 'quiz_sessions', 'presentations'];

/**
 * Delete all documents in a collection that match a userId
 */
async function deleteCollectionByUser(db, collectionName, userId) {
  const snapshot = await db.collection(collectionName).where('userId', '==', userId).get();
  if (snapshot.empty) return 0;

  const batch = db.batch();
  snapshot.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
  return snapshot.size;
}

/**
 * Delete all documents in a collection (batched)
 */
async function deleteCollection(db, collectionName) {
  const snapshot = await db.collection(collectionName).limit(500).get();
  if (snapshot.empty) return 0;

  const batch = db.batch();
  snapshot.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
  return snapshot.size;
}

async function cleanup() {
  initializeAdmin();
  const db = getFirestore();

  if (deleteAll) {
    console.log('\nWARNING: Deleting ALL data from all collections!\n');
    for (const col of COLLECTIONS) {
      let total = 0;
      let count;
      do {
        count = await deleteCollection(db, col);
        total += count;
      } while (count > 0);
      console.log(`  [${col}] Deleted ${total} documents`);
    }
    console.log('\nCleanup complete (all data deleted).\n');
  } else if (TARGET_USER_ID) {
    console.log(`\nDeleting all data for user: ${TARGET_USER_ID}\n`);
    // Delete flashcards, sessions, presentations first (dependents)
    for (const col of COLLECTIONS) {
      if (col === 'users') continue;
      const count = await deleteCollectionByUser(db, col, TARGET_USER_ID);
      console.log(`  [${col}] Deleted ${count} documents`);
    }
    // Delete user last
    const userCount = await deleteCollectionByUser(db, 'users', TARGET_USER_ID);
    console.log(`  [users] Deleted ${userCount} documents`);
    console.log('\nCleanup complete.\n');
  } else {
    console.log('\nUsage:');
    console.log('  node scripts/cleanup.js --userId=<id>   Delete data for a specific user');
    console.log('  node scripts/cleanup.js --all            Delete ALL data\n');
    process.exit(0);
  }
}

cleanup().catch(err => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
