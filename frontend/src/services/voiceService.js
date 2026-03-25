import { GoogleGenAI, Modality } from '@google/genai'
import { apiClient } from './apiClient'

/**
 * Convert Float32Array to Int16 PCM.
 */
function floatTo16BitPCM(float32Array) {
  const buffer = new ArrayBuffer(float32Array.length * 2)
  const view = new DataView(buffer)
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]))
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return new Int16Array(buffer)
}

/**
 * Downsample Float32 audio from one rate to another.
 */
function downsampleBuffer(buffer, inputRate, outputRate) {
  if (outputRate >= inputRate) return buffer
  const ratio = inputRate / outputRate
  const newLength = Math.round(buffer.length / ratio)
  const result = new Float32Array(newLength)
  let offsetResult = 0
  let offsetBuffer = 0
  while (offsetResult < result.length) {
    const nextOffset = Math.round((offsetResult + 1) * ratio)
    let accum = 0
    let count = 0
    for (let i = offsetBuffer; i < nextOffset && i < buffer.length; i++) {
      accum += buffer[i]
      count++
    }
    result[offsetResult] = count > 0 ? accum / count : 0
    offsetResult++
    offsetBuffer = nextOffset
  }
  return result
}

/**
 * Encode an ArrayBuffer to base64.
 */
