import { defineConfig } from "tsdown";

export default defineConfig([
  {
    platform: "neutral",
    name: "zxcvbn",
    globalName: "zxcvbn",
    publint: true,
    sourcemap: true,
    dts: {
      enabled: true,
      sourcemap: true,
    },
  },
  {
    entry: { index: "src/index_async.ts" },
    platform: "neutral",
    name: "zxcvbn-async",
    outDir: "dist/async",
    publint: true,
    sourcemap: true,
    exports: {
      customExports(pkg) {
        pkg["./async"] = "./dist/async/index.js";
        pkg["."] = "./dist/index.js";

        return pkg;
      },
    },
    dts: {
      enabled: true,
      sourcemap: true,
    },
  },
]);
