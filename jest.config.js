// For a detailed explanation regarding each configuration property, visit:
// https://jestjs.io/docs/en/configuration.html

module.exports = {
  // The test environment that will be used for testing
  testEnvironment: 'jsdom',

  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',

  // An array of glob patterns indicating a set of files for which coverage information should be collected
  collectCoverageFrom: ['src/**/*.ts', '!src/index.ts', '!src/typings/**'],

  // A list of paths to modules that run some code to configure or set up the testing framework before each test
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],

  // A map from regular expressions to module names that allow to stub out resources with a single module
  moduleNameMapper: {
    // Handle ES modules in node_modules
    '^rrule/dist/es5/rrule$': '<rootDir>/test/helpers/mockRRule.ts',
  },

  // An array of regexp pattern strings that are matched against all source file paths, matched files will skip transformation
  transformIgnorePatterns: [
    '/node_modules/(?!(ol|domurl|luxon|rrule|ol-mapbox-style|ol-layerswitcher)/)',
  ],

  // The glob patterns Jest uses to detect test files
  testMatch: ['<rootDir>/test/**/*.test.ts'],

  // Indicates whether each individual test should be reported during the run
  verbose: true,

  // Automatically clear mock calls and instances between every test
  clearMocks: true,
};