function arrayBufferToBase64(buffer) {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Decode base64 to Int16Array.
 */
function base64ToPCM16(base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new Int16Array(bytes.buffer)
}

export const voiceService = {
  /**
   * Get full provider configuration from backend.
   */
  async getProviderConfig() {
    const data = await apiClient.get('/api/quiz/speech-token')
    return {
      provider: data.provider,
      signedUrl: data.signedUrl,
      capabilities: data.capabilities,
      config: data.config,
      fallbackOccurred: data.fallbackOccurred,
      fallbackReason: data.fallbackReason,
    }
  },

  /**
   * Start voice session with appropriate provider.
   */
  async startSession(providerConfig, callbacks) {
    if (providerConfig.provider === 'elevenlabs') {
      return this.startElevenLabsSession(providerConfig, callbacks)
    } else if (providerConfig.provider === 'gemini') {
      return this.startGeminiSession(providerConfig, callbacks)
    } else {
      throw new Error(`Unknown provider: ${providerConfig.provider}`)
    }
  },

  /**
   * Start ElevenLabs session using @elevenlabs/client.
   */
  async startElevenLabsSession(config, callbacks) {
    const { Conversation } = await import('@elevenlabs/client')

    const conversation = await Conversation.startSession({
      signedUrl: config.signedUrl,
      connectionType: 'websocket',
      onConnect: callbacks.onConnect,
      onDisconnect: callbacks.onDisconnect,
      onMessage: callbacks.onMessage,
      onError: callbacks.onError,
      onStatusChange: callbacks.onStatusChange,
      onModeChange: callbacks.onModeChange,
      onCanSendFeedbackChange: callbacks.onCanSendFeedbackChange,
    })

    return {
      conversation,
      provider: 'elevenlabs',
      endSession: () => conversation.endSession(),
      sendMessage: (msg) => conversation.sendUserMessage(msg),
      sendContextualUpdate: (ctx) => conversation.sendContextualUpdate(ctx),
      setMicMuted: (muted) => conversation.setMicMuted(muted),
      sendFeedback: (positive) => conversation.sendFeedback(positive),
      getId: () => conversation.getId(),
    }
  },

  /**
   * Start Gemini Live session using @google/genai SDK.
   * Captures raw PCM from mic via ScriptProcessorNode and plays back 24kHz PCM output.
   */
  async startGeminiSession(config, callbacks) {
    const INPUT_SAMPLE_RATE = 16000
    const OUTPUT_SAMPLE_RATE = 24000
    const CHUNK_DURATION_MS = 100

    // Fetch Gemini API key from backend
    const geminiResp = await apiClient.get('/api/quiz/gemini-live')
    const geminiApiKey = geminiResp.apiKey
    const model = geminiResp.model

    let session = null
    let micStream = null
    let isMuted = false
    let sessionId = `gemini-${Date.now()}`
    let outputAudioContext = null
    let inputAudioContext = null
    let processorNode = null

    // Audio playback state
    let nextPlayTime = 0
    let audioAccumulator = []
    let modeChangeTimer = null

    const setMode = (mode) => {
      clearTimeout(modeChangeTimer)
      callbacks.onModeChange?.(mode)
    }

    const scheduleListeningMode = () => {
      clearTimeout(modeChangeTimer)
      modeChangeTimer = setTimeout(() => {
        if (audioAccumulator.length === 0) {
          callbacks.onModeChange?.('listening')
        }
      }, 500)
    }

    const flushAudioBuffer = () => {
      if (audioAccumulator.length === 0) return

      if (!outputAudioContext) {
        outputAudioContext = new (window.AudioContext || window.webkitAudioContext)({
          sampleRate: OUTPUT_SAMPLE_RATE,
        })
      }

      const totalLength = audioAccumulator.reduce((sum, arr) => sum + arr.length, 0)
      const combined = new Int16Array(totalLength)
      let offset = 0
      for (const chunk of audioAccumulator) {
        combined.set(chunk, offset)
        offset += chunk.length
      }
      audioAccumulator = []

      const audioBuffer = outputAudioContext.createBuffer(1, combined.length, OUTPUT_SAMPLE_RATE)
      const channelData = audioBuffer.getChannelData(0)
      for (let i = 0; i < combined.length; i++) {
        channelData[i] = combined[i] / 32768.0
      }

      const source = outputAudioContext.createBufferSource()
      source.buffer = audioBuffer
      source.connect(outputAudioContext.destination)

      const now = outputAudioContext.currentTime
      if (nextPlayTime < now) {
        nextPlayTime = now
      }
      source.start(nextPlayTime)
      nextPlayTime += audioBuffer.duration

      setMode('speaking')

      source.onended = () => {
        scheduleListeningMode()
      }
    }

    const queueAudioChunk = (pcm16) => {
      audioAccumulator.push(pcm16)
      const totalSamples = audioAccumulator.reduce((sum, arr) => sum + arr.length, 0)
      if (totalSamples >= OUTPUT_SAMPLE_RATE * 0.2) {
        flushAudioBuffer()
      }
    }

    // Start mic capture using ScriptProcessorNode for raw PCM at 16kHz
    const startAudioCapture = async () => {
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })

      inputAudioContext = new AudioContext()
      const source = inputAudioContext.createMediaStreamSource(micStream)
      const bufferSize = Math.round(inputAudioContext.sampleRate * CHUNK_DURATION_MS / 1000)
      processorNode = inputAudioContext.createScriptProcessor(bufferSize, 1, 1)

      processorNode.onaudioprocess = (e) => {
        if (isMuted || !session) return

        const inputData = e.inputBuffer.getChannelData(0)
        const downsampled = downsampleBuffer(inputData, inputAudioContext.sampleRate, INPUT_SAMPLE_RATE)
        const pcm16 = floatTo16BitPCM(downsampled)
        const base64 = arrayBufferToBase64(pcm16.buffer)

        session.sendRealtimeInput({
          audio: {
            data: base64,
            mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}`,
          },
        })
      }

      source.connect(processorNode)
      processorNode.connect(inputAudioContext.destination)
    }

    // Create Gemini SDK client and connect
    const ai = new GoogleGenAI({ apiKey: geminiApiKey })

    try {
      session = await ai.live.connect({
        model,
        callbacks: {
          onopen: () => {
            console.log('[Gemini] Session open')
          },
          onmessage: (message) => {
            const sc = message.serverContent

            if (sc) {
              // Model turn with audio parts
              if (sc.modelTurn) {
                for (const part of sc.modelTurn.parts || []) {
                  if (part.inlineData?.mimeType?.startsWith('audio/pcm')) {
                    const pcm16 = base64ToPCM16(part.inlineData.data)
                    queueAudioChunk(pcm16)
                  }
                  if (part.text) {
                    callbacks.onMessage?.({ type: 'agent-message', text: part.text })
                  }
                }
              }

              // Output transcription
              if (sc.outputTranscription?.text) {
                callbacks.onMessage?.({
                  type: 'agent-message',
                  text: sc.outputTranscription.text,
                })
              }

              // Input transcription
              if (sc.inputTranscription?.text) {
                callbacks.onMessage?.({
                  type: 'user-message',
                  text: sc.inputTranscription.text,
                })
              }

              // Interrupted
              if (sc.interrupted) {
                audioAccumulator = []
                nextPlayTime = 0
                callbacks.onModeChange?.('listening')
              }

              // Turn complete
              if (sc.turnComplete) {
                flushAudioBuffer()
              }
            }

            // Go away
            if (message.goAway) {
              console.warn('[Gemini] Server go-away:', message.goAway.timeLeft)
            }
          },
          onerror: (e) => {
            console.error('[Gemini] Error:', e.message)
            callbacks.onError?.(e)
          },
          onclose: (e) => {
            console.log('[Gemini] Closed:', e.reason)
            callbacks.onDisconnect?.()
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Zephyr' },
            },
          },
        },
      })
    } catch (err) {
      console.error('[Gemini] Failed to connect:', err)
      throw err
    }

    // Connection established
    callbacks.onConnect?.()
    callbacks.onModeChange?.('listening')

    // Start mic capture
    try {
      await startAudioCapture()
    } catch (err) {
      console.error('[Gemini] Mic capture error:', err)
      throw err
    }

    // Session control object
    return {
      provider: 'gemini',
      endSession: () => {
        try {
          session?.close()
        } catch (e) {
          // ignore
        }
        if (processorNode) {
          processorNode.disconnect()
          processorNode = null
        }
        if (inputAudioContext) {
          inputAudioContext.close()
          inputAudioContext = null
        }
        if (micStream) {
          micStream.getTracks().forEach((t) => t.stop())
          micStream = null
        }
        if (outputAudioContext) {
          outputAudioContext.close()
          outputAudioContext = null
        }
        session = null
      },
      sendMessage: (msg) => {
        if (!session) return
        session.sendClientContent({
          turns: [{ role: 'user', parts: [{ text: msg }] }],
          turnComplete: true,
        })
        callbacks.onMessage?.({ type: 'user-message', text: msg })
      },
      sendContextualUpdate: (ctx) => {
        if (!session || !ctx) return
        session.sendClientContent({
          turns: [{ role: 'user', parts: [{ text: `[Context: ${ctx}]` }] }],
          turnComplete: true,
        })
      },
      setMicMuted: (muted) => {
        isMuted = muted
      },
      sendFeedback: () => {
        console.warn('Feedback not supported by Gemini provider')
      },
      getId: () => sessionId,
    }
  },
}
