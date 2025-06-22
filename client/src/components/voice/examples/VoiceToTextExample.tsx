import React, { useState } from 'react';
import { VoiceToText } from '../VoiceToText';
import { TranscriptionResult } from '../TranscriptionDisplay';

/**
 * Example component demonstrating how to use the VoiceToText component
 * This shows the complete integration of voice recording and transcription
 */
export const VoiceToTextExample: React.FC = () => {
  const [savedTranscriptions, setSavedTranscriptions] = useState<TranscriptionResult[]>([]);
  const [currentSettings, setCurrentSettings] = useState({
    language: 'en',
    service: 'whisper' as 'whisper' | 'web-speech',
    autoTranscribe: true,
    maxDuration: 120
  });

  /**
   * Handle successful transcription
   */
  const handleTranscriptionComplete = (result: TranscriptionResult) => {
    console.log('Transcription completed:', result);
    
    // Save to history
    setSavedTranscriptions(prev => [
      {
        ...result,
        timestamp: new Date().toISOString()
      } as TranscriptionResult & { timestamp: string },
      ...prev.slice(0, 9) // Keep last 10 transcriptions
    ]);
    
    // Here you could also:
    // - Send to parent component
    // - Save to local storage
    // - Send to API for storage
    // - Trigger other actions based on the transcription
  };

  /**
   * Handle transcription errors
   */
  const handleTranscriptionError = (error: string) => {
    console.error('Transcription error:', error);
    // Here you could:
    // - Show toast notification
    // - Log to error tracking service
    // - Provide user guidance
  };

  /**
   * Clear all saved transcriptions
   */
  const clearHistory = () => {
    setSavedTranscriptions([]);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Voice-to-Text Demo
        </h1>
        <p className="text-gray-600">
          Record audio and convert it to text using AI transcription
        </p>
      </div>

      {/* Settings Panel */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Settings</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Language
            </label>
            <select
              value={currentSettings.language}
              onChange={(e) => setCurrentSettings(prev => ({ ...prev, language: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="auto-detect">Auto-detect</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Service
            </label>
            <select
              value={currentSettings.service}
              onChange={(e) => setCurrentSettings(prev => ({ ...prev, service: e.target.value as 'whisper' | 'web-speech' }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="whisper">OpenAI Whisper</option>
              <option value="web-speech">Web Speech API</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Duration (s)
            </label>
            <select
              value={currentSettings.maxDuration}
              onChange={(e) => setCurrentSettings(prev => ({ ...prev, maxDuration: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={30}>30 seconds</option>
              <option value={60}>1 minute</option>
              <option value={120}>2 minutes</option>
              <option value={300}>5 minutes</option>
            </select>
          </div>

          <div className="flex items-center pt-6">
            <input
              type="checkbox"
              id="auto-transcribe"
              checked={currentSettings.autoTranscribe}
              onChange={(e) => setCurrentSettings(prev => ({ ...prev, autoTranscribe: e.target.checked }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="auto-transcribe" className="ml-2 text-sm text-gray-700">
              Auto-transcribe
            </label>
          </div>
        </div>
      </div>

      {/* Main Voice-to-Text Component */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <VoiceToText
          onTranscriptionComplete={handleTranscriptionComplete}
          onTranscriptionError={handleTranscriptionError}
          defaultLanguage={currentSettings.language}
          defaultService={currentSettings.service}
          maxRecordingDuration={currentSettings.maxDuration}
          autoTranscribe={currentSettings.autoTranscribe}
          enableFallback={true}
          className="w-full"
        />
      </div>

      {/* Transcription History */}
      {savedTranscriptions.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              Transcription History ({savedTranscriptions.length})
            </h2>
            <button
              onClick={clearHistory}
              className="px-3 py-1 text-sm bg-gray-500 hover:bg-gray-600 text-white rounded-md transition-colors duration-200"
            >
              Clear History
            </button>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {savedTranscriptions.map((transcription, index) => (
              <div
                key={index}
                className="p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                      {transcription.service}
                    </span>
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                      {transcription.language}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      transcription.confidence >= 0.8 
                        ? 'bg-green-100 text-green-800'
                        : transcription.confidence >= 0.6
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {Math.round(transcription.confidence * 100)}% confident
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date((transcription as any).timestamp).toLocaleTimeString()}
                  </div>
                </div>
                
                <p className="text-gray-900 text-sm leading-relaxed">
                  {transcription.text}
                </p>
                
                {transcription.fallbackUsed && (
                  <div className="mt-2 text-xs text-yellow-600">
                    ⚠️ Fallback service was used
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Usage Instructions */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">
          How to Use
        </h3>
        <div className="space-y-2 text-sm text-blue-800">
          <p>• Click the record button or hold <kbd className="px-1 py-0.5 bg-blue-100 rounded text-xs">Space</kbd> to start recording</p>
          <p>• Speak clearly into your microphone</p>
          <p>• Click stop or release <kbd className="px-1 py-0.5 bg-blue-100 rounded text-xs">Space</kbd> to end recording</p>
          <p>• Transcription will appear automatically (if auto-transcribe is enabled)</p>
          <p>• Use the settings above to customize language and service preferences</p>
        </div>
      </div>
    </div>
  );
};

export default VoiceToTextExample;