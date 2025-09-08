module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setupTests.js'],
  testMatch: [
    '**/tests/**/*.test.js',
    '!**/tests/ultra.simple.test.js'
  ],
  testTimeout: 10000,
  forceExit: true,
  detectOpenHandles: true,
  maxWorkers: 2,
  bail: false,
  verbose: true,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/config/**',
    '!src/migrations/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
};
