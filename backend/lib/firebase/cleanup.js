/**
 * Database Cleanup Script
 * Removes test/seed data or all data from Firestore collections.
 *
 * Usage:
 *   node lib/firebase/cleanup.js --seed     Remove only seed data
 *   node lib/firebase/cleanup.js --all      Remove ALL data (requires confirmation)
 *   node lib/firebase/cleanup.js --user <userId>  Remove all data for a specific user
 */

import { getFirestore, initializeAdmin } from './admin.js';

initializeAdmin();
const db = getFirestore();

const SEED_USER_ID = 'seed-user-test-001';

const COLLECTIONS = ['flashcards', 'modules', 'quiz_sessions', 'presentations'];

async function deleteCollectionByUser(collectionName, userId) {
  const snapshot = await db.collection(collectionName)
    .where('userId', '==', userId)
    .get();

  if (snapshot.empty) return 0;

  const batch = db.batch();
  snapshot.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
  return snapshot.size;
}

async function deleteAllInCollection(collectionName) {
  const snapshot = await db.collection(collectionName).limit(500).get();
  if (snapshot.empty) return 0;

  const batch = db.batch();
  snapshot.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();

  let count = snapshot.size;
  if (snapshot.size === 500) {
    count += await deleteAllInCollection(collectionName);
  }
  return count;
}

async function cleanupSeedData() {
  console.log('Cleaning up seed data...\n');

  let total = 0;
  for (const collection of COLLECTIONS) {
    const count = await deleteCollectionByUser(collection, SEED_USER_ID);
    console.log(`  ${collection}: deleted ${count} documents`);
    total += count;
  }

  await db.collection('users').doc(SEED_USER_ID).delete();
  console.log(`  users: deleted 1 document`);
  total += 1;

  console.log(`\nCleanup complete. Removed ${total} documents.`);
}

async function cleanupUserData(userId) {
  console.log(`Cleaning up all data for user: ${userId}\n`);

  let total = 0;
  for (const collection of COLLECTIONS) {
    const count = await deleteCollectionByUser(collection, userId);
    console.log(`  ${collection}: deleted ${count} documents`);
    total += count;
  }

  const userDoc = await db.collection('users').doc(userId).get();
  if (userDoc.exists) {
    await userDoc.ref.delete();
    console.log(`  users: deleted 1 document`);
    total += 1;
  }

  console.log(`\nCleanup complete. Removed ${total} documents.`);
}

async function cleanupAll() {
  console.log('WARNING: This will delete ALL data from ALL collections.\n');

  let total = 0;
  for (const collection of COLLECTIONS) {
    const count = await deleteAllInCollection(collection);
    console.log(`  ${collection}: deleted ${count} documents`);
    total += count;
  }

  const userCount = await deleteAllInCollection('users');
  console.log(`  users: deleted ${userCount} documents`);
  total += userCount;

  console.log(`\nFull cleanup complete. Removed ${total} documents.`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--seed')) {
    await cleanupSeedData();
  } else if (args.includes('--all')) {
    const confirm = args.includes('--yes');
    if (!confirm) {
      console.log('To confirm deletion of ALL data, add --yes flag:');
      console.log('  node lib/firebase/cleanup.js --all --yes');
      process.exit(1);
    }
    await cleanupAll();
  } else if (args.includes('--user')) {
    const userIdIndex = args.indexOf('--user') + 1;
    const userId = args[userIdIndex];
    if (!userId) {
      console.error('Error: --user requires a user ID argument');
      process.exit(1);
    }
    await cleanupUserData(userId);
  } else {
    console.log('Usage:');
    console.log('  node lib/firebase/cleanup.js --seed              Remove seed data');
    console.log('  node lib/firebase/cleanup.js --user <userId>     Remove user data');
    console.log('  node lib/firebase/cleanup.js --all --yes         Remove ALL data');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
