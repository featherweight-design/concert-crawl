import kitNode from '@fwd-stack/eslint-config/node'

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...kitNode,
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      'no-undef': 'off',
      // Stricter than the kit: type annotations may not import either.
      '@typescript-eslint/consistent-type-imports': 'error',
      'id-length': [
        'error',
        { min: 2, exceptions: ['i', 'j', 'k', 'x', 'y', 'z', '_'] },
      ],
    },
  },
]
