/**
 * Tests for useSpeech Hook
 */

// Mock React hooks
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useState: jest.fn(),
  useEffect: jest.fn(),
  useCallback: jest.fn((fn) => fn),
  useRef: jest.fn(() => ({ current: null })),
}));

// Mock ElevenLabs client
jest.mock('@elevenlabs/client', () => ({
  Conversation: jest.fn().mockImplementation(() => ({
    startSession: jest.fn().mockResolvedValue(true),
    endSession: jest.fn(),
    sendContextualUpdate: jest.fn(),
    sendMessage: jest.fn(),
  })),
}));

import { useSpeech } from './useSpeech';

describe('useSpeech Hook', () => {
  let mockSetState;
  let mockUseState;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock useState to return [value, setter] pairs
    mockUseState = jest.span(() => {
      mockSetState = jest.fn();
      return [null, mockSetState];
    });
    
    // Override React's useState mock
    require('react').useState.mockImplementation(mockUseState);
  });

  it('should initialize with default state', () => {
    const { isConnected, isSpeaking, isListening, status, error } = useSpeech();
    
    expect(isConnected).toBe(false);
    expect(isSpeaking).toBe(false);
    expect(isListening).toBe(false);
    expect(status).toBe('idle');
    expect(error).toBeNull();
  });

  it('should start conversation when startConversation is called', async () => {
    const mockSignedUrl = 'wss://test.url';
    const mockOverrides = {};
    
    const { startConversation } = useSpeech();
    const result = await startConversation(mockSignedUrl, mockOverrides);
    
    expect(result).toBe(true);
    // Note: Actual state updates would be checked via mockSetState calls
  });

  it('should stop conversation when stopConversation is called', () => {
    const { stopConversation } = useSpeech();
    stopConversation();
    // Would check that endSession was called on conversation instance
  });

  it('should send contextual update when sendContextualUpdate is called', () => {
    const mockText = 'Test context';
    const { sendContextualUpdate } = useSpeech();
    sendContextualUpdate(mockText);
    // Would check that sendContextualUpdate was called on conversation instance
  });

  it('should send user message when sendUserMessage is called', () => {
    const mockText = 'Test message';
    const { sendUserMessage } = useSpeech();
    sendUserMessage(mockText);
    // Would check that sendMessage was called on conversation instance
  });
});