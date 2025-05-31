module.exports = {
  env: {
    node: true,
    es2021: true,
  },
  extends: ["eslint:recommended", "plugin:node/recommended", "plugin:import/recommended", "standard", "prettier"],
  parser: "@babel/eslint-parser",
  parserOptions: {
    requireConfigFile: false,
    ecmaVersion: 12,
    sourceType: "module",
  },
  plugins: ["node", "import"],
  rules: {
    semi: ["error", "always"],
    indent: ["off"],
    quotes: ["error", "double"],
    "no-unused-vars": ["warn"],
    "node/no-unsupported-features/es-syntax": ["error", { ignores: ["modules", "dynamicImport", "restSpreadProperties"] }],
    "node/no-unsupported-features/node-builtins": ["error", { version: ">=14.17.0" }],
    "import/order": ["error", { "newlines-between": "always" }],
    "no-control-regex": "off",
    "no-process-exit": "off",
    "import/namespace": ["error", { allowComputed: true }],
  },
  overrides: [
    {
      files: ["*.mjs", "rollup.config.js"],
      rules: {
        "node/shebang": "off",
      },
    },
  ],
};
