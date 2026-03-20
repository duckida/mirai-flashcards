/**
 * Firestore Connection Test
 * 
 * This script tests the Firebase Admin SDK connection and basic Firestore operations.
 * Run with: node lib/firebase/test.js
 */

import { getFirestore } from './admin.js';

async function testFirestoreConnection() {
  console.log('🔍 Testing Firestore connection...\n');

  try {
    const db = getFirestore();
    console.log('✓ Firebase Admin SDK initialized');

    // Test 1: Write operation
    console.log('\n📝 Test 1: Write operation');
    const testRef = db.collection('test').doc('connection-test');
    await testRef.set({
      message: 'Firestore connection successful',
      timestamp: new Date(),
      testType: 'connection-verification',
    });
    console.log('✓ Successfully wrote test document');

    // Test 2: Read operation
    console.log('\n📖 Test 2: Read operation');
    const doc = await testRef.get();
    if (doc.exists) {
      console.log('✓ Successfully read test document');
      console.log('  Document data:', doc.data());
    } else {
      throw new Error('Document does not exist after write');
    }

    // Test 3: Update operation
    console.log('\n✏️  Test 3: Update operation');
    await testRef.update({
      message: 'Updated message',
      updatedAt: new Date(),
    });
    const updatedDoc = await testRef.get();
    console.log('✓ Successfully updated test document');
    console.log('  Updated data:', updatedDoc.data());

    // Test 4: Delete operation
    console.log('\n🗑️  Test 4: Delete operation');
    await testRef.delete();
    const deletedDoc = await testRef.get();
    if (!deletedDoc.exists) {
      console.log('✓ Successfully deleted test document');
    } else {
      throw new Error('Document still exists after delete');
    }

    // Test 5: Collection query
    console.log('\n🔍 Test 5: Collection query');
    const snapshot = await db.collection('test').limit(1).get();
    console.log(`✓ Successfully queried collection (found ${snapshot.size} documents)`);

    console.log('\n' + '='.repeat(50));
    console.log('✅ All Firestore tests passed!');
    console.log('='.repeat(50));
    console.log('\nFirestore is properly configured and ready to use.');
    console.log('You can now implement the application services.');

  } catch (error) {
    console.error('\n' + '='.repeat(50));
    console.error('❌ Firestore test failed');
    console.error('='.repeat(50));
    console.error('\nError:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Verify FIREBASE_SERVICE_ACCOUNT_JSON is set in .env.local');
    console.error('2. Ensure the JSON is valid (no line breaks in the middle)');
    console.error('3. Check that Firestore database is created in Firebase Console');
    console.error('4. Verify security rules allow read/write for test collection');
    console.error('\nFull error:');
    console.error(error);
    process.exit(1);
  }
}

// Run test
testFirestoreConnection();
