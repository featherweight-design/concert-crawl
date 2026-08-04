import { FlatCompat } from '@eslint/eslintrc'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const compat = new FlatCompat({ baseDirectory: __dirname })

/** @type {import('eslint').Linter.Config[]} */
export default [
  { ignores: ['.next/**', 'dist/**', 'next-env.d.ts'] },
  ...compat.extends('next/core-web-vitals'),
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    languageOptions: {
      parser: tsParser,
    },
    rules: {
      'no-unused-vars': 'off',
      'no-undef': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': 'error',
      'id-length': [
        'error',
        { min: 2, exceptions: ['i', 'j', 'k', 'x', 'y', 'z', '_'] },
      ],
    },
  },

  // Customer-facing strings must live in a `definitions/copy.ts` (see
  // CLAUDE.md). This rule is the mechanical half of that convention: it
  // catches the string at authoring time instead of at the next copy audit.
  // The 2026-08 audit found ~193 hardcoded strings, most of them sentence
  // fragments wrapped around an interpolated value, which is exactly what a
  // human reviewer skims past.
  {
    files: ['src/**/*.tsx'],
    ignores: [
      // Admin UI is deliberately allowed to be ad-hoc (CLAUDE.md: "Ad-hoc OK
      // for Admin UIs only") — it has no copy-review bar to enforce.
      'src/components/admin/**',
      'src/app/(protected)/admin/**',
      // Release-note hero illustrations are artwork, not copy. The strings in
      // them ("ADMIT ONE", "DOORS · 8 PM") are drawn elements of a fake ticket
      // stub, and extracting them would make the artwork harder to read.
      'src/components/consumer/release-notes/heroes/**',
      '**/*.test.tsx',
    ],
    rules: {
      'react/jsx-no-literals': [
        'error',
        {
          // Punctuation, currency, arrows and icon glyphs. These carry no
          // voice, so routing them through copy.ts adds indirection and no
          // review value.
          allowedStrings: [
            '·',
            '—',
            '–',
            '@',
            '$',
            '+',
            '.',
            ',',
            ':',
            '/',
            '%',
            '#',
            '&',
            '*',
            '×',
            '→',
            '←',
            '↑',
            '↓',
            '↵',
            '↗',
            '✓',
            '✕',
            '★',
            '●',
            '!',
            '?',
            '(',
            ')',
            '-',
            '~',
            '№',
            '&ldquo;',
            '&rdquo;',
          ],
        },
      ],
    },
  },
]
