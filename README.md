# dyflex-config
[![CI Actions](https://github.com/pcafstockf/dyflex-config/workflows/CI/badge.svg)](https://github.com/pcafstockf/dyflex-config/actions)
[![Publish Actions](https://github.com/pcafstockf/dyflex-config/workflows/NPM%20Publish/badge.svg)](https://github.com/pcafstockf/dyflex-config/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
![OSS Lifecycle](https://img.shields.io/osslifecycle/pcafstockf/dyflex-config.svg)
[![npm version](https://img.shields.io/npm/v/dyflex-config)](https://www.npmjs.com/package/dyflex-config)

Simple, dynamic, flexible, modular, extensible, templated, configuration library.

## Why another configuration library?
Many projects need to load configuration.  
Configuration from command line opts, from env, from json, from properties files, and on and on.  
Some options vary from environment to environment and from developer to developer.  
But importantly, some options just don't; They are only there to help future-proof your app.  
If that's not complicated enough, sometimes you need to pull in **pieces** of config from different locations.  
And speaking of dynamic configuration, wouldn't functionality like Java's @AutoWire be nice?

## Installation
You can get the latest release using npm:
```
$ npm install dyflex-config --save
```
Please note that this library supports a wide variety of runtimes and is distributed as both esm and cjs modules, side by side.

## Concepts
I believe configuration should be:
* reference-able (to eliminate duplication)
* override-able (for different envs)
* modular (for generation and maintainability)
* compose-able (to **reverse** modularity 😃 and more easily support override-ability)

## ESM and CommonJS Support

This library recognizes the realities we live in and fully supports both ESM and CommonJS module systems:

**ESM (import):**
```typescript
import { makeConfig, mergeConfig, evalConfig } from 'dyflex-config';
```

**CommonJS (require):**
```javascript
const { makeConfig, mergeConfig, evalConfig } = require('dyflex-config');
```

## Browser Compatibility

**Note:** Some features depend on Node.js-specific APIs:

- `loadConfigFile()` - Uses Node.js `fs` module (not browser-compatible)
- `pkgToConfig()` - Uses Node.js `fs` module (not browser-compatible)

**Browser and Node.js compatible functions:**
- `makeConfig()`
- `mergeConfig()`
- `evalConfig()`
- `keyValueToConfig()`

For browser usage, the package automatically provides a browser-specific entry point that excludes Node.js-only functions.
Modern bundlers will automatically use this when building for browser environments.

## Show me some code
Some folks like the details (below), some folks want to see the code first...

As you read the code, keep in mind that for this example:
* We are trying to show a myriad of features but still keep it simple.
* There is a .env file in the cwd that contains `host=mysql.prod.example.com`
* The app will be invoked with `node example.js --defs mysql.user=james`
* And of course, you would naturally want to use [async-injection](https://github.com/pcafstockf/async-injection/) (but you don't have to).

```typescript
// Simple injectable database manager with injected settings.
@Injectable()
class MySqlDbMgr {
	constructor(@Inject(Symbol.for(my-sql-conf)) conf: MySqlConfiguration) {
		this.pool = mysql.createPool(conf);
	}
	// useful properties and methods.
}
const DbMgrToken = new InjectionToken<MySqlDbMgr>('DbMgr');

// Optionally define the global structure of your app configuration.
const DefaultAppConfig = {
	// @ts-ignore  (see pkgToConfig function for details)
	info: pkgToConfig(__dirname, __APP_NAME__, __APP_VERSION__, __APP_DESCRIPTION__),
	mysql: {
		// Flag this as the MySql configurtion object.
		__conf_register: 'my-sql-conf',
        // Define the type, but actuall value merged from .env
		host: undefined as unknown as string,
		port: 3306,
		user: undefined as unknown as string,
        // see evalConfig function to define your own custom interpolators
		password: '<%= fn.getSecret("my-app-passwd") %>',
		database: 'my-app-database',
        // auto-wire a database connection service via dependency injection.
        // makeConfig (below), creates a fully configured, injectable, database manager.
		__conf_init: {
			fn: (di: Container) => di.bindClass(DbMgrToken, MySqlDbMgr).asSingleton()
		}
	}
};

// ************ Main entry *****************
(async (args) => {
	const di = new Container();
	// Wire up the configuration for your application.
	const config = await makeConfig(DefaultAppConfig, 
                    {
                        // Helper to bind configuration information into dependency injeciton.
                        evalCb: (key: symbol, obj: object, path: string[]) => di.bindConstant(key, obj),
                        // Extensible configuration templating.
                        evalExt: {getSecret: (filePath) => fs.readFileSync(filePath, 'utf-8').trim()},
                        ctx: di
                    },
                    // merge the .env info into config.mysql
                    ['mysql', loadConfigFile('.env')],
                    // merge any command line arguments into the configuration.
                    keyValueToConfig(args.defs)
	);
	// Picked up from your package.json (see pkgToConfig).
	console.log(`Running ${config.info.name} v${config.info.version}`);
	// Thanks to async-injection, 'dbMgr' is fully typed as MySqlDbMgr.
	const dbMgr = di.get(DbMgrToken);   
})(minimist(process.argv.slice(2))).catch(e => console.error(e));
```

## Details

### Default Base Configuration (aka object literals).

Default Base Configurations are modular and composable `const` object literals, that contains default values (preferably for local development), 
which describes the structure (e.g. `interface` type) of the configuration for a given piece of your application.  
This saves you from having to define a configuration `interface`, as it is derivable from the `const` declaration of the default base configuration  
(e.g. `type AppConfigType = typeof DefaultAppConfig;`).

Your application can define its own (global) default base configuration, by simply merging together 
default base configurations from various modules within your application.

### Loading
[json5](https://www.npmjs.com/package/json5) is required to be present, and always supported.
[properties-reader](https://www.npmjs.com/package/properties-reader), 
[dotenv](https://www.npmjs.com/package/dotenv), 
[yaml](https://www.npmjs.com/package/yaml) are supported if installed.

### Merging

You supply the configuration merging process with an array of objects, and it recursively merges these into your global default base configuration.  
You may also provide configuration fragments and merge them at defined sub-nodes.
See `mergeConfig`, `loadConfigFile`, `keyValueToConfig`, and `pkgToConfig` for more info.

### Templating (aka Interpolation)

Any object property value in the configuration hierarchy may be templated to reference other configuration properties.  
`const config = {release: '<%= config.name + "@" + config.version %>'};`    
This templating step is performed after all merging is completed,
so the full config hierarchy is available to the template for interpolation.  
Since templates are strings, the rendered (template output) type is normally `string`.  
But templating provides a few helper functions:
* `fn.asNum` Renders output type `number` (e.g. 12, '12', NaN, 'Infinity', etc.) instead of `string`.
* `fn.asBool` Renders output type `boolean` (e.g. false, 'false', 0, etc) instead of `string`.
* `fn.asJs` Ensures the config value is whatever was passed into the helper (e.g. `object`, `number`, `string`, etc.) instead of `string`.
* `fn.fromEnv` Allows you to retrieve values from process.env.
* `fn.relTo` Retrieve a property relative to the current object **OR** to a symbol. 
  The input should be specified as a lodash property path. 
  If the argument starts with a '.' it is interpreted as a relative path, 
  otherwise it is interpreted as an absolute path starting at the given symbol (interpreted using Symbol.for).

Example:  
`const config = {port: '<%= fn.asNum("8888") %>'};`  
`const config = {port: '<%= fn.asJs(8888) %>'};`
See `evalConfig` for more info.

### Initializers (aka auto-wiring)

The default base configuration (`const`) fragments, can contain **initializers** which are simply factory functions that
automatically process configuration data to construct (and typically register) a service with the Dependency Injection Container.  
This means that adding services to your application is usually as simple as defining a default base configuration.  
You will likely need to provide configuration override data, such as username and/or password (.env, json, etc.), but that's it!  
See `discoverInitializers` and `invokeInitializers` for more info.

## Implementation Notes
lodash.merge is used for configuration merging (along with lodash.set if you are merging at a key prefixed merge point).  
Understanding how lodash.merge actually works is important, so please read [its documentation](https://lodash.com/docs/#merge).  
Once you understand it,
you will see a problem that this library uses  [lodash.mergeWith](https://lodash.com/docs/#mergeWith) to address...
* How do I merge **or** union two arrays (instead of having the right array simply replace the left).
* How do I replace an object (as opposed to merging it)?

By default, we use lodash.union to 'merge' arrays which is (IMO) the intuitive behavior. 
If you really did want to replace the left array with the right, you can us the 'not' feature described next.  
To address the second, we implement a "not" ability (aka `!`, aka _bang_, aka _replacement_).  
This feature allows you to **overwrite** a node in the hierarchy instead of merging.
Finally, if you want the standard lodash merge behavior for arrays (instead of our default union behavior), 
you can prefix the key with `%`.
```json5
// Merging in this json5 override will "merge" the values into configuration,
// but completely replace anything at or below 'http.authn' (if it existed).
{
  "http": {
    "!authn": {
      "username": "foo",
      "password": "bar"
    },
    "some-key": "baz",
    "%some-array": ["one","two"]
  }
}
```
