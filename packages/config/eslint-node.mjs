import kitNode from '@fwd-stack/eslint-config/node'

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...kitNode,
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      'no-undef': 'off',
      // Stricter than the kit: type annotations may not import either. The
      // options are spelled out because a severity-only override keeps the
      // kit's { disallowTypeAnnotations: false }.
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { disallowTypeAnnotations: true },
      ],
      'id-length': [
        'error',
        { min: 2, exceptions: ['i', 'j', 'k', 'x', 'y', 'z', '_'] },
      ],
    },
  },
]
