/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ["**/web-service/test/**/*.test.ts", "**/test/**/*.test.ts"],
  modulePathIgnorePatterns: ["<rootDir>/dist/"],
  setupFiles: ["dotenv/config"]
};