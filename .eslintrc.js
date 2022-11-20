module.exports = {
  extends: [
    'airbnb',
    'plugin:flowtype/recommended',
    'prettier',
    'prettier/flowtype',
    'prettier/react',
    'plugin:jest/recommended'
  ],
  parser: 'babel-eslint',
  plugins: ['flowtype', 'jest'],
  // Some rules can be too strict. Feel free to relax them. Explain.
  rules: {
    'consistent-return': 0, // Flow.
    'import/first': 0, // Too strict.
    'no-plusplus': 0, // Prettier ensures it can't happen.
    'react/jsx-filename-extension': 0, // Too strict.
    'react/prop-types': 0, // Flow.
    'react/self-closing-comp': 0, // <Text> </Text> is fine.
    'spaced-comment': 0, // Too strict.
    'react/no-multi-comp': 0, // Too strict.
    'react/prefer-stateless-function': 0, // PureComponent FTW.
    'arrow-body-style': 0, // Too strict.
    'prefer-destructuring': 0, // Flow casting can need it.
    'import/extensions': 0, // Flow checks it.
    'no-alert': 0, // // Too strict.
    'no-unused-expressions': 0, // For Flow casting, e.g. (field: empty);
    'react/require-default-props': 0, // WTF? Not needed when we pass props.
    'object-curly-newline': 0,
    'no-param-reassign': 0,
    'import/prefer-default-export': 0,
    'no-unused-vars': ['warn'],
    'flowtype/no-types-missing-file-annotation': 0,
    'jsx-a11y/no-autofocus': 0,
    'jsx-a11y/anchor-is-valid': 0,
    'no-underscore-dangle': ['error', { allow: ['_id'] }]
  }
};

//   "rules": {
//     "arrow-parens": ["error", "as-needed"],
//     "class-methods-use-this": 0,
//     "comma-dangle": [2, "never"],
//     "consistent-return": 1,
//     "import/prefer-default-export": 0,
//     "indent": 0,
//     "max-len": 0,
//     "no-mixed-operators": "off",
//     "no-nested-ternary": 0,

//     "no-plusplus": 0,
//     "no-underscore-dangle": 0,
//     "no-unused-vars": ["warn"]
//   },
