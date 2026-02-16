import antfu from '@antfu/eslint-config'

export default antfu({
  typescript: true,
  ignores: ['**/dist/**', '**/node_modules/**', '**/*.tsbuildinfo'],
}, {
  files: ['packages/adapter-github/**/*.ts'],
  rules: {
    'dot-notation': 'off',
    'ts/dot-notation': 'off',
  },
})
