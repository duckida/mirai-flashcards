import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Spinner } from '@/components/ui/spinner'
import useAuth from '@/hooks/useAuth'
import { flashcardService } from '@/services/flashcardService'

const STATES = { IDLE: 'idle', UPLOADING: 'uploading', SCANNING: 'scanning', PREVIEW: 'preview', SAVING: 'saving', SUCCESS: 'success', ERROR: 'error' }

function FlashcardPreview({ flashcard, index }) {
  const confidence = Math.round((flashcard.confidence || 0) * 100)
  const variant = confidence >= 80 ? 'success' : confidence >= 50 ? 'warning' : 'error'

  return (
    <Card className="mb-3">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-primary-lighter flex items-center justify-center text-primary font-bold text-xs">
            {index + 1}
          </div>
          <Badge variant={variant}>{confidence}% confidence</Badge>
        </div>
        <div className="p-3 bg-bg-muted rounded-xl mb-2">
          <div className="text-xs text-primary font-semibold uppercase tracking-wide mb-1">Q</div>
          <div className="text-text-primary">{flashcard.question}</div>
        </div>
        <div className="p-3 bg-primary-lighter rounded-xl">
          <div className="text-xs text-primary font-semibold uppercase tracking-wide mb-1">A</div>
          <div className="text-text-primary">{flashcard.answer}</div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function UploadImageScreen({ onBack, onSuccess }) {
  const { user } = useAuth()
  const fileInputRef = useRef(null)
  const [state, setState] = useState(STATES.IDLE)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [flashcards, setFlashcards] = useState([])
  const [error, setError] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [saveMessage, setSaveMessage] = useState(null)

  const handleFileSelect = useCallback((file) => {
    if (!file) return
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setError('Unsupported format. Please upload a JPEG, PNG, or WEBP image.')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('File too large. Maximum size is 20MB.')
      return
    }
    setError(null)
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }, [])

  const handleUploadAndScan = useCallback(async () => {
    if (!selectedFile) {
      setError('Please select an image first.')
      return
    }
    if (!user?.id) {
      setError('User not authenticated. Please sign in again.')
      setState(STATES.ERROR)
      return
    }
    setError(null)
    setState(STATES.UPLOADING)
    setUploadProgress(0)
    try {
      const result = await flashcardService.uploadAndScan(selectedFile, user.id, 0.5, (p) => {
        setUploadProgress(p)
        if (p >= 100) setState(STATES.SCANNING)
      })
      if (!result.success) throw new Error(result.error || 'Failed to process image')
      const extracted = result.scan?.flashcards || []
      if (extracted.length === 0) throw new Error('No flashcards could be extracted.')
      setFlashcards(extracted)
      setState(STATES.PREVIEW)
    } catch (err) {
      setError(err.message)
      setState(STATES.ERROR)
    }
  }, [selectedFile, user])

  const handleConfirm = useCallback(async () => {
    if (!user?.id || flashcards.length === 0) return
    setError(null)
    setState(STATES.SAVING)
    try {
      const result = await flashcardService.saveFlashcards(user.id, flashcards.map((c) => ({
        question: c.question, answer: c.answer, sourceImageUrl: c.sourceImageUrl || '', confidence: c.confidence || 0,
      })))
      if (!result.success) throw new Error(result.error || 'Failed to save flashcards')
      const moduleInfo = result.moduleAssignments?.map((m) => `${m.moduleName} (${m.flashcardCount} cards)`).join(', ')
      setSaveMessage(`${flashcards.length} flashcard${flashcards.length > 1 ? 's' : ''} saved! ${moduleInfo ? `Added to: ${moduleInfo}` : ''}`)
      setState(STATES.SUCCESS)
    } catch (err) {
      setError(err.message)
      setState(STATES.ERROR)
    }
  }, [user, flashcards])

  const handleReset = useCallback(() => {
    setState(STATES.IDLE)
    setSelectedFile(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setFlashcards([])
    setError(null)
    setUploadProgress(0)
    setSaveMessage(null)
  }, [previewUrl])

  return (
    <div className="min-h-screen bg-white">
      <header className="flex items-center justify-between p-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary-lighter flex items-center justify-center text-xl">📷</div>
          <div>
            <h1 className="text-2xl font-extrabold text-text-primary">Upload Image</h1>
            <p className="text-sm text-text-secondary">Scan your notes into flashcards</p>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={onBack}>← Back</Button>
      </header>

      <main className="p-4 max-w-2xl mx-auto">
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-error-light border border-error mb-4">
            <span>⚠️</span>
            <span className="text-error font-medium flex-1">{error}</span>
            <Button variant="secondary" size="sm" onClick={() => setError(null)}>Dismiss</Button>
          </div>
        )}

        {state === STATES.SUCCESS && saveMessage && (
          <Card className="mb-4 bg-success-light border-success">
            <CardContent className="pt-8 pb-8 text-center">
              <div className="text-4xl mb-3">✅</div>
              <h3 className="text-2xl font-bold text-success mb-2">Flashcards Saved!</h3>
              <p className="text-text-primary mb-4">{saveMessage}</p>
              <div className="flex gap-3 justify-center">
                <Button onClick={handleReset}>Upload Another</Button>
                <Button variant="secondary" onClick={onSuccess}>Go to Dashboard</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {(state === STATES.IDLE || state === STATES.ERROR) && (
          <div>
            <div
              className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
                isDragging ? 'border-primary bg-primary-lighter' : 'border-border bg-bg-muted hover:border-primary hover:bg-primary-lighter'
              }`}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileSelect(e.dataTransfer?.files?.[0]) }}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragging(false) }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => handleFileSelect(e.target.files?.[0])} className="hidden" />
              {previewUrl ? (
                <div>
                  <img src={previewUrl} alt="Preview" className="max-w-full max-h-56 rounded-xl mb-3 mx-auto" />
                  <p className="text-sm text-text-secondary">{selectedFile?.name} ({(selectedFile?.size / 1024 / 1024).toFixed(2)} MB)</p>
                </div>
              ) : (
                <>
                  <div className="w-20 h-20 rounded-3xl bg-primary-lighter flex items-center justify-center mx-auto mb-4 text-4xl text-primary">+</div>
                  <p className="text-xl font-bold text-text-primary mb-2">Drop image here or click to browse</p>
                  <p className="text-base text-text-secondary">Supports JPEG, PNG, WEBP up to 20MB</p>
                </>
              )}
            </div>
            {selectedFile && (
              <Button className="w-full mt-4" size="lg" onClick={handleUploadAndScan}>
                🔍 Scan Image for Flashcards
              </Button>
            )}
          </div>
        )}

        {(state === STATES.UPLOADING || state === STATES.SCANNING) && (
          <div className="py-16 text-center">
            <Spinner size="lg" className="mx-auto mb-6" />
            <h3 className="text-xl font-bold text-text-primary mb-2">
              {state === STATES.UPLOADING ? 'Uploading image...' : 'Scanning for flashcards...'}
            </h3>
            {state === STATES.UPLOADING && (
              <div className="max-w-xs mx-auto mt-4">
                <Progress value={uploadProgress} />
                <p className="text-sm text-text-secondary mt-2">{uploadProgress}% uploaded</p>
              </div>
            )}
            {state === STATES.SCANNING && (
              <p className="text-sm text-text-secondary">AI is reading your notes and extracting flashcards...</p>
            )}
          </div>
        )}

        {state === STATES.SAVING && (
          <div className="py-16 text-center">
            <Spinner size="lg" className="mx-auto mb-6" />
            <h3 className="text-xl font-bold text-text-primary">Saving flashcards...</h3>
          </div>
        )}

        {state === STATES.PREVIEW && (
          <div>
            <Card className="mb-4 bg-primary-lighter border-primary">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-white font-extrabold text-2xl">
                    {flashcards.length}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-text-primary">Flashcards Extracted</h3>
                    <p className="text-sm text-text-secondary">Review before saving</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {flashcards.map((card, i) => <FlashcardPreview key={i} flashcard={card} index={i} />)}

            {flashcards.length === 0 && (
              <div className="py-10 text-center bg-bg-muted rounded-2xl">
                <div className="text-3xl mb-3">📭</div>
                <p className="text-text-secondary">All flashcards removed. Go back to upload a new image.</p>
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <Button variant="secondary" className="flex-1" size="lg" onClick={handleReset}>Cancel</Button>
              <Button className="flex-1" size="lg" onClick={handleConfirm}>
                Save {flashcards.length} Card{flashcards.length !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
