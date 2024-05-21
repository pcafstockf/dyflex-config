# dyflex-config
Simple, dynamic, flexible, configuration library.

It seems every backend project I work on, has some need to read a configuration file.  
From command line opts, from env, from json, from properties files, and on and on.  
Worse, some options vary from environment to environment and from developer to developer.  
But importantly, some options just dont; They are just there to help future proof your app.
And then if its not complicated enough, sometimes you need to pull in **pieces** of config from different locations.
Then you learn about @AutoWire in Java and curse the language you love (TypeScript of course).

After copy and pasting the same configuration routines from project to project for many years,
I finally decided to bite the bullet and publish a library.

## Concepts
Configuration needs to be:
* reference-able (to eliminate duplication)
* override-able (for different envs)
* modular (for generation and maintainability)
* compose-able (to reverse modularity 😃 and more easily support override-ability)

## Show me some code
Some folks like the details (below), some folks want to see the code first...

As you read the code, keep in mind:
* In this example there is a .env file in the cwd that contains `host=mysql.prod.example.com`
* In this example the app will be invoked with `node example.js --defs mysql.user=james`

```typescript
@Injectable()
class MySqlDbMgr {
	constructor(@Inject(Symbol.for(my-sql-conf)) conf: MySqlConfiguration) {
		this.pool = mysql.createPool(conf);
	}
	// useful properties and methods.
}
const DbMgrToken = new InjectionToken<MySqlDbMgr>('DbMgr');

// Global structure of application configuration.
const AppConfig = {
	// @ts-ignore
	info: pkgToConfig(__dirname, __APP_NAME__, __APP_VERSION__, __APP_DESCRIPTION__),
	mysql: {
		// Flag this as the MySql configurtion object.
		__conf_register: 'my-sql-conf',
		host: undefined as unknown as string,
		port: 3306,
		user: undefined as unknown as string,
		password: '<%= fn.getSecret("my-app-passwd") %>',
		database: 'my-app-database',
        // auto-wire a database connection service into dependency injection.
		__conf_init: {
			fn: (di: Container) => di.bindClass(DbMgrToken, MySqlDbMgr).asSingleton()
		}
	}
};
type AppConfigType = typeof AppConfig;

// Main entry
(async (args) => {
	// Are you not using DI in your app ???
	const di = new Container();
	// Wire up the configuration for your application.
	const conf = await makeConfig(AppConfig, {
			evalCb: (key: symbol, obj: object, path: string[]) => di.bindConstant(key, obj),
			evalExt: {getSecret: (filePath) => fs.readFileSync(filePath, 'utf-8').trim()},
			ctx: di
		},
		['mysql', loadConfigFile('.env')],
		keyValueToConfig(args.defs)
	);
	console.log(`Running ${conf.info.name} v${conf.info.version}`);
	// Note that using npmjs async-injection, 'dbMgr' is fully typed as MySqlDbMgr.
	const dbMgr = di.get(DbMgrToken);   
})(minimist(process.argv.slice(2))).catch(e => console.error(e));
```

## Details

### Default Base Configuration (aka object literals).

Default Base Configurations are modular and composable TypeScript `const` declarations, that contains default values (preferably for local development), 
which describes the structure (e.g. `interface` type) of the configuration for a given part of your application.  
It should be rare for you to manually describe the configuration `interface` of a module, as it is
derivable from the `const` declaration of the modules default base configuration  
(e.g. `type MyAppConfig = typeof DefaultMyAppConfig;`).

Your application defines its own (global) default base configuration, by simply merging together imported
default base configuration objects from the modules your application will use, as well as default base configuration
fragments defined by your own application services.

### Loading
json5 is a peer dependency and is required to be present.
"properties-reader", "dotenv", "yaml" will be used if present.

### Merging

Configuration Resource Locations (CRL) are external configuration files (e.g. json5, .env, yaml, etc), and are typically
configuration fragments that contain overrides for selected value(s) defined in default base configuration.  
You supply the configuration merging process with an array of locations, and it recursively merges these fragments into
your global default base configuration.  
You may also establish file change watches for any CRL describing a local file.

### Templating (aka Interpolation)

Any object property value in the configuration hierarchy may be templated to reference other configuration properties.  
`const config = {release: '<%= config.name + "@" + config.version %>'};`    
This templating step is performed after all merging is completed,
so the full config hierarchy is available to the template for interpolation.  
Since templates are strings, the rendered (template output) type is normally `string`.  
But templating provides a few helper functions:
* `fn.asNum` Renders output type `number` (e.g. 12, '12', NaN, 'Infinity', etc) instead of `string`.
* `fn.asBool` Renders output type `boolean` (e.g. false, 'false', 0, etc) instead of `string`.
* `fn.asJs` This helper ensures the config value is whatever type was passed into the helper (e.g. `object`, `number`, `string`, etc) instead of `string`.
* `fn.fromEnv` Allows you to retrieve values from process.env.
* `fn.relTo` Retrieve a property relative to the current object **OR** to a symbol. 
  The input should be specified as a lodash property path. 
  If the argument starts with a '.' it is interpreted as a relative path, 
  otherwise it is interpreted as an absolute path starting at the given symbol (interpreted as Symbol.for).

Example:  
`const config = {port: '<%= fn.asNum("8888") %>'};
`

### Initializers (aka auto-wiring)

The default base configuration (`const`) fragments, often contain **initializers** which are simply factory functions that
automatically process configuration data to construct (and typically register) a service with the Dependency Injection Container.  
This means that adding services to your application is usually as simple as merging in the default base
configuration of a given service, into your applications default base configuration.  
no other TypeScript code needed. You will likely need to provide env specific configuration (json5) override data,
such as username and/or password, but that's it!

## Implementation Notes
lodash.merge is used for configuration merging (along with lodash.set if you are merging at a key prefixed merge point).  
Understanding how lodash.merge actually works is important, so please read [it's documentation](https://lodash.com/docs/#merge).  Once you understand it,
you will see a problem...
* How do I replace an object or an array of values?

This library actually uses [lodash.mergeWith](https://lodash.com/docs/#mergeWith) in order to implement a _not_ ability (aka `!`, aka _bang_, aka _replacement_).  
This feature allows you to **overwrite** a node in the hierarchy instead of merging into it.
```json5
// Merging in this json5 override will "merge" the values into configuration,
// but completely replace anything at or below 'http.authn' (if it existed).
{
  "http": {
    "!authn": {
      "username": "foo",
      "password": "bar"
    },
    "some-key": "baz"
  }
}
```
