import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import useAuth from '@/hooks/useAuth';
import { quizService } from '@/services/quizService';

export default function MultipleChoiceQuizScreen({ moduleId, moduleName, flashcard, onBack, onComplete, onNavigate }) {
  const { user } = useAuth();
  
  const [session, setSession] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [feedback, setFeedback] = useState(null); // { isCorrect, feedbackText, correctAnswer }

  // Start Session
  useEffect(() => {
    async function initQuiz() {
      setIsLoading(true);
      try {
        // Start a session specifically for this flashcard (cardCount = 1)
        // Wait, if flashcard is passed, we might just want to quiz that one card.
        // Actually the backend endpoint doesn't currently accept a specific flashcardId to start with,
        // it just takes moduleId and cardCount.
        // Wait! Let's check the spec: "Start a quiz session with a single flashcard ID."
        // Did the spec say I need to modify backend to accept flashcardId? 
        // "Start a quiz session with a single flashcard ID. ... `POST /api/quiz/start` with `type: 'multiple_choice'`, `cardCount: 1`"
        // Wait, if it only takes `moduleId`, and `cardCount: 1`, it will randomly select 1 flashcard from the module, not necessarily the specific one.
        // Let's check the spec text:
        // "Start a quiz session with a single flashcard ID. ... `POST /api/quiz/start` with `type: 'multiple_choice'`, `cardCount: 1`"
        // The backend `startSession` function: `startSession(userId, moduleId, type, cardCount = 10)`
        // If I pass `cardCount: 1`, it selects 1 flashcard based on knowledge score.
        // Let's look at `selectFlashcards(moduleId, count)`: it does `where('moduleId', '==', moduleId).orderBy('knowledgeScore', 'asc').limit(count)`.
        // If we want a specific flashcard, we would need to pass `flashcardId` to the backend and modify `startSession`.
        // The spec specifically says: "2. Reuse existing backend ... The startSession ... endpoints are ready."
        // "3. Backend change needed: Add 'multiple_choice' to the allowed quiz types ... " (doesn't mention changing startSession to accept flashcardId).
        // It says: "2. Screen starts a quiz session (POST /api/quiz/start with type: 'multiple_choice', cardCount: 1)"
        // Okay, I will just follow the spec: pass `cardCount: 1` and `type: 'multiple_choice'`.

        const res = await quizService.startSession(user.id, moduleId, 'multiple_choice', 1, flashcard?.id);
        if (res.success) {
          setSession(res.session);
          fetchNextQuestion(res.session.id);
        } else {
          console.error('Failed to start session');
          setIsLoading(false);
        }
      } catch (err) {
        console.error(err);
        setIsLoading(false);
      }
    }
    
    if (user && moduleId) {
      initQuiz();
    }
  }, [user, moduleId]);

  const fetchNextQuestion = async (sessionId) => {
    try {
      const res = await quizService.getNextQuestion(sessionId);
      if (res.success) {
        if (res.question) {
          setCurrentQuestion(res.question);
          setSelectedOption(null);
          setFeedback(null);
        } else {
          // Session complete
          endQuiz(sessionId);
        }
      }
    } catch (err) {
      console.error('Failed to fetch next question', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptionSelect = async (option) => {
    if (isSubmitting || feedback) return;
    
    setSelectedOption(option);
    setIsSubmitting(true);
    
    try {
      const res = await quizService.submitAnswer(session.id, currentQuestion.id, option);
      if (res.success) {
        setFeedback({
          isCorrect: res.result.isCorrect,
          feedbackText: res.result.feedback,
          correctAnswer: res.result.correctAnswer
        });
      }
    } catch (err) {
      console.error('Failed to submit answer', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    setIsLoading(true);
    fetchNextQuestion(session.id);
  };

  const endQuiz = async (sessionId) => {
    try {
      const res = await quizService.endSession(sessionId);
      if (res.success) {
        onComplete(res.summary);
      }
    } catch (err) {
      console.error('Failed to end session', err);
    }
  };

  if (isLoading && !currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <p className="text-text-secondary">No questions available.</p>
        <Button onClick={onBack} className="mt-4">Go Back</Button>
      </div>
    );
  }

  const progressValue = ((currentQuestion.questionNumber - 1) / currentQuestion.totalQuestions) * 100;

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <header className="flex items-center justify-between p-4 border-b border-border bg-white">
        <h1 className="text-xl font-bold text-text-primary">Text Quiz</h1>
        <Button variant="outline" size="sm" onClick={onBack}>Cancel</Button>
      </header>

      <div className="flex-1 p-4 max-w-2xl mx-auto w-full flex flex-col">
        <div className="mb-6">
          <div className="flex justify-between text-sm text-text-secondary mb-2">
            <span>Question {currentQuestion.questionNumber} of {currentQuestion.totalQuestions}</span>
            <span>{Math.round(progressValue)}%</span>
          </div>
          <Progress value={progressValue} indicatorClassName="bg-primary" />
        </div>

        <Card className="flex-1 mb-6 flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg leading-relaxed">
              {currentQuestion.question}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-3">
            {currentQuestion.options?.map((option, idx) => {
              let btnVariant = "outline";
              let btnClass = "justify-start h-auto py-4 px-4 text-left font-normal border-2";
              
              if (feedback) {
                // Determine styling after answer is submitted
                // If this option is the one the user selected
                if (option === selectedOption) {
                  btnVariant = feedback.isCorrect ? "success" : "destructive";
                  btnClass += feedback.isCorrect ? " border-success bg-success-light" : " border-error bg-error-light";
                } 
                // If this option is the correct one, highlight it (even if not selected)
                // Wait, does currentQuestion include correctAnswer? 
                // Yes, backend returns it in `question.correctAnswer`
                else if (option === currentQuestion.correctAnswer) {
                  btnVariant = "success";
                  btnClass += " border-success bg-success-light text-success-dark";
                } else {
                  btnClass += " opacity-50";
                }
              } else if (option === selectedOption) {
                // While submitting, highlight selected
                btnVariant = "secondary";
                btnClass += " border-primary";
              }

              return (
                <Button
                  key={idx}
                  variant={btnVariant}
                  className={btnClass}
                  onClick={() => handleOptionSelect(option)}
                  disabled={!!feedback || isSubmitting}
                >
                  {option}
                </Button>
              );
            })}
          </CardContent>
        </Card>

        {feedback && (
          <Card className={`mb-6 border-l-4 ${feedback.isCorrect ? 'border-l-success' : 'border-l-error'}`}>
            <CardContent className="pt-6">
              <h3 className={`font-bold mb-2 ${feedback.isCorrect ? 'text-success' : 'text-error'}`}>
                {feedback.isCorrect ? 'Correct!' : 'Incorrect'}
              </h3>
              <p className="text-text-secondary text-sm">
                {feedback.feedbackText || (feedback.isCorrect ? "Great job!" : `The correct answer is: ${currentQuestion.correctAnswer}`)}
              </p>
            </CardContent>
          </Card>
        )}

        <div className="mt-auto">
          {feedback ? (
            <Button 
              className="w-full" 
              size="lg" 
              onClick={handleNext}
              disabled={isLoading}
            >
              {isLoading ? <Spinner size="sm" /> : (currentQuestion.questionNumber >= currentQuestion.totalQuestions ? 'Finish Quiz' : 'Next Question')}
            </Button>
          ) : (
            <Button 
              className="w-full" 
              size="lg" 
              disabled={true}
              variant="secondary"
            >
              Select an answer
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
