/**
 * useSpeech Hook
 *
 * React hook for ElevenLabs speech integration.
 * Manages conversation lifecycle, microphone access, and speech events.
 */

const { useState, useEffect, useCallback, useRef } = require('react');
// Import ElevenLabs client - assuming it's available via window or imported
let ElevenLabsClient = null;

try {
  // Try to import the ElevenLabs client (may not work in all environments)
  ElevenLabsClient = require('@elevenlabs/client');
} catch (error) {
  console.warn('@elevenlabs/client not available in this environment');
}

function useSpeech() {
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [agentMessage, setAgentMessage] = useState('');
  const [status, setStatus] = useState('idle'); // idle, connecting, connected, error, disconnected
  const [error, setError] = useState(null);

  const conversationRef = useRef(null);
  const microphoneRef = useRef(null);

  /**
   * Initialize microphone access
   * @returns {Promise<MediaStream>}
   */
  const initializeMicrophone = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      microphoneRef.current = stream;
      return stream;
    } catch (err) {
      console.error('Microphone access error:', err);
      throw new Error('Microphone access denied or not available');
    }
  }, []);

  /**
   * Start ElevenLabs conversation
   * @param {string} signedUrl - Signed WebSocket URL from ElevenLabs
   * @param {Object} overrides - Conversation configuration overrides
   */
  const startConversation = useCallback(async (signedUrl, overrides = {}) => {
    if (!ElevenLabsClient) {
      setError('ElevenLabs client not available');
      return false;
    }

    try {
      setStatus('connecting');
      
      // Initialize microphone
      await initializeMicrophone();

      // Create conversation instance
      const conversation = new ElevenLabsClient.Conversation({
        url: signedUrl,
        // Optional: override default settings
        ...overrides,
        // Event handlers
        onMessage: (message) => {
          // Handle incoming messages from agent
          if (message.type === 'agent_message') {
            setAgentMessage(message.message);
            setIsSpeaking(true);
          } else if (message.type === 'user_transcript') {
            setTranscript(message.transcript);
            setIsListening(false);
          }
        },
        onStatusChange: (status) => {
          // Handle connection status changes
          if (status === 'connected') {
            setIsConnected(true);
            setStatus('connected');
            setError(null);
          } else if (status === 'disconnected') {
            setIsConnected(false);
            setStatus('disconnected');
          }
        },
        onError: (err) => {
          console.error('ElevenLabs error:', err);
          setError(err.message || 'Unknown error');
          setStatus('error');
          setIsConnected(false);
        }
      });

      // Start the conversation
      await conversation.startSession();
      conversationRef.current = conversation;
      
      return true;
    } catch (err) {
      console.error('Failed to start conversation:', err);
      setError(err.message || 'Failed to start speech session');
      setStatus('error');
      return false;
    }
  }, [initializeMicrophone]);

  /**
   * Stop ElevenLabs conversation
   */
  const stopConversation = useCallback(() => {
    if (conversationRef.current) {
      try {
        conversationRef.current.endSession();
      } catch (err) {
        console.error('Error ending conversation:', err);
      } finally {
        conversationRef.current = null;
        setIsConnected(false);
        setIsSpeaking(false);
        setIsListening(false);
        setStatus('idle');
        
        // Clean up microphone
        if (microphoneRef.current) {
          microphoneRef.current.getTracks().forEach(track => track.stop());
          microphoneRef.current = null;
        }
      }
    }
  }, []);

  /**
   * Send contextual update to the agent
   * @param {string} text - Contextual information to send
   */
  const sendContextualUpdate = useCallback((text) => {
    if (conversationRef.current) {
      try {
        conversationRef.current.sendContextualUpdate(text);
      } catch (err) {
        console.error('Error sending contextual update:', err);
      }
    }
  }, []);

  /**
   * Send user message to the agent
   * @param {string} text - Message to send
   */
  const sendUserMessage = useCallback((text) => {
    if (conversationRef.current) {
      try {
        conversationRef.current.sendMessage(text);
      } catch (err) {
        console.error('Error sending user message:', err);
      }
    }
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      stopConversation();
    };
  }, [stopConversation]);

  return {
    isConnected,
    isSpeaking,
    isListening,
    transcript,
    agentMessage,
    status,
    error,
    startConversation,
    stopConversation,
    sendContextualUpdate,
    sendUserMessage,
  };
}

module.exports = useSpeech;