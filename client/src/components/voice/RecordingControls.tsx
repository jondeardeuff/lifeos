import React from 'react';
import { formatRecordingTime, getTimeRemaining } from './utils/audioUtils';
import { RecordingState } from './VoiceRecorder';

interface RecordingControlsProps {
  recordingState: RecordingState;
  isRecording: boolean;
  recordingTime: number;
  maxDuration: number;
  onStartRecording: () => void;
  onStopRecording: () => void;
  disabled?: boolean;
  className?: string;
}

export const RecordingControls: React.FC<RecordingControlsProps> = ({
  recordingState,
  isRecording,
  recordingTime,
  maxDuration,
  onStartRecording,
  onStopRecording,
  disabled = false,
  className = ''
}) => {
  const { remaining, isWarning } = getTimeRemaining(recordingTime, maxDuration);
  const progressPercentage = (recordingTime / maxDuration) * 100;

  const getButtonText = () => {
    switch (recordingState) {
      case RecordingState.RECORDING:
        return 'Stop Recording';
      case RecordingState.PROCESSING:
        return 'Processing...';
      case RecordingState.SUCCESS:
        return 'Complete!';
      case RecordingState.ERROR:
        return 'Try Again';
      default:
        return 'Start Recording';
    }
  };

  const getButtonColor = () => {
    switch (recordingState) {
      case RecordingState.RECORDING:
        return 'bg-red-600 hover:bg-red-700 focus:ring-red-500';
      case RecordingState.PROCESSING:
        return 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500 cursor-not-allowed';
      case RecordingState.SUCCESS:
        return 'bg-green-600 hover:bg-green-700 focus:ring-green-500';
      case RecordingState.ERROR:
        return 'bg-red-600 hover:bg-red-700 focus:ring-red-500';
      default:
        return 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500';
    }
  };

  const handleButtonClick = () => {
    if (disabled || recordingState === RecordingState.PROCESSING) return;
    
    if (isRecording) {
      onStopRecording();
    } else {
      onStartRecording();
    }
  };

  const isButtonDisabled = disabled || recordingState === RecordingState.PROCESSING;

  return (
    <div className={`recording-controls ${className}`}>
      <div className="flex flex-col items-center space-y-4">
        {/* Time Display and Progress */}
        {(isRecording || recordingTime > 0) && (
          <div className="text-center">
            <div className={`text-lg font-mono ${isWarning ? 'text-red-600' : 'text-gray-700'}`}>
              {formatRecordingTime(recordingTime)} / {formatRecordingTime(maxDuration)}
            </div>
            
            {/* Progress Bar */}
            <div className="w-48 bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  isWarning ? 'bg-red-500' : 'bg-indigo-600'
                }`}
                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                role="progressbar"
                aria-valuenow={progressPercentage}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Recording progress: ${Math.round(progressPercentage)}%`}
              />
            </div>
            
            {/* Time Remaining Warning */}
            {isWarning && isRecording && (
              <div className="text-red-600 text-xs mt-1">
                {remaining} seconds remaining
              </div>
            )}
          </div>
        )}

        {/* Main Record Button */}
        <button
          onClick={handleButtonClick}
          disabled={isButtonDisabled}
          className={`
            relative px-8 py-4 rounded-full text-white font-medium 
            focus:outline-none focus:ring-2 focus:ring-offset-2 
            transition-all duration-200 transform
            ${getButtonColor()}
            ${isButtonDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
            ${isRecording ? 'animate-pulse' : ''}
          `}
          aria-label={getButtonText()}
          aria-pressed={isRecording}
        >
          <div className="flex items-center space-x-2">
            {/* Recording Icon */}
            {recordingState === RecordingState.RECORDING ? (
              <div className="w-4 h-4 bg-white rounded-sm" />
            ) : recordingState === RecordingState.PROCESSING ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : recordingState === RecordingState.SUCCESS ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : recordingState === RecordingState.ERROR ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
              </svg>
            )}
            
            <span>{getButtonText()}</span>
          </div>
        </button>

        {/* Additional Controls */}
        {isRecording && (
          <div className="flex space-x-3">
            <button
              onClick={onStopRecording}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 text-sm"
              aria-label="Stop recording immediately"
            >
              Stop
            </button>
          </div>
        )}
      </div>
    </div>
  );
};