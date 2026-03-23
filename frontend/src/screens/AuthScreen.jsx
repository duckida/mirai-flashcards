import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import useAuth from '@/hooks/useAuth'

export default function AuthScreen() {
  const { isLoading, error, login } = useAuth()

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-white relative overflow-hidden">
      <div className="absolute top-10 right-10 w-32 h-32 rounded-full bg-primary-light opacity-30 -z-10" />
      <div className="absolute bottom-16 left-8 w-20 h-20 rounded-full bg-primary/20 opacity-20 -z-10" />

      <Card className="max-w-md w-full">
        <CardContent className="pt-10 pb-8 px-10">
          <div className="flex flex-col items-center gap-6">
            <div className="w-20 h-20 rounded-3xl bg-primary-lighter border-2 border-primary flex items-center justify-center text-4xl">
              📚
            </div>

            <div className="text-center">
              <h1 className="text-3xl font-extrabold text-text-primary tracking-tight mb-2">
                AI Flashcard Quizzer
              </h1>
              <p className="text-base text-text-secondary">
                Digitize your notes and learn with AI-powered quizzes
              </p>
            </div>

            {error && (
              <div className="w-full flex items-center gap-2 px-4 py-3 rounded-xl bg-error-light border border-error">
                <span>⚠️</span>
                <span className="text-error text-sm font-medium">{error}</span>
              </div>
            )}

            {isLoading ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <Spinner size="lg" />
                <span className="text-text-secondary">Connecting to Civic.ai...</span>
              </div>
            ) : (
              <Button className="w-full" size="lg" onClick={login}>
                Sign in with Civic
              </Button>
            )}

            <div className="flex items-center gap-2 px-4 py-3 bg-primary-lighter rounded-full">
              <span className="text-sm">🔒</span>
              <span className="text-sm text-text-secondary font-medium">
                Secure authentication powered by Civic.ai
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
