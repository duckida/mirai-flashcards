import { useState, useRef, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Spinner } from '@/components/ui/spinner'
import { Camera, AlertTriangle, CheckCircle, ArrowLeft, Search, Inbox, X, Plus, Crop as CropIcon, RotateCw } from 'lucide-react'
import useAuth from '@/hooks/useAuth'
import { flashcardService } from '@/services/flashcardService'
import { getCroppedImage } from '@/services/imageCrop'

const STATES = { IDLE: 'idle', CROPPING: 'cropping', UPLOADING: 'uploading', SCANNING: 'scanning', PREVIEW: 'preview', SAVING: 'saving', SUCCESS: 'success', ERROR: 'error' }

function FlashcardPreview({ flashcard, index }) {
  const confidence = Math.round((flashcard.confidence || 0) * 100)
  const variant = confidence >= 80 ? 'success' : confidence >= 50 ? 'warning' : 'error'

  return (
    <Card className="mb-3">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-[#111111] font-bold text-xs">
            {index + 1}
          </div>
          <Badge variant={variant}>{confidence}% confidence</Badge>
        </div>
        {flashcard.sourceImageUrl && (
          <div className="rounded-xl overflow-hidden bg-bg-muted">
            <img 
              src={flashcard.sourceImageUrl} 
              alt={`Flashcard ${index + 1}`} 
              loading="lazy"
              className="w-full max-w-md mx-auto"
            />
          </div>
        )}
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

  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)

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
    setState(STATES.CROPPING)
  }, [])

  const handleApplyCrop = useCallback(async () => {
    if (!previewUrl || !croppedAreaPixels) return
    try {
      const croppedFile = await getCroppedImage(previewUrl, croppedAreaPixels)
      URL.revokeObjectURL(previewUrl)
      setSelectedFile(croppedFile)
      setPreviewUrl(URL.createObjectURL(croppedFile))
      setState(STATES.IDLE)
    } catch (err) {
      setError('Failed to crop image: ' + err.message)
    }
  }, [previewUrl, croppedAreaPixels])

  const handleSkipCrop = useCallback(() => {
    setState(STATES.IDLE)
  }, [])

  const onCropComplete = useCallback((_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels)
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
        content: c.content,
        drawingDescriptions: c.drawingDescriptions || [],
        sourceImageUrl: c.sourceImageUrl || '',
        confidence: c.confidence || 0,
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
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCroppedAreaPixels(null)
  }, [previewUrl])

  return (
    <div className="min-h-screen bg-white">
      <header className="flex items-center justify-between p-5 ">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center shrink-0">
            <Camera className="w-5 h-5 text-[#111111]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-extrabold text-text-primary truncate">Upload Image</h1>
            <p className="text-sm text-text-secondary truncate">Scan your notes into flashcards</p>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={onBack} className="shrink-0">
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back</span>
        </Button>
      </header>

      <main className="p-4 max-w-2xl mx-auto">
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-error-light border border-error mb-4">
            <AlertTriangle className="w-4 h-4 text-error shrink-0" />
            <span className="text-error font-medium flex-1">{error}</span>
            <Button variant="secondary" size="sm" onClick={() => setError(null)}>Dismiss</Button>
          </div>
        )}

        {state === STATES.CROPPING && previewUrl && (
          <div className="mb-4">
            <div className="relative w-full h-[300px] md:h-[400px] rounded-2xl overflow-hidden bg-[#111]">
              <Cropper
                image={previewUrl}
                crop={crop}
                zoom={zoom}
                aspect={4 / 3}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                classes={{ containerClassName: 'rounded-2xl' }}
              />
            </div>
            <div className="flex items-center gap-4 mt-4">
              <div className="flex items-center gap-2 flex-1">
                <RotateCw className="w-4 h-4 text-text-muted shrink-0" />
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full h-1.5 bg-bg-muted rounded-full appearance-none cursor-pointer accent-[#111]"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <Button variant="secondary" className="flex-1" size="lg" onClick={handleSkipCrop}>
                <X className="w-4 h-4" />
                Skip
              </Button>
              <Button className="flex-1" size="lg" onClick={handleApplyCrop}>
                <CropIcon className="w-4 h-4" />
                Apply Crop
              </Button>
            </div>
          </div>
        )}

        {state === STATES.SUCCESS && saveMessage && (
          <Card className="mb-4 bg-success-light border-success">
            <CardContent className="pt-8 pb-8 text-center">
              <CheckCircle className="w-12 h-12 text-success mx-auto mb-3" />
              <h3 className="text-2xl font-bold text-success mb-2">Flashcards Saved!</h3>
              <p className="text-text-primary mb-4">{saveMessage}</p>
              <div className="flex gap-3 justify-center">
                <Button onClick={handleReset}>
                  <Plus className="w-4 h-4" />
                  Upload Another
                </Button>
                <Button variant="secondary" onClick={onSuccess}>Go to Dashboard</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {(state === STATES.IDLE || state === STATES.ERROR) && (
          <div>
            <div
              className={`border-2 border-dashed rounded-2xl p-6 md:p-12 text-center cursor-pointer transition-all ${
                isDragging ? 'border-primary bg-[#F8F8F8]' : 'border-border bg-bg-muted hover:border-primary hover:bg-[#F8F8F8]'
              }`}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileSelect(e.dataTransfer?.files?.[0]) }}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragging(false) }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => handleFileSelect(e.target.files?.[0])} className="hidden" />
              {previewUrl ? (
                <div className="w-full">
                  <img src={previewUrl} alt="Preview" loading="lazy" className="max-w-full max-h-56 rounded-xl mb-3 mx-auto" />
                  <p className="text-sm text-text-secondary truncate max-w-full">{selectedFile?.name} ({(selectedFile?.size / 1024 / 1024).toFixed(2)} MB)</p>
                </div>
              ) : (
                <>
                  <div className="w-20 h-20 rounded-3xl bg-primary flex items-center justify-center mx-auto mb-4">
                    <Plus className="w-10 h-10 text-[#111111]" />
                  </div>
                  <p className="text-xl font-bold text-text-primary mb-2">Drop image here or click to browse</p>
                  <p className="text-base text-text-secondary">Supports JPEG, PNG, WEBP up to 20MB</p>
                </>
              )}
            </div>
            {selectedFile && (
              <div className="flex gap-3 mt-4">
                <Button variant="secondary" className="flex-1" size="lg" onClick={() => { setState(STATES.CROPPING); setCrop({ x: 0, y: 0 }); setZoom(1) }}>
                  <CropIcon className="w-4 h-4" />
                  Crop
                </Button>
                <Button className="flex-1" size="lg" onClick={handleUploadAndScan}>
                  <Search className="w-4 h-4" />
                  Scan Image for Flashcards
                </Button>
              </div>
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
            <Card className="mb-4 bg-primary border-0">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-[#111111] font-extrabold text-2xl">
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
                <Inbox className="w-10 h-10 text-text-muted mx-auto mb-3" />
                <p className="text-text-secondary">All flashcards removed. Go back to upload a new image.</p>
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <Button variant="secondary" className="flex-1" size="lg" onClick={handleReset}>
                <X className="w-4 h-4" />
                Cancel
              </Button>
              <Button className="flex-1" size="lg" onClick={handleConfirm}>
                <CheckCircle className="w-4 h-4" />
                Save {flashcards.length} Card{flashcards.length !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
