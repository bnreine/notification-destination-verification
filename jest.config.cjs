module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['aws-cdk-lib/testhelpers/jest-autoclean'],
    preset: 'ts-jest/presets/default-esm',
    extensionsToTreatAsEsm: ['.ts'],
    transform: {
        '^.+\\.tsx?$': [
            'ts-jest',
            {
                useESM: true,
            },
        ],
    },
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
};
