/**
 * useQuiz Hook
 *
 * React hook for managing quiz session state.
 * Handles starting sessions, loading questions, submitting answers,
 * tracking progress, and ending sessions.
 */

const { useState, useCallback, useRef } = require('react');
const quizService = require('../services/quizService');

function useQuiz() {
  const [session, setSession] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [summary, setSummary] = useState(null);
  const [answeredQuestions, setAnsweredQuestions] = useState([]);

  // Track question count with ref to avoid stale state
  const questionCountRef = useRef({ current: 0, total: 0 });

  /**
   * Start a new quiz session
   */
  const startQuiz = useCallback(async (userId, moduleId, type, cardCount = 10) => {
    setIsLoading(true);
    setError(null);
    setFeedback(null);
    setSummary(null);
    setAnsweredQuestions([]);

    try {
      const result = await quizService.startSession(userId, moduleId, type, cardCount);

      if (result.success) {
        setSession(result.session);
        questionCountRef.current = {
          current: 0,
          total: result.session.flashcardCount,
        };

        // Load first question
        await loadQuestion(result.session.id);
      } else {
        throw new Error(result.error || 'Failed to start quiz');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Load the next question
   */
  const loadQuestion = useCallback(async (sessionId) => {
    const sid = sessionId || session?.id;
    if (!sid) return;

    setIsLoading(true);
    setError(null);
    setFeedback(null);

    try {
      const result = await quizService.getNextQuestion(sid);

      if (result.success) {
        if (result.question) {
          setCurrentQuestion(result.question);
          questionCountRef.current.current = result.question.questionNumber;
          questionCountRef.current.total = result.question.totalQuestions;
        } else {
          // No more questions - quiz is complete
          setCurrentQuestion(null);
        }
      } else {
        throw new Error(result.error || 'Failed to load question');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  /**
   * Submit an answer
   */
  const submitAnswer = useCallback(async (answer) => {
    if (!session || !currentQuestion) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await quizService.submitAnswer(
        session.id,
        currentQuestion.id,
        answer
      );

      if (result.success) {
        setFeedback(result.result);

        // Track answered question
        setAnsweredQuestions(prev => [
          ...prev,
          {
            question: currentQuestion,
            userAnswer: answer,
            result: result.result,
          },
        ]);

        return result.result;
      } else {
        throw new Error(result.error || 'Failed to submit answer');
      }
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [session, currentQuestion]);

  /**
   * Advance to the next question after viewing feedback
   */
  const nextQuestion = useCallback(async () => {
    setFeedback(null);
    await loadQuestion();
  }, [loadQuestion]);

  /**
   * End the quiz session early
   */
  const endQuiz = useCallback(async () => {
    if (!session) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await quizService.endSession(session.id);

      if (result.success) {
        setSummary(result.summary);
        setCurrentQuestion(null);
        setFeedback(null);
      } else {
        throw new Error(result.error || 'Failed to end quiz');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  /**
   * Get session summary without ending
   */
  const getSummary = useCallback(async () => {
    if (!session) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await quizService.getSessionSummary(session.id);

      if (result.success) {
        setSummary(result.summary);
      } else {
        throw new Error(result.error || 'Failed to get summary');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  /**
   * Reset quiz state
   */
  const reset = useCallback(() => {
    setSession(null);
    setCurrentQuestion(null);
    setFeedback(null);
    setSummary(null);
    setAnsweredQuestions([]);
    setError(null);
    questionCountRef.current = { current: 0, total: 0 };
  }, []);

  /**
   * Check if quiz is complete (no more questions)
   */
  const isComplete = currentQuestion === null && session !== null && summary === null;

  /**
   * Get progress information
   */
  const progress = {
    current: questionCountRef.current.current,
    total: questionCountRef.current.total,
    percentage: questionCountRef.current.total > 0
      ? Math.round((questionCountRef.current.current / questionCountRef.current.total) * 100)
      : 0,
    answered: answeredQuestions.length,
    correct: answeredQuestions.filter(q => q.result?.isCorrect).length,
    incorrect: answeredQuestions.filter(q => !q.result?.isCorrect).length,
  };

  return {
    // State
    session,
    currentQuestion,
    isLoading,
    error,
    feedback,
    summary,
    answeredQuestions,
    isComplete,
    progress,

    // Actions
    startQuiz,
    loadQuestion,
    submitAnswer,
    nextQuestion,
    endQuiz,
    getSummary,
    reset,
    setError,
  };
}

module.exports = useQuiz;
