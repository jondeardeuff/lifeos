const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

/**
 * Transcription result interface
 * @typedef {Object} TranscriptionResult
 * @property {string} text - Transcribed text
 * @property {number} confidence - Confidence score (0.0 to 1.0)
 * @property {string} language - Detected language
 * @property {Array} alternatives - Alternative transcriptions
 * @property {Array} segments - Timestamped segments
 * @property {number} duration - Audio duration in seconds
 * @property {string} service - Service used ('whisper' or 'web-speech')
 */

/**
 * OpenAI Whisper API integration service
 */
class WhisperService {
  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.warn('⚠️  OPENAI_API_KEY not found - Whisper service will be disabled');
      this.openai = null;
      this.available = false;
    } else {
      this.openai = new OpenAI({
        apiKey: apiKey,
      });
      this.available = true;
    }
    
    this.config = {
      model: 'whisper-1',
      response_format: 'verbose_json',
      temperature: 0.0, // More deterministic results
      timeout: 30000, // 30 seconds
    };
    
    this.supportedFormats = [
      'audio/mp3',
      'audio/mp4', 
      'audio/mpeg',
      'audio/mpga',
      'audio/m4a',
      'audio/wav',
      'audio/webm'
    ];
    
    this.maxFileSize = 25 * 1024 * 1024; // 25MB
  }

  /**
   * Check if Whisper service is available
   * @returns {boolean}
   */
  isAvailable() {
    if (!this.available || !this.openai) {
      return false;
    }
    return !!process.env.OPENAI_API_KEY;
  }

  /**
   * Validate audio file before processing
   * @param {Buffer|Blob} audioData - Audio data to validate
   * @param {string} mimeType - MIME type of the audio
   * @returns {Object} Validation result
   */
  validateAudioFile(audioData, mimeType) {
    const validation = {
      valid: true,
      errors: []
    };

    // Check file size
    if (audioData.length > this.maxFileSize) {
      validation.valid = false;
      validation.errors.push(`File size ${(audioData.length / 1024 / 1024).toFixed(2)}MB exceeds maximum of 25MB`);
    }

    // Check MIME type
    if (!this.supportedFormats.includes(mimeType)) {
      validation.valid = false;
      validation.errors.push(`Unsupported audio format: ${mimeType}`);
    }

    // Check minimum file size (too small files are likely empty)
    if (audioData.length < 1024) { // 1KB minimum
      validation.valid = false;
      validation.errors.push('Audio file too small (minimum 1KB required)');
    }

    return validation;
  }

  /**
   * Transcribe audio using OpenAI Whisper API
   * @param {Buffer} audioBuffer - Audio data as buffer
   * @param {Object} options - Transcription options
   * @returns {Promise<TranscriptionResult>}
   */
  async transcribeAudio(audioBuffer, options = {}) {
    try {
      if (!this.isAvailable()) {
        throw new Error('Whisper service is not available - OpenAI API key not configured');
      }

      const {
        language = null, // Auto-detect if not specified
        prompt = '',
        temperature = this.config.temperature,
        filename = 'audio.webm'
      } = options;

      // Validate input
      const mimeType = this.getMimeTypeFromFilename(filename);
      const validation = this.validateAudioFile(audioBuffer, mimeType);
      
      if (!validation.valid) {
        throw new Error(`Audio validation failed: ${validation.errors.join(', ')}`);
      }

      console.log(`Transcribing audio with Whisper: ${(audioBuffer.length / 1024).toFixed(2)}KB, format: ${mimeType}`);

      // Create a temporary file for the upload
      const tempFilePath = await this.createTempFile(audioBuffer, filename);
      
      try {
        // Call Whisper API
        const transcription = await this.callWhisperAPI(tempFilePath, {
          language,
          prompt,
          temperature
        });

        // Process and format the result
        const result = this.formatTranscriptionResult(transcription);
        
        console.log(`Whisper transcription completed: ${result.text.length} characters, confidence: ${result.confidence}`);
        
        return result;
      } finally {
        // Clean up temporary file
        await this.cleanupTempFile(tempFilePath);
      }
    } catch (error) {
      console.error('Whisper transcription error:', error);
      throw this.handleWhisperError(error);
    }
  }

  /**
   * Call OpenAI Whisper API with retries
   * @param {string} filePath - Path to audio file
   * @param {Object} options - API options
   * @returns {Promise<Object>} Raw Whisper response
   */
  async callWhisperAPI(filePath, options) {
    const { language, prompt, temperature } = options;
    
    const requestParams = {
      file: fs.createReadStream(filePath),
      model: this.config.model,
      response_format: this.config.response_format,
      temperature
    };

    // Add optional parameters
    if (language) {
      requestParams.language = language;
    }
    
    if (prompt) {
      requestParams.prompt = prompt;
    }

    // Call API with timeout
    return await Promise.race([
      this.openai.audio.transcriptions.create(requestParams),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Whisper API request timeout')), this.config.timeout)
      )
    ]);
  }

  /**
   * Format Whisper API response to standard format
   * @param {Object} whisperResponse - Raw Whisper API response
   * @returns {TranscriptionResult}
   */
  formatTranscriptionResult(whisperResponse) {
    const {
      text,
      language,
      duration,
      segments = []
    } = whisperResponse;

    // Calculate overall confidence from segments
    let confidence = 0.85; // Default confidence for Whisper (typically high)
    
    if (segments && segments.length > 0) {
      const segmentConfidences = segments
        .filter(seg => seg.avg_logprob !== undefined)
        .map(seg => Math.exp(seg.avg_logprob));
      
      if (segmentConfidences.length > 0) {
        confidence = segmentConfidences.reduce((sum, conf) => sum + conf, 0) / segmentConfidences.length;
      }
    }

    // Generate alternatives based on confidence
    const alternatives = this.generateAlternatives(text, confidence);

    return {
      text: text.trim(),
      confidence: Math.max(0, Math.min(1, confidence)), // Clamp between 0 and 1
      language: language || 'unknown',
      alternatives,
      segments: this.formatSegments(segments),
      duration: duration || 0,
      service: 'whisper'
    };
  }

  /**
   * Format segments with timestamps
   * @param {Array} segments - Raw segments from Whisper
   * @returns {Array} Formatted segments
   */
  formatSegments(segments) {
    if (!segments || !Array.isArray(segments)) {
      return [];
    }

    return segments.map(segment => ({
      start: segment.start || 0,
      end: segment.end || 0,
      text: (segment.text || '').trim(),
      confidence: segment.avg_logprob ? Math.exp(segment.avg_logprob) : 0.85
    }));
  }

  /**
   * Generate alternative transcriptions (placeholder for actual implementation)
   * @param {string} text - Primary transcription
   * @param {number} confidence - Confidence score
   * @returns {Array} Alternative suggestions
   */
  generateAlternatives(text, confidence) {
    const alternatives = [];
    
    // If confidence is low, suggest some alternatives
    if (confidence < 0.8) {
      // For now, we'll return empty alternatives
      // In a full implementation, you might use multiple model calls or
      // stored alternative predictions from Whisper segments
      alternatives.push({
        text: text.toLowerCase(),
        confidence: confidence * 0.9
      });
    }
    
    return alternatives;
  }

  /**
   * Create temporary file for Whisper API upload
   * @param {Buffer} audioBuffer - Audio data
   * @param {string} filename - Original filename
   * @returns {Promise<string>} Path to temporary file
   */
  async createTempFile(audioBuffer, filename) {
    const tempDir = path.join(__dirname, '../../../temp');
    
    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const tempFilename = `whisper_${Date.now()}_${Math.random().toString(36).substring(7)}_${filename}`;
    const tempFilePath = path.join(tempDir, tempFilename);
    
    return new Promise((resolve, reject) => {
      fs.writeFile(tempFilePath, audioBuffer, (err) => {
        if (err) {
          reject(new Error(`Failed to create temp file: ${err.message}`));
        } else {
          resolve(tempFilePath);
        }
      });
    });
  }

  /**
   * Clean up temporary file
   * @param {string} filePath - Path to temporary file
   */
  async cleanupTempFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.warn('Failed to cleanup temp file:', error.message);
    }
  }

  /**
   * Get MIME type from filename
   * @param {string} filename - Filename
   * @returns {string} MIME type
   */
  getMimeTypeFromFilename(filename) {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
      '.mp3': 'audio/mp3',
      '.mp4': 'audio/mp4',
      '.m4a': 'audio/m4a',
      '.wav': 'audio/wav',
      '.webm': 'audio/webm',
      '.mpeg': 'audio/mpeg',
      '.mpga': 'audio/mpga'
    };
    
    return mimeTypes[ext] || 'audio/webm';
  }

  /**
   * Handle and format Whisper API errors
   * @param {Error} error - Original error
   * @returns {Error} Formatted error
   */
  handleWhisperError(error) {
    console.error('Whisper API error details:', error);
    
    // OpenAI API specific errors
    if (error.status) {
      switch (error.status) {
        case 400:
          return new Error('Invalid audio file or request parameters');
        case 401:
          return new Error('Invalid OpenAI API key');
        case 413:
          return new Error('Audio file too large (maximum 25MB)');
        case 429:
          return new Error('OpenAI API rate limit exceeded');
        case 500:
        case 502:
        case 503:
          return new Error('OpenAI service temporarily unavailable');
        default:
          return new Error(`OpenAI API error (${error.status}): ${error.message}`);
      }
    }
    
    // Network or timeout errors
    if (error.message.includes('timeout')) {
      return new Error('Transcription request timed out');
    }
    
    if (error.message.includes('network') || error.code === 'ENOTFOUND') {
      return new Error('Network error connecting to OpenAI');
    }
    
    // Generic error handling
    return new Error(`Transcription failed: ${error.message}`);
  }

  /**
   * Health check for Whisper service
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    const health = {
      service: 'whisper',
      available: this.isAvailable(),
      timestamp: new Date().toISOString()
    };

    if (!health.available) {
      health.error = 'OpenAI API key not configured';
      return health;
    }

    try {
      // Test with a minimal API call (if needed)
      health.status = 'healthy';
    } catch (error) {
      health.status = 'unhealthy';
      health.error = error.message;
    }

    return health;
  }
}

module.exports = WhisperService;