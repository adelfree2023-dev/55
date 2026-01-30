module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    moduleNameMapper: {
        '^@apex/config$': '<rootDir>/packages/config/src/index.ts',
        '^@apex/security$': '<rootDir>/packages/security/src/index.ts',
        '^@apex/db$': '<rootDir>/packages/db/src/index.ts',
    },
    testMatch: ['**/*.spec.ts', '**/*.test.ts'],
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov'],
    collectCoverageFrom: [
        'packages/**/*.ts',
        '!packages/**/*.spec.ts',
        '!packages/**/*.test.ts',
        '!packages/**/index.ts',
    ],
};
