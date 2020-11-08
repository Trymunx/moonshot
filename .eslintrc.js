module.exports = {
  env: {
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    parser: "@typescript-eslint/parser",
  },
  plugins: [
    "@typescript-eslint",
    "eslint-plugin-import",
    "sort-keys-fix",
    "typescript-sort-keys",
  ],
  root: true,
  rules: {
    "arrow-parens": ["warn", "as-needed"],
    "comma-dangle": ["error", "always-multiline"],
    "generator-star-spacing": ["error", { after: true, before: false }],
    indent: ["error", 2, { SwitchCase: 1 }],
    "linebreak-style": ["error", "unix"],
    "max-len": ["error", { code: 100, ignoreTrailingComments: true, tabWidth: 2 }],
    "no-console": process.env.NODE_ENV === "production" ? "error" : "off",
    "no-debugger": process.env.NODE_ENV === "production" ? "error" : "off",
    "no-fallthrough": ["error", { commentPattern: "break[\\s\\w]*omitted" }],
    "no-trailing-spaces": ["error"],
    "object-curly-spacing": ["warn", "always", { arraysInObjects: false, objectsInObjects: false }],
    quotes: ["error", "double"],
    semi: ["error", "always"],
    "sort-imports": [
      "warn",
      {
        ignoreCase: true,
        memberSyntaxSortOrder: ["none", "all", "single", "multiple"],
      },
    ],
    "sort-keys": ["warn", "asc", { caseSensitive: true, natural: true }],
    "sort-keys-fix/sort-keys-fix": "warn",
    "space-before-function-paren": [
      "error",
      { anonymous: "never", asyncArrow: "never", named: "never" },
    ],
    "typescript-sort-keys/interface": "error",
    "typescript-sort-keys/string-enum": "error",
  },
};
