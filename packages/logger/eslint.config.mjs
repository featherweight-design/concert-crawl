import nodeConfig from '@concert-crawl/config/eslint-node';

export default [
  { ignores: ['dist/**', '**/*.test.ts'] },
  ...nodeConfig,
];
