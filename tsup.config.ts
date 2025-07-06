import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  outExtension({ format }) {
    return {
      js: format === "esm" ? ".js" : ".cjs"
    };
  },
  external: ["react", "react-dom"],
  dts: true,
  clean: true,
});
