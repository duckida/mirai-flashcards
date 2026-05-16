import { getFirestore } from '@/lib/firebase/admin.js';
import { apiHandler } from '@/lib/api/middleware.js';
import { errorResponse, successResponse } from '@/lib/api/errorHandler.js';

const MAX_FLASHCARDS = 500;

export const GET = apiHandler(async (request) => {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const limit = Math.min(parseInt(searchParams.get('limit')) || MAX_FLASHCARDS, MAX_FLASHCARDS);

  if (!userId) {
    return errorResponse('User ID is required', 400);
  }

  const db = getFirestore();

  const [flashcardsSnapshot, modulesSnapshot] = await Promise.all([
    db.collection('flashcards').where('userId', '==', userId).limit(limit).get(),
    db.collection('modules').where('userId', '==', userId).get(),
  ]);

  const moduleMap = {};
  modulesSnapshot.docs.forEach(doc => {
    const data = doc.data();
    moduleMap[doc.id] = { name: data.name, color: data.color, icon: data.icon };
  });

  const flashcards = flashcardsSnapshot.docs.map(doc => {
    const data = doc.data();
    const moduleInfo = moduleMap[data.moduleId] || {};
    return {
      id: doc.id,
      ...data,
      moduleName: moduleInfo.name || 'Unknown',
      moduleColor: moduleInfo.color || '#FEE500',
      moduleIcon: moduleInfo.icon || null,
    };
  });

  return successResponse({ flashcards });
});
