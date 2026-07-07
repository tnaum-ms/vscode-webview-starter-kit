/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
    testEnvironment: 'node',
    testMatch: ['<rootDir>/src/**/*.test.ts'],
    transform: {
        '^.+.tsx?$': ['ts-jest', {}],
    },
    // `vscode` is provided by the VS Code runtime, not installed as a package.
    // Map it to the manual mock so host-side code (routers, controllers) that
    // imports `vscode` can be unit-tested under Jest.
    moduleNameMapper: {
        '^vscode$': '<rootDir>/src/__mocks__/vscode.js',
    },
    // Limit workers to avoid OOM kills on machines with many cores.
    // Each ts-jest worker loads the TypeScript compiler and consumes ~500MB+.
    maxWorkers: '50%',
};
