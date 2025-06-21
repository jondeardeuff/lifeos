import {
  formatRecordingTime,
  getTimeRemaining,
  processAudioLevels,
  isAudioRecordingSupported,
  getBestSupportedMimeType,
  cleanupMediaStream,
  getAudioCapabilities
} from '../utils/audioUtils';

// Mock MediaRecorder for testing
global.MediaRecorder = {
  isTypeSupported: jest.fn(() => true)
} as any;

describe('Audio Utilities', () => {
  describe('formatRecordingTime', () => {
    test('formats seconds correctly', () => {
      expect(formatRecordingTime(0)).toBe('0:00');
      expect(formatRecordingTime(30)).toBe('0:30');
      expect(formatRecordingTime(60)).toBe('1:00');
      expect(formatRecordingTime(90)).toBe('1:30');
      expect(formatRecordingTime(120)).toBe('2:00');
      expect(formatRecordingTime(125)).toBe('2:05');
    });

    test('handles large values', () => {
      expect(formatRecordingTime(3661)).toBe('61:01'); // 1 hour 1 minute 1 second
    });
  });

  describe('getTimeRemaining', () => {
    test('calculates remaining time correctly', () => {
      const result1 = getTimeRemaining(30, 120);
      expect(result1.remaining).toBe(90);
      expect(result1.isWarning).toBe(false);

      const result2 = getTimeRemaining(100, 120);
      expect(result2.remaining).toBe(20);
      expect(result2.isWarning).toBe(true); // <= 30 seconds remaining
    });

    test('identifies warning state correctly', () => {
      expect(getTimeRemaining(90, 120).isWarning).toBe(true); // 30 seconds left
      expect(getTimeRemaining(89, 120).isWarning).toBe(true); // 31 seconds left
      expect(getTimeRemaining(88, 120).isWarning).toBe(true); // 32 seconds left
    });
  });

  describe('processAudioLevels', () => {
    test('processes empty audio levels', () => {
      const result = processAudioLevels([], 10);
      expect(result).toHaveLength(10);
      expect(result.every(level => level === 0)).toBe(true);
    });

    test('processes audio levels with data', () => {
      const levels = new Array(100).fill(0).map((_, i) => i / 100); // 0 to 0.99
      const result = processAudioLevels(levels, 20);
      
      expect(result).toHaveLength(20);
      expect(result.every(level => level >= 0 && level <= 1)).toBe(true);
    });

    test('handles different bar counts', () => {
      const levels = [0.1, 0.2, 0.3, 0.4, 0.5];
      
      expect(processAudioLevels(levels, 5)).toHaveLength(5);
      expect(processAudioLevels(levels, 3)).toHaveLength(3);
      expect(processAudioLevels(levels, 10)).toHaveLength(10);
    });
  });

  describe('isAudioRecordingSupported', () => {
    beforeEach(() => {
      // Reset navigator mock
      Object.defineProperty(global.navigator, 'mediaDevices', {
        writable: true,
        value: undefined
      });
      global.MediaRecorder = undefined as any;
    });

    test('returns true when all APIs are supported', () => {
      Object.defineProperty(global.navigator, 'mediaDevices', {
        value: { getUserMedia: jest.fn() }
      });
      global.MediaRecorder = jest.fn() as any;

      expect(isAudioRecordingSupported()).toBe(true);
    });

    test('returns false when MediaRecorder is not supported', () => {
      Object.defineProperty(global.navigator, 'mediaDevices', {
        value: { getUserMedia: jest.fn() }
      });
      global.MediaRecorder = undefined as any;

      expect(isAudioRecordingSupported()).toBe(false);
    });

    test('returns false when getUserMedia is not supported', () => {
      Object.defineProperty(global.navigator, 'mediaDevices', {
        value: undefined
      });
      global.MediaRecorder = jest.fn() as any;

      expect(isAudioRecordingSupported()).toBe(false);
    });
  });

  describe('getBestSupportedMimeType', () => {
    test('returns first supported MIME type', () => {
      global.MediaRecorder = {
        isTypeSupported: jest.fn((type) => type === 'audio/webm;codecs=opus')
      } as any;

      expect(getBestSupportedMimeType()).toBe('audio/webm;codecs=opus');
    });

    test('throws error when no MIME types are supported', () => {
      global.MediaRecorder = {
        isTypeSupported: jest.fn(() => false)
      } as any;

      expect(() => getBestSupportedMimeType()).toThrow();
    });
  });

  describe('cleanupMediaStream', () => {
    test('stops all tracks in a media stream', () => {
      const mockTrack1 = { stop: jest.fn() };
      const mockTrack2 = { stop: jest.fn() };
      const mockStream = {
        getTracks: () => [mockTrack1, mockTrack2]
      } as any;

      cleanupMediaStream(mockStream);

      expect(mockTrack1.stop).toHaveBeenCalled();
      expect(mockTrack2.stop).toHaveBeenCalled();
    });

    test('handles null stream gracefully', () => {
      expect(() => cleanupMediaStream(null)).not.toThrow();
    });
  });

  describe('getAudioCapabilities', () => {
    beforeEach(() => {
      global.MediaRecorder = {
        isTypeSupported: jest.fn(() => true)
      } as any;
      
      Object.defineProperty(global.navigator, 'mediaDevices', {
        value: { getUserMedia: jest.fn() }
      });
    });

    test('returns capabilities object', () => {
      const capabilities = getAudioCapabilities();

      expect(capabilities).toHaveProperty('isSupported');
      expect(capabilities).toHaveProperty('supportedMimeTypes');
      expect(capabilities).toHaveProperty('hasPermissionsAPI');
      expect(capabilities).toHaveProperty('preferredMimeType');
    });

    test('detects supported MIME types', () => {
      global.MediaRecorder.isTypeSupported = jest.fn((type) => 
        type.includes('webm')
      );

      const capabilities = getAudioCapabilities();
      expect(capabilities.supportedMimeTypes.length).toBeGreaterThan(0);
      expect(capabilities.supportedMimeTypes.every(type => type.includes('webm'))).toBe(true);
    });
  });
});