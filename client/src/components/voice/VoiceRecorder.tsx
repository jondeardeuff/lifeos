import React, { useCallback, useRef, useEffect, useState } from 'react';
import { useAudioRecorder } from './hooks/useAudioRecorder';
import { useMicrophonePermission } from './hooks/useMicrophonePermission';
import { AudioVisualizer } from './AudioVisualizer';
import { RecordingControls } from './RecordingControls';
import { PermissionHandler } from './PermissionHandler';

export interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  disabled?: boolean;
  maxDuration?: number; // in seconds, default 120 (2 minutes)
  className?: string;
}

export enum RecordingState {
  IDLE = 'IDLE',
  RECORDING = 'RECORDING',
  PROCESSING = 'PROCESSING',
  ERROR = 'ERROR',
  SUCCESS = 'SUCCESS'
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onRecordingComplete,
  onRecordingStart,
  onRecordingStop,
  disabled = false,
  maxDuration = 120,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [recordingState, setRecordingState] = useState<RecordingState>(RecordingState.IDLE);
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  const {
    hasPermission,
    requestPermission,
    permissionState,
    error: permissionError
  } = useMicrophonePermission();

  const {
    isRecording,
    recordingTime,
    audioLevels,
    startRecording,
    stopRecording,
    error: recordingError
  } = useAudioRecorder({
    maxDuration,
    onRecordingComplete: (blob) => {
      setRecordingState(RecordingState.SUCCESS);
      onRecordingComplete(blob);
      setTimeout(() => setRecordingState(RecordingState.IDLE), 2000);
    },
    onRecordingStart: () => {
      setRecordingState(RecordingState.RECORDING);
      onRecordingStart?.();
    },
    onRecordingStop: () => {
      setRecordingState(RecordingState.PROCESSING);
      onRecordingStop?.();
    }
  });

  // Handle keyboard shortcuts (spacebar hold-to-record)
  useEffect(() => {
    if (!hasPermission || disabled) return;

    let isSpacePressed = false;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' && !isSpacePressed && !isRecording) {
        event.preventDefault();
        isSpacePressed = true;
        handleStartRecording();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space' && isSpacePressed && isRecording) {
        event.preventDefault();
        isSpacePressed = false;
        handleStopRecording();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [hasPermission, disabled, isRecording]);

  // Handle errors
  useEffect(() => {
    const error = permissionError || recordingError;
    if (error) {
      setRecordingState(RecordingState.ERROR);
      setErrorMessage(error);
    }
  }, [permissionError, recordingError]);

  const handleStartRecording = useCallback(async () => {
    if (disabled || isRecording) return;
    
    try {
      await startRecording();
    } catch (error) {
      setRecordingState(RecordingState.ERROR);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to start recording');
    }
  }, [disabled, isRecording, startRecording]);

  const handleStopRecording = useCallback(() => {
    if (!isRecording) return;
    stopRecording();
  }, [isRecording, stopRecording]);

  // Show permission handler if permissions not granted
  if (!hasPermission) {
    return (
      <PermissionHandler
        permissionState={permissionState}
        onRequestPermission={requestPermission}
        error={permissionError}
        className={className}
      />
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`voice-recorder ${className}`}
      role="application"
      aria-label="Voice Recorder"
    >
      <div className="flex flex-col items-center space-y-4 p-4 bg-white rounded-lg shadow-sm border">
        {/* Audio Visualizer */}
        <AudioVisualizer
          audioLevels={audioLevels}
          isRecording={isRecording}
          recordingState={recordingState}
        />

        {/* Recording Controls */}
        <RecordingControls
          recordingState={recordingState}
          isRecording={isRecording}
          recordingTime={recordingTime}
          maxDuration={maxDuration}
          onStartRecording={handleStartRecording}
          onStopRecording={handleStopRecording}
          disabled={disabled}
        />

        {/* Error Display */}
        {recordingState === RecordingState.ERROR && (
          <div 
            className="text-red-600 text-sm text-center bg-red-50 p-2 rounded-md"
            role="alert"
            aria-live="polite"
          >
            {errorMessage}
          </div>
        )}

        {/* Success Message */}
        {recordingState === RecordingState.SUCCESS && (
          <div 
            className="text-green-600 text-sm text-center bg-green-50 p-2 rounded-md"
            role="status"
            aria-live="polite"
          >
            Recording completed successfully!
          </div>
        )}

        {/* Keyboard Shortcut Hint */}
        <div className="text-xs text-gray-500 text-center">
          Hold <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Space</kbd> to record
        </div>
      </div>
    </div>
  );
};