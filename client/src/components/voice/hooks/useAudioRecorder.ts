import { useState, useRef, useCallback, useEffect } from 'react';
import { validateAudioBlob } from '../utils/audioValidation';
import { RecordingError } from '../utils/audioUtils';

export interface UseAudioRecorderOptions {
  maxDuration: number; // in seconds
  onRecordingComplete: (blob: Blob) => void;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
}

export interface UseAudioRecorderReturn {
  isRecording: boolean;
  recordingTime: number;
  audioLevels: number[];
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  error: string | null;
}

export const useAudioRecorder = ({
  maxDuration,
  onRecordingComplete,
  onRecordingStart,
  onRecordingStop
}: UseAudioRecorderOptions): UseAudioRecorderReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevels, setAudioLevels] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up function
  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (timeIntervalRef.current) {
      clearInterval(timeIntervalRef.current);
      timeIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (analyserRef.current) {
      analyserRef.current = null;
    }
    setAudioLevels([]);
    setRecordingTime(0);
  }, []);

  // Audio level visualization
  const updateAudioLevels = useCallback(() => {
    if (!analyserRef.current || !isRecording) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Convert to amplitude levels (0-1)
    const levels = Array.from(dataArray, (value) => value / 255);
    setAudioLevels(levels);

    animationFrameRef.current = requestAnimationFrame(updateAudioLevels);
  }, [isRecording]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });

      streamRef.current = stream;

      // Set up audio analysis
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Set up MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';

      if (!mimeType) {
        throw new Error(RecordingError.UNSUPPORTED_BROWSER);
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        
        try {
          await validateAudioBlob(audioBlob);
          onRecordingComplete(audioBlob);
        } catch (validationError) {
          setError(validationError instanceof Error ? validationError.message : 'Invalid audio file');
        }
        
        cleanup();
      };

      // Start recording
      mediaRecorder.start(100); // Capture data every 100ms
      setIsRecording(true);
      
      // Start timer
      timeIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          if (newTime >= maxDuration) {
            stopRecording();
          }
          return newTime;
        });
      }, 1000);

      // Start audio level monitoring
      updateAudioLevels();
      
      onRecordingStart?.();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start recording';
      setError(errorMessage);
      cleanup();
      throw err;
    }
  }, [maxDuration, onRecordingComplete, onRecordingStart, updateAudioLevels, cleanup]);

  const stopRecording = useCallback(() => {
    if (!isRecording || !mediaRecorderRef.current) return;

    setIsRecording(false);
    mediaRecorderRef.current.stop();
    onRecordingStop?.();
  }, [isRecording, onRecordingStop]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    isRecording,
    recordingTime,
    audioLevels,
    startRecording,
    stopRecording,
    error
  };
};