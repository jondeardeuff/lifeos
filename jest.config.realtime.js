module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '<rootDir>/src/__tests__/realtime/**/*.test.js',
    '<rootDir>/client/src/__tests__/**/*.test.js'
  ],
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/src/__tests__/setup.js'
  ],
  
  // Module paths (correct property name)
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@client/(.*)$': '<rootDir>/client/src/$1'
  },
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/realtime/**/*.js',
    'client/src/hooks/realtime/**/*.js',
    'client/src/services/socketService.js',
    '!src/realtime/index.js',
    '!**/__tests__/**',
    '!**/node_modules/**'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // Transform configuration for client-side code
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  
  // Module file extensions
  moduleFileExtensions: ['js', 'jsx', 'json'],
  
  // Test timeout
  testTimeout: 15000,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Verbose output
  verbose: true
};