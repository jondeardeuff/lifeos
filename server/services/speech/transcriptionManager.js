const WhisperService = require('./whisperService');
const WebSpeechService = require('./webSpeechService');

/**
 * Transcription Manager - orchestrates between different speech-to-text services
 * Handles fallback logic, retry mechanisms, and service selection
 */
class TranscriptionManager {
  constructor() {
    this.whisperService = new WhisperService();
    this.webSpeechService = new WebSpeechService();
    
    this.config = {
      retryAttempts: 3,
      retryDelay: 1000, // Start with 1 second
      preferredService: 'whisper',
      fallbackEnabled: true,
      timeoutMs: 30000 // 30 seconds
    };
    
    this.errorCounts = {
      whisper: 0,
      webSpeech: 0
    };
  }

  /**
   * Main transcription method with automatic fallback
   * @param {Buffer} audioBuffer - Audio data
   * @param {Object} options - Transcription options
   * @returns {Promise<TranscriptionResult>}
   */
  async transcribeAudio(audioBuffer, options = {}) {
    const {
      preferredService = this.config.preferredService,
      language = null,
      enableFallback = this.config.fallbackEnabled,
      retryAttempts = this.config.retryAttempts,
      filename = 'audio.webm'
    } = options;

    console.log(`Starting transcription: ${(audioBuffer.length / 1024).toFixed(2)}KB, preferred: ${preferredService}`);

    let lastError = null;
    let fallbackUsed = false;

    // Try preferred service first
    if (preferredService === 'whisper' && this.whisperService.isAvailable()) {
      try {
        const result = await this.transcribeWithRetry(
          () => this.whisperService.transcribeAudio(audioBuffer, { language, filename }),
          retryAttempts,
          'whisper'
        );
        
        console.log('Whisper transcription successful');
        return { ...result, fallbackUsed: false };
      } catch (error) {
        console.warn('Whisper transcription failed:', error.message);
        lastError = error;
        this.errorCounts.whisper++;
      }
    }

    // Fallback to Web Speech API (client-side instruction)
    if (enableFallback) {
      console.log('Preparing Web Speech API fallback instructions');
      fallbackUsed = true;
      
      // Since Web Speech API is client-side only, we return instructions
      // for the client to use it as a fallback
      const fallbackResult = {
        text: '',
        confidence: 0,
        language: language || 'en-US',
        alternatives: [],
        segments: [],
        duration: 0,
        service: 'web-speech-fallback',
        fallbackUsed: true,
        fallbackInstructions: this.webSpeechService.getClientConfig(),
        error: lastError ? lastError.message : 'Primary service unavailable'
      };
      
      return fallbackResult;
    }

    // If no fallback or all services failed
    throw lastError || new Error('No transcription services available');
  }

  /**
   * Transcribe with retry logic
   * @param {Function} transcribeFunction - Function to call for transcription
   * @param {number} maxAttempts - Maximum retry attempts
   * @param {string} serviceName - Service name for logging
   * @returns {Promise<TranscriptionResult>}
   */
  async transcribeWithRetry(transcribeFunction, maxAttempts, serviceName) {
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`${serviceName} transcription attempt ${attempt}/${maxAttempts}`);
        
        // Add timeout to prevent hanging
        const result = await Promise.race([
          transcribeFunction(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Transcription timeout')), this.config.timeoutMs)
          )
        ]);
        
