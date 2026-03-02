# Security audit summary

Run `npm audit` and `npm audit fix` locally for the latest status. Summary of what was found:

## Vulnerabilities (npm audit)

| Package   | Severity | Issue | Fix |
|-----------|----------|--------|-----|
| **esbuild** (via Vite) | Moderate | Dev server request handling (GHSA-67mh-4wv8-2f99) | `npm audit fix --force` would upgrade to Vite 7 (breaking). **Impact**: dev only; production build is unaffected. |
| **minimatch** | High | ReDoS in pattern matching (GHSA-3ppc-4f35-3m26, GHSA-7r86-cg39-jmmj, GHSA-23c5-xmqv-rm74) | `npm audit fix` (safe update). |
| **rollup** | High | Path traversal / arbitrary file write (GHSA-mw96-cpmx-2vgc) | `npm audit fix` (safe update). |
| **tar** (via @capacitor/cli) | High | Path overwrite / symlink issues (GHSA-*) | `npm audit fix --force` would upgrade @capacitor/cli (breaking). **Impact**: dev/build tool only; not in runtime. |

## Recommendations

1. **Apply safe fixes** (no breaking changes):
   ```bash
   npm audit fix
   ```
   This should address **minimatch** and **rollup**.

2. **esbuild / Vite**: The reported issue affects the **development server** only. Your production build and deployed app are not affected. You can:
   - Leave as-is if you only use `npm run build` for production, or
   - Plan an upgrade to Vite 7 when ready (test the project after upgrading).

3. **tar / @capacitor/cli**: Affects the **Capacitor CLI** (dev/build). Not in the app runtime. You can:
   - Run `npm audit fix --force` only if you are ready to upgrade @capacitor/cli (and test the Android build), or
   - Accept the risk for local/dev use and upgrade later.

4. **Ongoing**: Re-run `npm audit` after dependency changes and before releases.
