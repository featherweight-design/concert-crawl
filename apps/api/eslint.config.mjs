import nodeConfig from '@concert-crawl/config/eslint-node';

export default [
  { ignores: ['dist/**', '**/*.test.ts'] },
  ...nodeConfig,
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          // Without a hook, zValidator's 400 body is whatever the ZodError
          // serialises to, which on Zod 4 drops the issue list the web reads.
          selector:
            "CallExpression[callee.name='zValidator'][arguments.length<3]",
          message:
            'Pass validationHook (lib/validator.ts) or a custom hook as the third argument to zValidator.',
        },
      ],
    },
  },
];
