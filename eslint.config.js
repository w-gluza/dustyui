import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import prettier from "eslint-config-prettier/flat";
import globals from "globals";

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
      "jsx-a11y/control-has-associated-label": [
        "error",
        { ignoreElements: ["input", "select", "textarea"] },
      ],
      "jsx-a11y/no-aria-hidden-on-focusable": "error",
      "jsx-a11y/prefer-tag-over-role": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "no-console": "error",
    },
  },
  prettier,
]);
