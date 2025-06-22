import React, { useState, useEffect } from 'react';

export interface TranscriptionResult {
  text: string;
  confidence: number;
  language: string;
  alternatives?: Array<{
    text: string;
    confidence: number;
  }>;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
    confidence: number;
  }>;
  duration: number;
  service: string;
  fallbackUsed?: boolean;
  fallbackInstructions?: any;
  error?: string;
}

export interface TranscriptionDisplayProps {
  isTranscribing: boolean;
  transcription: TranscriptionResult | null;
  error: string | null;
  onRetry?: () => void;
  onSelectAlternative?: (alternativeText: string) => void;
  onClear?: () => void;
  className?: string;
}

const TranscriptionDisplay: React.FC<TranscriptionDisplayProps> = ({
  isTranscribing,
  transcription,
  error,
  onRetry,
  onSelectAlternative,
  onClear,
  className = ''
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Typing animation effect
  useEffect(() => {
    if (transcription?.text && !isTyping) {
      setIsTyping(true);
      setDisplayedText('');
      
      const text = transcription.text;
      let currentIndex = 0;
      
      const typeInterval = setInterval(() => {
        if (currentIndex <= text.length) {
          setDisplayedText(text.slice(0, currentIndex));
          currentIndex++;
        } else {
          setIsTyping(false);
          clearInterval(typeInterval);
        }
      }, 30); // Typing speed

      return () => clearInterval(typeInterval);
    }
  }, [transcription?.text, isTyping]);

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceLabel = (confidence: number): string => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  const formatConfidence = (confidence: number): string => {
    return `${Math.round(confidence * 100)}%`;
  };

  if (isTranscribing) {
    return (
      <div className={`bg-blue-50 border-l-4 border-blue-400 p-4 ${className}`}>
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
          <div>
            <h3 className="text-sm font-medium text-blue-800">
              Transcribing Audio...
            </h3>
            <p className="text-sm text-blue-600 mt-1">
              Converting speech to text using AI
            </p>
          </div>
        </div>
        <div className="mt-3">
          <div className="bg-blue-200 rounded-full h-2 overflow-hidden">
            <div className="bg-blue-600 h-full rounded-full animate-pulse w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border-l-4 border-red-400 p-4 ${className}`}>
        <div className="flex justify-between items-start">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Transcription Failed
              </h3>
              <p className="text-sm text-red-600 mt-1">
                {error}
              </p>
            </div>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!transcription) {
    return (
      <div className={`bg-gray-50 border-2 border-dashed border-gray-300 p-4 text-center ${className}`}>
        <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
        <p className="text-sm text-gray-500">
          Record audio to see transcription here
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      {/* Header with confidence and service info */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center space-x-3">
          <span className="text-sm font-medium text-gray-700">Transcription</span>
          {transcription.service && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {transcription.service}
              {transcription.fallbackUsed && (
                <span className="ml-1 text-yellow-600">(fallback)</span>
              )}
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Confidence indicator */}
          <div className="flex items-center space-x-1">
            <span className="text-xs text-gray-500">Confidence:</span>
            <span className={`text-xs font-medium ${getConfidenceColor(transcription.confidence)}`}>
              {formatConfidence(transcription.confidence)}
            </span>
            <div className="w-12 bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${transcription.confidence >= 0.8 ? 'bg-green-500' : transcription.confidence >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${transcription.confidence * 100}%` }}
              ></div>
            </div>
          </div>
          
          {/* Language indicator */}
          {transcription.language && (
            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
              {transcription.language.toUpperCase()}
            </span>
          )}
          
          {/* Clear button */}
          {onClear && (
            <button
              onClick={onClear}
              className="text-gray-400 hover:text-gray-600 p-1"
              title="Clear transcription"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Main transcription text */}
      <div className="mb-4">
        <div className="bg-gray-50 rounded-lg p-3 min-h-[80px]">
          <p className="text-gray-900 leading-relaxed">
            {displayedText}
            {isTyping && (
              <span className="animate-pulse">|</span>
            )}
          </p>
          {displayedText === '' && !isTyping && (
            <p className="text-gray-500 italic">No transcription available</p>
          )}
        </div>
      </div>

      {/* Alternative suggestions */}
      {transcription.alternatives && transcription.alternatives.length > 0 && transcription.confidence < 0.8 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Alternative Suggestions:
          </h4>
          <div className="space-y-2">
            {transcription.alternatives.map((alternative, index) => (
              <button
                key={index}
                onClick={() => onSelectAlternative?.(alternative.text)}
                className="w-full text-left p-2 bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 transition-colors duration-200"
              >
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-800">{alternative.text}</p>
                  <span className={`text-xs ${getConfidenceColor(alternative.confidence)}`}>
                    {formatConfidence(alternative.confidence)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Segments (timestamps) */}
      {transcription.segments && transcription.segments.length > 1 && (
        <details className="mb-4">
          <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
            Show Timestamps ({transcription.segments.length} segments)
          </summary>
          <div className="mt-2 space-y-1">
            {transcription.segments.map((segment, index) => (
              <div key={index} className="flex items-center space-x-2 text-xs text-gray-600">
                <span className="font-mono">
                  {segment.start.toFixed(1)}s - {segment.end.toFixed(1)}s
                </span>
                <span>|</span>
                <span className="flex-1">{segment.text}</span>
                <span className={getConfidenceColor(segment.confidence)}>
                  {formatConfidence(segment.confidence)}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Duration and metadata */}
      {transcription.duration > 0 && (
        <div className="text-xs text-gray-500 flex justify-between">
          <span>Duration: {transcription.duration.toFixed(1)}s</span>
          {transcription.fallbackUsed && (
            <span className="text-yellow-600">Used fallback service</span>
          )}
        </div>
      )}

      {/* Fallback instructions (for Web Speech API) */}
      {transcription.fallbackUsed && transcription.fallbackInstructions && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="text-sm font-medium text-yellow-800 mb-2">
            Fallback Mode Active
          </h4>
          <p className="text-sm text-yellow-700">
            Primary transcription service is unavailable. 
            {transcription.error && ` Error: ${transcription.error}`}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200"
            >
              Try Again
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default TranscriptionDisplay;