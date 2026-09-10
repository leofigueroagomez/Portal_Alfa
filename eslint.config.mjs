import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Los patrones de arriba solo cubren la raiz. Sin estos, `npm run lint`
    // entra al build generado de cualquier subdirectorio y ahoga los hallazgos
    // reales en miles de avisos sobre chunks de Turbopack.
    "**/.next/**",
    "**/out/**",
    "**/build/**",
    // Worktrees: son copias del repo y se lintean en su propio arbol.
    ".claude/worktrees/**",
  ]),
]);

export default eslintConfig;
