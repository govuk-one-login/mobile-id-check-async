import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier'

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  eslintConfigPrettier, // disables rules that conflict with prettier
  {
    rules: {
      'no-unused-vars': 'off', // disabled as a duplicate with @typscript-eslint/no-unused-vars rule
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: "^_"
        }
      ]
    }
  }
);