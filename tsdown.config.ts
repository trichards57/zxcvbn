import { defineConfig } from "tsdown";

export default defineConfig({
  platform: "neutral",
  name: "zxcvbn",
  globalName: "zxcvbn",
  publint: true,
  sourcemap: true,
  exports: true,
  dts: {
    enabled: true,
    sourcemap: true,
  },
});
