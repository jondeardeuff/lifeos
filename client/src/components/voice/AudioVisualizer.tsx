import React, { useMemo } from 'react';
import { processAudioLevels } from './utils/audioUtils';
import { RecordingState } from './VoiceRecorder';

interface AudioVisualizerProps {
  audioLevels: number[];
  isRecording: boolean;
  recordingState: RecordingState;
  barCount?: number;
  className?: string;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  audioLevels,
  isRecording,
  recordingState,
  barCount = 20,
  className = ''
}) => {
  // Process audio levels for visualization
  const processedLevels = useMemo(() => {
    return processAudioLevels(audioLevels, barCount);
  }, [audioLevels, barCount]);

  // Generate bars for visualization
  const visualBars = useMemo(() => {
    return Array.from({ length: barCount }, (_, index) => {
      const level = processedLevels[index] || 0;
      const height = Math.max(level * 100, 2); // Minimum 2% height
      
      return {
        id: index,
        height: `${height}%`,
        opacity: isRecording ? Math.max(level, 0.3) : 0.3
      };
    });
  }, [processedLevels, barCount, isRecording]);

  const getVisualizerColor = () => {
    switch (recordingState) {
      case RecordingState.RECORDING:
        return 'bg-red-500';
      case RecordingState.PROCESSING:
        return 'bg-yellow-500';
      case RecordingState.SUCCESS:
        return 'bg-green-500';
      case RecordingState.ERROR:
        return 'bg-red-300';
      default:
        return 'bg-gray-400';
    }
  };

  const getContainerAnimation = () => {
    if (recordingState === RecordingState.RECORDING) {
      return 'animate-pulse';
    }
    if (recordingState === RecordingState.PROCESSING) {
      return 'animate-spin';
    }
    return '';
  };

  return (
    <div 
      className={`audio-visualizer ${className}`}
      role="img"
      aria-label={`Audio level visualization - ${recordingState.toLowerCase()}`}
    >
      <div 
        className={`flex items-end justify-center space-x-1 h-16 w-48 ${getContainerAnimation()}`}
      >
        {visualBars.map((bar) => (
          <div
            key={bar.id}
            className={`w-2 transition-all duration-100 ease-out rounded-t ${getVisualizerColor()}`}
            style={{
              height: bar.height,
              opacity: bar.opacity
            }}
            aria-hidden="true"
          />
        ))}
      </div>
      
      {/* Status indicator */}
      <div className="flex justify-center mt-2">
        {recordingState === RecordingState.IDLE && (
          <div className="flex items-center text-gray-500">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path 
                fillRule="evenodd" 
                d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" 
                clipRule="evenodd" 
              />
            </svg>
            <span className="text-xs">Ready to record</span>
          </div>
        )}
        
        {recordingState === RecordingState.RECORDING && (
          <div className="flex items-center text-red-600">
            <div className="w-2 h-2 bg-red-600 rounded-full mr-2 animate-pulse"></div>
            <span className="text-xs font-medium">Recording...</span>
          </div>
        )}
        
        {recordingState === RecordingState.PROCESSING && (
          <div className="flex items-center text-yellow-600">
            <svg className="w-4 h-4 mr-1 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-xs">Processing...</span>
          </div>
        )}
        
        {recordingState === RecordingState.SUCCESS && (
          <div className="flex items-center text-green-600">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path 
                fillRule="evenodd" 
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                clipRule="evenodd" 
              />
            </svg>
            <span className="text-xs">Complete!</span>
          </div>
        )}
        
        {recordingState === RecordingState.ERROR && (
          <div className="flex items-center text-red-600">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path 
                fillRule="evenodd" 
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" 
                clipRule="evenodd" 
              />
            </svg>
            <span className="text-xs">Error</span>
          </div>
        )}
      </div>
    </div>
  );
};