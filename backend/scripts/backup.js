/**
 * Firestore Backup Script
 * Exports all Firestore collections to JSON files
 *
 * Usage: node scripts/backup.js [--outputDir=<path>]
 *   --outputDir=<path>  Directory to write backup files (default: ./backups)
 */
import { initializeAdmin, getFirestore } from '../lib/firebase/admin.js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const args = process.argv.slice(2);
const outputArg = args.find(a => a.startsWith('--outputDir='));
const outputDir = outputArg ? outputArg.split('=')[1] : './backups';

const COLLECTIONS = ['users', 'modules', 'flashcards', 'quiz_sessions', 'presentations'];

/**
 * Export a collection to a JSON-serializable array
 */
async function exportCollection(db, collectionName) {
  const snapshot = await db.collection(collectionName).get();
  return snapshot.docs.map(doc => {
    const data = doc.data();
    // Convert Firestore Timestamps to ISO strings for JSON
    const serialized = {};
    for (const [key, value] of Object.entries(data)) {
      if (value && typeof value.toDate === 'function') {
        serialized[key] = value.toDate().toISOString();
      } else {
        serialized[key] = value;
      }
    }
    return { id: doc.id, ...serialized };
  });
}

async function backup() {
  console.log('\nStarting Firestore backup...\n');

  initializeAdmin();
  const db = getFirestore();

  // Create output directory
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = join(outputDir, `backup-${timestamp}`);
  if (!existsSync(backupDir)) {
    mkdirSync(backupDir, { recursive: true });
  }

  const summary = {};

  for (const col of COLLECTIONS) {
    const docs = await exportCollection(db, col);
    const filePath = join(backupDir, `${col}.json`);
    writeFileSync(filePath, JSON.stringify(docs, null, 2));
    summary[col] = docs.length;
    console.log(`  [${col}] Backed up ${docs.length} documents -> ${col}.json`);
  }

  // Write metadata
  const meta = {
    timestamp: new Date().toISOString(),
    collections: summary,
    totalDocuments: Object.values(summary).reduce((a, b) => a + b, 0),
  };
  writeFileSync(join(backupDir, 'meta.json'), JSON.stringify(meta, null, 2));

  console.log(`\nBackup complete!`);
  console.log(`  Location: ${backupDir}`);
  console.log(`  Total documents: ${meta.totalDocuments}\n`);
}

backup().catch(err => {
  console.error('Backup failed:', err);
  process.exit(1);
});
