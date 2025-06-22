import { useState, useCallback, useRef } from 'react';
import { TranscriptionResult } from '../TranscriptionDisplay';

export interface TranscriptionOptions {
  language?: string;
  preferredService?: 'whisper' | 'web-speech';
  enableFallback?: boolean;
}

export interface UseTranscriptionOptions {
  defaultLanguage?: string;
  defaultService?: 'whisper' | 'web-speech';
  enableFallback?: boolean;
  onTranscriptionComplete?: (result: TranscriptionResult) => void;
  onTranscriptionError?: (error: string) => void;
}

export interface UseTranscriptionReturn {
  transcribe: (audioBlob: Blob, options?: TranscriptionOptions) => Promise<TranscriptionResult>;
  isTranscribing: boolean;
  transcriptionResult: TranscriptionResult | null;
  error: string | null;
  clearTranscription: () => void;
  clearError: () => void;
  retryTranscription: () => Promise<TranscriptionResult | null>;
  supportedLanguages: string[];
  healthStatus: any;
}

/**
 * React hook for managing speech-to-text transcription
 * Integrates with the VoiceRecorder component and transcription API
 */
export const useTranscription = (options: UseTranscriptionOptions = {}): UseTranscriptionReturn => {
  const {
    defaultLanguage = 'en',
    defaultService = 'whisper',
    enableFallback = true,
    onTranscriptionComplete,
    onTranscriptionError
  } = options;

  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionResult, setTranscriptionResult] = useState<TranscriptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [supportedLanguages, setSupportedLanguages] = useState<string[]>(['en', 'es']);
  const [healthStatus, setHealthStatus] = useState<any>(null);

  // Keep reference to last transcription parameters for retry
  const lastTranscriptionRef = useRef<{
    audioBlob: Blob;
    options: TranscriptionOptions;
  } | null>(null);

  /**
   * Get auth token from localStorage or context
   */
  const getAuthToken = useCallback((): string | null => {
    try {
      return localStorage.getItem('accessToken') || localStorage.getItem('authToken');
    } catch {
      return null;
    }
  }, []);

  /**
   * Create headers for API requests
   */
  const createHeaders = useCallback((includeContentType = false): Record<string, string> => {
    const headers: Record<string, string> = {};
    
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    if (includeContentType) {
      headers['Content-Type'] = 'application/json';
    }
    
    return headers;
  }, [getAuthToken]);

  /**
   * Fetch supported languages from the API
   */
  const fetchSupportedLanguages = useCallback(async (): Promise<string[]> => {
    try {
      const response = await fetch('/api/transcribe/languages', {
        headers: createHeaders()
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch languages: ${response.statusText}`);
      }

      const data = await response.json();
      const languages = data.data?.recommended || data.data || ['en', 'es'];
      setSupportedLanguages(languages);
      return languages;
    } catch (error) {
      console.warn('Failed to fetch supported languages:', error);
      return ['en', 'es']; // fallback
    }
  }, [createHeaders]);

  /**
   * Check transcription service health
   */
  const checkHealth = useCallback(async () => {
    try {
      const response = await fetch('/api/transcribe/health', {
        headers: createHeaders()
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.statusText}`);
      }

      const health = await response.json();
      setHealthStatus(health);
      return health;
    } catch (error) {
      console.warn('Transcription health check failed:', error);
      return null;
    }
  }, [createHeaders]);

  /**
   * Main transcription function
   */
  const transcribe = useCallback(async (
    audioBlob: Blob,
    transcriptionOptions: TranscriptionOptions = {}
  ): Promise<TranscriptionResult> => {
    const options = {
      language: defaultLanguage,
      preferredService: defaultService,
      enableFallback,
      ...transcriptionOptions
    };

    // Store for retry functionality
    lastTranscriptionRef.current = { audioBlob, options };

    setIsTranscribing(true);
    setError(null);

    try {
      // Validate audio blob
      if (!audioBlob || audioBlob.size === 0) {
        throw new Error('Invalid audio file: empty or missing');
      }

      // Check file size (25MB limit)
      const maxSize = 25 * 1024 * 1024; // 25MB
      if (audioBlob.size > maxSize) {
        throw new Error(`Audio file too large: ${(audioBlob.size / 1024 / 1024).toFixed(1)}MB (max 25MB)`);
      }

      console.log(`Transcribing audio: ${(audioBlob.size / 1024).toFixed(2)}KB, ${audioBlob.type}, ${options.language}`);

      // Create form data for file upload
      const formData = new FormData();
      formData.append('audio', audioBlob, `recording_${Date.now()}.webm`);
      
      if (options.language) {
        formData.append('language', options.language);
      }
      
      if (options.preferredService) {
        formData.append('preferredService', options.preferredService);
      }

      // Make API request
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: createHeaders(false), // Don't set Content-Type for FormData
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || `Transcription failed: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      const responseData = await response.json();
      
      if (!responseData.success || !responseData.data) {
        throw new Error(responseData.message || 'Invalid response from transcription service');
      }

      const result: TranscriptionResult = responseData.data;
      
      // Validate transcription result
      if (!result.text && !result.fallbackUsed) {
        throw new Error('No transcription text received');
      }

      setTranscriptionResult(result);
      onTranscriptionComplete?.(result);

      console.log('Transcription completed:', {
        text: result.text?.substring(0, 50) + '...',
        confidence: result.confidence,
        service: result.service,
        fallbackUsed: result.fallbackUsed
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Transcription failed';
      console.error('Transcription error:', errorMessage);
      
      setError(errorMessage);
      onTranscriptionError?.(errorMessage);
      
      throw error;
    } finally {
      setIsTranscribing(false);
    }
  }, [
    defaultLanguage, 
    defaultService, 
    enableFallback, 
    createHeaders, 
    onTranscriptionComplete, 
    onTranscriptionError
  ]);

  /**
   * Retry the last transcription
   */
  const retryTranscription = useCallback(async (): Promise<TranscriptionResult | null> => {
    if (!lastTranscriptionRef.current) {
      setError('No previous transcription to retry');
      return null;
    }

    const { audioBlob, options } = lastTranscriptionRef.current;
    
    try {
      return await transcribe(audioBlob, options);
    } catch (error) {
      console.error('Retry transcription failed:', error);
      return null;
    }
  }, [transcribe]);

  /**
   * Clear current transcription result
   */
  const clearTranscription = useCallback(() => {
    setTranscriptionResult(null);
    setError(null);
  }, []);

  /**
   * Clear current error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    transcribe,
    isTranscribing,
    transcriptionResult,
    error,
    clearTranscription,
    clearError,
    retryTranscription,
    supportedLanguages,
    healthStatus,
    // Utility methods
    fetchSupportedLanguages,
    checkHealth
  } as UseTranscriptionReturn & {
    fetchSupportedLanguages: () => Promise<string[]>;
    checkHealth: () => Promise<any>;
  };
};

/**
 * Higher-order hook that combines VoiceRecorder and Transcription
 * Provides a complete voice-to-text solution
 */
export interface UseVoiceToTextOptions extends UseTranscriptionOptions {
  maxRecordingDuration?: number;
  autoTranscribe?: boolean;
}

export interface UseVoiceToTextReturn {
  // Recording state
  isRecording: boolean;
  recordingTime: number;
  audioLevels: number[];
  
  // Transcription state
  isTranscribing: boolean;
  transcriptionResult: TranscriptionResult | null;
  error: string | null;
  
  // Actions
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  transcribeAudio: (audioBlob: Blob, options?: TranscriptionOptions) => Promise<TranscriptionResult>;
  clearTranscription: () => void;
  retryTranscription: () => Promise<TranscriptionResult | null>;
  
  // Voice recorder props
  voiceRecorderProps: {
    onRecordingComplete: (audioBlob: Blob) => void;
    onRecordingStart?: () => void;
    onRecordingStop?: () => void;
    maxDuration?: number;
  };
  
  // Transcription display props
  transcriptionDisplayProps: {
    isTranscribing: boolean;
    transcription: TranscriptionResult | null;
    error: string | null;
    onRetry: () => Promise<TranscriptionResult | null>;
    onClear: () => void;
  };
}

export const useVoiceToText = (options: UseVoiceToTextOptions = {}): UseVoiceToTextReturn => {
  const {
    maxRecordingDuration = 120,
    autoTranscribe = true,
    ...transcriptionOptions
  } = options;

  const [recordingState, setRecordingState] = useState({
    isRecording: false,
    recordingTime: 0,
    audioLevels: [] as number[]
  });

  const transcription = useTranscription(transcriptionOptions);

  /**
   * Handle completed recording
   */
  const handleRecordingComplete = useCallback(async (audioBlob: Blob) => {
    if (autoTranscribe) {
      try {
        await transcription.transcribe(audioBlob);
      } catch (error) {
        console.error('Auto-transcription failed:', error);
      }
    }
  }, [autoTranscribe, transcription.transcribe]);

  /**
   * Mock recording functions (would be replaced by actual useAudioRecorder hook)
   */
  const startRecording = useCallback(async () => {
    setRecordingState(prev => ({ ...prev, isRecording: true }));
  }, []);

  const stopRecording = useCallback(() => {
    setRecordingState(prev => ({ ...prev, isRecording: false }));
  }, []);

  return {
    // Recording state
    isRecording: recordingState.isRecording,
    recordingTime: recordingState.recordingTime,
    audioLevels: recordingState.audioLevels,
    
    // Transcription state
    isTranscribing: transcription.isTranscribing,
    transcriptionResult: transcription.transcriptionResult,
    error: transcription.error,
    
    // Actions
    startRecording,
    stopRecording,
    transcribeAudio: transcription.transcribe,
    clearTranscription: transcription.clearTranscription,
    retryTranscription: transcription.retryTranscription,
    
    // Props for components
    voiceRecorderProps: {
      onRecordingComplete: handleRecordingComplete,
      maxDuration: maxRecordingDuration
    },
    
    transcriptionDisplayProps: {
      isTranscribing: transcription.isTranscribing,
      transcription: transcription.transcriptionResult,
      error: transcription.error,
      onRetry: transcription.retryTranscription,
      onClear: transcription.clearTranscription
    }
  };
};