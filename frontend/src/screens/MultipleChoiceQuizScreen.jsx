import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import useAuth from '@/hooks/useAuth';
import { quizService } from '@/services/quizService';

export default function MultipleChoiceQuizScreen({ moduleId, moduleName, flashcard, onBack, onComplete }) {
  const { user } = useAuth();
  
  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Mapping of question.id -> selected option text
  const [answers, setAnswers] = useState({});
  // Mapping of question.id -> { isCorrect, feedbackText, correctAnswer }
  const [feedbacks, setFeedbacks] = useState(null);

  // Start Session
  useEffect(() => {
    async function initQuiz() {
      setIsLoading(true);
      try {
        const res = await quizService.startSession(user.id, moduleId, 'multiple_choice', 1, flashcard?.id);
        if (res.success) {
          setSession(res.session);
          if (res.session.preGeneratedQuestions) {
            setQuestions(res.session.preGeneratedQuestions);
          } else {
            console.error('No pre-generated questions returned.');
          }
        } else {
          console.error('Failed to start session');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    
    if (user && moduleId) {
      initQuiz();
    }
  }, [user, moduleId, flashcard?.id]);

  const handleOptionSelect = (questionId, option) => {
    if (isSubmitting || feedbacks) return;
    setAnswers(prev => ({ ...prev, [questionId]: option }));
  };

  const handleSubmit = async () => {
    if (isSubmitting || feedbacks) return;
    setIsSubmitting(true);
    
    try {
      const results = {};
      
      // Submit all answers sequentially to prevent backend race condition on session.responses
      for (const q of questions) {
        const res = await quizService.submitAnswer(session.id, q.id, answers[q.id]);
        if (res.success) {
          results[q.id] = {
            isCorrect: res.result.isCorrect,
            feedbackText: res.result.feedback,
            correctAnswer: res.result.correctAnswer
          };
        }
      }
      
      setFeedbacks(results);
    } catch (err) {
      console.error('Failed to submit answers', err);
    } finally {
      setIsSubmitting(false);
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
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bg gap-4">
        <Spinner size="lg" />
        <p className="text-text-secondary">Generating your quiz...</p>
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

  const allAnswered = Object.keys(answers).length === questions.length;

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-border bg-white shadow-sm">
        <h1 className="text-xl font-bold text-text-primary">Text Quiz</h1>
        <Button variant="outline" size="sm" onClick={onBack} disabled={isSubmitting}>Cancel</Button>
      </header>

      <div className="flex-1 p-4 max-w-3xl mx-auto w-full flex flex-col gap-6 py-6">
        {questions.map((q, idx) => {
          const selectedOption = answers[q.id];
          const feedback = feedbacks ? feedbacks[q.id] : null;

          return (
            <Card key={q.id} className="flex flex-col shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-8 h-8 rounded-full bg-primary-lighter text-primary font-bold flex items-center justify-center text-sm">
                    {idx + 1}
                  </span>
                  <CardTitle className="text-lg leading-relaxed m-0">
                    {q.question}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {q.options?.map((option, oIdx) => {
                  let btnVariant = "outline";
                  let btnClass = "justify-start h-auto py-4 px-4 text-left font-normal border-2 transition-all";
                  
                  if (feedback) {
                    // Quiz submitted
                    if (option === selectedOption) {
                      btnVariant = feedback.isCorrect ? "success" : "destructive";
                      btnClass += feedback.isCorrect ? " border-success bg-success-light text-success-dark font-medium" : " border-error bg-error-light text-error-dark font-medium";
                    } else if (option === feedback.correctAnswer || option === q.correctAnswer) {
                      // Correct option that wasn't selected
                      btnVariant = "success";
                      btnClass += " border-success bg-success-light text-success-dark font-medium";
                    } else {
                      btnClass += " opacity-40";
                    }
                  } else if (option === selectedOption) {
                    // Selected but not yet submitted
                    btnVariant = "secondary";
                    btnClass += " border-primary bg-primary-lighter text-primary font-medium";
                  }

                  return (
                    <Button
                      key={oIdx}
                      variant={btnVariant}
                      className={btnClass}
                      onClick={() => handleOptionSelect(q.id, option)}
                      disabled={!!feedbacks || isSubmitting}
                    >
                      {option}
                    </Button>
                  );
                })}

                {feedback && (
                  <div className={`mt-3 p-4 rounded-xl text-sm border-l-4 ${feedback.isCorrect ? 'bg-success-light/30 border-l-success' : 'bg-error-light/30 border-l-error'}`}>
                    <span className="font-bold mr-2">
                      {feedback.isCorrect ? '✓ Correct:' : '✗ Incorrect:'}
                    </span>
                    <span className="text-text-secondary">
                      {feedback.feedbackText || (feedback.isCorrect ? "Great job!" : `The correct answer is: ${q.correctAnswer}`)}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        <div className="mt-4 mb-8 sticky bottom-4 z-10">
          {!feedbacks ? (
            <Button 
              className="w-full shadow-lg h-14 text-lg" 
              size="lg" 
              onClick={handleSubmit}
              disabled={!allAnswered || isSubmitting}
            >
              {isSubmitting ? <Spinner size="sm" className="mr-2" /> : null}
              {isSubmitting ? 'Submitting...' : (allAnswered ? 'Submit Quiz' : `Answer ${questions.length - Object.keys(answers).length} more to submit`)}
            </Button>
          ) : (
            <Button 
              className="w-full shadow-lg h-14 text-lg" 
              size="lg" 
              onClick={handleFinish}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Spinner size="sm" className="mr-2" /> : null}
              {isSubmitting ? 'Finishing...' : 'Finish & See Results'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
