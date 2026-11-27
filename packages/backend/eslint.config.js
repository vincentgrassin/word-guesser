import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    name: 'app/files-to-ignore',
    ignores: ['build/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // The editor sees several TypeScript projects in the monorepo: point at this one.
    languageOptions: { parserOptions: { tsconfigRootDir: import.meta.dirname } },
    rules: {
      // Allows `const { socket, ...rest } = player` to drop a property
      '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
    },
  },
)
