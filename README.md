# dyflex-config

[![CI Actions](https://github.com/pcafstockf/dyflex-config/workflows/CI/badge.svg)](https://github.com/pcafstockf/dyflex-config/actions)
[![Publish Actions](https://github.com/pcafstockf/dyflex-config/workflows/NPM%20Publish/badge.svg)](https://github.com/pcafstockf/dyflex-config/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
![OSS Lifecycle](https://img.shields.io/osslifecycle/pcafstockf/dyflex-config.svg)
[![npm version](https://img.shields.io/npm/v/dyflex-config)](https://www.npmjs.com/package/dyflex-config)

> **Compose configuration from any source. Resolve the rest.**

Load from multiple sources, in various formats, merge with fine-grained control, and resolve interpolated values.  
When optionally paired with dependency injection, configuration fragments become injectable services — automatically wired and ready to use.

```bash
npm install dyflex-config
```

Works in Node, Deno, Bun, Electron, and browsers.  
Ships as ESM and CJS.

---

## Quick start

```typescript
import { makeConfig, loadConfigFile, keyValueToConfig } from 'dyflex-config';

const defaults = {
  server: {
    host: 'localhost',
    port: 3000,
  },
  db: {
    url: '<%= config.db.host + ":" + config.db.port + "/" + config.db.name %>',
    host: 'localhost',
    port: 5432,
    name: 'myapp',
  }
};

const config = await makeConfig(defaults, {},
  await loadConfigFile('./config.json'),            // merge a JSON/JSON5/YAML file
  ['db', await loadConfigFile('.env')],              // merge .env values into config.db
  keyValueToConfig(process.argv.slice(2))            // merge command-line key=value pairs
);

console.log(config.db.url); // "prod-db.example.com:5432/myapp" (interpolated at access time)
```

---

## Why dyflex-config?

| | |
|---|---|
| **Load from anywhere** | JSON, JSON5, YAML, .properties, .ini, .env, code, CLI args |
| **Merge with precision** | Deep merge by default; directives to force-replace, conditionally replace, merge arrays by element, or remove items |
| **Cross-reference values** | Template interpolation resolves after merging — any value can reference any other |
| **Type-safe defaults** | Define config as a `const` literal, derive the type: `type Config = typeof defaults` |
| **Framework-independent** | Works anywhere TypeScript or JavaScript runs |
| **Built for DI** | Config fragments register as injectable services and auto-wire at startup |

## When to use it

**Good fit:**
- Config assembled from multiple sources, each providing a fragment (e.g. `.env` for db credentials merged into `config.db`)
- Environment-specific overrides layered on shared defaults
- Values that reference other values (connection strings, derived paths)
- DI-driven apps where config fragments should auto-wire services

**Possible overkill:**
- One config file, no interpolation, no merging, no auto wiring — `JSON.parse` genuinely covers it

---

## How it works

`dyflex-config` follows a pipeline: **load → merge → interpolate → initialize**.  
Each step is useful on its own, but together they can wire your entire application.

### 1 · Define defaults

Your default configuration is an ordinary object literal — both structure definition and development defaults:

```typescript
const defaults = {
  http: { port: 3000, host: 'localhost' },
  db:   { host: 'localhost', port: 5432 }
};
```

The TypeScript type is derived directly: `type AppConfig = typeof defaults`.

### 2 · Load and merge overrides

Load from files, env vars, or CLI arguments. Target merges at specific sub-nodes with tuples:

```typescript
const config = await makeConfig(defaults, {},
  await loadConfigFile('./config.yaml'),             // merges at the root
  ['db', await loadConfigFile('.env')],              // merges into config.db
  keyValueToConfig(['http.port=8080'])               // merges key=value pairs
);
```

Supported formats: JSON/JSON5 (built-in), YAML, .properties, .ini, .env (via peer deps).

### 3 · Interpolate

Any string value can reference others using `<%= ... %>` templates.  
Templates resolve lazily — the full merged config is available at access time:

```typescript
const defaults = {
  name: 'myapp',
  version: '1.0.0',
  release: '<%= config.name + "@" + config.version %>'
};
```

Built-in helpers for type conversion (templates produce strings by default):

| Helper | Returns |
|:--|:--|
| `fn.asNum(v)` | `number` |
| `fn.asBool(v)` | `boolean` |
| `fn.asJs(v)` | the value as-is (any type) |
| `fn.parseJson(v)` | parsed JSON object |
| `fn.fromEnv(v)` | `process.env[v]` |
| `fn.relTo(v)` | value by relative path or symbol |

Add your own custom helpers via the `evalExt` option.

### 4 · Register and initialize

This is where the pipeline pays off.

Mark a fragment as injectable with `__conf_register`.  
After merging and interpolation, it's handed to a registrar callback — typically binding into your DI container.

Declare an initializer with `__conf_init`.  
Initializers run after config is fully built, receiving the DI container as context:

```typescript
const defaults = {
  db: {
    __conf_register: 'db-config',
    host: 'localhost',
    port: 5432,
    password: '<%= fn.fromEnv("DB_PASSWORD") %>',
    __conf_init: {
      fn: (container) => container.bindClass(DbPool).asSingleton(),
      priority: 0
    }
  }
};

const container = new Container();
const config = await makeConfig(defaults, {
  evalCb: (key, obj) => container.bindConstant(key, obj),
  ctx: container
},
  ['db', await loadConfigFile('.env')]
);

const pool = container.get(DbPool);  // fully wired with resolved config
```

Adding a new service is often as simple as defining a configuration fragment.
The fragment carries its structure, defaults, registration, and wiring — override files supply environment-specific values; the library handles the rest.

Initializers execute in priority order (lowest first), same-priority in parallel.

---

## Merge directives

By default, objects are deep-merged and arrays are unioned (no duplicates).
Prefix keys to control behavior:

| Prefix | Behavior |
|:--|:--|
| `!key` | **Force replace** — overwrites the target completely |
| `~key` | **Conditional** — only replaces if the key already exists |
| `%key` | **Element merge** — deep merges arrays element-by-element |
| `-key` | **Remove** — removes matching elements from target array |

```json5
{
  "!server": { "port": 8080 },         // replaces entire server object
  "~feature_flags": { "beta": true },  // only if feature_flags already exists
  "-plugins": ["deprecated-plugin"]    // removes from the plugins array
}
```

---

## API

### `makeConfig(defaults, opts, ...overrides)`

All-in-one: merge, interpolate, and initialize.  Returns `Promise<Config>`.

**Options (`ConfigOpts`):**

| Option | Purpose |
|:--|:--|
| `evalCb` | Callback for `__conf_register` markers (DI binding) |
| `evalExt` | Custom template helper functions |
| `onEvalError` | Callback when a helper fails — return a replacement value, or throw |
| `ctx` | Passed to initializers (typically a DI container); triggers initializer execution |

Overrides must be pre-resolved — `await` any async sources like `loadConfigFile()`.

### `mergeConfig(dst, src, mergePoint?)`
Merge `src` into `dst`. Optionally target a sub-node via `mergePoint` (lodash path notation).

### `mergeConfigs(dst, sources)`
Merge multiple sources. Array elements are `[mergePoint, src]` tuples.

### `evalConfig(config, registrar?, evalExt?, onEvalError?)`
Walk the config, process markers, and set up template interpolation.

### `loadConfigFile(filepath, opts?)`
Load a local file as an object. Supports JSON/JSON5 (built-in), YAML, .properties, .ini, .env.
YAML, properties, and dotenv require their respective peer dependencies.
For `.env` files, pass previously loaded config or `process.env` as opts to provide expansion variables for dotenv-expand.

### `keyValueToConfig(pairs, sep?, delim?)`
Convert `key=value` pairs into a nested config object.
Keys are lodash property paths, so `db.pool.size=10` sets a deeply nested value — useful for overriding any config property from the command line.

### `pkgToConfig(searchDir?, name?, version?, description?)`
Extract name, version, and description from `package.json` or npm environment. Returns `Promise`.

---

## Browser support

The package provides a browser-safe entry point via the `"browser"` export condition.
Modern bundlers (webpack, Vite, esbuild) use it automatically.
Browser builds exclude `loadConfigFile` and `pkgToConfig` (which depend on Node.js `fs`).

## License

[MIT](./License.txt) © 2020–2026 Frank Stock
