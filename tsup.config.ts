// tsup.config.ts
import { defineConfig } from "tsup";

export default defineConfig({
  // emit JS per file (preserve folder structure)
  entry: ["src/**/*.tsx", "src/**/*.ts", "!src/**/*.d.ts"],
  bundle: false, // ⬅️ important: keep dist/Button/Button.js
  format: ["esm", "cjs"],
  outExtension: ({ format }) => ({ js: format === "esm" ? ".js" : ".cjs" }),
  external: ["react", "react-dom"],
  dts: false, // ⬅️ let tsc emit declarations (see step 2)
  clean: true,

  // copy CSS next to JS (no hashing)
  loader: { ".module.css": "copy", ".css": "copy" },
  esbuildOptions(o) {
    // keep folder + filename; if your esbuild supports it, use "[dir]/[name].[ext]"
    o.assetNames = "[dir]/[name]";
  },
});
