import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import useAuth from '@/hooks/useAuth';
import { quizService } from '@/services/quizService';

export default function MultipleChoiceQuizScreen({ moduleId, moduleName, flashcard, onBack, onComplete }) {
  const { user } = useAuth();

  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [error, setError] = useState(null);

  const [selectedOption, setSelectedOption] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [results, setResults] = useState([]);

  useEffect(() => {
    let progressInterval;

    async function initQuiz() {
      setIsLoading(true);
      setGenerationProgress(0);
      setError(null);

      progressInterval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev >= 95) return 95;
          return prev + (95 / (8000 / 100));
        });
      }, 100);

      try {
        const res = await quizService.startSession(user.id, moduleId, 'multiple_choice', 1, flashcard?.id);

        setGenerationProgress(100);
        clearInterval(progressInterval);

        setTimeout(() => {
          if (res.success) {
            setSession(res.session);
            if (res.session.preGeneratedQuestions && res.session.preGeneratedQuestions.length > 0) {
              setQuestions(res.session.preGeneratedQuestions);
            } else {
              setError('No questions were generated. The flashcard may be empty.');
            }
          } else {
            setError(res.error || 'Failed to start session');
          }
          setIsLoading(false);
        }, 300);
      } catch (err) {
        console.error('Error starting session:', err);
        setError(err.message || 'An error occurred');
        clearInterval(progressInterval);
        setIsLoading(false);
      }
    }

    if (user && moduleId) {
      initQuiz();
    }

    return () => {
      if (progressInterval) clearInterval(progressInterval);
    };
  }, [user, moduleId, flashcard?.id]);

  const handleOptionSelect = (option) => {
    if (feedback || isSubmitting) return;
    setSelectedOption(option);
  };

  const handleSubmitAnswer = async () => {
    if (!selectedOption || feedback || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const q = questions[currentQuestionIndex];
      const res = await quizService.submitAnswer(session.id, q.id, selectedOption);

      if (res.success) {
        const resultData = {
          isCorrect: res.result.isCorrect,
          feedbackText: res.result.feedback,
          correctAnswer: res.result.correctAnswer || q.correctAnswer
        };
        setFeedback(resultData);
        setResults(prev => [...prev, { questionId: q.id, ...resultData }]);
      }
    } catch (err) {
      console.error('Failed to submit answer', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedOption(null);
      setFeedback(null);
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      const res = await quizService.endSession(session.id);
      if (res.success) {
        onComplete(res.summary);
      }
    } catch (err) {
      console.error('Failed to end session', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bg gap-6 p-6">
        <Spinner size="lg" />
        <div className="w-full max-w-xs space-y-2 text-center">
          <p className="text-text-primary font-medium">Generating questions...</p>
          <Progress value={generationProgress} indicatorClassName="bg-primary" className="h-3" />
          <p className="text-xs text-text-muted">{Math.round(generationProgress)}%</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bg gap-4 p-6">
        <div className="text-center">
          <p className="text-error font-medium mb-2">Error</p>
          <p className="text-text-secondary text-sm mb-4">{error}</p>
        </div>
        <Button onClick={onBack}>Go Back</Button>
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bg gap-4">
        <p className="text-text-secondary">No questions available.</p>
        <Button onClick={onBack}>Go Back</Button>
      </div>
    );
  }

  const q = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-border bg-white shadow-sm">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-text-primary">Text Quiz</h1>
          <Badge variant="secondary">{currentQuestionIndex + 1} / {questions.length}</Badge>
        </div>
        <Button variant="outline" size="sm" onClick={onBack} disabled={isSubmitting}>Cancel</Button>
      </header>

      <div className="flex-1 flex flex-col">
        <div className="p-2 bg-white border-b border-border">
          <Progress value={progress} indicatorClassName="bg-primary" className="h-2" />
        </div>

        <div className="flex-1 p-4 max-w-2xl mx-auto w-full flex flex-col justify-center">
          <Card className={`shadow-sm ${feedback ? (feedback.isCorrect ? 'border-2 border-success' : 'border-2 border-error') : ''}`}>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <span className="w-10 h-10 rounded-full bg-primary-lighter text-primary font-bold flex items-center justify-center text-lg shrink-0">
                  {currentQuestionIndex + 1}
                </span>
                <CardTitle className="text-xl leading-relaxed m-0">
                  {q.question}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {q.options?.map((option, oIdx) => {
                let btnVariant = "outline";
                let btnClass = "justify-start h-auto py-4 px-4 text-left font-normal border-2 transition-all";

                if (feedback) {
                  if (option === selectedOption) {
                    btnVariant = feedback.isCorrect ? "success" : "destructive";
                    btnClass += feedback.isCorrect
                      ? " border-success bg-success-light text-success-dark font-medium"
                      : " border-error bg-error-light text-error-dark font-medium";
                  } else if (option === feedback.correctAnswer || option === q.correctAnswer) {
                    btnVariant = "success";
                    btnClass += " border-success bg-success-light text-success-dark font-medium";
                  } else {
                    btnClass += " opacity-40";
                  }
                } else if (option === selectedOption) {
                  btnVariant = "secondary";
                  btnClass += " border-primary bg-primary-lighter text-primary font-medium";
                }

                return (
                  <Button
                    key={oIdx}
                    variant={btnVariant}
                    className={btnClass}
                    onClick={() => handleOptionSelect(option)}
                    disabled={!!feedback || isSubmitting}
                  >
                    {option}
                  </Button>
                );
              })}

              {feedback && (
                <div className={`mt-4 p-4 rounded-xl text-sm border-l-4 ${feedback.isCorrect ? 'bg-success-light/30 border-l-success' : 'bg-error-light/30 border-l-error'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{feedback.isCorrect ? '✅' : '❌'}</span>
                    <span className="font-bold text-base">
                      {feedback.isCorrect ? 'Correct!' : 'Incorrect'}
                    </span>
                  </div>
                  {!feedback.isCorrect && (
                    <p className="text-text-secondary mt-2">
                      The correct answer is: <strong>{feedback.correctAnswer || q.correctAnswer}</strong>
                    </p>
                  )}
                  {feedback.feedbackText && (
                    <p className="text-text-secondary mt-1">{feedback.feedbackText}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="p-4 border-t border-border max-w-2xl mx-auto w-full">
          {!feedback ? (
            <Button
              className="w-full shadow-lg h-14 text-lg"
              size="lg"
              onClick={handleSubmitAnswer}
              disabled={!selectedOption || isSubmitting}
            >
              {isSubmitting ? <Spinner size="sm" className="mr-2" /> : null}
              {isSubmitting ? 'Checking...' : 'Check Answer'}
            </Button>
          ) : (
            <Button
              className="w-full shadow-lg h-14 text-lg"
              size="lg"
              onClick={handleNextQuestion}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Spinner size="sm" className="mr-2" /> : null}
              {isSubmitting ? 'Finishing...' : (isLastQuestion ? 'See Results' : 'Next Question →')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
