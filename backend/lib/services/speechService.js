import fetch from 'node-fetch';

export class SpeechService {
  /**
   * Fetches a signed URL for ElevenLabs conversation
   * @param {string} agentId - ElevenLabs agent ID
   * @returns {Promise<string>} Signed URL for WebSocket connection
   */
  static async getSignedUrl(agentId) {
    try {
      const apiKey = process.env.ELEVENLABS_API_KEY;
      
      if (!apiKey) {
        throw new Error('ElevenLabs API key not configured');
      }

      const response = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`,
        {
          method: 'GET',
          headers: {
            'xi-api-key': apiKey,
          },
        }
      );

      if (!response.ok) {
        let errorMessage = 'Unknown error';
        try {
          // Check if response.json exists and is a function
          if (typeof response.json === 'function') {
            const errorData = await response.json();
            if (errorData && typeof errorData === 'object' && errorData !== null) {
              if (errorData.detail) {
                errorMessage = String(errorData.detail);
              } else if (errorData.message) {
                errorMessage = String(errorData.message);
              } else {
                // Use the whole object if no expected fields found
                errorMessage = String(Object.prototype.toString.call(errorData) === '[object Object]' 
                  ? JSON.stringify(errorData) 
                  : errorData);
              }
            } else {
              // Handle primitive values or null
              errorMessage = String(errorData ?? response.statusText ?? 'HTTP Error ' + response.status);
            }
          } else {
            // If no json function, use status text
            errorMessage = String(response.statusText || 'HTTP Error ' + response.status);
          }
        } catch (parseError) {
          // If we can't parse JSON, use status text
          errorMessage = String(response.statusText || 'HTTP Error ' + response.status);
        }
        throw new Error(`Failed to get signed URL: ${errorMessage}`);
      }

      const data = await response.json();
      return data.signed_url;
    } catch (error) {
      console.error('Error fetching signed URL:', error);
      throw error;
    }
  }

  /**
   * Builds conversation context for quiz session
   * @param {Object} session - Quiz session data
   * @param {Array} flashcards - Array of flashcard objects
   * @param {Object} user - User object
   * @returns {Object} Contextual data for agent
   */
  static buildConversationContext(session, flashcards, user) {
    const currentFlashcardIndex = session.currentFlashcardIndex || 0;
    const currentFlashcard = flashcards[currentFlashcardIndex];
    const totalQuestions = session.flashcardIds?.length || flashcards.length;
    
    return {
      user_id: user.id,
      user_name: user.name || 'User',
      session_id: session.id,
      module_name: session.moduleName || 'Unknown Module',
      current_question_index: currentFlashcardIndex,
      total_questions: totalQuestions,
      flashcard_content: currentFlashcard ? currentFlashcard.content : null,
      drawing_descriptions: currentFlashcard?.drawingDescriptions || [],
      score_correct: session.totalCorrect || 0,
      score_incorrect: session.totalIncorrect || 0,
      is_complete: session.status === 'completed' || false,
      feedback: session.lastFeedback || null,
    };
  }

  /**
   * Builds session overrides for quiz context
   * @param {string} moduleName - Name of the module
   * @param {string} userName - Name of the user
   * @returns {Object} Conversation configuration override
   */
  static buildSessionOverrides(moduleName, userName) {
    return {
      agent: {
        prompt: {
          prompt: `You are a helpful quiz assistant for the "${moduleName}" module. Greet the user by name (${userName}) and help them study by asking questions from their flashcards. Read questions clearly, wait for their responses, and provide encouraging feedback. Keep your responses concise and focused on the quiz.`,
        },
        first_message: `Hello ${userName}! I'm your quiz assistant for ${moduleName}. Let's start studying!`,
      },
    };
  }
}