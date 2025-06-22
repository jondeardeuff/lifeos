import React, { useState, useCallback } from 'react';
import { VoiceRecorder } from './VoiceRecorder';
import { TranscriptionDisplay, TranscriptionResult } from './TranscriptionDisplay';
import { useTranscription, TranscriptionOptions } from './hooks/useTranscription';

export interface VoiceToTextProps {
  onTranscriptionComplete?: (result: TranscriptionResult) => void;
  onTranscriptionError?: (error: string) => void;
  defaultLanguage?: string;
  defaultService?: 'whisper' | 'web-speech';
  enableFallback?: boolean;
  maxRecordingDuration?: number;
  autoTranscribe?: boolean;
  className?: string;
  disabled?: boolean;
}

/**
 * Complete Voice-to-Text component that combines recording and transcription
 * This is the main component users will interact with for speech-to-text functionality
 */
export const VoiceToText: React.FC<VoiceToTextProps> = ({
  onTranscriptionComplete,
  onTranscriptionError,
  defaultLanguage = 'en',
  defaultService = 'whisper',
  enableFallback = true,
  maxRecordingDuration = 120,
  autoTranscribe = true,
  className = '',
  disabled = false
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState(defaultLanguage);
  const [selectedService, setSelectedService] = useState<'whisper' | 'web-speech'>(defaultService);
  const [lastRecordedAudio, setLastRecordedAudio] = useState<Blob | null>(null);

  const transcription = useTranscription({
    defaultLanguage: selectedLanguage,
    defaultService: selectedService,
    enableFallback,
    onTranscriptionComplete,
    onTranscriptionError
  });

  /**
   * Handle recording completion
   */
  const handleRecordingComplete = useCallback(async (audioBlob: Blob) => {
    setLastRecordedAudio(audioBlob);
    
    if (autoTranscribe) {
      const options: TranscriptionOptions = {
        language: selectedLanguage,
        preferredService: selectedService,
        enableFallback
      };
      
      try {
        await transcription.transcribe(audioBlob, options);
      } catch (error) {
        console.error('Auto-transcription failed:', error);
      }
    }
  }, [autoTranscribe, selectedLanguage, selectedService, enableFallback, transcription.transcribe]);

  /**
   * Handle manual transcription (for when autoTranscribe is false)
   */
  const handleManualTranscribe = useCallback(async () => {
    if (!lastRecordedAudio) return;

    const options: TranscriptionOptions = {
      language: selectedLanguage,
      preferredService: selectedService,
      enableFallback
    };

    try {
      await transcription.transcribe(lastRecordedAudio, options);
    } catch (error) {
      console.error('Manual transcription failed:', error);
    }
  }, [lastRecordedAudio, selectedLanguage, selectedService, enableFallback, transcription.transcribe]);

  /**
   * Handle alternative selection from TranscriptionDisplay
   */
  const handleSelectAlternative = useCallback((alternativeText: string) => {
    if (transcription.transcriptionResult) {
      const updatedResult: TranscriptionResult = {
        ...transcription.transcriptionResult,
        text: alternativeText
      };
      onTranscriptionComplete?.(updatedResult);
    }
  }, [transcription.transcriptionResult, onTranscriptionComplete]);

  /**
   * Clear everything and start fresh
   */
  const handleClearAll = useCallback(() => {
    transcription.clearTranscription();
    transcription.clearError();
    setLastRecordedAudio(null);
  }, [transcription.clearTranscription, transcription.clearError]);

  return (
    <div className={`voice-to-text ${className}`}>
      <div className="space-y-6">
        {/* Settings Panel */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Transcription Settings</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Language Selection */}
            <div>
              <label htmlFor="language-select" className="block text-xs font-medium text-gray-600 mb-1">
                Language
              </label>
              <select
                id="language-select"
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={disabled || transcription.isTranscribing}
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="auto-detect">Auto-detect</option>
              </select>
            </div>

            {/* Service Selection */}
            <div>
              <label htmlFor="service-select" className="block text-xs font-medium text-gray-600 mb-1">
                Service
              </label>
              <select
                id="service-select"
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value as 'whisper' | 'web-speech')}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={disabled || transcription.isTranscribing}
              >
                <option value="whisper">OpenAI Whisper (Recommended)</option>
                <option value="web-speech">Web Speech API</option>
              </select>
            </div>
          </div>

          {/* Auto-transcribe Toggle */}
          <div className="mt-3 flex items-center">
            <input
              type="checkbox"
              id="auto-transcribe"
              checked={autoTranscribe}
              onChange={(e) => {
                // This would need to be handled by parent component
                // since autoTranscribe is a prop
              }}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              disabled={disabled}
            />
            <label htmlFor="auto-transcribe" className="ml-2 text-xs text-gray-600">
              Automatically transcribe after recording
            </label>
          </div>
        </div>

        {/* Voice Recorder */}
        <VoiceRecorder
          onRecordingComplete={handleRecordingComplete}
          maxDuration={maxRecordingDuration}
          disabled={disabled || transcription.isTranscribing}
          className="w-full"
        />

        {/* Manual Transcribe Button (shown when autoTranscribe is false and we have audio) */}
        {!autoTranscribe && lastRecordedAudio && !transcription.transcriptionResult && (
          <div className="text-center">
            <button
              onClick={handleManualTranscribe}
              disabled={transcription.isTranscribing || disabled}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-md transition-colors duration-200"
            >
              {transcription.isTranscribing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Transcribing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Transcribe Audio
                </>
              )}
            </button>
          </div>
        )}

        {/* Transcription Display */}
        <TranscriptionDisplay
          isTranscribing={transcription.isTranscribing}
          transcription={transcription.transcriptionResult}
          error={transcription.error}
          onRetry={transcription.retryTranscription}
          onSelectAlternative={handleSelectAlternative}
          onClear={transcription.clearTranscription}
          className="w-full"
        />

        {/* Action Buttons */}
        {(transcription.transcriptionResult || transcription.error || lastRecordedAudio) && (
          <div className="flex justify-center space-x-3">
            <button
              onClick={handleClearAll}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white text-sm font-medium rounded-md transition-colors duration-200"
              disabled={transcription.isTranscribing}
            >
              Clear All
            </button>
            
            {transcription.transcriptionResult && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(transcription.transcriptionResult!.text);
                }}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors duration-200"
              >
                Copy Text
              </button>
            )}
          </div>
        )}

        {/* Debug Info (development only) */}
        {process.env.NODE_ENV === 'development' && transcription.healthStatus && (
          <details className="text-xs text-gray-500">
            <summary className="cursor-pointer">Debug Info</summary>
            <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
              {JSON.stringify({
                selectedLanguage,
                selectedService,
                hasAudio: !!lastRecordedAudio,
                audioSize: lastRecordedAudio ? `${(lastRecordedAudio.size / 1024).toFixed(2)}KB` : null,
                healthStatus: transcription.healthStatus
              }, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
};

export default VoiceToText;