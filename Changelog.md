## 1.2.0 / 2026-02-14
* Fixed ESM imports by adding `.js` extensions to all relative imports (using tsc-esm-fix)
* Use lodash-es for ESM builds
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
