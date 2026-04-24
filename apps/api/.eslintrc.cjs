/** @type {import('eslint').Linter.Config} */
module.exports = {
  ...require('@concert-crawl/config/eslint-node'),
  parserOptions: {
    project: true,
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: ['**/*.test.ts', 'dist/'],
}
