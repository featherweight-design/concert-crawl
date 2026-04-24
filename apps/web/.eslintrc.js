/** @type {import('eslint').Linter.Config} */
module.exports = {
  ...require('@concert-crawl/config/eslint-next'),
  parserOptions: {
    project: true,
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: ['**/*.test.ts', '**/*.test.tsx', '.next/', 'dist/', 'next-env.d.ts'],
}
