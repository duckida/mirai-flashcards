/**
 * Speech service for ElevenLabs integration
 * Handles API calls for getting signed URLs
 */

export async function getSignedUrl() {
  try {
    const response = await fetch('/api/quiz/speech-token', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Important for cookies/session
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get speech token');
    }

    const data = await response.json();
    return data.signedUrl;
  } catch (error) {
    console.error('Error in speech service:', error);
    throw error;
  }
}