/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  projects: [
    {
      displayName: 'api',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/packages/api/**/*.test.ts'],
      transform: {
        '^.+\\.(t|j)s$': 'ts-jest',
      },
      moduleFileExtensions: ['js', 'json', 'ts'],
      rootDir: '.',
    },
    {
      displayName: 'web',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/packages/web/**/*.test.tsx'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          tsconfig: 'packages/web/tsconfig.json'
        }],
      },
    },
  ],
};