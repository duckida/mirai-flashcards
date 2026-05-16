import { useState, useEffect, useMemo, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Spinner } from '@/components/ui/spinner'
import { Input } from '@/components/ui/input'
import { Search, BarChart3, FileText, Mic, ArrowLeft, Trash2, Palette, Crop, RotateCw, CheckCircle, X, Loader } from 'lucide-react'
import ModuleCustomizeSheet, { ICON_MAP } from '@/components/ModuleCustomizeSheet'
import { getCroppedImage } from '@/services/imageCrop'

import { moduleService } from '@/services/moduleService'
import { flashcardService } from '@/services/flashcardService'

function FlashcardCard({ flashcard, onVoiceQuiz, onTextQuiz, onDelete, isDeleting, onSaveImage }) {
  const score = flashcard.knowledgeScore || 0
  const variant = score >= 70 ? 'success' : score >= 40 ? 'warning' : 'error'
  const color = score >= 70 ? 'bg-success' : score >= 40 ? 'bg-warning' : 'bg-error'
  const [showCrop, setShowCrop] = useState(false)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [isSaving, setIsSaving] = useState(false)

  const onCropComplete = useCallback((_, pixels) => {
    setCroppedAreaPixels(pixels)
  }, [])

  const handleApplyCrop = async () => {
    if (!flashcard.sourceImageUrl || !croppedAreaPixels) return
    setIsSaving(true)
    try {
      const file = await getCroppedImage(flashcard.sourceImageUrl, croppedAreaPixels)
      await onSaveImage(flashcard.id, file)
      setShowCrop(false)
    } catch (err) {
      console.error('Crop failed:', err)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <Card className="mb-3 transition-all">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Badge variant={variant}>{score}%</Badge>
              <span className="text-xs text-text-muted">Knowledge Score</span>
            </div>
          </div>

          {flashcard.sourceImageUrl && (
            <div className="rounded-xl overflow-hidden bg-bg-muted relative group">
              <img 
                src={flashcard.sourceImageUrl} 
                alt="Flashcard" 
                loading="lazy"
                className="w-full max-w-md mx-auto"
              />
              <button
                onClick={() => setShowCrop(true)}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center md:opacity-0 md:group-hover:opacity-100 transition-opacity shadow-sm hover:bg-white"
              >
                <Crop className="w-4 h-4 text-[#111]" />
              </button>
            </div>
          )}

          <Progress value={score} indicatorClassName={color} className="mt-3" />

          {flashcard.reviewCount > 0 && (
            <div className="flex gap-3 mt-3 text-xs text-text-secondary">
              <span>Reviews: <strong>{flashcard.reviewCount}</strong></span>
              <span className="text-success">&#10003; {flashcard.correctCount || 0}</span>
              <span className="text-error">&#10007; {flashcard.incorrectCount || 0}</span>
            </div>
          )}

          <div className="flex gap-2 mt-3">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 px-2 md:px-3"
              onClick={() => onVoiceQuiz?.(flashcard)}
            >
              <Mic className="w-4 h-4 shrink-0" />
              <span>Voice</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 px-2 md:px-3"
              onClick={() => onTextQuiz?.(flashcard)}
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span>Text</span>
            </Button>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => onDelete?.(flashcard)}
              disabled={isDeleting}
              className="px-2 md:px-3"
            >
              {isDeleting ? 'Deleting...' : <Trash2 className="w-4 h-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {showCrop && flashcard.sourceImageUrl && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="fixed inset-0 bg-black/60" onClick={() => setShowCrop(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-t-3xl p-6 pb-10 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-extrabold text-text-primary">Crop Image</h3>
              <button onClick={() => setShowCrop(false)} className="w-8 h-8 rounded-full bg-bg-muted flex items-center justify-center text-sm font-medium text-text-secondary">
                Done
              </button>
            </div>
            <div className="relative w-full h-[250px] md:h-[320px] rounded-2xl overflow-hidden bg-[#111] mb-4">
              <Cropper
                image={flashcard.sourceImageUrl}
                crop={crop}
                zoom={zoom}
                aspect={4 / 3}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className="flex items-center gap-3 mb-4">
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
            <Button className="w-full" size="lg" onClick={handleApplyCrop} disabled={isSaving}>
              {isSaving ? <><Loader className="w-4 h-4 animate-spin" /> Saving...</> : <><Crop className="w-4 h-4" /> Apply Crop</>}
            </Button>
          </div>
        </div>
      )}
    </>
  )
}

