// File: .eslintrc.js
module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es2021: true,
    jest: true,
    node: true
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'standard'
  ],
  parserOptions: {
    ecmaFeatures: {
      jsx: true
    },
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  plugins: [
    'react'
  ],
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'warn',
    camelcase: 'off'
  },
  overrides: [
    {
      files: ['src/backend/**/*.js'],
      env: {
        node: true,
        browser: false
      },
      rules: {}
    },
    {
      files: ['src/frontend/src/**/*.{js,jsx}'],
      env: {
        browser: true,
        node: false
      },
      extends: [
        'plugin:react/recommended',
        'react-app',
        'react-app/jest'
      ]
    }
  ],
  settings: {
    react: {
      version: 'detect'
    }
  },
  // Bỏ qua các thư mục không cần lint
  ignorePatterns: ['node_modules/', 'build/', 'dist/', 'public/']
}
