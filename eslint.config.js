import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import prettier from "eslint-config-prettier/flat";
import globals from "globals";

export default defineConfig([
  globalIgnores(["dist/**", "consumer/**"]),
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  reactHooks.configs.flat.recommended,
  jsxA11y.flatConfigs.strict,
  {
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: {
        project: ["./tsconfig.json", "./tsconfig.test.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "jsx-a11y/control-has-associated-label": [
        "error",
        { ignoreElements: ["input", "select", "textarea"] },
      ],
      "jsx-a11y/no-aria-hidden-on-focusable": "error",
      "jsx-a11y/prefer-tag-over-role": "error",
      "jsx-a11y/no-redundant-roles": [
        "error",
        { nav: ["navigation"], ul: ["list"], ol: ["list"] },
      ],
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/switch-exhaustiveness-check": [
        "error",
        { considerDefaultExhaustiveForUnions: true },
      ],
      "no-console": "error",
    },
  },
  {
    files: ["src/ObjectInspector/describe/safeRead.ts"],
    rules: { "@typescript-eslint/unbound-method": "off" },
  },
  {
    files: ["src/**/*.test.{ts,tsx}"],
    rules: {
      "@typescript-eslint/only-throw-error": "off",
      "@typescript-eslint/unbound-method": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
    },
  },
  {
    files: ["*.js", "*.ts", "scripts/**"],
    extends: [tseslint.configs.disableTypeChecked],
  },
  prettier,
]);
