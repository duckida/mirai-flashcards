import { useState, useCallback } from 'react'
import { quizService } from '../services/quizService'

export default function useQuiz() {
  const [session, setSession] = useState(null)
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [summary, setSummary] = useState(null)
  const [answeredQuestions, setAnsweredQuestions] = useState([])

  const progress = {
    current: currentQuestion?.questionNumber || 0,
    total: currentQuestion?.totalQuestions || session?.flashcardCount || 0,
    percentage: currentQuestion?.totalQuestions
      ? Math.round((currentQuestion.questionNumber / currentQuestion.totalQuestions) * 100)
      : 0,
    answered: answeredQuestions.length,
    correct: answeredQuestions.filter((q) => q.result.isCorrect).length,
    incorrect: answeredQuestions.filter((q) => !q.result.isCorrect).length,
  }

  const startQuiz = useCallback(async (userId, moduleId, type, cardCount) => {
    setIsLoading(true)
    setError(null)
    setSummary(null)
    setAnsweredQuestions([])
    setFeedback(null)
    setSession(null)
    setCurrentQuestion(null)
    try {
      const result = await quizService.startSession(userId, moduleId, type, cardCount)
      if (!result.success) throw new Error(result.error || 'Failed to start quiz')
      setSession(result.session)
      const questionResult = await quizService.getNextQuestion(result.session.id)
      if (!questionResult.success) throw new Error(questionResult.error || 'Failed to get first question')
      setCurrentQuestion(questionResult.question || null)
    } catch (err) {
      setError(err.message)
      setSession(null)
      setCurrentQuestion(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadQuestion = useCallback(async (sessionId) => {
    const sid = sessionId || session?.id
    if (!sid) return
    try {
      const data = await quizService.getNextQuestion(sid)
      if (!data.success) throw new Error(data.error || 'Failed to load question')
      setCurrentQuestion(data.question || null)
      if (!data.question) {
        // Quiz is complete, fetch summary
        try {
          const summaryData = await quizService.getSessionSummary(sid)
          if (summaryData.success) {
            setSummary(summaryData.summary)
          } else {
            throw new Error(summaryData.error || 'Failed to fetch summary')
          }
        } catch (summaryErr) {
          setError(summaryErr.message)
        }
      }
    } catch (err) {
      setError(err.message)
    }
  }, [session])

  const submitAnswer = useCallback(async (answer) => {
    if (!session?.id || !currentQuestion?.id) return
    setIsLoading(true)
    setError(null)
    setFeedback(null)
    try {
      const result = await quizService.submitAnswer(session.id, currentQuestion.id, answer)
      if (!result.success) throw new Error(result.error || 'Failed to submit answer')
      setFeedback(result.result)
      setAnsweredQuestions((prev) => [
        ...prev,
        { question: currentQuestion, userAnswer: answer, result: result.result },
      ])
      return result.result
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [session, currentQuestion])

  const nextQuestion = useCallback(async () => {
    setFeedback(null)
    setIsLoading(true)
    try {
      await loadQuestion()
    } finally {
      setIsLoading(false)
    }
  }, [loadQuestion])

  const endQuiz = useCallback(async () => {
    if (!session?.id) return
    setIsLoading(true)
    setError(null)
    try {
      const endResult = await quizService.endSession(session.id)
      if (!endResult.success) throw new Error(endResult.error || 'Failed to end quiz')
      const summaryData = await quizService.getSessionSummary(session.id)
      if (!summaryData.success) throw new Error(summaryData.error || 'Failed to get summary')
      setSummary(summaryData.summary)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [session])

  const reset = useCallback(() => {
    setSession(null)
    setCurrentQuestion(null)
    setIsLoading(false)
    setError(null)
    setFeedback(null)
    setSummary(null)
    setAnsweredQuestions([])
  }, [])

  return {
    session,
    currentQuestion,
    isLoading,
    error,
    feedback,
    summary,
    isComplete: currentQuestion === null && session !== null,
    progress,
    startQuiz,
    submitAnswer,
    nextQuestion,
    endQuiz,
    reset,
    setError,
  }
}
