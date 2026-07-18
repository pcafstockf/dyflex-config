## 2.0.2 / 2026-07-17
* Type fixes (no code or behavior changes).

## 2.0.0 / 2026-06-02
* Small but breaking API changes:
  * `pkgToConfig` is now async (returns `Promise`). Callers must `await` it.
  * `LoadConfigFileOpts` no longer uses a `data` property (only affects apps utilizing `dotenv-expand`).
  * `mergeViaDirectives` is no longer exported from the main entry points.
  * Removed `setup-fs` module (redundant with `index`).
  * Initializer priority sort is now numeric.
* `onEvalError` notification when a helper fails during interpolation.
* Comprehensive doc updates.

## 1.4.0 / 2026-05-28
* Add fn.parseJson helper.
* Upgrade dependencies.

## 1.3.4 / 2026-05-25
* Fix tupple mergepoint defect.

## 1.3.3 / 2026-04-02
* Update lodash dependency.

## 1.3.2 / 2026-03-26
* Simple dev and peer dependency updates.

## 1.3.1 / 2026-02-15
* Replace tsx slop nightmare, with trustworthy ts-node.

## 1.3.0 / 2026-02-15
* More capable config merging + export of merge utility function (`mergeViaDirectives`). 
* Upgraded tsc target to `es2019` (but dist is still fully es2017 compatible). 
* Upgrade dependencies, which flushed out duplicate (incorrect) test suite name.

## 1.2.0 / 2026-02-14
* ESM fixes:
    - Added `.js` extensions to all relative imports (using tsc-esm-fix)
    - Use lodash-es for ESM builds
    - json5 imports now ESM compatible
    - peer dependency loading (yaml, dotenv, properties-reader) to by using dynamic imports
* Use tsx for tests
* Added package.json exports for browser entry point (`browser-index.ts`) that excludes Node.js functions.

## 1.1.1 / 2025-11-18
* Updated devDependencies (dependabot alerts about build toolchain).

## 1.1.1 / 2024-09-11
* Implement cjs/esm packaging lessons learned from [async-injection](https://github.com/pcafstockf/async-injection).

## 1.1.0 / 2024-08-03
* When merging config, allow for lodash merge of arrays (overriding the default union behavior introduced in v1.0.3).
* Update patch level dependencies

## 1.0.3 / 2024-05-30
* When merging config, union arrays (instead of right replacing left).

## 1.0.2 / 2024-05-27 (No functional changes)
* Improve index.ts

## 1.0.1 / 2024-05-27 (No functional changes)
* Expose some constants.
* Documentation typos.

## 1.0.0 / 2024-05-20
* Initial release  
