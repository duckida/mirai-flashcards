import { apiClient } from './apiClient'

/**
 * Audio utility: Convert Float32Array to PCM16 Int16Array.
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
   * Start Gemini Live session using @google/genai with ephemeral token.
   * Streams PCM audio directly to Gemini and plays back native audio.
   */
  async startGeminiSession(config, callbacks) {
    const OUTPUT_SAMPLE_RATE = 24000

    // Fetch Gemini connection info from backend
    const geminiResp = await apiClient.get('/api/quiz/gemini-live')
    const geminiApiKey = geminiResp.apiKey
    const model = geminiResp.model

    let ws = null
    let stream = null
    let isMuted = false
    let sessionId = `gemini-${Date.now()}`
    let outputAudioContext = null

    // Audio playback with precise scheduling for seamless output
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

      // Concatenate all accumulated samples
      const totalLength = audioAccumulator.reduce((sum, arr) => sum + arr.length, 0)
      const combined = new Int16Array(totalLength)
      let offset = 0
      for (const chunk of audioAccumulator) {
        combined.set(chunk, offset)
        offset += chunk.length
      }
      audioAccumulator = []

      // Convert to AudioBuffer
      const audioBuffer = outputAudioContext.createBuffer(1, combined.length, OUTPUT_SAMPLE_RATE)
      const channelData = audioBuffer.getChannelData(0)
      for (let i = 0; i < combined.length; i++) {
        channelData[i] = combined[i] / 32768.0
      }

      const source = outputAudioContext.createBufferSource()
      source.buffer = audioBuffer
      source.connect(outputAudioContext.destination)

      // Schedule seamlessly — no gaps between chunks
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
      // Flush when we've accumulated ~200ms of audio (4800 samples at 24kHz)
      const totalSamples = audioAccumulator.reduce((sum, arr) => sum + arr.length, 0)
      if (totalSamples >= OUTPUT_SAMPLE_RATE * 0.2) {
        flushAudioBuffer()
      }
    }

    // Start microphone capture using MediaRecorder (reliable in all browsers)
    const startAudioCapture = () => {
      navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      }).then((mediaStream) => {
        stream = mediaStream

        // Use MediaRecorder to capture audio chunks
        const recorder = new MediaRecorder(mediaStream, {
          mimeType: 'audio/webm;codecs=opus',
        })

        recorder.ondataavailable = async (e) => {
          if (e.data.size === 0 || isMuted || !ws || ws.readyState !== WebSocket.OPEN) return

          // Decode WebM/Opus to PCM 16kHz using AudioContext
          const arrayBuffer = await e.data.arrayBuffer()
          const decodeCtx = new AudioContext({ sampleRate: 16000 })

          try {
            const audioBuffer = await decodeCtx.decodeAudioData(arrayBuffer)
            const channelData = audioBuffer.getChannelData(0)
            const pcm16 = floatTo16BitPCM(channelData)
            const base64 = arrayBufferToBase64(pcm16.buffer)

            ws.send(JSON.stringify({
              realtimeInput: {
                mediaChunks: [{
                  mimeType: 'audio/pcm;rate=16000',
                  data: base64,
                }],
              },
            }))
          } catch (err) {
            // Decode error, skip this chunk
          } finally {
            decodeCtx.close()
          }
        }

        // Collect audio every 500ms
        recorder.start(500)
        console.log('[Gemini] MediaRecorder started at 16kHz')
      }).catch((err) => {
        console.error('[Gemini] Mic access error:', err)
      })
    }

    // Connect to Gemini Live via raw WebSocket with API key
    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${geminiApiKey}`

    return new Promise((resolve, reject) => {
      ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        console.log('[Gemini] WebSocket open, sending setup...')

        // Send setup message with model config
        ws.send(JSON.stringify({
          setup: {
            model,
            generation_config: {
              response_modalities: ['AUDIO'],
              speech_config: {
                voice_config: {
                  prebuilt_voice_config: { voice_name: 'Zephyr' },
                },
                language_code: 'en-US',
              },
            },
          },
        }))
      }

      ws.onmessage = async (event) => {
        // Handle binary/Blob messages - try parsing as JSON first, treat as audio if not
        if (event.data instanceof Blob) {
          const text = await event.data.text()
          try {
            const msg = JSON.parse(text)
            handleJsonMessage(msg)
            return
          } catch (e) {
            // Not JSON - treat as raw audio bytes
            const arrayBuffer = await event.data.arrayBuffer()
            const int16 = new Int16Array(arrayBuffer)
            queueAudioChunk(int16)
            return
          }
        }

        // Handle text (JSON) messages
        try {
          const msg = JSON.parse(event.data)
          handleJsonMessage(msg)
        } catch (err) {
          console.error('[Gemini] Parse error:', err)
        }
      }

      const handleJsonMessage = (msg) => {
        // Session ready
        if (msg.setupComplete) {
          console.log('[Gemini] Session ready')
          callbacks.onConnect?.()
          callbacks.onModeChange?.('listening')
          startAudioCapture()
          resolve(sessionObj)
          return
        }

        // Server content
        if (msg.serverContent) {
          const sc = msg.serverContent

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

          // Input transcription
          if (sc.inputTranscription?.text) {
            callbacks.onMessage?.({
              type: 'user-message',
              text: sc.inputTranscription.text,
            })
          }

          // Output transcription
          if (sc.outputTranscription?.text) {
            callbacks.onMessage?.({
              type: 'agent-message',
              text: sc.outputTranscription.text,
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
            // Ready for next turn
          }
        }

        // Go away / error
        if (msg.goAway) {
          console.warn('[Gemini] Server go-away')
        }
      }

      ws.onerror = (err) => {
        console.error('[Gemini] WebSocket error:', err)
        callbacks.onError?.(err)
        reject(new Error('Gemini WebSocket connection failed'))
      }

      ws.onclose = (event) => {
        console.log('[Gemini] WebSocket closed:', event.code, event.reason)
        callbacks.onDisconnect?.()
      }

      // Session control object
      var sessionObj = {
        provider: 'gemini',
        endSession: () => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ clientContent: { turns: [], turnComplete: true } }))
            ws.close()
          }
          if (stream) stream.getTracks().forEach((t) => t.stop())
          if (outputAudioContext) outputAudioContext.close()
          ws = null
        },
        sendMessage: (msg) => {
          if (!ws || ws.readyState !== WebSocket.OPEN) return
          ws.send(JSON.stringify({
            clientContent: {
              turns: [{ role: 'user', parts: [{ text: msg }] }],
              turnComplete: true,
            },
          }))
          callbacks.onMessage?.({ type: 'user-message', text: msg })
        },
        sendContextualUpdate: (ctx) => {
          if (!ws || ws.readyState !== WebSocket.OPEN || !ctx) return
          ws.send(JSON.stringify({
            clientContent: {
              turns: [{ role: 'user', parts: [{ text: `[Context: ${ctx}]` }] }],
              turnComplete: true,
            },
          }))
        },
        setMicMuted: (muted) => {
          isMuted = muted
        },
        sendFeedback: () => {
          console.warn('Feedback not supported by Gemini provider')
        },
        getId: () => sessionId,
      }
    })
  },
}
