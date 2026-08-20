module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  setupFilesAfterEnv: ['./src/test/setup.js'],
  testTimeout: 30000,
  moduleNameMapper: {
    '^otplib$': '<rootDir>/src/test/mocks/otplib.js',
  },
};
