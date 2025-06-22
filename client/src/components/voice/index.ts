// Voice Recording Infrastructure - Main Exports
// P0-TASK-1: Basic Voice Recording Infrastructure
// P0-TASK-2: Speech-to-Text Integration

// Core Components
export { VoiceRecorder, RecordingState } from './VoiceRecorder';
export { AudioVisualizer } from './AudioVisualizer';
export { RecordingControls } from './RecordingControls';
export { PermissionHandler } from './PermissionHandler';

// P0-TASK-2: Transcription Components
export { TranscriptionDisplay } from './TranscriptionDisplay';
export { VoiceToText } from './VoiceToText';
export type { TranscriptionResult, TranscriptionDisplayProps } from './TranscriptionDisplay';
export type { VoiceToTextProps } from './VoiceToText';

// Hooks
export { useAudioRecorder } from './hooks/useAudioRecorder';
export { useMicrophonePermission } from './hooks/useMicrophonePermission';
export { useTranscription, useVoiceToText } from './hooks/useTranscription';
export type { UseAudioRecorderOptions, UseAudioRecorderReturn } from './hooks/useAudioRecorder';
export type { PermissionState, UseMicrophonePermissionReturn } from './hooks/useMicrophonePermission';
export type { 
  UseTranscriptionOptions, 
  UseTranscriptionReturn,
  UseVoiceToTextOptions,
  UseVoiceToTextReturn,
  TranscriptionOptions
} from './hooks/useTranscription';

// Utilities
export {
  AUDIO_CONSTRAINTS,
  SUPPORTED_MIME_TYPES,
  RecordingError,
  formatRecordingTime,
  getTimeRemaining,
  processAudioLevels,
  getBestSupportedMimeType,
  cleanupMediaStream,
  isAudioRecordingSupported,
  getAudioCapabilities
} from './utils/audioUtils';

export {
  validateAudioBlob,
  validateRecordingDuration,
  getAudioBlobInfo,
  validateAudioPlayback
} from './utils/audioValidation';

// Type definitions for external use
export interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  disabled?: boolean;
  maxDuration?: number;
  className?: string;
}