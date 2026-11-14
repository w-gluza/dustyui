import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import prettier from "eslint-config-prettier/flat";
import globals from "globals";

const a11yRulesAsErrors = Object.fromEntries(
  Object.keys(jsxA11y.flatConfigs.strict.rules).map((rule) => [rule, "error"]),
);

export default defineConfig([
  globalIgnores(["dist/**"]),
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  jsxA11y.flatConfigs.strict,
  {
    languageOptions: {
      globals: { ...globals.browser },
    },
    rules: {
      ...a11yRulesAsErrors,
      "@typescript-eslint/consistent-type-imports": "error",
      "no-console": "error",
    },
  },
  prettier,
]);
