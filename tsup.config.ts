// tsup.config.ts
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/**/*.tsx", "src/**/*.ts", "!src/**/*.d.ts"],
  bundle: false,
  format: ["esm", "cjs"],
  outExtension: ({ format }) => ({ js: format === "esm" ? ".js" : ".cjs" }),
  external: ["react", "react-dom"],
  dts: false,
  clean: true,
  loader: { ".module.css": "copy", ".css": "copy" },
  esbuildOptions(o) {
    o.outbase = "src";
    o.assetNames = "[dir]/[name]";
  },
});