export default function ModuleDetailScreen({ moduleId, onBack, onNavigate }) {
  const [module, setModule] = useState(null)
  const [flashcards, setFlashcards] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCustomize, setShowCustomize] = useState(false)

  const filteredFlashcards = useMemo(() => {
    if (!searchQuery.trim()) return flashcards
    const q = searchQuery.toLowerCase()
    return flashcards.filter((card) =>
      (card.content || '').toLowerCase().includes(q)
    )
  }, [flashcards, searchQuery])

  const fetchData = useCallback(async () => {
    if (!moduleId) return
    setIsLoading(true)
    try {
      const result = await moduleService.getModuleFlashcards(moduleId)
      if (result.success) {
        setModule(result.module)
        setFlashcards(result.flashcards || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [moduleId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSaveImage = async (flashcardId, croppedFile) => {
    try {
      const uploadResult = await flashcardService.uploadImage(croppedFile)
      if (!uploadResult?.url) throw new Error('Upload failed')
      await flashcardService.updateFlashcard(flashcardId, { sourceImageUrl: uploadResult.url })
      await fetchData()
    } catch (err) {
      console.error('Failed to save cropped image:', err)
    }
  }

  const handleColorChange = async (color) => {
    setModule((prev) => ({ ...prev, color }))
    try {
      await moduleService.updateModule(moduleId, { color })
    } catch (err) {
      console.error('Failed to update color:', err)
    }
  }

  const handleIconChange = async (icon) => {
    setModule((prev) => ({ ...prev, icon }))
    try {
      await moduleService.updateModule(moduleId, { icon })
    } catch (err) {
      console.error('Failed to update icon:', err)
    }
  }

  const aggregateScore = flashcards.length > 0
    ? Math.round(flashcards.reduce((sum, c) => sum + (c.knowledgeScore || 0), 0) / flashcards.length)
    : 0
  const scoreColor = aggregateScore >= 70 ? 'bg-success' : aggregateScore >= 40 ? 'bg-warning' : 'bg-error'

  const handleDeleteFlashcard = async (flashcard) => {
    if (!confirm(`Are you sure you want to delete this flashcard? This action cannot be undone.`)) {
      return
    }

    setDeletingId(flashcard.id)
    try {
      await flashcardService.deleteFlashcard(flashcard.id)
      const result = await moduleService.getModuleFlashcards(moduleId)
      if (result.success) {
        setFlashcards(result.flashcards || [])
      }
    } catch (err) {
      console.error('Failed to delete flashcard:', err)
      alert('Failed to delete flashcard. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Spinner size="lg" />
      </div>
    )
  }

  const ModuleAvatar = ICON_MAP[module?.icon]
  const defaultColor = module?.color || '#FEE500'

  return (
    <div className="min-h-screen bg-white">
      <header className="flex items-center justify-between p-5 ">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            className="w-10 md:w-12 h-10 md:h-12 rounded-2xl flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity shrink-0"
            style={{ backgroundColor: defaultColor }}
            onClick={() => setShowCustomize(true)}
          >
            {ModuleAvatar ? (
              <ModuleAvatar className="w-5 md:w-6 h-5 md:h-6 text-[#111111]" />
            ) : (
              <span className="text-[#111111] font-extrabold text-lg md:text-xl">
                {(module?.name || 'M').charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-extrabold text-text-primary truncate">{module?.name || 'Module'}</h1>
            <p className="text-sm text-text-secondary truncate">
              {flashcards.length} card{flashcards.length !== 1 ? 's' : ''} &middot; Score: {aggregateScore}%
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="secondary" size="sm" onClick={() => setShowCustomize(true)} className="px-2 md:px-3">
            <Palette className="w-4 h-4" />
            <span className="hidden sm:inline ml-1">Customize</span>
          </Button>
          <Button variant="secondary" size="sm" onClick={onBack} className="px-2 md:px-3">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline ml-1">Back</span>
          </Button>
        </div>
      </header>

      {showCustomize && (
        <ModuleCustomizeSheet
          color={module?.color || '#FEE500'}
          icon={module?.icon || ''}
          onColorChange={handleColorChange}
          onIconChange={handleIconChange}
          onClose={() => setShowCustomize(false)}
        />
      )}

      <main className="p-4 max-w-2xl mx-auto">
        <Card className="mb-4 bg-primary border-0">
          <CardContent className="pt-5 pb-5">
            <div className="flex justify-between items-center mb-3">
              <span className="text-lg font-bold text-text-primary flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Module Knowledge Score
              </span>
              <span className="text-2xl font-bold">{aggregateScore}%</span>
            </div>
            <Progress value={aggregateScore} indicatorClassName={scoreColor} />
          </CardContent>
        </Card>

        <div className="mb-4">
          <h2 className="text-xl font-bold text-text-primary mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Flashcards
            {searchQuery.trim() && (
              <span className="text-sm font-normal text-text-secondary">
                ({filteredFlashcards.length} of {flashcards.length} {filteredFlashcards.length === 1 ? 'card' : 'cards'})
              </span>
            )}
          </h2>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input
              type="text"
              placeholder="Search flashcards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {filteredFlashcards.length === 0 ? (
            <div className="py-10 text-center bg-bg-muted rounded-2xl">
              <Search className="w-10 h-10 text-text-muted mx-auto mb-3" />
              <p className="text-text-secondary">
                {flashcards.length === 0
                  ? 'No flashcards in this module yet.'
                  : 'No cards match your search.'}
              </p>
            </div>
          ) : (
            filteredFlashcards.map((card) => (
              <FlashcardCard
                key={card.id}
                flashcard={card}
                onVoiceQuiz={(card) => onNavigate?.('voice_quiz', moduleId, card, module?.name)}
                onTextQuiz={(card) => onNavigate?.('text_quiz', moduleId, card, module?.name)}
                onDelete={handleDeleteFlashcard}
                isDeleting={deletingId === card.id}
                onSaveImage={handleSaveImage}
              />
            ))
          )}
        </div>
      </main>
    </div>
  )
}