        // Reset error count on success
        this.errorCounts[serviceName] = 0;
        return result;
        
      } catch (error) {
        console.warn(`${serviceName} attempt ${attempt} failed:`, error.message);
        lastError = error;
        
        // Don't retry for certain errors
        if (this.shouldNotRetry(error)) {
          console.log(`Not retrying ${serviceName} due to error type:`, error.message);
          break;
        }
        
        // Wait before retrying (exponential backoff)
        if (attempt < maxAttempts) {
          const delay = this.getRetryDelay(attempt);
          console.log(`Waiting ${delay}ms before retry...`);
          await this.sleep(delay);
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Determine if an error should not be retried
   * @param {Error} error - Error to check
   * @returns {boolean} True if should not retry
   */
  shouldNotRetry(error) {
    const noRetryConditions = [
      'Invalid audio file',
      'Invalid OpenAI API key',
      'Audio file too large',
      'Unsupported audio format',
      'Audio validation failed'
    ];
    
    return noRetryConditions.some(condition => 
      error.message.toLowerCase().includes(condition.toLowerCase())
    );
  }

  /**
   * Calculate retry delay with exponential backoff
   * @param {number} attemptNumber - Current attempt number
   * @returns {number} Delay in milliseconds
   */
  getRetryDelay(attemptNumber) {
    const baseDelay = this.config.retryDelay;
    const maxDelay = 30000; // 30 seconds max
    const delay = Math.min(baseDelay * Math.pow(2, attemptNumber - 1), maxDelay);
    
    // Add some jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    return Math.floor(delay + jitter);
  }

  /**
   * Sleep utility function
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Health check for all transcription services
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    const whisperHealth = await this.whisperService.healthCheck();
    const webSpeechHealth = this.webSpeechService.healthCheck();
    
    return {
      transcriptionManager: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        config: {
          preferredService: this.config.preferredService,
          fallbackEnabled: this.config.fallbackEnabled,
          retryAttempts: this.config.retryAttempts
        },
        errorCounts: this.errorCounts
      },
      services: {
        whisper: whisperHealth,
        webSpeech: webSpeechHealth
      }
    };
  }

  /**
   * Get available transcription services
   * @returns {Array<string>} Available service names
   */
  getAvailableServices() {
    const services = [];
    
    if (this.whisperService.isAvailable()) {
      services.push('whisper');
    }
    
    // Web Speech API is always "available" as fallback
    services.push('web-speech');
    
    return services;
  }

  /**
   * Set preferred service
   * @param {string} service - Service name ('whisper' or 'web-speech')
   */
  setPreferredService(service) {
    if (['whisper', 'web-speech'].includes(service)) {
      this.config.preferredService = service;
      console.log(`Preferred transcription service set to: ${service}`);
    } else {
      throw new Error(`Invalid service: ${service}`);
    }
  }

  /**
   * Get transcription statistics
   * @returns {Object} Statistics
   */
  getStatistics() {
    const availableServices = this.getAvailableServices();
    
    return {
      availableServices,
      preferredService: this.config.preferredService,
      errorCounts: this.errorCounts,
      totalErrors: Object.values(this.errorCounts).reduce((sum, count) => sum + count, 0),
      whisperAvailable: this.whisperService.isAvailable(),
      fallbackEnabled: this.config.fallbackEnabled
    };
  }

  /**
   * Reset error counts (useful for monitoring/alerting)
   */
  resetErrorCounts() {
    this.errorCounts = {
      whisper: 0,
      webSpeech: 0
    };
    console.log('Transcription error counts reset');
  }

  /**
   * Update configuration
   * @param {Object} newConfig - New configuration options
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('Transcription manager config updated:', newConfig);
  }

  /**
   * Validate audio before transcription
   * @param {Buffer} audioBuffer - Audio buffer to validate
   * @param {string} mimeType - MIME type
   * @returns {Object} Validation result
   */
  validateAudio(audioBuffer, mimeType) {
    // Use Whisper service validation as it's more comprehensive
    return this.whisperService.validateAudioFile(audioBuffer, mimeType);
  }

  /**
   * Get supported languages across all services
   * @returns {Object} Supported languages
   */
  getSupportedLanguages() {
    return {
      whisper: ['en', 'es', 'auto-detect'], // Whisper supports many more, these are our focus
      webSpeech: Object.keys(this.webSpeechService.getSupportedLanguages()),
      recommended: ['en', 'es'] // Languages we've optimized for
    };
  }
}

module.exports = TranscriptionManager;