import tseslint from 'typescript-eslint'
import eslintConfigPrettier from 'eslint-config-prettier'
import jsdoc from 'eslint-plugin-jsdoc'

export default tseslint.config(
  {
    ignores: ['dist'],
  },
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    files: ['src/**/*.ts', 'test/**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['test/*.test.ts'],
          maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 50,
        },
      },
    },
    rules: {
      // TODO: enable and fix — tracked as follow-up to eliminate internal any usage
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      // Used for Proxy handlers and closure-based class patterns
      '@typescript-eslint/no-this-alias': 'off',
      // Allow _ prefix for intentionally unused vars
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  // Require TSDoc on every publicly-exported declaration in src/.
  // Tests are excluded — they don't form the public API.
  {
    files: ['src/**/*.ts'],
    plugins: {
      jsdoc,
    },
    settings: {
      jsdoc: {
        mode: 'typescript',
      },
    },
    rules: {
      'jsdoc/require-jsdoc': [
        'error',
        {
          publicOnly: true,
          enableFixer: false,
          require: {
            ClassDeclaration: true,
            FunctionDeclaration: true,
            MethodDefinition: true,
            ArrowFunctionExpression: false,
            FunctionExpression: false,
          },
          contexts: [
            'ExportNamedDeclaration > TSInterfaceDeclaration',
            'ExportNamedDeclaration > TSTypeAliasDeclaration',
            'ExportNamedDeclaration > VariableDeclaration',
            'TSInterfaceDeclaration:not(:has(ExportNamedDeclaration)) > TSPropertySignature',
            'TSInterfaceDeclaration > TSMethodSignature',
          ],
          exemptEmptyConstructors: true,
        },
      ],
    },
  }
)
